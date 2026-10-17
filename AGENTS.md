# AGENTS.md

This is **@hyperstructure/design**: tokens, fonts, WebGL scenes, fctl's mark
and hyperstructure's symbol, shared by fctl's web app (hyperstructure/fctl,
`web/`) and fctl.sh (hyperstructure/fctl-site).

## Commands

```sh
npm install
npm run dev      # the playground at http://localhost:5175
npm run check    # Biome + TypeScript; CI runs this, the tests and the build
npm test         # the commit and release rules (scripts/commits.mjs)
npm run build    # builds the playground into dist/
node scripts/lint-commit.mjs "feat(gl): add x"   # a pull request title
node scripts/release.mjs --dry-run               # the next version and its notes
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
  scene's options or a token's meaning is a breaking change: mark the pull
  request title with `!` and explain it in a `BREAKING CHANGE:` paragraph
  (before 1.0 that bumps the minor version).
- hyperstructure's symbol (Twist, `assets/hyperstructure/`) is drawn once:
  `symbol.svg` is the source; `symbol-yellow.svg`, `symbol-rings.svg` and
  `brand.ts` reuse its ring path. The GitHub avatar is the rings in `#0d1117`
  on `#ffff5d`. Do not redraw it; derive from the path.
- Look at changes in the playground in both themes before tagging.

## Commits, pull requests and releases

- Changes reach `main` as squash-merged pull requests. The title becomes
  the commit, so it is a
  [Conventional Commit](https://www.conventionalcommits.org):
  `feat(gl): add a dithered orb`. CI checks it. Types, scopes and the flow:
  [.claude/skills/commit/SKILL.md](.claude/skills/commit/SKILL.md).
- A person merges agents' pull requests unless they ask the agent to.
  Never push to `main` directly.
- Releases come from the Release workflow: the version from those commits,
  CHANGELOG.md, the tag and the GitHub release. Then the consumers move
  their pinned tag in pull requests:
  [.claude/skills/release/SKILL.md](.claude/skills/release/SKILL.md).
