---
name: release
description: "How @hyperstructure/design is released (the tag fctl's web app and fctl.sh pin): by the Release workflow after a merge that brings a feature or fix, or by hand, then moving the consumers to the new tag. Use when asked to release or publish the design package, to find out whether a change is released, or to bring a design change to fctl or fctl.sh."
---

# Releasing @hyperstructure/design

Consumers install the package from git at a tag
(`github:hyperstructure/design#v0.4.0`), so a release is a tag on `main`.
The **Release** workflow makes it; never edit the version, CHANGELOG.md or
tags by hand.

## 1. A merge releases

The Release workflow runs after every merge to `main`. It checks and builds
`main`, and releases when the commits since the last tag include a `feat`,
`fix`, `perf`, `revert` or breaking change: it writes the version into
`package.json` and `package-lock.json`, adds the notes to `CHANGELOG.md`,
pushes the `chore(release): vX.Y.Z` commit and the tag with
`RELEASE_DEPLOY_KEY` (the deploy key that the rulesets on `main` and `v*`
tags let through), and creates the GitHub release with the notes. Other changes (`docs`, `refactor`, `test`,
`build`, `ci`, `chore`) wait for the next release.

The version follows the commits since the last tag: a breaking change bumps
the minor version (before 1.0), a `feat` the minor version, anything else
the patch. Preview it with `node scripts/release.mjs --dry-run` on an
up-to-date `main`; `--if-due` shows whether a merge would release now.

So a change has to be ready when it merges: CI passed, and it looks right
in the playground in both themes. After the merge, watch the run and find
the tag:

```sh
gh run list --repo hyperstructure/design --workflow release.yml --commit MERGE_SHA
gh run watch ID --repo hyperstructure/design --exit-status
git fetch --tags origin && git tag --contains MERGE_SHA
```

## 2. Releasing by hand

To release changes that are waiting (a dependency update consumers need),
or to choose the bump, start the workflow yourself. That needs write access
to Actions; if you don't have it, ask a person.

```sh
gh workflow run release.yml --repo hyperstructure/design --ref main -f bump=auto
```

or GitHub → Actions → Release → Run workflow. Run by hand, it releases
whatever is new since the last tag. `bump` (patch, minor or major)
overrides the version, and `dry_run` only shows the next version and its
notes. Every run starts from `main`, a dry run too: the job uses the
production environment, which only `main` may use.

## 3. Move the consumers

Open one pull request in each consumer, titled
`build(deps): use @hyperstructure/design vX.Y.Z`:

- **hyperstructure/fctl**: in `web/package.json`, set
  `"@hyperstructure/design": "github:hyperstructure/design#vX.Y.Z"`, run
  `npm install` at the repository root (it updates `package-lock.json`),
  then `cargo xtask check`. Look at the app in both themes.
- **hyperstructure/fctl-site**: the same in `package.json`, then
  `npm install && npm run check && npm run build`. Look at the landing page
  and a docs page in both themes and at a phone width.

The release notes go in the pull request descriptions. A breaking release
needs the consumers' code changed in the same pull requests.

Never move or delete a published tag: consumers' lockfiles point at it.
