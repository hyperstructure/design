// The stream's glyphs as rigid bodies: convex hulls that float home on
// springs, can be grabbed and thrown, bounce off the edges and each other,
// get pushed around by the air, and fall over when gravity is on. World
// units (the view is one unit tall), y down, angles in radians.

export interface Grab {
  id: number;
  /** The grabbed point, in the body's frame. */
  lx: number;
  ly: number;
  /** Where the pointer is. */
  tx: number;
  ty: number;
}

export interface Body {
  x: number;
  y: number;
  a: number;
  vx: number;
  vy: number;
  w: number;
  m: number;
  /** Moment of inertia about the centre of mass. */
  I: number;
  /** Convex hull in the body's frame, counter-clockwise (x, y pairs). */
  hull: Float32Array;
  /** The hull in the world, updated by `hullToWorld`. */
  world: Float32Array;
  /** The furthest hull point from the centre. */
  r: number;
  /** Where the body rests. */
  hx: number;
  hy: number;
  grab: Grab | null;
  /** Seconds before the home spring pulls again after a throw. */
  free: number;
  /** 0..1, set by hard knocks; the scene flashes the outline. */
  flash: number;
  /** Let go: gravity pulls it to the floor instead of the spring home. */
  falling: boolean;
}

export interface BodyWorld {
  bodies: Body[];
  /** Left, top, right, bottom (y down). */
  bounds: [number, number, number, number];
  /** The ground (y) that falling bodies land on. */
  floor: number;
  /** Downward acceleration of falling bodies. */
  gravity: number;
  /** The air's velocity at a point, for the push it gives. */
  air?: (x: number, y: number) => [number, number];
}

export function makeBody(hull: Float32Array, m: number, I: number, x: number, y: number): Body {
  // Counter-clockwise in these coordinates (positive signed area), so edge normals point out.
  let area = 0;
  const n = hull.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += (hull[i * 2] ?? 0) * (hull[j * 2 + 1] ?? 0) - (hull[j * 2] ?? 0) * (hull[i * 2 + 1] ?? 0);
  }
  let h = hull;
  if (area < 0) {
    h = new Float32Array(hull.length);
    for (let i = 0; i < n; i++) {
      h[i * 2] = hull[(n - 1 - i) * 2] ?? 0;
      h[i * 2 + 1] = hull[(n - 1 - i) * 2 + 1] ?? 0;
    }
  }
  let r = 0;
  for (let i = 0; i < n; i++) r = Math.max(r, Math.hypot(h[i * 2] ?? 0, h[i * 2 + 1] ?? 0));
  return {
    x,
    y,
    a: 0,
    vx: 0,
    vy: 0,
    w: 0,
    m,
    I,
    hull: h,
    world: new Float32Array(h.length),
    r,
    hx: x,
    hy: y,
    grab: null,
    free: 0,
    flash: 0,
    falling: false,
  };
}

export function hullToWorld(b: Body) {
  const c = Math.cos(b.a);
  const s = Math.sin(b.a);
  const { hull, world } = b;
  for (let i = 0; i < hull.length; i += 2) {
    const lx = hull[i] ?? 0;
    const ly = hull[i + 1] ?? 0;
    world[i] = b.x + c * lx - s * ly;
    world[i + 1] = b.y + s * lx + c * ly;
  }
}

/** A point in the body's frame, in the world. */
export function toWorld(b: Body, lx: number, ly: number): [number, number] {
  const c = Math.cos(b.a);
  const s = Math.sin(b.a);
  return [b.x + c * lx - s * ly, b.y + s * lx + c * ly];
}

/** A world point in the body's frame. */
export function toLocal(b: Body, x: number, y: number): [number, number] {
  const c = Math.cos(b.a);
  const s = Math.sin(b.a);
  const dx = x - b.x;
  const dy = y - b.y;
  return [c * dx + s * dy, -s * dx + c * dy];
}

/** Applies impulse (jx, jy) at world point (px, py). */
function impulse(b: Body, px: number, py: number, jx: number, jy: number) {
  b.vx += jx / b.m;
  b.vy += jy / b.m;
  b.w += ((px - b.x) * jy - (py - b.y) * jx) / b.I;
}

