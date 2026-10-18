// `node scripts/release.mjs [--bump auto|patch|minor|major] [--if-due] [--dry-run]`:
// the next version from the Conventional Commits since the last v* tag,
// package.json and package-lock.json at that version, CHANGELOG.md, and the
// release commit and tag. The Release workflow pushes them and makes the
// GitHub release; consumers then move their pinned tag. After a merge, the
// workflow passes --if-due: it releases only when a change calls for it.

import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { bumpOf, changelogWith, nextVersion, notes, parse } from "./commits.mjs";

/**
 * The options from the arguments. Without `--bump` the bump is auto: the commits pick it, as in
 * the Release workflow. Anything else throws.
 */
export function releaseOptions(args) {
  const { values } = parseArgs({
    args,
    options: {
      bump: { type: "string", default: "auto" },
      "if-due": { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
    },
  });
  if (!["auto", "patch", "minor", "major"].includes(values.bump)) {
    throw new Error(`--bump is auto, patch, minor or major, not \`${values.bump}\``);
  }
  return { bump: values.bump, ifDue: values["if-due"], dryRun: values["dry-run"] };
}

/**
 * Whether the changes call for a release when they merge (`--if-due`): a feature, a fix, a
 * performance change, a revert or a breaking change. Docs, CI, tests, refactors, builds and
 * chores wait for the next release.
 */
export function releaseDue(changes) {
  return changes.some((c) => c.breaking || ["feat", "fix", "perf", "revert"].includes(c.kind));
}

function release({ bump: bumpArg, ifDue, dryRun }) {
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
  if (ifDue && !releaseDue(changes)) {
    const why = `No release: no feat, fix, perf, revert or breaking change since ${prev ?? "the start"}.`;
    console.log(why);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${why}\n`);
    process.exit(0);
  }
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
}

// Run as a script, not when the tests import it. Through a symlink, argv[1]
// differs from import.meta.url until it is resolved.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let options;
  try {
    options = releaseOptions(process.argv.slice(2));
  } catch (e) {
    console.error(
      `${e.message}\nusage: node scripts/release.mjs [--bump auto|patch|minor|major] [--if-due] [--dry-run]`,
    );
    process.exit(2);
  }
  release(options);
}
