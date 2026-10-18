// The stream's glyphs: each character of the text drawn once with Canvas 2D,
// turned into a signed distance field (for the shader's dithered body, the
// air's solids and the threads' collisions) and a convex hull (for the
// glyph's physics). Everything here is in tile pixels; the scene scales it.

/** One character, rasterized into a square tile. */
export interface Glyph {
  char: string;
  /** Signed distance to the outline in tile pixels, negative inside (row-major, `size`²). */
  sd: Float32Array;
  /** The centre of mass in tile pixels (the body's origin). */
  cx: number;
  cy: number;
  /** Area in tile pixels² and the moment of inertia about the centre of mass (pixels⁴). */
  area: number;
  inertia: number;
  /** The convex hull around the centre of mass, in tile pixels (x, y pairs, counter-clockwise on screen). */
  hull: Float32Array;
  /** The furthest hull point from the centre of mass. */
  radius: number;
  /** The deepest point inside, in pixels (half the thickest stroke). */
  thick: number;
  /** Where the glyph's centre of mass sits relative to the text's ink centre, in tile pixels. */
  ox: number;
  oy: number;
}

export interface GlyphSet {
  glyphs: Glyph[];
  /** Tile side in pixels. */
  size: number;
  /** The ink of the whole text, in tile pixels. */
  width: number;
  height: number;
  /** The distance range stored in the atlas, ± pixels. */
  range: number;
  /** The SDFs side by side, as bytes (0.5 is the outline): `size * glyphs.length` × `size`. */
  atlas: Uint8Array;
}

const INF = 1e20;

/** Felzenszwalb and Huttenlocher's squared distance transform, along one row or column. */
function edt1d(
  g: Float64Array,
  offset: number,
  stride: number,
  n: number,
  f: Float64Array,
  v: Int32Array,
  z: Float64Array,
) {
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  f[0] = g[offset] ?? INF;
  for (let q = 1, k = 0; q < n; q++) {
    const fq = g[offset + q * stride] ?? INF;
    f[q] = fq;
    const q2 = q * q;
    let s = 0;
    do {
      const r = v[k] ?? 0;
      s = (fq - (f[r] ?? 0) + q2 - r * r) / (q - r) / 2;
    } while (s <= (z[k] ?? 0) && --k > -1);
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  for (let q = 0, k = 0; q < n; q++) {
    while ((z[k + 1] ?? INF) < q) k++;
    const r = v[k] ?? 0;
    const d = q - r;
    g[offset + q * stride] = (f[r] ?? 0) + d * d;
  }
}

function edt(g: Float64Array, w: number, h: number) {
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) edt1d(g, x, w, h, f, v, z);
  for (let y = 0; y < h; y++) edt1d(g, y * w, 1, w, f, v, z);
}

/** A signed distance field from coverage (0..1), positive outside, with sub-pixel edges (as in Mapbox's TinySDF). */
export function distanceField(alpha: Float32Array, w: number, h: number): Float32Array {
  // Seeds: zero on ink for the distance to ink, zero on empty pixels for the distance to them.
  const toInk = new Float64Array(w * h);
  const toEmpty = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = alpha[i] ?? 0;
    if (a >= 1) {
      toInk[i] = 0;
      toEmpty[i] = INF;
    } else if (a <= 0) {
      toInk[i] = INF;
      toEmpty[i] = 0;
    } else {
      const d = 0.5 - a;
      toInk[i] = d > 0 ? d * d : 0;
      toEmpty[i] = d < 0 ? d * d : 0;
    }
  }
  edt(toInk, w, h);
  edt(toEmpty, w, h);
  const sd = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) sd[i] = Math.sqrt(toInk[i] ?? 0) - Math.sqrt(toEmpty[i] ?? 0);
  return sd;
}

/** Andrew's monotone chain; points as x, y pairs. Returns the hull counter-clockwise on screen (y down). */
export function convexHull(points: number[]): number[] {
  const n = points.length / 2;
  const idx = Array.from({ length: n }, (_, i) => i);
  const X = (i: number) => points[i * 2] ?? 0;
  const Y = (i: number) => points[i * 2 + 1] ?? 0;
  idx.sort((a, b) => X(a) - X(b) || Y(a) - Y(b));
  const cross = (o: number, a: number, b: number) =>
    (X(a) - X(o)) * (Y(b) - Y(o)) - (Y(a) - Y(o)) * (X(b) - X(o));
  const lower: number[] = [];
  for (const i of idx) {
    while (lower.length >= 2 && cross(lower[lower.length - 2] ?? 0, lower[lower.length - 1] ?? 0, i) <= 0)
      lower.pop();
    lower.push(i);
  }
  const upper: number[] = [];
  for (let k = idx.length - 1; k >= 0; k--) {
    const i = idx[k] ?? 0;
    while (upper.length >= 2 && cross(upper[upper.length - 2] ?? 0, upper[upper.length - 1] ?? 0, i) <= 0)
      upper.pop();
    upper.push(i);
  }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  return hull.flatMap((i) => [X(i), Y(i)]);
}

