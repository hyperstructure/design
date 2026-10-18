import assert from "node:assert/strict";
import { test } from "node:test";
import { parse } from "./commits.mjs";
import { releaseDue, releaseOptions } from "./release.mjs";

test("release options", () => {
  const defaults = { bump: "auto", ifDue: false, dryRun: false };
  // Without --bump the commits pick it, in a preview too.
  assert.deepEqual(releaseOptions([]), defaults);
  assert.deepEqual(releaseOptions(["--dry-run"]), { ...defaults, dryRun: true });
  // As the Release workflow passes them, and in any order.
  assert.deepEqual(releaseOptions(["--bump", "minor"]), { ...defaults, bump: "minor" });
  assert.deepEqual(releaseOptions(["--bump", "auto", "--if-due"]), { ...defaults, ifDue: true });
  assert.deepEqual(releaseOptions(["--bump", "auto", "--dry-run"]), { ...defaults, dryRun: true });
  assert.deepEqual(releaseOptions(["--dry-run", "--bump=patch"]), {
    ...defaults,
    bump: "patch",
    dryRun: true,
  });
  // A mistake stops the release instead of making a patch.
  for (const args of [["--bump"], ["--bump", "huge"], ["--bump", "--dry-run"], ["--dryrun"], ["minor"]]) {
    assert.throws(() => releaseOptions(args), Error, args.join(" "));
  }
});

test("a merge releases features, fixes, reverts and breaking changes", () => {
  const due = (...subjects) => releaseDue(subjects.map((s) => parse("1", s)));
  assert.equal(due("docs: a", "feat(gl): b (#9)"), true);
  assert.equal(due("fix(tokens): a"), true);
  assert.equal(due("perf(gl): a"), true);
  assert.equal(due("revert: a"), true);
  assert.equal(due("refactor(gl)!: a"), true);
  assert.equal(releaseDue([parse("1", "chore: a", "BREAKING CHANGE: b")]), true);
  // The rest waits for the next release.
  assert.equal(due("docs: a", "ci: b", "test: c", "refactor: d", "build(deps): e", "chore: f"), false);
  assert.equal(due("chore(release): v0.4.0"), false);
  assert.equal(due("Tidy up"), false);
  assert.equal(due(), false);
});
