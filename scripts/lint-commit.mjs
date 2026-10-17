// Checks Conventional Commit subjects: `node scripts/lint-commit.mjs "<subject>"`.
// CI runs it on pull request titles, which become the squash-merged commits.

import { lint } from "./commits.mjs";

const subjects = process.argv.slice(2);
if (subjects.length === 0) {
  console.error('usage: node scripts/lint-commit.mjs "type(scope): what changed"');
  process.exit(2);
}
let failed = false;
for (const s of subjects) {
  const why = lint(s);
  if (why) {
    console.error(`${s}\n  ${why} (see .claude/skills/commit/SKILL.md)`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
