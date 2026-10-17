# AGENTS.md

This is **@hyperstructure/design**: tokens, fonts, WebGL scenes, fctl's mark
and hyperstructure's symbol, shared by fctl's web app (hyperstructure/fctl,
`web/`) and fctl.sh (hyperstructure/fctl-site).

## Commands

```sh
npm install
npm run dev      # the playground at http://localhost:5175
npm run check    # Biome + TypeScript; CI runs this and the build
npm run build    # builds the playground into dist/
```

## Rules

- The palette is fixed: yellow `#ffff5d`, lime `#eaff81` (yellow on light
  backgrounds), hot pink `#ff00d8`, blue `#007eff`, blackish `#171717`,
  whiteish `#fafafa`. Light-theme text shades exist only where a brand color
  cannot be read on whiteish (see the comments in `src/tokens.css`). Keep
  `src/brand.ts` in step with `src/tokens.css`.
- Tokens are semantic (`canvas`, `surface`, `ink`, `accent`, `highlight`,
  `pink`, `blue`, `danger`…). Add a token rather than a raw color in a
  consumer.
- Scenes render dithered to the palette (8×8 Bayer, exact brand colors), pause
  when hidden, survive context loss and draw one still frame when motion is
  reduced (`mount()` handles this; call `scene.invalidate?.()` when inputs
  change). Keep them cheap: one fullscreen pass at low resolution.
- This package is an API: exports in `package.json` are public. Changing a
  scene's options or a token's meaning is a breaking change — bump the minor
  version (0.x) and say so in the release notes.
- hyperstructure's symbol (Twist, `assets/hyperstructure/`) is drawn once:
  `symbol.svg` is the source; `symbol-yellow.svg`, `symbol-rings.svg` and
  `brand.ts` reuse its ring path. The GitHub avatar is the rings in `#0d1117`
  on `#ffff5d`. Do not redraw it; derive from the path.
- Look at changes in the playground in both themes before tagging.

## Releasing

Bump `version`, commit ("Release 0.2.0"), tag `v0.2.0`, push the tag, then
open pull requests in the consumers to move their pinned tag.
