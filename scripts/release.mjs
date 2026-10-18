// `node scripts/release.mjs [--bump auto|patch|minor|major] [--dry-run]`:
// the next version from the Conventional Commits since the last v* tag,
// package.json and package-lock.json at that version, CHANGELOG.md, and the
// release commit and tag. The Release workflow pushes them and makes the
// GitHub release; consumers then move their pinned tag.

import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { bumpOf, changelogWith, nextVersion, notes, parse, releaseOptions } from "./commits.mjs";

let options;
try {
  options = releaseOptions(process.argv.slice(2));
} catch (e) {
  console.error(`${e.message}\nusage: node scripts/release.mjs [--bump auto|patch|minor|major] [--dry-run]`);
  process.exit(2);
}
const { bump: bumpArg, dryRun } = options;
const git = (...a) => execFileSync("git", a, { encoding: "utf8" }).trim();

let prev = null;
try {
  prev = git("describe", "--tags", "--abbrev=0", "--match", "v[0-9]*.[0-9]*.[0-9]*", "HEAD");
} catch {}
const log = git(
  "log",
  "--no-merges",
  "--reverse",
  "--format=%H%x1f%s%x1f%b%x1e",
  prev ? `${prev}..HEAD` : "HEAD",
);
const changes = log
  .split("\x1e")
  .map((r) => r.replace(/^\n/, ""))
  .filter((r) => r.trim())
  .map((r) => {
    const [sha, subject, body] = r.split("\x1f");
    return parse(sha.trim(), subject ?? "", body ?? "");
  });
if (changes.every((c) => c.kind === "chore" && c.scope === "release")) {
  console.error(`nothing to release since ${prev ?? "the start"}`);
  process.exit(1);
}
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const base = prev ? prev.slice(1) : pkg.version;
const bump = bumpArg === "auto" ? bumpOf(changes) : bumpArg;
const version = nextVersion(base, bump);
const repo = process.env.GITHUB_REPOSITORY
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`
  : "https://github.com/hyperstructure/design";
const body = notes(changes, repo);
const date = new Date().toISOString().slice(0, 10);
console.log(`@hyperstructure/design ${version} (${bump} bump since ${prev ?? "the start"})\n\n${body}`);
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## ${version}\n\n${body}\n`);
writeFileSync(process.env.RELEASE_NOTES ?? "/dev/null", body);
if (dryRun) {
  console.log("(dry run: nothing changed)");
  process.exit(0);
}
if (git("status", "--porcelain")) {
  console.error("the working tree has changes; commit or stash them first");
  process.exit(1);
}
execFileSync("npm", ["version", version, "--no-git-tag-version", "--allow-same-version"], {
  stdio: "inherit",
});
const intro =
  "# Changelog\n\nWhat changed in each release of @hyperstructure/design, from its Conventional Commits (`scripts/release.mjs` writes this file).\n";
let existing = "";
try {
  existing = readFileSync("CHANGELOG.md", "utf8");
} catch {}
writeFileSync("CHANGELOG.md", changelogWith(existing, `## ${version} (${date})\n\n${body}`, intro));
git("add", "package.json", "package-lock.json", "CHANGELOG.md");
git("commit", "-q", "-m", `chore(release): v${version}`);
git("tag", "-a", `v${version}`, "-m", `@hyperstructure/design ${version}`);
console.log(`Committed and tagged v${version}.`);
