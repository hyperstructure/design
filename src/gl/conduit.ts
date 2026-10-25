// The conduit: the foundry squeezed into a bar, for a row that people hover
// (fctl's Agent Floor, in its sidebar). A planet's limb rises at the bar's
// right end and threads of light stream along the bar into it: lit threads
// burn in their session's color with sparks running down them, packets race
// along them and flash where they land, and the threads part around the
// pointer and brighten under it, in a glint of stardust. Now and then a
// shooting star crosses.
//
// Shown, it powers on: the light floods in from the left behind a line of
// packets, which lands on the limb in a cascade of flashes. Hidden, it
// dissolves in the dither's order, the faintest pixels first.
//
// Like the foundry it renders at a low resolution, quantized to the brand
// palette with an 8×8 ordered (Bayer) dither and upscaled without smoothing:
// every pixel is one exact brand color or nothing. One fullscreen pass,
// LANES lane evaluations per low-res pixel.

import {
  compile,
  cssColor,
  FULLSCREEN_VS,
  GLSL_NOISE,
  isDark,
  prefersReducedMotion,
  type Scene,
} from "./core";
import type { FoundryLane } from "./foundry";

/** Threads in the bar. */
export const LANES = 8;

/** How long the light takes to dissolve once hidden, in milliseconds. */
export const DISSOLVE_MS = 220;

/** How fast packets travel, and the light when it powers on, in heights per second. */
const SPEED = 11;

const FS = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uRes;
uniform float uTime;
uniform float uDark;
uniform vec4 uLane[${LANES}];   // x: lit (0..1), y: color index, z: energy, w: phase
uniform vec2 uPulse[${LANES}];  // x: start time, y: weight (0 = none)
uniform vec2 uEnd[${LANES}];    // where each thread meets the limb (heights)
uniform vec3 uPlanet;           // x, y: center, z: radius (heights)
uniform vec3 uMouse;            // xy: pointer (heights, y up), z: strength
uniform float uDensity;         // how many idle threads show (0..1)
uniform float uFront;           // how far the light has flooded in (heights)
uniform float uFade;            // how much of it shows: 1, less as it dissolves
uniform vec3 uCol[5];           // thread colors: neutral, working, waiting, paused, failed
uniform vec3 uInk;              // stars, the limb, sparks (white on dark, ink on light)
uniform vec3 uHot;              // packets (hot pink)
uniform vec3 uFlash;            // landing flashes (yellow)
uniform vec3 uBodyNear;         // planet body near the limb
uniform vec3 uBodyDeep;         // planet body further in
uniform vec3 uAir;              // the glow around the planet
${GLSL_NOISE}

float bayer8(vec2 p) {
  ivec2 q = ivec2(mod(p, 8.0));
  int a = q.x ^ q.y;
  int y = q.y;
  int v = ((a & 1) << 5) | ((y & 1) << 4) | ((a & 2) << 2) | ((y & 2) << 1) | ((a & 4) >> 1) | ((y & 4) >> 2);
  return (float(v) + 0.5) / 64.0;
}

// A thread's height at x: from its place at the left end to where it meets the limb, swaying,
// and parted by the pointer (near: how close the pointer is, 0..1).
float threadY(int i, float x, vec2 E, float lit, out float near) {
  float lane = float(i);
  float s = clamp(x / max(E.x, 0.001), 0.0, 1.0);
  float e = s * s * (3.0 - 2.0 * s);
  float y = mix(mix(0.16, 0.84, lane / ${LANES - 1}.0), E.y, pow(e, 1.5));
  float amp = (0.06 + 0.04 * lit) * (1.0 - e);
  y += sin(s * 6.2831 * (1.4 + fract(lane * 0.618) * 1.1) + uTime * 0.8 + lane * 1.7) * amp;
  y += sin(s * 6.2831 * (3.2 + fract(lane * 0.381) * 1.5) - uTime * 0.55 + lane) * amp * 0.4;
  vec2 dm = vec2((x - uMouse.x) * 0.55, y - uMouse.y);
  near = exp(-dot(dm, dm) / 0.1) * uMouse.z;
  return y + sign(dm.y) * near * 0.2 * smoothstep(1.0, 0.8, s);
}

