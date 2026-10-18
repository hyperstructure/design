# @hyperstructure/design

hyperstructure's design system: the brand palette and tokens, the fonts, the
dithered WebGL scenes, and the marks and app icons. Used by
[fctl](https://github.com/hyperstructure/fctl)'s web app and
[fctl.sh](https://github.com/hyperstructure/fctl-site).

| Export | What |
|---|---|
| `@hyperstructure/design/tokens.css` | Colors (dark and light themes), fonts, easings, radii, keyframes, base styles, as a Tailwind 4 `@theme` |
| `@hyperstructure/design/fonts.css` | Inter (with optical sizes), JetBrains Mono, and Instrument Serif for display headlines (`font-serif`) |
| `@hyperstructure/design/brand` | The palette and the mark as values (`palette`, `mark`, `markSvg()`) |
| `@hyperstructure/design/gl/core` | A small WebGL2 runtime: `mount()`, shader helpers, `cssColor()` |
| `@hyperstructure/design/gl/foundry` | The foundry scene: a dithered planet with threads of light |
| `@hyperstructure/design/gl/orb` | A tiny dithered planet for a session's state |
| `@hyperstructure/design/gl/stream` | The stream: the foundry's threads flowing around glyphs made of the planet's matter, which people can stir, throw and knock over (fctl's 404 and 5xx pages) |
| `@hyperstructure/design/assets/mark.svg`, `favicon.svg` | fctl's mark: hyperstructure's symbol on a rounded yellow square |
| `@hyperstructure/design/assets/icons/*` | fctl's app icons for web app manifests and home screens: `icon-192.png` and `icon-512.png` (rounded, manifest purpose `any`); `icon-maskable-512.png`, `icon-maskable-1024.png` and `apple-touch-icon.png` (yellow to the edges, for platforms that shape icons themselves) |
| `@hyperstructure/design/assets/hyperstructure/*` | hyperstructure's symbol: `symbol.svg`, `symbol-yellow.svg` (the GitHub avatar), `symbol-rings.svg` (`currentColor`), `avatar-512.png` |

The palette: yellow `#ffff5d` (lime `#eaff81` on light backgrounds), hot pink
`#ff00d8`, blue `#007eff`, blackish `#171717`, whiteish `#fafafa`. Danger
(destructive actions, errors, failures) is red `#ff4d4d` (`#cc1f1f` on light
backgrounds), which is not a brand color and is used for nothing else.

hyperstructure's symbol is **Twist**: two rounded squares turning inside each
other. The organization avatar is the rings in `#0d1117` on full-bleed yellow
`#ffff5d`; `brand.ts` has it as values (`hyperstructure`, `hyperstructureSvg()`).

fctl's mark is the same symbol on a yellow square whose corners are rounded to
a fifth of its side (`mark`, `markSvg()`). Icons that the platform masks (iOS
home screens, the macOS Dock, Android's maskable icons) fill the square
instead (`markSvg(size, { square: true })`); the rings stay inside the
maskable safe zone. `npm run icons` renders `mark.svg`, `favicon.svg` and
`assets/icons/` from `brand.ts`, and `npm test` checks they are current.

## Using it

While the repository is private, depend on a tag:

```sh
npm install "github:hyperstructure/design#v0.1.0"
```

```css
@import "tailwindcss";
@import "@hyperstructure/design/fonts.css";
@import "@hyperstructure/design/tokens.css";
```

```ts
import { mount } from "@hyperstructure/design/gl/core";
import { foundry } from "@hyperstructure/design/gl/foundry";

const scene = foundry({ planet: [1.02, -0.75, 1.15], density: 0.55 });
const dispose = mount(canvas, scene.scene, { pixel: 3 });
scene.setLanes(new Map([[12, { lit: 1, color: 1, energy: 0.4 }]]));
```

The stream takes the text its glyphs spell and a box (fractions of the
canvas) to fit them into; `play()` hands it pointer events: moving stirs the
threads, dragging a glyph throws it, a tap sends a burst. `power(false)`
turns the wind and the lights off, and the glyphs drop to the floor;
`power(true)` stands them up again.

```ts
import { play, stream } from "@hyperstructure/design/gl/stream";

const s = stream({ text: "404" });
mount(canvas, s.scene, { pixel: 3 });
s.place({ x: 0.2, y: 0.18, width: 0.6, height: 0.3 });
play(canvas.parentElement, canvas, s);
```

The package ships TypeScript sources; a bundler that compiles TypeScript
(Vite, esbuild) is expected. Tailwind 4 is a peer dependency.

## The playground

```sh
npm install
npm run dev      # http://localhost:5175: every scene and token, both themes
npm run check    # Biome and TypeScript
npm run icons    # render fctl's mark and app icons from src/brand.ts
```

## Releasing

Merging a pull request releases it when it brings a feature, a fix, a
performance change, a revert or a breaking change. The Release workflow
picks the version from the Conventional Commits since the last tag, adds
the notes to CHANGELOG.md, and makes the tag and the GitHub release. Other
changes wait for the next release, or for a run of the workflow by hand.
Consumers then move their pinned tag in a pull request. The details:
[.claude/skills/release/SKILL.md](.claude/skills/release/SKILL.md).

## License

[MIT](LICENSE)
