// The playground: the scenes and tokens, live, in both themes.

import "./playground.css";
import { hyperstructureSvg, markSvg, palette } from "../src/brand";
import { LANES as CONDUIT_LANES, type ConduitHandle, conduit } from "../src/gl/conduit";
import { cssColor, mount, type Scene } from "../src/gl/core";
import { type FoundryHandle, type FoundryLane, foundry, LANES } from "../src/gl/foundry";
import { orb } from "../src/gl/orb";
import { play, type StreamHandle, stream } from "../src/gl/stream";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel);

// Theme: stored per viewer; the scenes read the tokens every frame.
const root = document.documentElement;
function setTheme(t: string) {
  root.dataset.theme = t;
  try {
    localStorage.setItem("hs-design-theme", t);
  } catch {}
  for (const b of document.querySelectorAll<HTMLButtonElement>("[data-theme-choice]")) {
    b.setAttribute("aria-pressed", String(b.dataset.themeChoice === t));
  }
  renderTokens();
}
let initial = "dark";
try {
  initial =
    localStorage.getItem("hs-design-theme") ??
    (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
} catch {}
for (const b of document.querySelectorAll<HTMLButtonElement>("[data-theme-choice]")) {
  b.addEventListener("click", () => setTheme(b.dataset.themeChoice ?? "dark"));
}

// The marks, from brand.ts.
const markEl = $(".mark");
if (markEl) markEl.innerHTML = markSvg(22);
const ringsInk = $("#rings-ink");
if (ringsInk) ringsInk.innerHTML = hyperstructureSvg(120, { ink: "currentColor", background: null });
const ringsYellow = $("#rings-yellow");
if (ringsYellow) ringsYellow.innerHTML = hyperstructureSvg(120, { ink: palette.yellow, background: null });

// The foundry, with imaginary sessions.
const PLANETS: Record<string, [number, number, number]> = {
  hero: [1.02, -0.75, 1.15],
  floor: [0.95, -0.85, 1.4],
};
let scene: FoundryHandle | null = null;
let unmount: (() => void) | null = null;
const lanes = new Map<number, FoundryLane>();
function fill(count: number) {
  lanes.clear();
  let i = 0;
  while (lanes.size < count && i++ < 500) {
    const lane = Math.floor(Math.random() * LANES);
    const r = Math.random();
    lanes.set(lane, { lit: 1, color: r < 0.7 ? 1 : r < 0.9 ? 2 : 3, energy: Math.random() * 0.6 });
  }
  scene?.setLanes(lanes);
}
function start() {
  unmount?.();
  const canvas = $<HTMLCanvasElement>("#foundry");
  if (!canvas) return;
  const density = Number($<HTMLInputElement>("#density")?.value ?? 55) / 100;
  const stars = Number($<HTMLInputElement>("#stars")?.value ?? 100) / 100;
  scene = foundry({ planet: PLANETS[$<HTMLSelectElement>("#planet")?.value ?? "hero"], density, stars });
  unmount = mount(canvas, scene.scene, { pixel: 3 });
  fill(Number($<HTMLInputElement>("#lit")?.value ?? 9));
}
$("#lit")?.addEventListener("input", (e) => fill(Number((e.target as HTMLInputElement).value)));
$("#density")?.addEventListener("change", start);
$("#stars")?.addEventListener("change", start);
$("#planet")?.addEventListener("change", start);
$("#pulse")?.addEventListener("click", () => {
  const working = [...lanes.keys()];
  const lane = working[Math.floor(Math.random() * working.length)];
  if (lane !== undefined) scene?.pulse(lane, 800);
});
const stage = $(".stage");
stage?.addEventListener("pointermove", (e) => {
  const r = stage.getBoundingClientRect();
  scene?.pointer((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
});
stage?.addEventListener("pointerleave", () => scene?.pointerLeave());
setInterval(() => {
  const working = [...lanes.entries()].filter(([, l]) => l.color === 1);
  const pick = working[Math.floor(Math.random() * working.length)];
  if (pick) scene?.pulse(pick[0], 40 + Math.random() * 900);
}, 600);

// The stream, with the glyphs in a box in its middle.
const streamCanvas = $<HTMLCanvasElement>("#stream");
const streamStage = $("#stream-stage");
const streamBox = $("#stream-box");
let streamScene: StreamHandle | null = null;
let streamStop = () => {};
let streamOn = true;
function placeStream() {
  if (!streamScene || !streamCanvas || !streamBox) return;
  const c = streamCanvas.getBoundingClientRect();
  const b = streamBox.getBoundingClientRect();
  if (!c.width || !c.height) return;
  streamScene.place({
    x: (b.left - c.left) / c.width,
    y: (b.top - c.top) / c.height,
    width: b.width / c.width,
    height: b.height / c.height,
  });
}
function startStream(text: string) {
  streamStop();
  if (!streamCanvas || !streamStage) return;
  const s = stream({ text, power: streamOn });
  const unmount = mount(streamCanvas, s.scene, { pixel: 3 });
  const unplay = play(streamStage, streamCanvas, s);
  streamStop = () => {
    unplay();
    unmount();
  };
  streamScene = s;
  placeStream();
}
if (streamStage) new ResizeObserver(placeStream).observe(streamStage);
const streamText = $<HTMLInputElement>("#stream-text");
streamText?.addEventListener("change", () => startStream(streamText.value || "404"));
const streamPower = $<HTMLButtonElement>("#stream-power");
streamPower?.addEventListener("click", () => {
  streamOn = !streamOn;
  streamScene?.power(streamOn);
  streamPower.textContent = streamOn ? "Wind on" : "Wind off";
  streamPower.setAttribute("aria-pressed", String(streamOn));
});
startStream("404");

// The conduit, behind a sidebar row and four times as large: one scene pixel per 1.5 CSS
// pixels or so, as fctl's sidebar draws it.
const conduits: ConduitHandle[] = [];
let conduitHold = false;
function conduitLanes(count: number) {
  const lanes = new Map<number, FoundryLane>();
  for (let i = 0; i < count; i++) {
    const lane = Math.round(((i + 0.5) * CONDUIT_LANES) / count - 0.5);
    lanes.set(lane, { lit: 1, color: i % 4 === 3 ? 2 : 1, energy: Math.random() * 0.6 });
  }
  for (const c of conduits) c.setLanes(lanes);
}
function conduitOn(canvasId: string, rowId: string, scale: number) {
  const canvas = $<HTMLCanvasElement>(`#${canvasId}`);
  const row = $(`#${rowId}`);
  if (!canvas || !row) return;
  const c = conduit();
  mount(canvas, c.scene, { pixel: Math.max(2, Math.round(devicePixelRatio * 1.5)) * scale });
  row.addEventListener("pointerenter", () => c.show(true));
  row.addEventListener("pointermove", (e) => {
    const r = row.getBoundingClientRect();
    c.pointer((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  });
  row.addEventListener("pointerleave", () => {
    c.pointerLeave();
    if (!conduitHold) c.show(false);
  });
  row.addEventListener("click", (e) => {
    e.preventDefault();
    c.burst();
  });
  conduits.push(c);
}
conduitOn("conduit", "conduit-row", 1);
conduitOn("conduit-big", "conduit-big-row", 4);
const conduitLit = $<HTMLInputElement>("#conduit-lit");
conduitLit?.addEventListener("input", () => conduitLanes(Number(conduitLit.value)));
conduitLanes(Number(conduitLit?.value ?? 3));
$<HTMLInputElement>("#conduit-hold")?.addEventListener("change", (e) => {
  conduitHold = (e.target as HTMLInputElement).checked;
  for (const c of conduits) c.show(conduitHold);
});
$("#conduit-pulse")?.addEventListener("click", () => {
  const lane = Math.floor(Math.random() * CONDUIT_LANES);
  for (const c of conduits) c.pulse(lane, 800);
});
$("#conduit-burst")?.addEventListener("click", () => {
  for (const c of conduits) c.burst();
});

// Orbs, one per session state: [color A, color B, dim, energy].
const ORBS: [string, string, string, number, number][] = [
  ["Queued", "--c-ink-3", "--c-blue", 0.45, 0.06],
  ["Starting", "--c-ink-2", "--c-blue", 0.25, 0.3],
  ["Working", "--c-highlight", "--c-pink", 0, 0.8],
  ["Waiting", "--c-blue", "--c-pink", 0.15, 0.06],
  ["Paused", "--c-pink", "--c-blue", 0.3, 0.06],
  ["Stopped", "--c-ink-3", "--c-ink-4", 0.75, 0.06],
  ["Failed", "--c-danger", "--c-ink-4", 0.4, 0.06],
];
const orbs = $("#orbs");
for (const [label, a, b, dim, energy] of ORBS) {
  const fig = document.createElement("figure");
  const canvas = document.createElement("canvas");
  const cap = document.createElement("figcaption");
  cap.textContent = label;
  fig.append(canvas, cap);
  orbs?.append(fig);
  const s: Scene = orb(() => ({
    a: cssColor(a, [1, 1, 0.36]),
    b: cssColor(b, [1, 0, 0.85]),
    energy,
    dim,
  }));
  mount(canvas, s, { pixel: 2, fps: 30 });
}

// Swatches.
function swatch(name: string, value: string) {
  const el = document.createElement("div");
  el.className = "swatch";
  const chip = document.createElement("span");
  chip.className = "chip";
  chip.style.background = value;
  const text = document.createElement("span");
  const n = document.createElement("strong");
  n.textContent = name;
  const v = document.createElement("code");
  v.textContent = value;
  text.append(n, v);
  el.append(chip, text);
  return el;
}
const brand = $("#brand");
for (const [name, hex] of Object.entries(palette)) brand?.append(swatch(name, hex));
const TOKENS = [
  "canvas",
  "surface",
  "raised",
  "sunken",
  "ink",
  "ink-2",
  "ink-3",
  "ink-4",
  "line",
  "line-strong",
  "hover",
  "accent",
  "accent-soft",
  "highlight",
  "highlight-ink",
  "pink",
  "blue",
  "amber",
  "danger",
  "pr-open",
  "pr-draft",
  "pr-queued",
  "pr-merged",
  "pr-closed",
  "pr-unknown",
  "checks-passed",
  "checks-pending",
  "checks-failed",
];
function renderTokens() {
  const box = $("#tokens");
  if (!box) return;
  box.replaceChildren(
    ...TOKENS.map((t) => swatch(t, getComputedStyle(root).getPropertyValue(`--c-${t}`).trim())),
  );
}

setTheme(initial);
start();
