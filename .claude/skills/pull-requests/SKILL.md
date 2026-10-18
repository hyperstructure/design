---
name: pull-requests
description: What to do once a pull request is open in hyperstructure/design. Covers waiting for CI in the same turn and fixing failures, the title check, answering review comments in their threads, keeping the branch current, and what to do after the merge (no pushes to the merged branch, ticking the issue, saying whether the change is live). Use right after `gh pr create`, when asked about a pull request's CI, reviews or state, and after a merge.
---

# After opening a pull request

Opening the pull request is not the end of the work: it is done when CI is
green, the review is answered and the merge is recorded in the issue. How
to write the title and description is in the `commit` skill. These are the
same rules as in hyperstructure/fctl.

## Wait for CI in the same turn

```sh
gh pr checks N --watch --fail-fast
```

or, for one run, `gh run watch ID --exit-status`. Do it before you end your
turn. An fctl session goes idle when the turn ends, and nothing wakes it
when CI finishes or someone reviews (hyperstructure/fctl#8 will), so a failure you don't watch
for stays unnoticed.

The checks: **Commits** checks the title, and **CI** (`check`) runs `npm run check`, `npm test` and `npm run build`.

## When a check fails

1. Find the run and read the failure:

   ```sh
   gh run list --branch "$(git branch --show-current)" --limit 5
   gh run view ID --log-failed
   ```

2. Reproduce it locally with `npm run check && npm test && npm run build`, fix it, commit, push, and watch
   again.
3. The title check fails on the title, not the code:
   `gh pr edit N --title "fix(…): …"`. Only the Commits workflow reruns.
4. If it looks like infrastructure (a timeout, a registry or network error),
   rerun it once with `gh run rerun ID --failed`. If it fails again, treat
   it as real.
5. Don't ask anyone to merge a red pull request, and don't skip or weaken a
   check to make it pass.

## Review comments

Read the conversation, and the comments on lines of code:

```sh
gh pr view N --comments
gh api repos/{owner}/{repo}/pulls/N/comments \
  --jq '.[] | {id, path, line, user: .user.login, body}'
```

Answer **every** comment in its own thread. Either fix it, push, and reply
with what changed (and the commit), or say plainly why not:

```sh
gh api repos/{owner}/{repo}/pulls/N/comments/ID/replies -f body="Fixed in abc1234: …"
gh pr comment N --body "…"   # for comments on the conversation
```

Leave resolving threads to the reviewer. If a comment asks for something
outside the pull request, say so and offer an issue (the `issues` skill).
After changes, update the description so it still says what the pull
request does: it becomes the commit message.

## Keeping the branch current

When `main` moves on and the pull request conflicts, or CI needs the newer
base, update your own branch:

```sh
git fetch origin
git rebase origin/main         # resolve, rerun the checks
git push --force-with-lease
```

Only ever force-push your own pull request branch, never `main`.

## After the merge

Check it: `gh pr view N --json state,mergeCommit,mergedAt`.

- **Don't push to the merged branch.** GitHub deletes it. Follow-ups go
  on a new branch from the updated `main`, in a new pull request that
  links the first.
- **Record it in the issue.** Tick what the merge completed and link the
  pull request. If it had `Refs`, comment what is left (the `issues` skill).
- **Say where it is live.** Merging changes nothing for consumers until
  a release and a pin bump:

  ```sh
  git fetch --tags origin
  git tag --contains MERGE_SHA    # empty: not released yet
  ```

  Then say "released in vX.Y.Z" (and whether fctl and fctl-site moved their
  pin), or "ships with the next release". Releasing and moving the consumers
  are the `release` skill's job, for those with access.
