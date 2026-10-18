// The stream: the foundry's threads of light, flowing for real. Air blows in
// from the left (a small fluid simulation, stream-fluid.ts) and carries the
// threads, streaklines of particles let out at the left edge, to the right.
// Glyphs made of the planet's dithered matter float in it (stream-glyphs.ts,
// stream-bodies.ts), and the threads part around them. People can stir the
// threads, grab a glyph and throw it, tap for a burst of packets, and turn
// the wind off (the glyphs fall over) and on again (they stand back up).
//
// fctl.sh and fctl's web app use it for their 404 and 5xx pages: the code is
// the glyphs.
//
// Like every scene it renders at a low resolution, quantized to the brand
// palette with an 8×8 Bayer dither: the threads go into an offscreen buffer
// (one channel per color), then one fullscreen pass dithers them together
// with the glyphs' bodies, outlines and glow, the stars and the grain.

import {
  compile,
  cssColor,
  FULLSCREEN_VS,
  GLSL_NOISE,
  isDark,
  prefersReducedMotion,
  type Scene,
} from "./core";
import { type Body, type BodyWorld, makeBody, stepBodies, toLocal } from "./stream-bodies";
import { Fluid } from "./stream-fluid";
import { type GlyphSet, rasterize, sampleSd } from "./stream-glyphs";

/** At most this many glyphs. */
export const MAX_GLYPHS = 4;

export interface StreamOptions {
  /** What the glyphs spell, e.g. "404" (at most four characters). */
  text: string;
  /** The glyphs' CSS font family. */
  family?: string;
  /** Their weight. */
  weight?: number;
  /** How many threads the left edge lets out. */
  threads?: number;
  /** Whether the wind blows at first (default true). */
  power?: boolean;
}

/** A box in fractions of the canvas (0..1, y down). */
export interface StreamBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StreamHandle {
  scene: Scene;
  /** Resolves when the glyphs are first drawn (after their font loaded). */
  ready: Promise<void>;
  /** Where the glyphs stand: the text is fitted into the box, centred. */
  place(box: StreamBox): void;
  /** A pointer went down at (x, y), fractions of the canvas. True when it grabbed a glyph. */
  pointerDown(x: number, y: number, id?: number, slop?: number): boolean;
  /** A pointer moved: it drags the glyph it holds, or stirs the air. */
  pointerMove(x: number, y: number, id?: number): void;
  pointerUp(id?: number): void;
  /** Whether a glyph is at (x, y), within `slop` (world units, the canvas is one tall). */
  hit(x: number, y: number, slop?: number): boolean;
  /** A burst of air and packets at (x, y). */
  burst(x: number, y: number): void;
  /** Turns the wind off (the glyphs fall over) or on (they stand back up). */
  power(on: boolean): void;
}

/** Speed of the wind, in heights per second. */
const WIND = 0.24;
/** Distance between a thread's particles, in heights. */
const SPACING = 0.0075;

const LINE_VS = `#version 300 es
layout(location = 0) in vec4 aP; // x, y (heights, y down), intensity, channel
uniform float uAspect;
out vec4 vC;
void main() {
  gl_Position = vec4(aP.x / uAspect * 2.0 - 1.0, 1.0 - aP.y * 2.0, 0.0, 1.0);
  float c = aP.w;
  vC = vec4(step(abs(c), 0.5), step(abs(c - 1.0), 0.5), step(abs(c - 2.0), 0.5), step(abs(c - 3.0), 0.5)) * aP.z;
}`;

const LINE_FS = `#version 300 es
precision mediump float;
in vec4 vC;
out vec4 outColor;
void main() { outColor = vC; }`;

const FS = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uRes;
uniform float uTime;
uniform float uDark;
uniform sampler2D uLines;      // threads: neutral, working, waiting, pink
uniform sampler2D uAtlas;      // glyph distance fields side by side
uniform int uCount;
uniform float uTiles;          // glyphs in the atlas
uniform vec4 uBody[${MAX_GLYPHS}];   // x, y (heights, y down), cos, sin
uniform vec4 uTile[${MAX_GLYPHS}];   // centre of mass in the tile (0..1), 1 / tile size (heights), tile index
uniform vec4 uMat[${MAX_GLYPHS}];    // thickest stroke /2, distance range (heights), flash, unused
uniform float uShow;           // the glyphs appear (0..1)
uniform float uLight;          // the power: 1 on, low when off
uniform vec3 uCol[4];          // thread colors
uniform vec3 uInk;             // outlines, stars
uniform vec3 uFlash;           // knocked outlines
uniform vec3 uSpark;           // bright sparks on working threads
uniform vec3 uBodyNear;
uniform vec3 uBodyDeep;
uniform vec3 uAir;
${GLSL_NOISE}

float bayer8(vec2 p) {
  ivec2 q = ivec2(mod(p, 8.0));
  int a = q.x ^ q.y;
  int y = q.y;
  int v = ((a & 1) << 5) | ((y & 1) << 4) | ((a & 2) << 2) | ((y & 2) << 1) | ((a & 4) >> 1) | ((y & 4) >> 2);
  return (float(v) + 0.5) / 64.0;
}

