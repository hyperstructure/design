// Renders fctl's mark from src/brand.ts into the files consumers serve:
// assets/mark.svg and assets/favicon.svg, and the PNG app icons in
// assets/icons/ (web app manifests, home screens, the Dock); and
// fctl-review's GitHub avatar into assets/fctl-review/. Run `npm run icons`
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

/** Every generated file, as [path from the repository root, contents]. */
export function icons() {
  const svg = markSvg(256, { title: "fctl" });
  return [
    ["assets/mark.svg", svg],
    ["assets/favicon.svg", svg],
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
