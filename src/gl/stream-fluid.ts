// The stream's air: a small incompressible fluid on a coarse grid (Stam's
// stable fluids), on the CPU. Cell-centred velocities in world units per
// second, y down, the grid one unit tall. Wind blows in at the left edge and
// leaves at the right; the top and bottom are walls. Cells marked solid move
// with the glyph that covers them, so a thrown glyph leaves a wake.

export class Fluid {
  readonly nx: number;
  readonly ny: number;
  /** Cell size in world units (1 / ny). */
  readonly h: number;
  u: Float32Array;
  v: Float32Array;
  /** Pressure, kept between steps (each solve starts from the last). */
  readonly p: Float32Array;
  /** 1 where a glyph covers the cell; its velocity there is (su, sv). */
  readonly solid: Uint8Array;
  readonly su: Float32Array;
  readonly sv: Float32Array;
  private tu: Float32Array;
  private tv: Float32Array;
  private readonly div: Float32Array;
  private readonly curl: Float32Array;

  constructor(nx: number, ny: number, wind = 0) {
    const n = nx * ny;
    this.nx = nx;
    this.ny = ny;
    this.h = 1 / ny;
    this.u = new Float32Array(n).fill(wind);
    this.v = new Float32Array(n);
    this.tu = new Float32Array(n);
    this.tv = new Float32Array(n);
    this.p = new Float32Array(n);
    this.div = new Float32Array(n);
    this.curl = new Float32Array(n);
    this.solid = new Uint8Array(n);
    this.su = new Float32Array(n);
    this.sv = new Float32Array(n);
  }

  /** Bilinear sample of a cell-centred field at world (x, y), clamped to the grid. */
  sample(f: Float32Array, x: number, y: number): number {
    const nx = this.nx;
    let gx = x * this.ny - 0.5;
    let gy = y * this.ny - 0.5;
    if (gx < 0) gx = 0;
    else if (gx > nx - 1.001) gx = nx - 1.001;
    if (gy < 0) gy = 0;
    else if (gy > this.ny - 1.001) gy = this.ny - 1.001;
    const i = gx | 0;
    const j = gy | 0;
    const fx = gx - i;
    const fy = gy - j;
    const c = i + j * nx;
    const a = f[c] ?? 0;
    const b = f[c + 1] ?? 0;
    const d = f[c + nx] ?? 0;
    const e = f[c + nx + 1] ?? 0;
    return (a + (b - a) * fx) * (1 - fy) + (d + (e - d) * fx) * fy;
  }

  /** Adds velocity (dx, dy) around (x, y), falling off over `r`. */
  splat(x: number, y: number, dx: number, dy: number, r: number) {
    const { nx, ny, h, u, v, solid } = this;
    const i0 = Math.max(0, Math.floor((x - 3 * r) / h));
    const i1 = Math.min(nx - 1, Math.ceil((x + 3 * r) / h));
    const j0 = Math.max(0, Math.floor((y - 3 * r) / h));
    const j1 = Math.min(ny - 1, Math.ceil((y + 3 * r) / h));
    const k = 1 / (r * r);
    for (let j = j0; j <= j1; j++) {
      const ey = (j + 0.5) * h - y;
      for (let i = i0; i <= i1; i++) {
        const c = i + j * nx;
        if (solid[c]) continue;
        const ex = (i + 0.5) * h - x;
        const w = Math.exp(-(ex * ex + ey * ey) * k);
        u[c] = (u[c] ?? 0) + dx * w;
        v[c] = (v[c] ?? 0) + dy * w;
      }
    }
  }

  /** Pushes air out from (x, y), like a small explosion. */
  burst(x: number, y: number, strength: number, r: number) {
    const { nx, ny, h, u, v, solid } = this;
    const i0 = Math.max(0, Math.floor((x - 3 * r) / h));
    const i1 = Math.min(nx - 1, Math.ceil((x + 3 * r) / h));
    const j0 = Math.max(0, Math.floor((y - 3 * r) / h));
    const j1 = Math.min(ny - 1, Math.ceil((y + 3 * r) / h));
    const k = 1 / (r * r);
    for (let j = j0; j <= j1; j++) {
      const ey = (j + 0.5) * h - y;
      for (let i = i0; i <= i1; i++) {
        const c = i + j * nx;
        if (solid[c]) continue;
        const ex = (i + 0.5) * h - x;
        const d = Math.hypot(ex, ey) + 1e-4;
        const w = (Math.exp(-d * d * k) * strength) / d;
        u[c] = (u[c] ?? 0) + ex * w;
        v[c] = (v[c] ?? 0) + ey * w;
      }
    }
  }

  /**
   * Advances the air by dt: swirls kept alive (vorticity confinement), carried
   * along (semi-Lagrangian), pulled towards the wind, then made incompressible.
   */
  step(dt: number, wind: number, vorticity: number, iterations: number) {
    if (vorticity > 0) this.confine(dt, vorticity);
    this.advect(dt);
    this.relax(dt, wind);
    this.project(wind, iterations);
  }