void main() {
  vec2 px = floor(gl_FragCoord.xy);
  float pixel = 1.0 / uRes.y;
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) * pixel;
  float th = bayer8(px);

  // The nearest glyph.
  float sd = 1.0;
  float thick = 1.0;
  float flash = 0.0;
  vec2 lp = vec2(0.0);
  for (int i = 0; i < ${MAX_GLYPHS}; i++) {
    if (i >= uCount) break;
    vec4 b = uBody[i];
    vec4 t = uTile[i];
    vec2 d = p - b.xy;
    vec2 l = vec2(b.z * d.x + b.w * d.y, -b.w * d.x + b.z * d.y);
    vec2 uv = l * t.z + t.xy;
    if (uv.x <= 0.0 || uv.y <= 0.0 || uv.x >= 1.0 || uv.y >= 1.0) continue;
    float s = (texture(uAtlas, vec2((t.w + uv.x) / uTiles, uv.y)).r - 0.5) * 2.0 * uMat[i].y;
    if (s < sd) {
      sd = s;
      thick = uMat[i].x;
      flash = uMat[i].z;
      lp = l;
    }
  }

  // The threads, with a soft glow around the lit ones.
  vec2 tc = gl_FragCoord.xy / uRes;
  vec2 o = 1.0 / uRes;
  vec4 core = texture(uLines, tc);
  vec4 halo = texture(uLines, tc + o * vec2(1.5, 1.5)) + texture(uLines, tc + o * vec2(-1.5, 1.5))
            + texture(uLines, tc + o * vec2(1.5, -1.5)) + texture(uLines, tc + o * vec2(-1.5, -1.5))
            + texture(uLines, tc + o * vec2(3.5, 0.0)) + texture(uLines, tc + o * vec2(-3.5, 0.0))
            + texture(uLines, tc + o * vec2(0.0, 3.5)) + texture(uLines, tc + o * vec2(0.0, -3.5));
  vec4 inten = core + halo * vec4(0.0, 0.05, 0.05, 0.07);
  float best = inten.r;
  vec3 bestCol = uCol[0];
  if (inten.g > best) { best = inten.g; bestCol = uCol[1]; }
  if (inten.b > best) { best = inten.b; bestCol = uCol[2]; }
  if (inten.a > best * 0.6 && inten.a > 0.02) { best = max(best, inten.a); bestCol = uCol[3]; }
  if (core.g > 0.97 && uDark > 0.5) bestCol = uSpark;

  // The glyphs: a dithered body that darkens inward, a hairline outline, a glow.
  float body = 0.0;
  vec3 bodyCol = uBodyNear;
  if (sd < 0.0) {
    float depth = clamp(-sd / thick, 0.0, 1.0);
    float band = vnoise(vec2(lp.x * 38.0 + lp.y * 9.0, depth * 5.0 - uTime * 0.22));
    body = mix(1.0, 0.16, pow(depth, 0.55)) * (0.72 + 0.28 * band) * uShow * (0.3 + 0.7 * uLight);
    bodyCol = mix(uBodyNear, uBodyDeep, smoothstep(0.1, 0.6, depth));
  }
  float limb = exp(-pow(sd / (pixel * mix(0.8, 1.8, flash)), 2.0)) * uShow;
  // The glow ends well inside the tile, whose edge would otherwise show.
  float air = sd > 0.0 ? exp(-sd * 34.0) * 0.32 * (1.0 - smoothstep(0.45, 0.85, sd / uMat[0].y)) * uShow * uLight : 0.0;

  float h = hash12(px * 0.913 + 17.0);
  float twinkle = 0.55 + 0.45 * sin(uTime * (0.6 + h * 2.4) + h * 40.0);
  float star = sd > 0.002 && h > 0.9978 ? twinkle : 0.0;
  float g = hash12(px + floor(uTime * 10.0) * 13.17);

  vec3 col = vec3(0.0);
  float a = 0.0;
  if (limb > th) {
    col = flash > 0.15 ? uFlash : uInk; a = 1.0;
  } else if (best > th) {
    col = bestCol; a = 1.0;
  } else if (star > 0.5) {
    col = uInk; a = star;
  } else if (body > th) {
    col = bodyCol; a = 1.0;
  } else if (air > th) {
    col = uAir; a = 1.0;
  } else if (g > 0.94) {
    col = uInk; a = uDark > 0.5 ? 0.05 : 0.035;
  }
  outColor = vec4(col * a, a);
}`;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const hash1 = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const noise1 = (x: number) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash1(i) * (1 - u) + hash1(i + 1) * u;
};

export function stream(opts: StreamOptions): StreamHandle {
  const family = opts.family ?? '"Inter Variable", ui-sans-serif, system-ui, sans-serif';
  const weight = opts.weight ?? 900;
  const E = opts.threads ?? 44;
  const reduced = prefersReducedMotion();
  let shown = () => {};
  const drawn = new Promise<void>((resolve) => {
    shown = resolve;
  });
  // The glyphs wait for their font (at most two seconds), so they never change shape.
  let fontReady = typeof document === "undefined" || !document.fonts;
  if (!fontReady) {
    const done = () => {
      if (fontReady) return;
      fontReady = true;
      scene.invalidate?.();
    };
    document.fonts.load(`${weight} 100px ${family}`, opts.text).then(done, done);
    setTimeout(done, 2000);
  }

  // Layout and state.
  let set: GlyphSet | null = null;
  let box: StreamBox | null = null;
  let aspect = 0;
  let scale = 1; // heights per tile pixel
  let bodies: Body[] = [];
  let fluid: Fluid | null = null;
  let ready = false; // the air and the threads exist for this size
  let laidOut = false;
  let on = opts.power ?? true;
  let wind = on ? WIND : 0;
  let since = 10; // seconds since the power last changed
  let time = 0;
  let show = reduced ? 1 : 0;
  let settle = 0; // reduced motion: seconds to simulate before the next still frame
  let nextPacket = 0;
  // Frames drawn, seconds not simulated yet, and what a step costs (ms, averaged).
  let frames = 0;
  let owed = 0;
  let cost = 0;
  let slow = false;
  /** The lights: 1 with the power on; off, dim, flickering up a little with each gust. */
  let light = on ? 1 : 0.15;
  /** How many glyphs have dropped since the power went: one every so often. */
  let dropped = 0;
  /** When someone last touched the scene, and when a glyph next fidgets if nobody does. */
  let touched = 0;
  let fidget = 9;
  let gusting = false;

  // Threads: E rings of M particles, newest at head.
  let M = 0;
  let tx = new Float32Array(0);
  let ty = new Float32Array(0);
  let born = new Float32Array(0);
  let pink = new Float32Array(0);
  const head = new Int32Array(E);
  const len = new Int32Array(E);
  const ey = new Float32Array(E);
  const kind = new Uint8Array(E);
  const phase = new Float32Array(E);
  const packetUntil = new Float32Array(E);
  // Mostly idle threads; one in five or so lit, spread out: working (yellow), now and then waiting (blue).
  const lit = new Set<number>();
  for (let e = Math.floor(Math.random() * 4); e < E; e += 4 + Math.floor(Math.random() * 3)) lit.add(e);
  for (let e = 0; e < E; e++) {
    ey[e] = (e + 0.5 + (Math.random() - 0.5) * 0.5) / E;
    kind[e] = lit.has(e) ? (Math.random() < 0.75 ? 1 : 2) : 0;
    phase[e] = Math.random() * 100;
  }
  let verts = new Float32Array(0);
  /** Unbroken stretches of thread to draw: first vertex, count. */
  let runs = new Int32Array(0);
  let nruns = 0;

  // Pointers: where each one is, how far it moved since the last frame.
  const pointers = new Map<number, { x: number; y: number; dx: number; dy: number }>();
  /** Taps: a ring that runs out from (x, y), pushing the threads aside and lighting them pink. */
  const bursts: { x: number; y: number; at: number; fresh: boolean }[] = [];
  const RING = 0.16;
  const RING_LIFE = 0.55;

  const world: BodyWorld = {
    bodies,
    bounds: [0, 0, 1, 1],
    floor: 1,
    gravity: 4.2,
    air: (x, y) => (fluid ? [fluid.sample(fluid.u, x, y), fluid.sample(fluid.v, x, y)] : [0, 0]),
  };

  const rebuildGlyphs = () => {
    set = rasterize([...opts.text].slice(0, MAX_GLYPHS).join(""), family, weight);
    bodies = [];
    laidOut = false;
  };

  /** Fits the text into the box and sets each glyph's home (and creates the bodies the first time). */
  const layout = () => {
    if (!set || !box || !aspect) return;
    const bw = box.width * aspect;
    const bh = box.height;
    scale = Math.min(bw / set.width, bh / set.height);
    const cx = (box.x + box.width / 2) * aspect;
    const cy = box.y + box.height / 2;
    const fresh = bodies.length !== set.glyphs.length;
    if (fresh) bodies = [];
    set.glyphs.forEach((g, i) => {
      const hx = cx + g.ox * scale;
      const hy = cy + g.oy * scale;
      const hull = new Float32Array(g.hull.length);
      for (let k = 0; k < hull.length; k++) hull[k] = (g.hull[k] ?? 0) * scale;
      const m = g.area * scale * scale;
      const I = g.inertia * scale ** 4;
      const old = bodies[i];
      if (old) {
        const b = makeBody(hull, m, I, old.x, old.y);
        Object.assign(old, { hull: b.hull, world: b.world, r: b.r, m, I, hx, hy });
      } else {
        // Each glyph drops in from a little above its place.
        const b = makeBody(hull, m, I, hx, hy - (reduced ? 0 : 0.02 + i * 0.008));
        b.hx = hx;
        b.hy = hy;
        bodies.push(b);
      }
    });
    world.bodies = bodies;
    world.bounds = [0.004, 0.004, aspect - 0.004, 0.996];
    // The floor falling glyphs land on: a little below where they float.
    world.floor = box.y + box.height / 2 + (set.height / 2) * scale + box.height * 0.14;
    laidOut = true;
  };

  // Each body's rotation, refreshed after the bodies move.
  const cos = new Float64Array(MAX_GLYPHS);
  const sin = new Float64Array(MAX_GLYPHS);
  const trig = () => {
    bodies.forEach((b, i) => {
      cos[i] = Math.cos(b.a);
      sin[i] = Math.sin(b.a);
    });
  };

  /** The signed distance from (x, y) to body i's glyph, in heights. */
  const distance = (i: number, x: number, y: number) => {
    const b = bodies[i];
    const g = set?.glyphs[i];
    if (!b || !g || !set) return 1;
    const c = cos[i] ?? 1;
    const s = sin[i] ?? 0;
    const dx = x - b.x;
    const dy = y - b.y;
    const k = 1 / scale;
    return (
      sampleSd(g, set.size, (c * dx + s * dy) * k + g.cx, (c * dy - s * dx) * k + g.cy, set.range) * scale
    );
  };

  /** Marks the cells the glyphs cover as solid, moving with them. */
  const solids = () => {
    if (!fluid || !set) return;
    trig();
    const { nx, ny, h, solid, su, sv } = fluid;
    solid.fill(0);
    bodies.forEach((b, bi) => {
      const r = b.r + h;
      const i0 = Math.max(0, Math.floor((b.x - r) / h));
      const i1 = Math.min(nx - 1, Math.ceil((b.x + r) / h));
      const j0 = Math.max(0, Math.floor((b.y - r) / h));
      const j1 = Math.min(ny - 1, Math.ceil((b.y + r) / h));
      for (let j = j0; j <= j1; j++) {
        const y = (j + 0.5) * h;
        for (let i = i0; i <= i1; i++) {
          const x = (i + 0.5) * h;
          if ((x - b.x) ** 2 + (y - b.y) ** 2 > r * r) continue;
          if (distance(bi, x, y) > -0.15 * h) continue;
          const c = i + j * nx;
          solid[c] = 1;
          su[c] = b.vx - b.w * (y - b.y);
          sv[c] = b.vy + b.w * (x - b.x);
        }
      }
    });
  };

  /**
   * The nearest glyph's surface within `reach` of (x, y): distance and outward
   * normal in `near`, or false.
   */
  const near = new Float64Array(3);
  const surface = (x: number, y: number, reach: number) => {
    let found = false;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (!b) continue;
      const r = b.r + reach;
      if ((x - b.x) ** 2 + (y - b.y) ** 2 > r * r) continue;
      const d = distance(i, x, y);
      if (d >= reach || (found && d >= (near[0] ?? 0))) continue;
      const e = 0.002;
      const gx = distance(i, x + e, y) - distance(i, x - e, y);
      const gy = distance(i, x, y + e) - distance(i, x, y - e);
      const gl = Math.hypot(gx, gy) || 1;
      near[0] = d;
      near[1] = gx / gl;
      near[2] = gy / gl;
      found = true;
    }
    return found;
  };

  /** Moves particle k with the air for dt; next to a glyph it slides along the surface. */
  const advect = (k: number, dt: number, sag: number) => {
    if (!fluid) return;
    const { u: fu, v: fv } = fluid;
    let x = tx[k] ?? 0;
    let y = ty[k] ?? 0;
    // The coarse grid makes the air near a glyph too slow; take it from just
    // outside that layer, along the surface.
    const slip = fluid.h * 1.6;
    if (bodies.length && surface(x, y, slip)) {
      const d = near[0] ?? 0;
      const nx = near[1] ?? 0;
      const ny = near[2] ?? 0;
      const sx = x + nx * (slip - d);
      const sy = y + ny * (slip - d);
      let vx = fluid.sample(fu, sx, sy);
      let vy = fluid.sample(fv, sx, sy);
      const vn = vx * nx + vy * ny;
      if (vn < 0) {
        vx -= vn * nx;
        vy -= vn * ny;
      }
      x += vx * dt;
      y += (vy + sag) * dt;
      // Never inside.
      const margin = 0.0035;
      if (d + (vx * nx + vy * ny) * dt < margin) {
        const out = margin - d - (vx * nx + vy * ny) * dt;
        x += nx * out;
        y += ny * out;
      }
    } else {
      const mx = x + 0.5 * dt * fluid.sample(fu, x, y);
      const my = y + 0.5 * dt * fluid.sample(fv, x, y);
      x += dt * fluid.sample(fu, mx, my);
      y += dt * (fluid.sample(fv, mx, my) + sag);
    }
    tx[k] = x;
    ty[k] = Math.min(0.999, Math.max(0.001, y));
  };

  /** Keeps a particle out of the glyphs: pushed back to just outside the outline. */
  const clear = (k: number) => {
    const x = tx[k] ?? 0;
    const y = ty[k] ?? 0;
    const margin = 0.0035;
    if (!surface(x, y, margin)) return;
    const d = near[0] ?? 0;
    tx[k] = x + (near[1] ?? 0) * (margin - d);
    ty[k] = y + (near[2] ?? 0) * (margin - d);
  };

  /** Lays the threads out along the air's streamlines, as if they had always flowed. */
  const prefill = () => {
    if (!fluid) return;
    const end = aspect + 0.02;
    for (let e = 0; e < E; e++) {
      // Trace the streamline from the inlet, then store it newest (inlet) first.
      const path: number[] = [];
      let px = -0.002;
      let py = ey[e] ?? 0.5;
      let t = 0;
      for (let s = 0; s < M - 1 && px < end; s++) {
        path.push(px, py, t);
        const u = fluid.sample(fluid.u, px, py);
        const v = fluid.sample(fluid.v, px, py);
        const sp = Math.hypot(u, v);
        if (sp < 1e-4) break;
        px += (u / sp) * SPACING;
        py += (v / sp) * SPACING;
        t += SPACING / sp;
      }
      const n = path.length / 3;
      len[e] = n;
      head[e] = n - 1;
      // Ring order: index 0 is the oldest (furthest along), head the newest.
      for (let q = 0; q < n; q++) {
        const src = (n - 1 - q) * 3;
        const k = e * M + q;
        tx[k] = path[src] ?? 0;
        ty[k] = path[src + 1] ?? 0;
        born[k] = time - (path[src + 2] ?? 0);
        pink[k] = 0;
        clear(k);
      }
    }
  };

  /** Air and threads for the current size. */
  const build = () => {
    const ny = reduced ? 48 : 46;
    const nx = Math.max(8, Math.round(ny * aspect));
    fluid = new Fluid(nx, ny, wind);
    M = Math.ceil((aspect / SPACING) * 1.9) + 24;
    tx = new Float32Array(E * M);
    ty = new Float32Array(E * M);
    born = new Float32Array(E * M);
    pink = new Float32Array(E * M);
    verts = new Float32Array(E * M * 4);
    runs = new Int32Array(E * M * 2);
    solids();
    fluid.step(0, Math.max(wind, 0.02), 0, 80);
    prefill();
    ready = true;
  };

  const step = (dt: number) => {
    if (!fluid) return;
    time += dt;
    since += dt;
    // The wind: steady when on (with a gust as it comes back); off, it sputters now and then.
    let target = WIND;
    let glow = 1;
    if (on) {
      if (since < 0.9) target = WIND * 1.6;
    } else {
      // The fan tries to start again now and then.
      const gust = Math.max(0, Math.sin(time * 1.7) * Math.sin(time * 0.53 + 1.3)) ** 3;
      target = WIND * (0.03 + 0.25 * gust);
      glow = 0.12 + 0.5 * gust;
    }
    wind += (target - wind) * (1 - Math.exp(-dt * (on ? 3.5 : 1.6)));
    // Left alone, a glyph hops now and then (people find out they move); in
    // the dark, a fallen one twitches when a gust comes, as if to get up.
    const idle = bodies.filter((b) => !b.grab);
    if (on && time - touched > fidget && since > 3) {
      const b = idle[Math.floor(Math.random() * idle.length)];
      if (b) {
        b.vy -= 0.55 + Math.random() * 0.25;
        b.w += (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 1.5);
        b.free = Math.max(b.free, 0.35);
      }
      touched = time;
      fidget = 10 + Math.random() * 8;
    }
    const gust = !on && glow > 0.4;
    if (gust && !gusting) {
      const b = idle[Math.floor(Math.random() * idle.length)];
      if (b?.falling) {
        b.vy -= 0.3 + Math.random() * 0.2;
        b.w += (Math.random() - 0.5) * 2.5;
      }
    }
    gusting = gust;
    light += (glow - light) * (1 - Math.exp(-dt * (on ? 4 : 2.5)));
    // Off: the glyphs stop floating and drop to the floor one after another,
    // spinning away from the middle, so they land on a corner and topple, or roll.
    while (!on && dropped < bodies.length && since >= 0.12 + dropped * 0.16) {
      const b = bodies[dropped];
      if (b && !b.grab) {
        const middle = ((bodies[0]?.hx ?? 0) + (bodies[bodies.length - 1]?.hx ?? 0)) / 2;
        const centre = Math.abs(b.hx - middle) < 0.01;
        const side = centre ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(b.hx - middle);
        b.falling = true;
        b.w += side * (centre ? 0.5 + Math.random() * 0.7 : 2.4 + Math.random() * 1.3);
        b.vx += (Math.random() - 0.5) * 0.08;
      }
      dropped++;
    }

    // People stir the air; bursts push it out.
    for (const [id, p] of pointers) {
      const held = bodies.some((b) => b.grab?.id === id);
      if (!held && (p.dx || p.dy) && dt > 0) {
        let vx = p.dx / dt;
        let vy = p.dy / dt;
        const sp = Math.hypot(vx, vy);
        if (sp > 3) {
          vx *= 3 / sp;
          vy *= 3 / sp;
        }
        fluid.splat(p.x, p.y, vx * 0.32, vy * 0.32, 0.04);
      }
      p.dx = 0;
      p.dy = 0;
    }
    for (let i = bursts.length - 1; i >= 0; i--) {
      const burst = bursts[i];
      if (!burst) continue;
      const { x, y } = burst;
      if (burst.fresh) {
        burst.fresh = false;
        burst.at = time - dt;
        // A little swirl stays behind, and the glyphs nearby get knocked away.
        fluid.splat(x - 0.02, y, 0, -0.8, 0.03);
        fluid.splat(x + 0.02, y, 0, 0.8, 0.03);
        for (const b of bodies) {
          const dx = b.x - x;
          const dy = b.y - y;
          const d = Math.hypot(dx, dy);
          if (d > 0.5 || d < 1e-4) continue;
          const k = (1 - d / 0.5) * 0.9;
          b.vx += (dx / d) * k;
          b.vy += (dy / d) * k;
          b.w += (Math.random() - 0.5) * 6 * k;
          b.free = Math.max(b.free, 0.25);
        }
      }
      const age = time - burst.at;
      if (age > RING_LIFE) {
        bursts.splice(i, 1);
        continue;
      }
      // The ring slows as it grows; particles at its front ride it outwards.
      const f = (t: number) => RING * (1 - (1 - Math.min(1, Math.max(0, t) / RING_LIFE)) ** 3);
      const r0 = f(age - dt);
      const r1 = f(age);
      const reach = (RING + 0.04) ** 2;
      for (let k = 0; k < tx.length; k++) {
        const dx = (tx[k] ?? 0) - x;
        const dy = (ty[k] ?? 0) - y;
        const d2 = dx * dx + dy * dy;
        if (d2 > reach) continue;
        const d = Math.sqrt(d2) + 1e-6;
        const front = Math.exp(-(((d - r1) / 0.022) ** 2));
        if (d < r1 + 0.03) {
          const push = (r1 - r0) * Math.max(front, d < r1 ? 0.6 : 0);
          tx[k] = (tx[k] ?? 0) + (dx / d) * push;
          ty[k] = (ty[k] ?? 0) + (dy / d) * push;
        }
        if (front > 0.3) pink[k] = Math.max(pink[k] ?? 0, 1.5 * front * (1 - age / RING_LIFE));
      }
    }

    // Glyphs (two substeps), then the air around them, then the threads.
    stepBodies(world, dt / 2);
    stepBodies(world, dt / 2);
    solids();
    fluid.step(dt, wind, on ? 2.5 : 1.5, 18);

    // A thrown glyph lights the threads it passes.
    for (const b of bodies) {
      const speed = Math.hypot(b.vx, b.vy);
      if (speed < 0.9) continue;
      const r = (b.r * 1.15) ** 2;
      const glow = Math.min(1.4, (speed - 0.9) * 1.2 + 0.6);
      for (let k = 0; k < tx.length; k++) {
        if (((tx[k] ?? 0) - b.x) ** 2 + ((ty[k] ?? 0) - b.y) ** 2 < r) pink[k] = Math.max(pink[k] ?? 0, glow);
      }
    }
    const sag = on ? 0 : 0.03 * Math.max(0, 1 - (2 * wind) / WIND);
    if (on && time >= nextPacket) {
      const working = [];
      for (let e = 0; e < E; e++) if (kind[e] === 1) working.push(e);
      const e = working[Math.floor(Math.random() * working.length)];
      if (e !== undefined) packetUntil[e] = time + 0.14 + Math.random() * 0.1;
      nextPacket = time + 0.35 + Math.random() * 0.4;
    }
    const fade = Math.exp(-dt * 0.35);
    for (let e = 0; e < E; e++) {
      const base = e * M;
      const n = len[e] ?? 0;
      const hd = head[e] ?? 0;
      for (let q = 0; q < n; q++) {
        const k = base + ((hd - q + M) % M);
        advect(k, dt, sag);
        pink[k] = (pink[k] ?? 0) * fade;
      }
      // The oldest leave at the right.
      let count = n;
      while (count > 0) {
        const k = base + ((hd - count + 1 + M) % M);
        if ((tx[k] ?? 0) < aspect + 0.02) break;
        count--;
      }
      // A new one at the inlet once the last has moved on.
      const newest = base + hd;
      const ex = -0.002;
      const eyv = ey[e] ?? 0.5;
      if (
        count === 0 ||
        (tx[newest] ?? 0) - ex >= SPACING * 0.9 ||
        Math.abs((ty[newest] ?? 0) - eyv) >= SPACING
      ) {
        const nh = (hd + 1) % M;
        const k = base + nh;
        tx[k] = ex;
        ty[k] = eyv + (Math.random() - 0.5) * 0.0016;
        born[k] = time;
        pink[k] = time < (packetUntil[e] ?? 0) ? 3 : 0;
        head[e] = nh;
        count = Math.min(M, count + 1);
      }
      len[e] = count;
    }
  };

  /** Writes the threads into the vertex buffer, newest first per thread, broken where they tore apart. */
  const vertices = () => {
    nruns = 0;
    for (let e = 0; e < E; e++) {
      const base = e * M;
      const n = len[e] ?? 0;
      const hd = head[e] ?? 0;
      const kd = kind[e] ?? 0;
      const ph = phase[e] ?? 0;
      const lit = kd !== 0;
      let start = base;
      let px = 0;
      let py = 0;
      for (let q = 0; q < n; q++) {
        const k = base + ((hd - q + M) % M);
        const x = tx[k] ?? 0;
        const y = ty[k] ?? 0;
        if (q > 0 && (x - px) ** 2 + (y - py) ** 2 > 0.0009) {
          runs[nruns++] = start;
          runs[nruns++] = base + q - start;
          start = base + q;
        }
        px = x;
        py = y;
        const b = born[k] ?? 0;
        const flow = 0.3 + 0.7 * noise1(b * 1.3 + ph);
        const idle = 0.17 * (0.05 + 0.95 * flow * flow);
        let inten = lit ? idle + (0.92 * (0.15 + 0.85 * flow * flow) - idle) * light : idle;
        if (lit) {
          const c = (b * 0.5 + ph) % 1;
          inten += c ** 26 * 1.2 * light;
        }
        inten *= smooth(-0.002, 0.06, x) * (1 - 0.6 * smooth(aspect - 0.25, aspect + 0.02, x));
        // In the dark, lit threads look like the others.
        let ch = lit && light > 0.45 ? kd : 0;
        const pk = pink[k] ?? 0;
        if (pk > 0.2) {
          ch = 3;
          inten = Math.max(inten, 0.25 + Math.min(1, pk) * 0.75);
        }
        const o = (base + q) * 4;
        verts[o] = x;
        verts[o + 1] = y;
        verts[o + 2] = Math.min(1, inten);
        verts[o + 3] = ch;
      }
      if (n > 0) {
        runs[nruns++] = start;
        runs[nruns++] = base + n - start;
      }
    }
  };

  // GL.
  let prog: WebGLProgram | null = null;
  let lineProg: WebGLProgram | null = null;
  let vao: WebGLVertexArrayObject | null = null;
  let lineVao: WebGLVertexArrayObject | null = null;
  let vbo: WebGLBuffer | null = null;
  let vboSize = 0;
  let fbo: WebGLFramebuffer | null = null;
  let lines: WebGLTexture | null = null;
  let fboW = 0;
  let fboH = 0;
  let atlas: WebGLTexture | null = null;
  let atlasFor: GlyphSet | null = null;
  const u: Record<string, WebGLUniformLocation | null> = {};
  const names = [
    "uRes",
    "uTime",
    "uDark",
    "uLines",
    "uAtlas",
    "uCount",
    "uTiles",
    "uBody",
    "uTile",
    "uMat",
    "uShow",
    "uLight",
    "uCol",
    "uInk",
    "uFlash",
    "uSpark",
    "uBodyNear",
    "uBodyDeep",
    "uAir",
  ];
  let uAspect: WebGLUniformLocation | null = null;
  const bodyU = new Float32Array(MAX_GLYPHS * 4);
  const tileU = new Float32Array(MAX_GLYPHS * 4);
  const matU = new Float32Array(MAX_GLYPHS * 4);

  const scene: Scene = {
    init(gl) {
      prog = compile(gl, FULLSCREEN_VS, FS);
      lineProg = compile(gl, LINE_VS, LINE_FS);
      vao = gl.createVertexArray();
      for (const n of names) u[n] = gl.getUniformLocation(prog, n);
      uAspect = gl.getUniformLocation(lineProg, "uAspect");
      lineVao = gl.createVertexArray();
      vbo = gl.createBuffer();
      gl.bindVertexArray(lineVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
      gl.bindVertexArray(null);
      vboSize = 0;
      fbo = gl.createFramebuffer();
      lines = gl.createTexture();
      fboW = 0;
      fboH = 0;
      atlas = gl.createTexture();
      atlasFor = null;
    },
    frame({ gl, width, height, time: clock, dt }) {
      if (!prog || !lineProg) return;
      const a = width / Math.max(1, height);
      if (Math.abs(a - aspect) > 0.002) {
        aspect = a;
        ready = false;
        laidOut = false;
      }
      if (!fontReady) return;
      if (!set) rebuildGlyphs();
      if (!laidOut) layout();
      if (!set || !laidOut) return;
      if (!ready) {
        build();
        if (reduced) settle = Math.max(settle, 1.5);
      }

      // Advance the world: in step with time, or in one go before a still frame.
      if (reduced) {
        for (let n = 0; settle > 0 && n < 400; n++) {
          step(1 / 60);
          settle -= 1 / 60;
        }
        settle = 0;
      } else {
        // Where the simulation is slow (an old phone), it runs every other
        // frame, twice as far each time.
        frames++;
        owed += dt;
        if (!slow || frames % 2 === 0) {
          const t0 = performance.now();
          step(Math.min(owed, slow ? 1 / 15 : 1 / 30));
          owed = 0;
          cost = cost * 0.95 + (performance.now() - t0) * 0.05;
          if (!slow && frames > 90 && cost > 12) slow = true;
        }
        show = Math.min(1, show + dt / 0.9);
      }
      vertices();

      // Threads into the offscreen buffer.
      if (width !== fboW || height !== fboH) {
        gl.bindTexture(gl.TEXTURE_2D, lines);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, lines, 0);
        fboW = width;
        fboH = height;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(lineProg);
      gl.uniform1f(uAspect, aspect);
      gl.bindVertexArray(lineVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      if (vboSize !== verts.byteLength) {
        gl.bufferData(gl.ARRAY_BUFFER, verts.byteLength, gl.DYNAMIC_DRAW);
        vboSize = verts.byteLength;
      }
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, verts);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      for (let r = 0; r < nruns; r += 2) {
        const n = runs[r + 1] ?? 0;
        if (n > 1) gl.drawArrays(gl.LINE_STRIP, runs[r] ?? 0, n);
      }
      gl.disable(gl.BLEND);
      gl.bindVertexArray(null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      // The glyphs' distance fields.
      if (atlasFor !== set) {
        gl.bindTexture(gl.TEXTURE_2D, atlas);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        const w = set.size * set.glyphs.length;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, w, set.size, 0, gl.RED, gl.UNSIGNED_BYTE, set.atlas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        atlasFor = set;
      }

      // Everything, dithered.
      const count = Math.min(MAX_GLYPHS, bodies.length);
      for (let i = 0; i < count; i++) {
        const b = bodies[i];
        const g = set.glyphs[i];
        if (!b || !g) continue;
        bodyU.set([b.x, b.y, Math.cos(b.a), Math.sin(b.a)], i * 4);
        tileU.set([g.cx / set.size, g.cy / set.size, 1 / (scale * set.size), i], i * 4);
        matU.set([g.thick * scale, set.range * scale, b.flash, 0], i * 4);
      }
      const dark = isDark();
      gl.viewport(0, 0, width, height);
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, lines);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, atlas);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(u.uLines ?? null, 0);
      gl.uniform1i(u.uAtlas ?? null, 1);
      gl.uniform2f(u.uRes ?? null, width, height);
      gl.uniform1f(u.uTime ?? null, clock);
      gl.uniform1f(u.uDark ?? null, dark ? 1 : 0);
      gl.uniform1i(u.uCount ?? null, count);
      gl.uniform1f(u.uTiles ?? null, set.glyphs.length);
      gl.uniform4fv(u.uBody ?? null, bodyU);
      gl.uniform4fv(u.uTile ?? null, tileU);
      gl.uniform4fv(u.uMat ?? null, matU);
      gl.uniform1f(u.uShow ?? null, show * show * (3 - 2 * show));
      gl.uniform1f(u.uLight ?? null, light);
      const ink = dark ? cssColor("--c-ink", [0.98, 0.98, 0.98]) : cssColor("--c-ink", [0.09, 0.09, 0.09]);
      const pal = [
        dark ? cssColor("--c-ink-3", [0.55, 0.55, 0.55]) : cssColor("--c-ink-4", [0.64, 0.64, 0.64]),
        dark ? cssColor("--c-accent", [1, 1, 0.36]) : ink,
        cssColor("--c-blue", [0, 0.49, 1]),
        cssColor("--c-pink", [1, 0, 0.85]),
      ];
      gl.uniform3fv(u.uCol ?? null, new Float32Array(pal.flat()));
      gl.uniform3fv(u.uInk ?? null, ink);
      gl.uniform3fv(
        u.uFlash ?? null,
        dark ? cssColor("--c-accent", [1, 1, 0.36]) : cssColor("--c-pink", [1, 0, 0.85]),
      );
      gl.uniform3fv(u.uSpark ?? null, [1, 1, 1]);
      gl.uniform3fv(u.uBodyNear ?? null, cssColor("--c-pink", [1, 0, 0.85]));
      gl.uniform3fv(u.uBodyDeep ?? null, cssColor("--c-blue", [0, 0.49, 1]));
      gl.uniform3fv(u.uAir ?? null, cssColor("--c-blue", [0, 0.49, 1]));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
      shown();
    },
    dispose(gl) {
      if (prog) gl.deleteProgram(prog);
      if (lineProg) gl.deleteProgram(lineProg);
      if (vao) gl.deleteVertexArray(vao);
      if (lineVao) gl.deleteVertexArray(lineVao);
      if (vbo) gl.deleteBuffer(vbo);
      if (fbo) gl.deleteFramebuffer(fbo);
      if (lines) gl.deleteTexture(lines);
      if (atlas) gl.deleteTexture(atlas);
    },
  };

  const toWorldX = (x: number) => x * (aspect || 1);

  return {
    scene,
    ready: drawn,
    place(b) {
      box = { ...b };
      laidOut = false;
      if (reduced) settle = Math.max(settle, 1.5);
      scene.invalidate?.();
    },
    pointerDown(x, y, id = 0, slop = 0.012) {
      const wx = toWorldX(x);
      touched = time;
      pointers.set(id, { x: wx, y, dx: 0, dy: 0 });
      if (reduced) return false;
      for (let i = bodies.length - 1; i >= 0; i--) {
        const b = bodies[i];
        if (!b || distance(i, wx, y) > slop) continue;
        const [lx, ly] = toLocal(b, wx, y);
        b.grab = { id, lx, ly, tx: wx, ty: y };
        b.free = 0;
        return true;
      }
      return false;
    },
    pointerMove(x, y, id = 0) {
      const wx = toWorldX(x);
      touched = time;
      const p = pointers.get(id);
      if (p) {
        p.dx += wx - p.x;
        p.dy += y - p.y;
        p.x = wx;
        p.y = y;
      } else pointers.set(id, { x: wx, y, dx: 0, dy: 0 });
      for (const b of bodies) {
        if (b.grab?.id === id) {
          b.grab.tx = wx;
          b.grab.ty = y;
        }
      }
    },
    pointerUp(id = 0) {
      pointers.delete(id);
      for (const b of bodies) {
        if (b.grab?.id === id) {
          b.grab = null;
          b.free = 0.9;
          if (!on) b.falling = true;
        }
      }
    },
    hit(x, y, slop = 0.012) {
      const wx = toWorldX(x);
      return bodies.some((_, i) => distance(i, wx, y) <= slop);
    },
    burst(x, y) {
      if (reduced) return;
      bursts.push({ x: toWorldX(x), y, at: time, fresh: true });
    },
    power(next) {
      if (next === on) return;
      on = next;
      since = 0;
      if (on) {
        for (const b of bodies) {
          b.falling = false;
          b.free = 0;
          b.vy -= 0.6;
          b.w += (Math.random() - 0.5) * 2;
        }
      } else dropped = 0;
      if (reduced) settle = Math.max(settle, 4);
      scene.invalidate?.();
    },
  };
}

/**
 * Lets people play with a stream drawn on `canvas`, through pointer events
 * on `target` (the canvas or an element over it): moving stirs the air,
 * dragging a glyph throws it, a tap sends a burst. Links, buttons and fields
 * (and anything marked `data-stream-ignore`) keep their own clicks. Returns
 * a disposer.
 */
export function play(target: HTMLElement, canvas: HTMLCanvasElement, s: StreamHandle): () => void {
  const at = (e: { clientX: number; clientY: number }): [number, number] => {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / Math.max(1, r.width), (e.clientY - r.top) / Math.max(1, r.height)];
  };
  const own = (t: EventTarget | null) =>
    t instanceof Element &&
    !!t.closest("a, button, input, textarea, select, summary, label, [data-stream-ignore]");
  const downs = new Map<number, { x: number; y: number; t: number; grabbed: boolean }>();
  const down = (e: PointerEvent) => {
    if (e.button > 0 || own(e.target)) return;
    const [x, y] = at(e);
    const grabbed = s.pointerDown(x, y, e.pointerId, e.pointerType === "touch" ? 0.03 : 0.012);
    downs.set(e.pointerId, { x, y, t: performance.now(), grabbed });
    if (grabbed) {
      target.setPointerCapture?.(e.pointerId);
      target.style.cursor = "grabbing";
      e.preventDefault();
    }
  };
  const move = (e: PointerEvent) => {
    const [x, y] = at(e);
    s.pointerMove(x, y, e.pointerId);
    if (e.pointerType === "mouse" && !downs.get(e.pointerId)?.grabbed) {
      target.style.cursor = !own(e.target) && s.hit(x, y) ? "grab" : "";
    }
  };
  const up = (e: PointerEvent) => {
    const d = downs.get(e.pointerId);
    downs.delete(e.pointerId);
    s.pointerUp(e.pointerId);
    if (d?.grabbed) target.style.cursor = "";
    else if (d && e.type === "pointerup" && !own(e.target)) {
      const [x, y] = at(e);
      if (Math.hypot(x - d.x, y - d.y) < 0.015 && performance.now() - d.t < 400) s.burst(x, y);
    }
  };
  const leave = (e: PointerEvent) => {
    if (!downs.has(e.pointerId)) s.pointerUp(e.pointerId);
  };
  // A finger on a glyph holds it instead of scrolling the page.
  const touch = (e: TouchEvent) => {
    const t = e.touches[0];
    if (!t || own(e.target)) return;
    const [x, y] = at(t);
    if (s.hit(x, y, 0.03)) e.preventDefault();
  };
  target.addEventListener("pointerdown", down);
  target.addEventListener("pointermove", move);
  target.addEventListener("pointerup", up);
  target.addEventListener("pointercancel", up);
  target.addEventListener("pointerleave", leave);
  target.addEventListener("touchstart", touch, { passive: false });
  return () => {
    target.removeEventListener("pointerdown", down);
    target.removeEventListener("pointermove", move);
    target.removeEventListener("pointerup", up);
    target.removeEventListener("pointercancel", up);
    target.removeEventListener("pointerleave", leave);
    target.removeEventListener("touchstart", touch);
  };
}
