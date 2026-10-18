import assert from "node:assert/strict";
import { test } from "node:test";
import { releaseOptions } from "./release.mjs";

test("release options", () => {
  // Without --bump the commits pick it, in a preview too.
  assert.deepEqual(releaseOptions([]), { bump: "auto", dryRun: false });
  assert.deepEqual(releaseOptions(["--dry-run"]), { bump: "auto", dryRun: true });
  // As the Release workflow passes them, and in any order.
  assert.deepEqual(releaseOptions(["--bump", "minor"]), { bump: "minor", dryRun: false });
  assert.deepEqual(releaseOptions(["--bump", "auto", "--dry-run"]), { bump: "auto", dryRun: true });
  assert.deepEqual(releaseOptions(["--dry-run", "--bump=patch"]), { bump: "patch", dryRun: true });
  // A mistake stops the release instead of making a patch.
  for (const args of [["--bump"], ["--bump", "huge"], ["--bump", "--dry-run"], ["--dryrun"], ["minor"]]) {
    assert.throws(() => releaseOptions(args), Error, args.join(" "));
  }
});
