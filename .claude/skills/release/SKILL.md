---
name: release
description: Release a new version of @hyperstructure/design (the tag fctl's web app and fctl.sh pin) through the Release workflow, then move the consumers to it. Only for people and agents with release access (write access to Actions on hyperstructure/design). Use when asked to release or publish the design package, or to bring a design change to fctl or fctl.sh.
---

# Releasing @hyperstructure/design

Consumers install the package from git at a tag
(`github:hyperstructure/design#v0.1.2`), so a release is a tag on `main`.
The **Release** workflow makes it; never edit the version, CHANGELOG.md or
tags by hand. Starting it needs write access to Actions; if you don't have
it, ask a person to start it.

## 1. Before

- CI passed on `main`, and the change looks right in the playground in both
  themes.
- Preview: `git switch main && git pull && node scripts/release.mjs --dry-run`,
  or run the workflow with `dry_run`. The version follows the commits since
  the last tag: a breaking change bumps the minor version (before 1.0), a
  `feat` the minor version, anything else the patch.

## 2. Release

```sh
gh workflow run release.yml --repo hyperstructure/design --ref main -f bump=auto
```

or GitHub → Actions → Release → Run workflow. It checks and builds `main`,
writes the version into `package.json` and `package-lock.json`, adds the
notes to `CHANGELOG.md`, pushes the `chore(release): vX.Y.Z` commit and the
tag, and creates the GitHub release with the notes.

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
