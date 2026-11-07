// Renders fctl's mark from src/brand.ts into the files consumers serve:
// assets/mark.svg, assets/favicon.svg and assets/favicon.ico, and the PNG
// app icons in assets/icons/ (web app manifests, home screens, the Dock);
// and fctl-review's GitHub avatar into assets/fctl-review/. Run `npm run icons`
// after changing them; `npm test` checks the files are current.
//
//   node scripts/icons.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { markSvg, reviewAppSvg } from "../src/brand.ts";

/** A PNG of `svg`, `size` pixels square. */
function render(svg, size) {
  return new Resvg(svg, { fitTo: { mode: "width", value: size }, font: { loadSystemFonts: false } })
    .render()
    .asPng();
}

/** A PNG of the mark, `size` pixels square; `square` fills the corners. */
function png(size, square) {
  return render(markSvg(size, { square }), size);
}

/**
 * An ICO of the rounded mark at each of `sizes` (at most 256), each stored as
 * a PNG, which every current browser and system reads in an ICO.
 */
function ico(sizes) {
  const images = sizes.map((size) => png(size, false));
  const directory = Buffer.alloc(6 + 16 * images.length);
  directory.writeUInt16LE(1, 2); // an icon, not a cursor
  directory.writeUInt16LE(images.length, 4);
  let offset = directory.length;
  images.forEach((image, i) => {
    const entry = 6 + 16 * i;
    directory.writeUInt8(sizes[i] % 256, entry); // width; 0 means 256
    directory.writeUInt8(sizes[i] % 256, entry + 1); // height
    directory.writeUInt16LE(1, entry + 4); // color planes
    directory.writeUInt16LE(32, entry + 6); // bits per pixel
    directory.writeUInt32LE(image.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  });
  return Buffer.concat([directory, ...images]);
}

/** Every generated file, as [path from the repository root, contents]. */
export function icons() {
  const svg = markSvg(256, { title: "fctl" });
  return [
    ["assets/mark.svg", svg],
    ["assets/favicon.svg", svg],
    // What browsers, feed readers and link previews fetch from /favicon.ico
    // when a page links no icon they take: the sizes of tabs, bookmarks and
    // Windows' taskbar.
    ["assets/favicon.ico", ico([16, 32, 48])],
    // Shown as they are (manifest purpose "any"): rounded, like the mark.
    ["assets/icons/icon-192.png", png(192, false)],
    ["assets/icons/icon-512.png", png(512, false)],
    // Shaped by the platform (manifest purpose "maskable", iOS home screens,
    // the macOS Dock): yellow to the edges. The rings stay inside the
    // maskable safe zone, a circle of 80% of the side.
    ["assets/icons/icon-maskable-512.png", png(512, true)],
    ["assets/icons/icon-maskable-1024.png", png(1024, true)],
    ["assets/icons/apple-touch-icon.png", png(180, true)],
    // fctl-review's avatar, as uploaded to GitHub: full bleed, which GitHub
    // rounds itself.
    ["assets/fctl-review/avatar.svg", reviewAppSvg(256)],
    ["assets/fctl-review/avatar-512.png", render(reviewAppSvg(512), 512)],
  ];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  for (const [path, contents] of icons()) {
    mkdirSync(dirname(`${root}/${path}`), { recursive: true });
    writeFileSync(`${root}/${path}`, contents);
    console.log(path);
  }
}
