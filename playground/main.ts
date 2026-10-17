// The playground: the scenes and tokens, live, in both themes.

import "./playground.css";
import { markSvg, palette } from "../src/brand";
import { cssColor, mount, type Scene } from "../src/gl/core";
import { type FoundryHandle, type FoundryLane, foundry, LANES } from "../src/gl/foundry";
import { orb } from "../src/gl/orb";

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

// The mark, from brand.ts.
const markEl = $(".mark");
if (markEl) markEl.innerHTML = markSvg(22);

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
  scene = foundry({ planet: PLANETS[$<HTMLSelectElement>("#planet")?.value ?? "hero"], density });
  unmount = mount(canvas, scene.scene, { pixel: 3 });
  fill(Number($<HTMLInputElement>("#lit")?.value ?? 9));
}
$("#lit")?.addEventListener("input", (e) => fill(Number((e.target as HTMLInputElement).value)));
$("#density")?.addEventListener("change", start);
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
  "accent",
  "accent-soft",
  "highlight",
  "highlight-ink",
  "pink",
  "blue",
  "amber",
  "danger",
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