/** The velocity of body `a` at (px, py), relative to body `b` there. */
function relative(a: Body, b: Body | null, px: number, py: number): [number, number] {
  let vx = a.vx - a.w * (py - a.y);
  let vy = a.vy + a.w * (px - a.x);
  if (b) {
    vx -= b.vx - b.w * (py - b.y);
    vy -= b.vy + b.w * (px - b.x);
  }
  return [vx, vy];
}

/**
 * Resolves a contact of body `a` (pushed along n) against a static surface or
 * body `b`. `support` is the impulse the surface gives a body resting on it
 * this step (its weight), which lets friction hold a corner still.
 */
function contact(
  a: Body,
  b: Body | null,
  px: number,
  py: number,
  nx: number,
  ny: number,
  depth: number,
  e: number,
  support = 0,
) {
  const rax = px - a.x;
  const ray = py - a.y;
  const rbx = b ? px - b.x : 0;
  const rby = b ? py - b.y : 0;
  let [vx, vy] = relative(a, b, px, py);
  const vn = vx * nx + vy * ny;
  const ran = rax * ny - ray * nx;
  const rbn = rbx * ny - rby * nx;
  const kn = 1 / a.m + (ran * ran) / a.I + (b ? 1 / b.m + (rbn * rbn) / b.I : 0);
  let j = 0;
  if (vn < 0) {
    j = (-(1 + e) * vn) / kn;
    impulse(a, px, py, j * nx, j * ny);
    if (b) impulse(b, px, py, -j * nx, -j * ny);
    const knock = j / a.m;
    if (knock > 0.35) a.flash = Math.max(a.flash, Math.min(1, knock / 1.6));
    if (b && j / b.m > 0.35) b.flash = Math.max(b.flash, Math.min(1, j / b.m / 1.6));
    [vx, vy] = relative(a, b, px, py);
  }
  // Friction along the surface.
  const limit = 0.6 * (j + support);
  if (limit > 0) {
    const tx = -ny;
    const ty = nx;
    const vt = vx * tx + vy * ty;
    const rat = rax * ty - ray * tx;
    const rbt = rbx * ty - rby * tx;
    const kt = 1 / a.m + (rat * rat) / a.I + (b ? 1 / b.m + (rbt * rbt) / b.I : 0);
    const jt = Math.max(-limit, Math.min(limit, -vt / kt));
    impulse(a, px, py, jt * tx, jt * ty);
    if (b) impulse(b, px, py, -jt * tx, -jt * ty);
  }
  // Push them apart, without adding speed.
  const push = Math.max(0, depth - 0.0005) * 0.7;
  if (!b) {
    a.x += nx * push;
    a.y += ny * push;
  } else {
    const share = b.m / (a.m + b.m);
    a.x += nx * push * share;
    a.y += ny * push * share;
    b.x -= nx * push * (1 - share);
    b.y -= ny * push * (1 - share);
  }
}

/** Whether (px, py) is inside convex `hull` (world): how deep, and the outward normal of the nearest edge. */
function inside(px: number, py: number, hull: Float32Array): [number, number, number] | null {
  const n = hull.length / 2;
  let best = Number.NEGATIVE_INFINITY;
  let bnx = 0;
  let bny = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const x0 = hull[i * 2] ?? 0;
    const y0 = hull[i * 2 + 1] ?? 0;
    const ex = (hull[j * 2] ?? 0) - x0;
    const ey = (hull[j * 2 + 1] ?? 0) - y0;
    const len = Math.hypot(ex, ey) || 1;
    const nx = ey / len;
    const ny = -ex / len;
    const d = (px - x0) * nx + (py - y0) * ny;
    if (d > 0) return null;
    if (d > best) {
      best = d;
      bnx = nx;
      bny = ny;
    }
  }
  return [-best, bnx, bny];
}