  private advect(dt: number) {
    const { nx, ny, h, u, v, tu, tv, solid, su, sv } = this;
    const keep = 1 / (1 + dt * 0.12);
    for (let j = 0; j < ny; j++) {
      const y = (j + 0.5) * h;
      for (let i = 0; i < nx; i++) {
        const c = i + j * nx;
        if (solid[c]) {
          tu[c] = su[c] ?? 0;
          tv[c] = sv[c] ?? 0;
          continue;
        }
        const x = (i + 0.5) * h;
        const u1 = u[c] ?? 0;
        const v1 = v[c] ?? 0;
        // Second order: trace back from the midpoint's velocity.
        const mx = x - 0.5 * dt * u1;
        const my = y - 0.5 * dt * v1;
        const bx = x - dt * this.sample(u, mx, my);
        const by = y - dt * this.sample(v, mx, my);
        tu[c] = this.sample(u, bx, by) * keep;
        tv[c] = this.sample(v, bx, by) * keep;
      }
    }
    this.tu = u;
    this.tv = v;
    this.u = tu;
    this.v = tv;
  }

  /** A sponge at the inlet makes the inflow clean; a weak pull elsewhere lets swirls live a while. */
  private relax(dt: number, wind: number) {
    const { nx, ny, h, u, v } = this;
    for (let i = 0; i < nx; i++) {
      const x = (i + 0.5) * h;
      const k = 0.32 + 4 * Math.max(0, 1 - x / 0.16);
      const a = 1 - Math.exp(-k * dt);
      for (let j = 0; j < ny; j++) {
        const c = i + j * nx;
        u[c] = (u[c] ?? 0) + (wind - (u[c] ?? 0)) * a;
        v[c] = (v[c] ?? 0) * (1 - a);
      }
    }
  }

  private confine(dt: number, eps: number) {
    const { nx, ny, h, u, v, curl, solid } = this;
    const k = 0.5 / h;
    for (let j = 1; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const c = i + j * nx;
        curl[c] = ((v[c + 1] ?? 0) - (v[c - 1] ?? 0) - ((u[c + nx] ?? 0) - (u[c - nx] ?? 0))) * k;
      }
    }
    for (let j = 2; j < ny - 2; j++) {
      for (let i = 2; i < nx - 2; i++) {
        const c = i + j * nx;
        if (solid[c]) continue;
        const gx = Math.abs(curl[c + 1] ?? 0) - Math.abs(curl[c - 1] ?? 0);
        const gy = Math.abs(curl[c + nx] ?? 0) - Math.abs(curl[c - nx] ?? 0);
        const len = Math.hypot(gx, gy) + 1e-5;
        const w = curl[c] ?? 0;
        u[c] = (u[c] ?? 0) + (gy / len) * w * eps * h * dt;
        v[c] = (v[c] ?? 0) - (gx / len) * w * eps * h * dt;
      }
    }
  }

  private project(wind: number, iterations: number) {
    const { nx, ny, h, u, v, p, div, solid, su, sv } = this;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const c = i + j * nx;
        if (solid[c]) {
          div[c] = 0;
          p[c] = 0;
          continue;
        }
        const uL = i > 0 ? (solid[c - 1] ? (su[c - 1] ?? 0) : (u[c - 1] ?? 0)) : wind;
        const uR = i < nx - 1 ? (solid[c + 1] ? (su[c + 1] ?? 0) : (u[c + 1] ?? 0)) : (u[c] ?? 0);
        const vU = j > 0 ? (solid[c - nx] ? (sv[c - nx] ?? 0) : (v[c - nx] ?? 0)) : 0;
        const vD = j < ny - 1 ? (solid[c + nx] ? (sv[c + nx] ?? 0) : (v[c + nx] ?? 0)) : 0;
        div[c] = -0.5 * h * (uR - uL + vD - vU);
      }
    }
    // Gauss-Seidel. Walls, the inlet and solids hold the pressure's slope at
    // zero; beyond the outlet the pressure is zero.
    for (let it = 0; it < iterations; it++) {
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const c = i + j * nx;
          if (solid[c]) continue;
          let sum = div[c] ?? 0;
          let n = 0;
          if (i > 0 && !solid[c - 1]) {
            sum += p[c - 1] ?? 0;
            n++;
          }
          if (i < nx - 1) {
            if (!solid[c + 1]) {
              sum += p[c + 1] ?? 0;
              n++;
            }
          } else n++;
          if (j > 0 && !solid[c - nx]) {
            sum += p[c - nx] ?? 0;
            n++;
          }
          if (j < ny - 1 && !solid[c + nx]) {
            sum += p[c + nx] ?? 0;
            n++;
          }
          p[c] = n > 0 ? sum / n : 0;
        }
      }
    }
    const k = 0.5 / h;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const c = i + j * nx;
        if (solid[c]) {
          u[c] = su[c] ?? 0;
          v[c] = sv[c] ?? 0;
          continue;
        }
        const pc = p[c] ?? 0;
        const pL = i > 0 && !solid[c - 1] ? (p[c - 1] ?? 0) : pc;
        const pR = i < nx - 1 ? (solid[c + 1] ? pc : (p[c + 1] ?? 0)) : 0;
        const pU = j > 0 && !solid[c - nx] ? (p[c - nx] ?? 0) : pc;
        const pD = j < ny - 1 && !solid[c + nx] ? (p[c + nx] ?? 0) : pc;
        u[c] = (u[c] ?? 0) - (pR - pL) * k;
        v[c] = (v[c] ?? 0) - (pD - pU) * k;
      }
    }
    // Walls: no flow through the top and bottom.
    for (let i = 0; i < nx; i++) {
      v[i] = Math.max(0, v[i] ?? 0);
      const b = i + (ny - 1) * nx;
      v[b] = Math.min(0, v[b] ?? 0);
    }
  }
}
