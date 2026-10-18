---
name: commit
description: Commit and open pull requests in hyperstructure/design. Covers Conventional Commit subjects (they become the release notes, pick the version and decide whether a merge releases), the description, branch names and how a change reaches main. Use when committing, naming a branch, writing a pull request title or description, or getting work merged.
---

# Commits and pull requests

Every change reaches `main` as one squash-merged pull request: its **title
becomes the commit subject** and its description the commit body.
`scripts/release.mjs` makes the version and the release notes from those
subjects, and decides from them whether a merge releases, so they follow
[Conventional Commits](https://www.conventionalcommits.org), with the same
rules as hyperstructure/fctl.

## The title

`type(scope): what changed`, at most 72 characters, no full stop.

| Type | For | Released |
|---|---|---|
| `feat` | a new token, scene, option, asset or font | when it merges, as a minor version |
| `fix` | a bug fix | when it merges, as a patch |
| `perf` | cheaper rendering, same look | when it merges, as a patch |
| `revert` | undoing an earlier change | when it merges, as a patch |
| `docs` | documentation only | with the next release |
| `refactor` | restructuring that changes nothing visible | with the next release |
| `test`, `build`, `ci`, `chore` | tests; builds and dependencies; CI; upkeep | with the next release |

Changes that wait count as a patch when someone releases them by hand (the
`release` skill).

Scopes (optional): `tokens`, `fonts`, `gl`, `brand`, `assets`,
`playground`, `deps`, `release`.

Write it in the imperative, lowercase unless it starts with a name:
`feat(gl): add a dithered orb`, `fix(tokens): darken lime text on light`.

A **breaking change** to an export (a scene's options, a token's meaning,
a removed file) gets a `!` and a `BREAKING CHANGE:` paragraph saying what
consumers change: `feat(tokens)!: rename amber to lime`. Before 1.0 it
bumps the minor version, and it is released when it merges, whatever its
type.

Check a title: `node scripts/lint-commit.mjs "feat(gl): add a dithered orb"`.
CI checks every pull request title.

## The description

What changed and why, and how you looked at it: the playground in both
themes, screenshots for anything visual. Link the issue: `Fixes #3` only
when the pull request does everything it asks (merging closes it), `Refs #3`
otherwise (the `issues` skill).

The description becomes the commit message on `main`, so it ends with
the content: no "Generated with …" footers and no links to chat sessions.
A link to the fctl session that made the change is welcome.

## The flow

1. Branch from an up-to-date `main`: `<type>/<topic>`.
2. Run `npm run check && npm test && npm run build` before you push.
3. Open the pull request: a conventional title, a description, one change.
4. Wait for CI and answer the review: the `pull-requests` skill.
5. A person merges it (squash) when CI is green, unless they asked you to.
   A `feat`, `fix`, `perf`, `revert` or breaking change is released when
   it merges.

Never push to `main` directly; only the Release workflow does.
