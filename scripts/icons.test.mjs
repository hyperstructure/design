import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { inflateSync } from "node:zlib";
import { icons } from "./icons.mjs";

/** Width, height and RGBA bytes of an 8-bit RGBA PNG (what resvg writes). */
function decode(png) {
  let width = 0;
  let height = 0;
  const data = [];
  for (let at = 8; at < png.length; ) {
    const length = png.readUInt32BE(at);
    const type = png.toString("latin1", at + 4, at + 8);
    const body = png.subarray(at + 8, at + 8 + length);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      assert.deepEqual([body[8], body[9], body[12]], [8, 6, 0], "8-bit RGBA, not interlaced");
    }
    if (type === "IDAT") data.push(body);
    at += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(data));
  const row = width * 4;
  const out = Buffer.alloc(row * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (row + 1)];
    for (let x = 0; x < row; x++) {
      const v = raw[y * (row + 1) + 1 + x];
      const a = x >= 4 ? out[y * row + x - 4] : 0;
      const b = y > 0 ? out[(y - 1) * row + x] : 0;
      const c = x >= 4 && y > 0 ? out[(y - 1) * row + x - 4] : 0;
      const p = a + b - c;
      const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
      const paeth = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      out[y * row + x] = v + [0, a, b, (a + b) >> 1, paeth][filter];
    }
  }
  return { width, height, pixels: out };
}

test("the mark and app icons are current (npm run icons)", () => {
  for (const [path, expected] of icons()) {
    const actual = readFileSync(new URL(`../${path}`, import.meta.url));
    if (typeof expected === "string") {
      assert.equal(actual.toString(), expected, path);
      continue;
    }
    // Pixels, not bytes: rasterizers may round differently on other CPUs.
    const [a, e] = [decode(actual), decode(expected)];
    assert.deepEqual([a.width, a.height], [e.width, e.height], path);
    let worst = 0;
    for (let i = 0; i < e.pixels.length; i++) worst = Math.max(worst, Math.abs(a.pixels[i] - e.pixels[i]));
    assert.ok(worst <= 2, `${path} differs from the mark by ${worst}/255; run npm run icons`);
  }
});

test("the full-bleed icons are opaque, so platforms can shape them", () => {
  for (const [path, png] of icons()) {
    if (typeof png === "string" || !/maskable|apple-touch/.test(path)) continue;
    const { pixels } = decode(png);
    for (let i = 3; i < pixels.length; i += 4) assert.equal(pixels[i], 255, path);
  }
});