void main() {
  vec2 px = floor(gl_FragCoord.xy);
  float pixel = 1.0 / uRes.y;
  vec2 p = gl_FragCoord.xy / uRes.y;
  float th = bayer8(px);

  // Dissolving, the pixels go in the dither's order.
  if (th >= uFade) {
    outColor = vec4(0.0);
    return;
  }
  // Powering on, the light shows behind the packets that lead it in, thinning out towards them.
  bool behind = bayer8(px + vec2(3.0, 5.0)) < (uFront - p.x) / 0.9;

  vec2 C = uPlanet.xy;
  float R = uPlanet.z;
  vec2 rel = p - C;
  float sd = length(rel) - R;

  // Threads.
  float best = 0.0;
  vec3 bestCol = vec3(0.0);
  bool hot = false;
  float flash = 0.0;
  for (int i = 0; i < ${LANES}; i++) {
    float lane = float(i);
    vec4 L = uLane[i];
    float lit = L.x;
    // Sparse when quiet: only some idle threads show.
    float shown = max(lit, step(fract(lane * 0.618 + 0.11), uDensity));
    if (shown <= 0.0) continue;
    vec2 E = uEnd[i];
    if (p.x > E.x + 2.0 * pixel) continue;
    float s = clamp(p.x / max(E.x, 0.001), 0.0, 1.0);
    float near;
    // Where the thread crosses this column of pixels: a crisp line one pixel thick even where
    // it is steep, and the pixels beside it, which packets light up too.
    float yl = threadY(i, p.x - 0.5 * pixel, E, lit, near);
    float yr = threadY(i, p.x + 0.5 * pixel, E, lit, near);
    float d = max(0.0, max(min(yl, yr) - p.y, p.y - max(yl, yr)));
    if (d > 2.5 * pixel) continue;
    float core = step(d, 0.5 * pixel);
    float side = step(d, 1.5 * pixel) - core;
    float speed = 0.05 + 0.1 * lit + 0.18 * L.z;
    float flow = 0.3 + 0.7 * vnoise(vec2(p.x * 3.5 - uTime * speed * 40.0, lane * 7.31));
    float c = fract(p.x * 0.4 - uTime * speed * 6.0 + L.w);
    float spark = pow(c, 18.0) * smoothstep(1.0, 0.94, c) * lit;
    float boost = 0.0;
    vec2 P = uPulse[i];
    if (P.y > 0.0) {
      float head = (uTime - P.x) * ${SPEED}.0;
      float dd = p.x - head;
      boost = P.y * (dd < 0.0 ? exp(dd * 5.0) : exp(-dd * 40.0)) * step(head, E.x + 0.05);
      // Where the packet lands, the limb flashes.
      float since = (uTime - P.x) - E.x / ${SPEED}.0;
      if (since > 0.0 && since < 0.6) {
        float r = length(p - E);
        float ring = step(abs(r - since * 1.3), 0.6 * pixel) * (1.0 - since / 0.6);
        flash = max(flash, ring * P.y);
      }
    }
    // Faint at the left, behind the row's label, and brighter towards the planet; packets
    // light up all of it.
    float fadeIn = mix(0.06, 1.0, smoothstep(0.28, 0.72, s));
    float base = mix(0.2, 1.1, lit) * flow * (1.0 + near * 1.5);
    float inten = core * ((base + spark * 1.2) * fadeIn + boost * 1.6) + side * smoothstep(0.75, 1.0, boost);
    if (inten > best) {
      best = inten;
      vec3 col = mix(uCol[0], uCol[int(L.y + 0.5)], lit);
      hot = boost > 0.35;
      if (hot) col = uHot;
      else if (spark * core > 0.55 && uDark > 0.5) col = uInk;
      bestCol = col;
    }
  }

  // The planet: a dithered body that darkens inward, a hairline limb, a glow.
  float body = 0.0;
  vec3 bodyCol = uBodyNear;
  if (sd < 0.0) {
    float depth = -sd / R;
    float band = vnoise(vec2(atan(rel.y, rel.x) * 38.0, depth * 60.0 - uTime * 0.25));
    body = exp(-depth * 8.0) * (0.65 + 0.35 * band);
    // Pink near the limb, blue further in, dithered between them rather than mixed.
    if (smoothstep(0.03, 0.16, depth) > bayer8(px + vec2(5.0, 1.0))) bodyCol = uBodyDeep;
  }
  float limb = step(abs(sd), 0.6 * pixel);
  float air = sd > 0.0 ? exp(-sd * 6.0) * 0.3 : 0.0;

  // Now and then a shooting star, from above the bar, left of the planet.
  float meteor = 0.0;
  float period = 3.7;
  float m = floor(uTime / period);
  float mt = uTime - m * period;
  if (mt < 0.5) {
    vec2 dir = normalize(vec2(1.0, -0.32));
    vec2 head = vec2(hash12(vec2(m, 3.1)) * (C.x - R) * 0.8, 1.15) + dir * mt * 9.0;
    vec2 q = p - head;
    float along = -dot(q, dir);
    float across = abs(dot(q, vec2(-dir.y, dir.x)));
    if (along > 0.0 && along < 1.4 && across < 0.55 * pixel) meteor = (1.0 - along / 1.4) * (1.0 - mt / 0.5);
  }

  // Stardust glinting around the pointer.
  vec2 dp = (p - uMouse.xy) * vec2(0.7, 1.0);
  float stir = exp(-dot(dp, dp) / 0.08) * uMouse.z;
  float glint = hash12(px * 1.31 + floor(uTime * 14.0) * 7.7);

  // Stars, with dust gathering near the limb, each twinkling at a pace of its own (as the
  // foundry's).
  float h = hash12(px * 0.913 + 17.0);
  float dust = sd > 0.0 ? 0.05 * exp(-sd * 3.0) : 0.0;
  float pace = hash12(px * 1.731 + 5.0);
  float twinkle = 0.55 + 0.45 * sin(uTime * (0.8 + pace * 3.0) + pace * 40.0);
  float star = h > 1.0 - (0.006 + dust) ? twinkle : 0.0;

  // Film grain on the empty dark.
  float g = hash12(px + floor(uTime * 10.0) * 13.17);

  vec3 col = vec3(0.0);
  float a = 0.0;
  if (flash > th) {
    col = uFlash; a = 1.0;
  } else if (best > th && (behind || hot)) {
    col = bestCol; a = 1.0;
  } else if (!behind) {
    // Not yet flooded in.
  } else if (meteor > th) {
    col = uInk; a = 1.0;
  } else if (glint > 1.0 - stir * 0.12) {
    col = glint > 1.0 - stir * 0.04 ? uInk : uCol[1]; a = 1.0;
  } else if (limb > th) {
    col = uInk; a = 1.0;
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

export interface ConduitOptions {
  /**
   * The planet: its center from the bar's right end (negative: inside the bar) and from its
   * bottom edge, and its radius, all in heights of the bar.
   */
  planet?: [number, number, number];
  /** Fraction of idle threads drawn (0..1). */
  density?: number;
}

export interface ConduitHandle {
  scene: Scene;
  /**
   * Powers it on (the light floods in from the left) or off (it dissolves, in `DISSOLVE_MS`).
   * Shown again before it has dissolved, it comes back without flooding in again.
   */
  show(on: boolean): void;
  /** The threads that are lit, by lane (0..LANES-1), as the foundry takes them. */
  setLanes(lanes: Map<number, FoundryLane>): void;
  /** A packet down a thread, for activity of the given weight. */
  pulse(lane: number, weight: number): void;
  /** Packets down every thread that shows, at once. */
  burst(): void;
  /** Pointer in 0..1 (y down, like the DOM). */
  pointer(x: number, y: number): void;
  pointerLeave(): void;
}

export function conduit(opts: ConduitOptions = {}): ConduitHandle {
  let prog: WebGLProgram | null = null;
  let vao: WebGLVertexArrayObject | null = null;
  const u: Record<string, WebGLUniformLocation | null> = {};
  const lanes = new Float32Array(LANES * 4);
  const target = new Float32Array(LANES * 4);
  const pulses = new Float32Array(LANES * 2);
  const ends = new Float32Array(LANES * 2);
  // The pointer in fractions of the bar (y down), and how strongly it acts.
  const mouse = new Float32Array([0, 0.5, 0]);
  const mouseTarget = new Float32Array([0, 0.5, 0]);
  const planet = opts.planet ?? [-0.3, -1.25, 2];
  const density = opts.density ?? 0.5;
  let now = 0;
  let first = true;
  // What show() asked for, how much shows (the dissolve), and when the light began to flood in
  // (null once it has, or while hidden).
  let on = false;
  let fade = 0;
  let flood: number | null = null;
  let floodNext = false;
  let burstNext = false;
  for (let i = 0; i < LANES; i++) {
    lanes[i * 4 + 3] = Math.random();
    target[i * 4 + 3] = lanes[i * 4 + 3] ?? 0;
  }
  const names = [
    "uRes",
    "uTime",
    "uDark",
    "uLane",
    "uPulse",
    "uEnd",
    "uPlanet",
    "uMouse",
    "uDensity",
    "uFront",
    "uFade",
    "uCol",
    "uInk",
    "uHot",
    "uFlash",
    "uBodyNear",
    "uBodyDeep",
    "uAir",
  ];

  /** Whether a lane's thread shows: lit, or one of the idle threads drawn (as in the shader). */
  const shows = (i: number) => (lanes[i * 4] ?? 0) > 0.05 || (i * 0.618 + 0.11) % 1 <= density;
  /** Packets down every thread that shows, a volley that leaves from `time` on. */
  const fire = (time: number) => {
    for (let i = 0; i < LANES; i++) {
      if (!shows(i)) continue;
      pulses[i * 2] = time + ((i * 0.618 + 0.3) % 1) * 0.09;
      pulses[i * 2 + 1] = 1;
    }
  };

  const scene: Scene = {
    init(gl) {
      prog = compile(gl, FULLSCREEN_VS, FS);
      vao = gl.createVertexArray();
      for (const n of names) u[n] = gl.getUniformLocation(prog, n);
    },
    frame({ gl, width, height, time, dt }) {
      if (!prog) return;
      now = time;
      const still = prefersReducedMotion();
      if (floodNext) {
        floodNext = false;
        if (!still) {
          flood = time;
          fire(time);
        }
      }
      if (burstNext) {
        burstNext = false;
        if (!still) fire(time);
      }
      if (still) fade = on ? 1 : 0;
      else if (on) fade = Math.min(1, fade + dt * 8);
      else fade = Math.max(0, fade - dt / (DISSOLVE_MS / 1000));
      const aspect = width / Math.max(1, height);
      // The front is where the packets that lead the light in are.
      const front = flood === null ? 1e4 : (time - flood) * SPEED;
      if (front > aspect + 1 || fade <= 0) flood = null;

      const k = 1 - Math.exp(-dt * 3);
      for (let i = 0; i < LANES; i++) {
        const o = i * 4;
        lanes[o] = (lanes[o] ?? 0) + ((target[o] ?? 0) - (lanes[o] ?? 0)) * k;
        // The color changes only while the thread is dark or lit, never mid-fade.
        if ((lanes[o] ?? 0) < 0.05 || (target[o] ?? 0) > 0) lanes[o + 1] = target[o + 1] ?? 0;
        lanes[o + 2] = (lanes[o + 2] ?? 0) + ((target[o + 2] ?? 0) - (lanes[o + 2] ?? 0)) * k;
      }
      const km = 1 - Math.exp(-dt * 8);
      for (let i = 0; i < 3; i++) mouse[i] = (mouse[i] ?? 0) + ((mouseTarget[i] ?? 0) - (mouse[i] ?? 0)) * km;

      const dark = isDark();
      gl.disable(gl.BLEND);
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.uniform2f(u.uRes ?? null, width, height);
      gl.uniform1f(u.uTime ?? null, time);
      gl.uniform1f(u.uDark ?? null, dark ? 1 : 0);
      gl.uniform4fv(u.uLane ?? null, lanes);
      gl.uniform2fv(u.uPulse ?? null, pulses);
      const cx = aspect + planet[0];
      const cy = planet[1];
      const r = planet[2];
      gl.uniform3f(u.uPlanet ?? null, cx, cy, r);
      // Threads land along the limb's arc in the bar: from where it rises out of the bottom edge
      // to where it leaves through the top or the right end.
      const clamp = (v: number) => Math.min(0.99, Math.max(-0.99, v));
      const bottom = Math.PI - Math.asin(clamp(-cy / r));
      const top = 1 - cy < r ? Math.PI - Math.asin(clamp((1 - cy) / r)) : 0;
      const exit = Math.max(top, Math.acos(clamp((aspect - cx) / r)));
      const from = bottom - 0.1;
      const to = exit + 0.12;
      for (let i = 0; i < LANES; i++) {
        const a = from + (to - from) * (i / (LANES - 1));
        ends[i * 2] = cx + r * Math.cos(a);
        ends[i * 2 + 1] = cy + r * Math.sin(a);
      }
      gl.uniform2fv(u.uEnd ?? null, ends);
      gl.uniform3f(u.uMouse ?? null, (mouse[0] ?? 0) * aspect, 1 - (mouse[1] ?? 0), mouse[2] ?? 0);
      gl.uniform1f(u.uDensity ?? null, density);
      gl.uniform1f(u.uFront ?? null, front);
      gl.uniform1f(u.uFade ?? null, fade);
      const ink = dark ? cssColor("--c-ink", [0.98, 0.98, 0.98]) : cssColor("--c-ink", [0.09, 0.09, 0.09]);
      const pal = [
        dark ? cssColor("--c-ink-3", [0.55, 0.55, 0.55]) : cssColor("--c-ink-4", [0.64, 0.64, 0.64]),
        dark ? cssColor("--c-accent", [1, 1, 0.36]) : ink,
        cssColor("--c-blue", [0, 0.49, 1]),
        cssColor("--c-pink", [1, 0, 0.85]),
        cssColor("--c-danger", [1, 0, 0.85]),
      ];
      gl.uniform3fv(u.uCol ?? null, new Float32Array(pal.flat()));
      gl.uniform3fv(u.uInk ?? null, ink);
      gl.uniform3fv(u.uHot ?? null, cssColor("--c-pink", [1, 0, 0.85]));
      gl.uniform3fv(u.uFlash ?? null, dark ? cssColor("--c-accent", [1, 1, 0.36]) : ink);
      gl.uniform3fv(u.uBodyNear ?? null, cssColor("--c-pink", [1, 0, 0.85]));
      gl.uniform3fv(u.uBodyDeep ?? null, cssColor("--c-blue", [0, 0.49, 1]));
      gl.uniform3fv(u.uAir ?? null, cssColor("--c-blue", [0, 0.49, 1]));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
    },
    dispose(gl) {
      if (prog) gl.deleteProgram(prog);
      if (vao) gl.deleteVertexArray(vao);
    },
  };

  return {
    scene,
    show(next) {
      if (next === on) return;
      on = next;
      if (on && fade <= 0) {
        // From dark: the light floods in.
        fade = 1;
        floodNext = true;
      } else if (!on) floodNext = false;
      scene.invalidate?.();
    },
    setLanes(map) {
      for (let i = 0; i < LANES; i++) {
        const l = map.get(i);
        target[i * 4] = l ? l.lit : 0;
        if (l) target[i * 4 + 1] = l.color;
        target[i * 4 + 2] = l ? l.energy : 0;
      }
      // The first lanes appear at once; later changes ease in.
      if (first) {
        first = false;
        for (let i = 0; i < LANES * 4; i++) if (i % 4 !== 3) lanes[i] = target[i] ?? 0;
      }
      scene.invalidate?.();
    },
    pulse(lane, weight) {
      if (lane < 0 || lane >= LANES) return;
      pulses[lane * 2] = now;
      pulses[lane * 2 + 1] = Math.min(1, 0.35 + Math.log10(1 + weight) / 3);
    },
    burst() {
      burstNext = true;
    },
    pointer(x, y) {
      mouseTarget[0] = x;
      mouseTarget[1] = y;
      mouseTarget[2] = 1;
    },
    pointerLeave() {
      mouseTarget[2] = 0;
    },
  };
}