function collide(a: Body, b: Body) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const rr = a.r + b.r;
  if (dx * dx + dy * dy > rr * rr) return;
  for (const [p, q] of [
    [a, b],
    [b, a],
  ] as const) {
    const w = p.world;
    for (let i = 0; i < w.length; i += 2) {
      const px = w[i] ?? 0;
      const py = w[i + 1] ?? 0;
      const hit = inside(px, py, q.world);
      if (hit) contact(p, q, px, py, hit[1], hit[2], hit[0], 0.4);
    }
  }
}

/** Advances the bodies by dt. */
export function stepBodies(world: BodyWorld, dt: number) {
  const { bodies, bounds, gravity } = world;
  for (const b of bodies) {
    let fx = 0;
    let fy = b.falling ? gravity * b.m : 0;
    let tq = 0;
    b.free = Math.max(0, b.free - dt);
    const pull = b.falling || b.grab ? 0 : 1 - Math.min(1, b.free / 0.8);
    if (pull > 0) {
      // A soft spring home (about 1.3 Hz), slightly underdamped so it settles with a little overshoot.
      fx += ((b.hx - b.x) * 70 - b.vx * 9) * b.m * pull;
      fy += ((b.hy - b.y) * 70 - b.vy * 9) * b.m * pull;
      let da = -b.a % (Math.PI * 2);
      if (da > Math.PI) da -= Math.PI * 2;
      if (da < -Math.PI) da += Math.PI * 2;
      tq += (da * 45 - b.w * 7) * b.I * pull;
    }
    if (b.grab) {
      const g = b.grab;
      const [gx, gy] = toWorld(b, g.lx, g.ly);
      const rx = gx - b.x;
      const ry = gy - b.y;
      const vgx = b.vx - b.w * ry;
      const vgy = b.vy + b.w * rx;
      const Fx = ((g.tx - gx) * 700 - vgx * 38) * b.m;
      const Fy = ((g.ty - gy) * 700 - vgy * 38) * b.m;
      fx += Fx;
      fy += Fy;
      tq += rx * Fy - ry * Fx - b.w * 2.5 * b.I;
    }
    if (world.air) {
      // The air pushes on the body where it meets it.
      for (let k = 0; k < 6; k++) {
        const t = (k / 6) * Math.PI * 2 + b.a;
        const px = b.x + Math.cos(t) * b.r * 1.05;
        const py = b.y + Math.sin(t) * b.r * 1.05;
        const [au, av] = world.air(px, py);
        const rx = px - b.x;
        const ry = py - b.y;
        const Fx = (au - (b.vx - b.w * ry)) * 0.2 * b.m;
        const Fy = (av - (b.vy + b.w * rx)) * 0.2 * b.m;
        fx += Fx;
        fy += Fy;
        tq += (rx * Fy - ry * Fx) * 0.25;
      }
    }
    b.vx += (fx / b.m) * dt;
    b.vy += (fy / b.m) * dt;
    b.w += (tq / b.I) * dt;
    const drag = Math.exp(-0.5 * dt);
    b.vx *= drag;
    b.vy *= drag;
    b.w *= Math.exp(-0.9 * dt);
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.a += b.w * dt;
    b.flash *= Math.exp(-dt * 5);
  }
  const [left, top, right, bottom] = bounds;
  for (let iter = 0; iter < 3; iter++) {
    for (const b of bodies) hullToWorld(b);
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const c = bodies[j];
        if (a && c) collide(a, c);
      }
    }
    for (const b of bodies) {
      hullToWorld(b);
      const w = b.world;
      const e = b.falling ? 0.25 : 0.55;
      const floor = b.falling ? Math.min(bottom, world.floor) : bottom;
      for (let i = 0; i < w.length; i += 2) {
        const px = w[i] ?? 0;
        const py = w[i + 1] ?? 0;
        if (px < left) contact(b, null, px, py, 1, 0, left - px, e);
        else if (px > right) contact(b, null, px, py, -1, 0, px - right, e);
        if (py < top) contact(b, null, px, py, 0, 1, top - py, e);
        else if (py > floor)
          contact(b, null, px, py, 0, -1, py - floor, e, b.falling ? gravity * b.m * dt : 0);
      }
    }
  }
  for (const b of bodies) hullToWorld(b);
}
