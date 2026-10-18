// The stream on its own, full screen: for working on the scene.

import "./playground.css";
import { mount } from "../src/gl/core";
import { play, type StreamHandle, stream } from "../src/gl/stream";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel);
const root = document.documentElement;
const params = new URLSearchParams(location.search);
root.dataset.theme = params.get("theme") ?? localStorage.getItem("hs-design-theme") ?? "dark";
for (const b of document.querySelectorAll<HTMLButtonElement>("[data-theme-choice]")) {
  b.addEventListener("click", () => {
    root.dataset.theme = b.dataset.themeChoice ?? "dark";
    localStorage.setItem("hs-design-theme", root.dataset.theme);
  });
}

const canvas = $<HTMLCanvasElement>("#stream");
const digits = $("#digits");
const input = $<HTMLInputElement>("#text");
let s: StreamHandle | null = null;
let stop = () => {};
let unplay = () => {};

function place() {
  if (!s || !canvas || !digits) return;
  const c = canvas.getBoundingClientRect();
  const d = digits.getBoundingClientRect();
  s.place({
    x: (d.left - c.left) / c.width,
    y: (d.top - c.top) / c.height,
    width: d.width / c.width,
    height: d.height / c.height,
  });
}

function start(text: string) {
  stop();
  unplay();
  if (!canvas) return;
  s = stream({ text });
  stop = mount(canvas, s.scene, { pixel: 3 });
  unplay = play(document.body, canvas, s);
  place();
  (window as unknown as { stream: StreamHandle }).stream = s;
}

new ResizeObserver(place).observe(document.body);
input?.addEventListener("change", () => start(input.value || "404"));
const power = $<HTMLButtonElement>("#power");
let on = params.get("power") !== "off";
power?.addEventListener("click", () => {
  on = !on;
  s?.power(on);
  power.textContent = on ? "Wind on" : "Wind off";
  power.setAttribute("aria-pressed", String(on));
});
start(params.get("text") ?? "404");
if (!on) setTimeout(() => s?.power(false), 900);

// Frame timing, for tuning.
let frames = 0;
let t0 = performance.now();
const stats = $("#stats");
const tick = () => {
  frames++;
  const now = performance.now();
  if (now - t0 > 1000 && stats) {
    stats.textContent = `${Math.round((frames * 1000) / (now - t0))} fps`;
    frames = 0;
    t0 = now;
  }
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