/** Drops the hull points that matter least (smallest triangle) until `max` are left. */
function simplify(hull: number[], max: number): number[] {
  const pts: [number, number][] = [];
  for (let i = 0; i < hull.length; i += 2) pts.push([hull[i] ?? 0, hull[i + 1] ?? 0]);
  const area = (i: number) => {
    const a = pts[(i - 1 + pts.length) % pts.length] ?? [0, 0];
    const b = pts[i] ?? [0, 0];
    const c = pts[(i + 1) % pts.length] ?? [0, 0];
    return Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  };
  while (pts.length > max) {
    let worst = 0;
    let least = Number.POSITIVE_INFINITY;
    for (let i = 0; i < pts.length; i++) {
      const s = area(i);
      if (s < least) {
        least = s;
        worst = i;
      }
    }
    pts.splice(worst, 1);
  }
  return pts.flat();
}

/**
 * Draws `text` one character per tile in `weight` and `family` (a CSS font
 * family list) and measures it. The tallest glyph's ink is about two thirds
 * of the tile.
 */
export function rasterize(
  text: string,
  family: string,
  weight: number,
  size = 256,
  range = 40,
): GlyphSet | null {
  const chars = [...text];
  if (!chars.length || typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  // Size the font so the tallest glyph fills two thirds of a tile.
  ctx.font = `${weight} 100px ${family}`;
  let tallest = 1;
  for (const ch of chars) {
    const m = ctx.measureText(ch);
    tallest = Math.max(tallest, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent);
  }
  const px = (100 * size * 0.66) / tallest;
  ctx.font = `${weight} ${px.toFixed(2)}px ${family}`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  // Pen positions along the line, spaced so the air can pass between the glyphs.
  const tracking = 0.07 * px;
  const metrics = chars.map((ch) => ctx.measureText(ch));
  let pen = 0;
  const pens = metrics.map((m) => {
    const at = pen;
    pen += m.width + tracking;
    return at;
  });
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  metrics.forEach((m, i) => {
    const p = pens[i] ?? 0;
    minX = Math.min(minX, p - m.actualBoundingBoxLeft);
    maxX = Math.max(maxX, p + m.actualBoundingBoxRight);
    minY = Math.min(minY, -m.actualBoundingBoxAscent);
    maxY = Math.max(maxY, m.actualBoundingBoxDescent);
  });
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  const glyphs: Glyph[] = [];
  const atlas = new Uint8Array(size * size * chars.length);
  const stride = size * chars.length;
  chars.forEach((ch, gi) => {
    const m = metrics[gi];
    if (!m) return;
    // Centre the glyph's ink in the tile.
    const inkX = (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
    const inkY = (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2;
    const x0 = size / 2 - inkX;
    const y0 = size / 2 - inkY;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#000";
    ctx.fillText(ch, x0, y0);
    const data = ctx.getImageData(0, 0, size, size).data;
    const alpha = new Float32Array(size * size);
    let area = 0;
    let sx = 0;
    let sy = 0;
    const edge: number[] = [];
    for (let y = 0; y < size; y++) {
      let first = -1;
      let last = -1;
      for (let x = 0; x < size; x++) {
        const a = (data[(x + y * size) * 4 + 3] ?? 0) / 255;
        alpha[x + y * size] = a;
        area += a;
        sx += a * (x + 0.5);
        sy += a * (y + 0.5);
        if (a > 0.5) {
          if (first < 0) first = x;
          last = x;
        }
      }
      if (first >= 0) edge.push(first, y, last + 1, y, first, y + 1, last + 1, y + 1);
    }
    if (area <= 0) return;
    const cx = sx / area;
    const cy = sy / area;
    let inertia = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const a = alpha[x + y * size] ?? 0;
        if (a > 0) inertia += a * ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2);
      }
    }
    const sd = distanceField(alpha, size, size);
    let thick = 1;
    for (let i = 0; i < sd.length; i++) {
      const d = sd[i] ?? 0;
      if (-d > thick) thick = -d;
      const b = Math.round(Math.min(1, Math.max(0, 0.5 + d / (2 * range))) * 255);
      atlas[gi * size + (i % size) + Math.floor(i / size) * stride] = b;
    }
    const hull = simplify(convexHull(edge), 14);
    let radius = 0;
    const local = new Float32Array(hull.length);
    for (let i = 0; i < hull.length; i += 2) {
      const hx = (hull[i] ?? 0) - cx;
      const hy = (hull[i + 1] ?? 0) - cy;
      local[i] = hx;
      local[i + 1] = hy;
      radius = Math.max(radius, Math.hypot(hx, hy));
    }
    // Where this glyph's centre of mass is, relative to the whole text's ink centre.
    const ox = (pens[gi] ?? 0) + (cx - x0) - midX;
    const oy = cy - y0 - midY;
    glyphs.push({ char: ch, sd, cx, cy, area, inertia, hull: local, radius, thick, ox, oy });
  });
  if (!glyphs.length) return null;
  return { glyphs, size, width: maxX - minX, height: maxY - minY, range, atlas };
}

/** The signed distance (tile pixels) at a point in tile pixels, bilinear; far outside the tile, `range`. */
export function sampleSd(g: Glyph, size: number, x: number, y: number, range: number): number {
  const gx = x - 0.5;
  const gy = y - 0.5;
  if (gx < 0 || gy < 0 || gx >= size - 1 || gy >= size - 1) return range;
  const i = gx | 0;
  const j = gy | 0;
  const fx = gx - i;
  const fy = gy - j;
  const c = i + j * size;
  const a = g.sd[c] ?? range;
  const b = g.sd[c + 1] ?? range;
  const d = g.sd[c + size] ?? range;
  const e = g.sd[c + size + 1] ?? range;
  return (a + (b - a) * fx) * (1 - fy) + (d + (e - d) * fx) * fy;
}
