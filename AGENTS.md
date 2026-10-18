# AGENTS.md

This is **@hyperstructure/design**: tokens, fonts, WebGL scenes, fctl's mark
and hyperstructure's symbol, shared by fctl's web app (hyperstructure/fctl,
`web/`) and fctl.sh (hyperstructure/fctl-site).

## Commands

```sh
npm install
npm run dev      # the playground at http://localhost:5175
npm run check    # Biome + TypeScript; CI runs this, the tests and the build
npm test         # the commit and release rules, and that the icons are current
npm run icons    # renders fctl's mark and app icons from src/brand.ts
npm run build    # builds the playground into dist/
node scripts/lint-commit.mjs "feat(gl): add x"   # a pull request title
node scripts/release.mjs --dry-run               # the next version and its notes
```

## Rules

- The palette is fixed: yellow `#ffff5d`, lime `#eaff81` (yellow on light
  backgrounds), hot pink `#ff00d8`, blue `#007eff`, blackish `#171717`,
  whiteish `#fafafa`. Red `#ff4d4d` (`#cc1f1f` on light backgrounds) is not
  a brand color: it is only for `danger` (destructive actions, errors,
  failures). Light-theme text shades exist only where a brand color
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
- fctl's mark is that symbol on a rounded yellow square (`mark` in
  `brand.ts`). `assets/mark.svg`, `assets/favicon.svg` and `assets/icons/`
  are rendered from it by `npm run icons`: change `brand.ts`, rerun it, and
  never edit those files by hand (`npm test` fails when they are stale).
  Icons that platforms mask fill the square to the edges.
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

## Issues

- Before starting on an issue, read it with its comments and the pull
  requests that mention it (`gh issue view N --comments`), and check that no
  open pull request already covers it.
- In a pull request, write `Fixes #N` only when it does everything the issue
  asks (merging closes it); otherwise `Refs #N`.
- Tick an item in an issue's checklist only once it is done and verified,
  and link the evidence. Report partial progress in a comment: what is done,
  what is left, what blocks it.
- An issue closes when everything in it is done and verified, or when a
  person decides it won't be done. Leftovers move to new, linked issues. Ask
  before closing an issue your task didn't name.
- New issues: search for duplicates first, describe what is wrong, how it
  works now and what should happen, and add labels. Add to other people's
  issues (a comment or a new section) instead of rewriting them.
- An fctl session's token covers only this repository: name what the other
  hyperstructure repositories need, and tell the person.
- The procedures: [.claude/skills/issues/SKILL.md](.claude/skills/issues/SKILL.md).

## After opening a pull request

- Wait for CI in the same turn (`gh pr checks N --watch --fail-fast`) and
  fix failures. Nothing wakes an fctl session when CI finishes or someone
  reviews.
- Answer every review comment in its thread: fix it, or say why not.
- After the merge, don't push to the merged branch; follow-ups go in a new
  pull request from the updated `main`. Record the merge in the issue, and
  say whether the change is live yet.
- The procedures:
  [.claude/skills/pull-requests/SKILL.md](.claude/skills/pull-requests/SKILL.md).
