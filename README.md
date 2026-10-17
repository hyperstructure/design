# @hyperstructure/design

hyperstructure's design system: the brand palette and tokens, the fonts, the
dithered WebGL scenes, and the mark. Used by
[fctl](https://github.com/hyperstructure/fctl)'s web app and
[fctl.sh](https://github.com/hyperstructure/fctl-site).

| Export | What |
|---|---|
| `@hyperstructure/design/tokens.css` | Colors (dark and light themes), fonts, easings, radii, keyframes, base styles, as a Tailwind 4 `@theme` |
| `@hyperstructure/design/fonts.css` | Inter (with optical sizes) and JetBrains Mono |
| `@hyperstructure/design/brand` | The palette and the mark as values (`palette`, `mark`, `markSvg()`) |
| `@hyperstructure/design/gl/core` | A small WebGL2 runtime: `mount()`, shader helpers, `cssColor()` |
| `@hyperstructure/design/gl/foundry` | The foundry scene: a dithered planet with threads of light |
| `@hyperstructure/design/gl/orb` | A tiny dithered planet for a session's state |
| `@hyperstructure/design/assets/mark.svg`, `favicon.svg` | fctl's mark |
| `@hyperstructure/design/assets/hyperstructure/*` | hyperstructure's symbol: `symbol.svg`, `symbol-yellow.svg` (the GitHub avatar), `symbol-rings.svg` (`currentColor`), `avatar-512.png` |

The palette: yellow `#ffff5d` (lime `#eaff81` on light backgrounds), hot pink
`#ff00d8`, blue `#007eff`, blackish `#171717`, whiteish `#fafafa`.

hyperstructure's symbol is **Twist**: two rounded squares turning inside each
other. The organization avatar is the rings in `#0d1117` on full-bleed yellow
`#ffff5d`; `brand.ts` has it as values (`hyperstructure`, `hyperstructureSvg()`).

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

The package ships TypeScript sources; a bundler that compiles TypeScript
(Vite, esbuild) is expected. Tailwind 4 is a peer dependency.

## The playground

```sh
npm install
npm run dev      # http://localhost:5175: every scene and token, both themes
npm run check    # Biome and TypeScript
```

## Releasing

Bump `version` in package.json, commit, tag `v<version>` and push the tag.
Consumers update their pinned tag in a pull request.

## License

[MIT](LICENSE)
