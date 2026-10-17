import assert from "node:assert/strict";
import { test } from "node:test";
import { bumpOf, changelogWith, lint, nextVersion, notes, parse } from "./commits.mjs";

test("parses subjects", () => {
  const c = parse("abc1234def", "feat(gl): add a dithered orb (#3)");
  assert.deepEqual(
    [c.kind, c.scope, c.text, c.pr, c.breaking],
    ["feat", "gl", "add a dithered orb", 3, false],
  );
  assert.equal(parse("1", "fix!: drop the old tokens").breaking, true);
  assert.equal(parse("1", "refactor: x", "BREAKING CHANGE: renamed").breaking, true);
  assert.equal(parse("1", "Add the serif (#2)").kind, null);
});

test("lints titles", () => {
  assert.equal(lint("feat(tokens): add a serif display font"), null);
  assert.notEqual(lint("Add a serif"), null);
  assert.notEqual(lint("feature: x"), null);
  assert.notEqual(lint("fix: trailing stop."), null);
  assert.notEqual(lint(`docs: ${"x".repeat(80)}`), null);
});

test("versions", () => {
  assert.equal(bumpOf([parse("1", "fix: a"), parse("1", "feat: b")]), "minor");
  assert.equal(bumpOf([parse("1", "docs: a")]), "patch");
  assert.equal(nextVersion("0.1.2", "major"), "0.2.0");
  assert.equal(nextVersion("1.4.2", "major"), "2.0.0");
  assert.equal(nextVersion("0.1.2", "patch"), "0.1.3");
});

test("notes and changelog", () => {
  const repo = "https://github.com/hyperstructure/design";
  const text = notes(
    [
      parse("aaaaaaa1", "feat(gl): add an orb (#3)"),
      parse("bbbbbbb2", "Tidy up"),
      parse("c", "chore(release): v0.1.2"),
    ],
    repo,
  );
  assert.equal(
    text,
    "### Features\n\n" +
      `- **gl:** Add an orb ([#3](${repo}/pull/3))\n\n` +
      "### Other changes\n\n" +
      `- Tidy up ([bbbbbbb](${repo}/commit/bbbbbbb2))\n`,
  );
  const first = changelogWith("", "## 0.2.0 (2026-10-18)\n\n- A\n", "# Changelog\n\nIntro.\n");
  const second = changelogWith(first, "## 0.3.0 (2026-11-01)\n\n- B\n", "unused");
  assert.ok(second.indexOf("## 0.3.0") < second.indexOf("## 0.2.0"));
  assert.ok(second.includes("- B\n\n## 0.2.0"));
});
