// Conventional Commits: parsing, linting, the next version and release notes.
// The same rules as hyperstructure/fctl's `cargo xtask release`
// (xtask/src/release.rs): keep them in step.

import { parseArgs } from "node:util";

/** Commit types, in the order their sections appear in the notes. */
export const TYPES = [
  ["feat", "Features"],
  ["fix", "Fixes"],
  ["perf", "Performance"],
  ["docs", "Documentation"],
  ["refactor", "Other changes"],
  ["test", "Other changes"],
  ["build", "Other changes"],
  ["ci", "Other changes"],
  ["chore", "Other changes"],
  ["revert", "Other changes"],
];

const MAX_SUBJECT = 72;
const WORD = /^[a-z0-9/-]+$/;

function split(subject) {
  const i = subject.indexOf(": ");
  if (i < 0) return null;
  let head = subject.slice(0, i);
  const text = subject.slice(i + 2).trim();
  const bang = head.endsWith("!");
  if (bang) head = head.slice(0, -1);
  let kind = head;
  let scope = null;
  const open = head.indexOf("(");
  if (open >= 0) {
    if (!head.endsWith(")")) return null;
    kind = head.slice(0, open);
    scope = head.slice(open + 1, -1);
  }
  if (!WORD.test(kind) || (scope !== null && !WORD.test(scope)) || !text) return null;
  return { kind, scope, bang, text };
}

/** `text (#14)` → [`text`, 14]. */
export function stripPr(text) {
  const m = /^(.*?) \(#(\d+)\)$/.exec(text);
  return m ? [m[1].trimEnd(), Number(m[2])] : [text, null];
}

export function parse(sha, subject, body = "") {
  const breakingBody = body.split("\n").some((l) => /^\s*BREAKING[ -]CHANGE:/.test(l));
  const [text, pr] = stripPr(subject.trim());
  const c = split(text);
  if (c && TYPES.some(([t]) => t === c.kind)) {
    return { kind: c.kind, scope: c.scope, breaking: c.bang || breakingBody, text: c.text, pr, sha };
  }
  return { kind: null, scope: null, breaking: breakingBody, text, pr, sha };
}

/** Why `subject` is not a good Conventional Commit subject, or null. */
export function lint(subject) {
  const [text] = stripPr(subject.trim());
  const types = TYPES.map(([t]) => t).join(", ");
  const c = split(text);
  if (!c) return `\`${text}\` is not \`type(scope): what changed\`; types: ${types}`;
  if (!TYPES.some(([t]) => t === c.kind)) return `\`${c.kind}\` is not a commit type; use one of: ${types}`;
  if (c.text.endsWith(".")) return "drop the full stop at the end";
  if ([...text].length > MAX_SUBJECT) {
    return `keep it to ${MAX_SUBJECT} characters (${[...text].length} now); details go in the body`;
  }
  return null;
}

const isRelease = (c) =>
  (c.kind === "chore" && c.scope === "release") ||
  (c.kind === null && /^Release \d+\.\d+\.\d+$/.test(c.text));

/** What the changes call for: "major", "minor" or "patch". */
export function bumpOf(changes) {
  if (changes.some((c) => c.breaking)) return "major";
  if (changes.some((c) => c.kind === "feat")) return "minor";
  return "patch";
}

/** The next version; before 1.0 breaking changes bump the minor one. */
export function nextVersion(version, bump) {
  const [major, minor, patch] = version.split(".").map(Number);
  if (bump === "major") return major === 0 ? `0.${minor + 1}.0` : `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * The options of `scripts/release.mjs [--bump auto|patch|minor|major] [--dry-run]`. Without `--bump`
 * the bump is auto: the commits pick it, as in the Release workflow. Anything else throws.
 */
export function releaseOptions(args) {
  const { values } = parseArgs({
    args,
    options: { bump: { type: "string", default: "auto" }, "dry-run": { type: "boolean", default: false } },
  });
  if (!["auto", "patch", "minor", "major"].includes(values.bump)) {
    throw new Error(`--bump is auto, patch, minor or major, not \`${values.bump}\``);
  }
  return { bump: values.bump, dryRun: values["dry-run"] };
}

function capitalized(text) {
  const first = text.split(/\s+/)[0] ?? "";
  const keep =
    first.startsWith("fctl") || first.startsWith("`") || /[_./]/.test(first) || /[A-Z]/.test(first.slice(1));
  return keep ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

function entry(c, repo) {
  const scope = c.scope ? `**${c.scope}:** ` : "";
  const link = c.pr ? `[#${c.pr}](${repo}/pull/${c.pr})` : `[${c.sha.slice(0, 7)}](${repo}/commit/${c.sha})`;
  return `- ${scope}${capitalized(c.text)} (${link})\n`;
}

/** The notes for one release: sections by type, breaking changes first. */
export function notes(changes, repo) {
  const list = changes.filter((c) => !isRelease(c));
  let out = "";
  const section = (title, items) => {
    if (items.length === 0) return;
    if (out) out += "\n";
    out += `### ${title}\n\n${items.map((c) => entry(c, repo)).join("")}`;
  };
  section(
    "Breaking changes",
    list.filter((c) => c.breaking),
  );
  for (const title of [...new Set(TYPES.map(([, s]) => s))]) {
    section(
      title,
      list.filter(
        (c) =>
          !c.breaking &&
          (c.kind ? TYPES.some(([t, s]) => t === c.kind && s === title) : title === "Other changes"),
      ),
    );
  }
  return out || "No changes worth noting.\n";
}

/** CHANGELOG.md with `section` added above the newest release. */
export function changelogWith(existing, section, intro) {
  const at = existing.indexOf("\n## ");
  const head = existing.startsWith("# Changelog")
    ? existing.slice(0, at < 0 ? undefined : at + 1).trimEnd()
    : intro.trimEnd();
  const body = at < 0 ? "" : existing.slice(at + 1);
  return `${`${head}\n\n${section.trimEnd()}\n\n${body}`.trimEnd()}\n`;
}
