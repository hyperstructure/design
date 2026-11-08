# The changes viewer

How fctl's web app shows what a session's agent changed: the Changes section beside a session, and the dialog that opens from it with every changed file's diff in one scroll, which follows the agent live as it works. Written from the code on `main` (`web/src`), its tests, the commits that built it (fctl#386, #388, #392, #398, #400), ADR 0074 and the notes earlier agents left. Paths are relative to `web/src` unless they say otherwise. Sizes are CSS pixels; Tailwind 4 spacing is 4 px a step (`h-6.5` is 26 px); the design package's radii are `rounded-sm` 6, `rounded-md` 9, `rounded-lg` 13, `rounded-xl` 18 px. Easings are the design package's tokens: `--ease-out` cubic-bezier(0.16, 1, 0.3, 1), `--ease-in-out` cubic-bezier(0.65, 0, 0.35, 1), `--ease-spring` cubic-bezier(0.34, 1.36, 0.64, 1).

Vocabulary used below:
- a **version** is one diff of a file as the agent last read it, named by its **digest** (`FileChange.digest`, which changes whenever the diff does);
- a **change**, for stepping and counting, is a run of lines added or taken out (one under the other);
- a **hunk** is git's `@@` block;
- **the band** is what the reader sees of the diffs: from under the sticky header of the file at the top of the view to the view's bottom edge.

## Purpose

People delegate code to agents and need to see the code. A pull request shows only what the agent pushed, exists only once it opened one, and the sandbox holding the work stops with the session. So each session keeps the latest diff of every changed file (ADR 0074: at most 512 KB a file and 8 MB a session) and the page shows them: work in progress, uncommitted work, repositories the agent doesn't push to, and sessions that stopped long ago.

The viewer does three jobs:
- **Review.** Read every change in a session fast, file after file, with what a code editor offers: keys, find, side by side, wrapping.
- **Follow.** Watch the agent change files while it works without losing one's place: a new version comes in where the reader looks, and the line they are reading never moves.
- **Locate.** Get from "this file changed" (a row in Changes, a file a turn edited, `c`) to its lines in one step.

### Where the diffs come from

- Each time fctl-agent reads the session's repositories (after each turn, and while Claude works, soon after tool calls that can change files), it also reads each changed file's diff: `git diff` from the merge base of the branch and `origin/<base>`, uncommitted and untracked work included (every line of an untracked file added). Each changed file in the `git` event carries the digest of its diff.
- The agent hands the diffs to its host before the event that lists their digests; the host passes on, over the session's uplink, those the session lacks. The session object keeps the latest diff of each file and forgets those of files no longer changed. It is not a history: the viewer can show one version of a file, and the motion between versions is the page's own work.
- The page reads them with `GET /api/v1/sessions/{id}/diff` (all at once) or per file, keyed by session, repository, path and digest. A digest's diff never changes, so it is cached for good; a new digest is a new version.
- The file list and its counts come from the `git` event (`git diff --numstat`), not from the diffs: the rail can list files whose diffs are still on their way, or too large to keep.

### Decisions recorded along the way

From the pull requests that built it (#386, #388):
- The control plane keeps code (the latest diff of each changed file), so diffs show for sessions that stopped; asking the live sandbox would show nothing for most sessions people read.
- The dialog links a file on GitHub only while the branch is pushed and its pull request isn't merged, since GitHub may delete a merged branch.
- Additions are green wherever a session's lines are counted, session lists included, so the same numbers have the same color everywhere.
- One scroll for every file replaced one file at a time; header buttons stopped taking the focus; the list's rows show focus as their own outline; a row a click opened the dialog from gets the focus back without a ring.
- `/` stays the list's filter and ⌘F the way into finding; ⌘F again in the bar opens the browser's own find; `n`/`p` step from change to change across files.
- Matching is literal and ignores case unless a toggle says otherwise, as in code editors, unlike the transcript's find, which also ignores accents and how much whitespace separates words: code search is more useful exact.

## Where it opens from

- **Changes, in the session's details** (`routes/session.tsx` `Details`, `components/session/changes.tsx`). In the right rail (340 px, from 1024 px wide) on both the classic and the new view; on narrower screens in the details sheet, after the pull requests (phones open those most). Titled "Changes" ("Changes reviewed" for a review agent's session). One list per repository with changes: the primary one first, then each other repository the agent cloned, under its `owner/name` in 12 px mono, with "read only" when the agent can't push there. Each row is a button: the change letter, the full path (mono 12 px, `text-ink-2`, `text-ink` on hover), and a 48 × 6 px bar on a `bg-raised` track, green (`bg-added/80`) then red (`bg-danger/70`), each as long as its share of the largest file's change, so the biggest file fills its bar. The row's `title` says "path: modified, +12 −3" and its `aria-label` "path, modified: show its diff". The first 10 files show; "Show 24 more files" appears only from 12 files, since a button in place of a single file saves no room; folding the list again scrolls its button back into view. A totals line follows: `+A −D` in green and red, "N commits", and where they are ("pushed", "not pushed yet", "kept in the sandbox", "#12 merged", "2 commits since, not pushed"). With no files: "No changes yet."
- **`c` on a session's page** opens the dialog at the first file of the first repository with changes; with none, a toast says "No changes yet" ("No changes to review yet" for a review agent).
- **A turn's end, in the new view** (`components/session/turns.tsx` `Outcome`). The line that closes a turn says "Edited 3 files +40 −12" (the counts in mono 11 px, green and red at 80% when above zero, `text-ink-4` at zero) with a chevron; it opens a list (`animate-rise`, each row stepping in 14 ms after the one above, the ninth and later together). Rows are the files the agent changed with its edit tools (Edit, MultiEdit, Write, NotebookEdit), not those its commands changed: a pen icon, the directory in `text-ink-4` (it truncates first), the name in `text-ink-2`, the lines, and an arrow that appears on hover (not below 768 px). A row whose file is among the session's changes now is a button titled "Open its changes"; one that isn't (reverted since, or outside the repositories) is plain text titled "Not among the session's changes now". `changeOf` maps `~/repos/<owner>/<name>/path` (where fctl tells agents to clone other repositories) to that repository's group.
- **Diff groups** (`useDiffGroups` in `routes/session.tsx`) build what the dialog shows from the session's git state: the primary repository (titled `owner/name`, or `~/workspace` without one), then the other repositories with changes, each with a `blob` function that links a path on GitHub on the session's branch. That link exists only while the branch is pushed, isn't a detached `HEAD`, and its pull request isn't merged, since GitHub may delete a merged branch; deleted files never get one.
- **Overlays belong to their session.** The router keeps the page when a link or Back leads to another session, so the dialog closes in the same render as the new session comes in, without the view transition showing it over the next session.

The glance at the top of the new view counts files changed with the same rolling figures but doesn't open the dialog.

## Anatomy

### The dialog (`components/session/diff-dialog.tsx`)

- A native modal `<dialog>`, portalled to `document.body`, `aria-labelledby` its "Changes" heading. From 640 px: 20 px from every edge of the window (`h-[calc(100dvh-2.5rem)]`, `w-[min(1440px,calc(100vw-2.5rem))]`), `rounded-xl` (18 px), a `border-line-strong` hairline, a deep shadow (`0 30px 120px rgb(0 0 0 / 0.55)`), the page behind dimmed to 55% black and blurred 3 px. On phones it fills the screen (`h-dvh w-screen`, no border or corners).
- `bg-surface`. It opens with `animate-rise` (420 ms `--ease-out`: from 6 px lower, 0.5% smaller, 2 px blurred) and closes at once.
- It holds the page behind still (`useHoldPage`: `overflow: hidden` on `<html>`, keeping a scrollbar's room with `scrollbar-gutter: stable` so nothing shifts). Overlays opened from one another share the hold.
- It closes on Escape, its X ("Close (Esc)"), or a press on the backdrop: only when both the press and the release land there, so a text selection dragged past the edge doesn't close it.
- Under the header: the file list on the left, then the diffs column (the find bar when open, then the scrolling diffs). The scrolling region is `bg-canvas/40`, `overflow-auto overscroll-contain`, `tabIndex=0` so the keys scroll it, and `overflow-anchor: none` (the dialog keeps the reader's place itself, [Holding the reader's place](#holding-the-readers-place-componentssessiondiff-livetsx-uselive)). After the last file: "End of the changes" (12 px `text-ink-4`, centered, 32 px above and 48 px below).

### The header

One row, 52 px (32 px buttons with 10 px above and below), `border-b border-line`, gaps of 8 px (12 px from 640 px). In order:
1. **The list toggle** (`PanelLeft`), "Show the changed files" / "Hide the changed files", `aria-expanded`, `text-ink` while the list shows.
2. **"Changes"** (14 px medium `text-ink`, the dialog's `h2`), then "9 files +907 −304" in 12 px `text-ink-3`, the counts in 11.5 px mono `tabular-nums`, green and red, rolling as they change. Hidden on phones.
3. **Find** (`Search`), "Find in the diffs (⌘F)" (Ctrl+F off Apple systems), `aria-pressed`, `bg-hover text-ink` while the bar is open.
4. **Files, as a `nav`** "Changed files": previous ("Previous file (k)"), the position "6/9" (11.5 px mono, the total in `text-ink-4`, at least 4.5 characters wide so it doesn't jitter, `aria-live="polite"`), next ("Next file (j)"). The ends disable their button.
5. A 20 px vertical rule (`bg-line`, from 640 px).
6. **Layout**, from 900 px only: a segmented control (`rounded-md border-line p-0.5`) of two 30 × 26 px buttons, "One below the other (s)" (`Rows3`) and "Side by side (s)" (`Columns2`), `aria-pressed`; the chosen one `bg-raised text-ink` with a 1 px `line-strong` ring, the other `text-ink-4`.
7. **Wrap** (`TextWrap`): "Wrap long lines (w)" / "Scroll long lines (w)", `aria-pressed`, `bg-hover text-ink` while wrapping.
8. **Close** (X).

Every header button is an `IconButton` (32 px, `rounded-md`, `text-ink-3`, `hover:bg-hover hover:text-ink`, `active:scale-95`, 16 px icons, its label as `aria-label` and tooltip with its key). Buttons that act on the diffs `preventDefault` on mouse down, so a click leaves the focus in the diffs, where the arrow keys keep scrolling them.

### The file list (`components/session/diff-files.tsx`)

- **Placement.** From 1024 px, a 288 px column at the left with a right border; whether it shows is kept per browser. Below 1024 px it covers the diffs when opened (`absolute inset-0`, `animate-fade`), as a 340 px panel from 640 px and the full width on phones; it starts closed and closes when a file is picked.
- **Filter.** Above the list when there are more than 6 files: a 32 px field (`rounded-md border-line bg-sunken`, `line-strong` border while focused) "Filter 34 files", with a `/` key cap from 640 px. Every word typed must be in the path, case aside. Enter goes to the first file shown, ↓ moves into the list, Escape clears the filter before it would close the dialog. With nothing left: "No changed file matches."
- **Grouping.** By repository (its title in 11.5 px mono `text-ink-3`, only when several repositories have files), then by directory: files at the root first, then each directory once, in the order the agent's list first names it (`byDirectory`). A directory line is 11 px mono `text-ink-4` with a 12 px folder, its path truncating; its files are indented to 22 px (10 px at the root). The diffs follow the same order.
- **A row** (`FileRow`): a button, `rounded-md`, 6 px above and below. The change letter (11 px mono, 12 px wide: A green for added and untracked, D red, M and R blue), the name (12.5 px mono, truncating; the full path is the tooltip), then either the counts (10.5 px mono, `text-added/80` and `text-danger/80`, rolling) or, while finding, the matches (an `accent-soft` pill, 10.5 px mono `text-ink`). Files without matches dim to 45% while finding. A file that just changed shows a 6 px accent dot that pulses ("Just changed") for 2.6 s.
- **The file in view** has `bg-hover text-ink`, a 2 px accent bar at its left edge (6 px from top and bottom, rounded) and `aria-current`. The list keeps it in sight: centered as the list opens (a frame later, since nothing scrolls in a dialog that isn't showing yet), then scrolled only as far as needed.
- **Focus.** The list is one Tab stop (roving `tabIndex`: the file in view, or the first shown). ↑ ↓ (and `j` `k` there), Home and End move to a file and take the focus with them, as in an editor's file tree. Keyboard focus shows as the row's own 1 px inset `line-strong` outline and the hover fill, not the page's yellow ring around it.
- **Key hints** at its foot from 1024 px: `j` `k` files, `n` `p` changes, `⌘F` find, `s` side by side (only where it is possible), `w` wrap, in 11.5 px `text-ink-4` with key caps.

### A file's section and its header

- Each file is a `<section data-file={index}>` labelled by its heading, with a bottom hairline.
- **Header** (`FileHeader`): 40 px, sticky at the top while its lines scroll under it (`z-[3]`, `bg-surface`, bottom hairline). In order: a 24 px fold button (a chevron that turns 90° in 150 ms; "Hide the lines of src/a.rs", `aria-expanded`, tooltip "Hide its lines"); the change letter; the path as the `h3` in 12.5 px mono, the repository first in `text-ink-4` when the session has several, then the directory in `text-ink-4`, which gives way first (`shrink-[1000]`), then the name in medium `text-ink`, with an `sr-only` "Modified: " before it; a 24 px copy button ("Copy the path", a check and "Copied" for 1.6 s); "from old/path.rs" for a rename (11.5 px mono `text-ink-4`, from 768 px); a spacer; the "Updated" or "New" pill ([Signals around the lines](#signals-around-the-lines)); the counts (11.5 px mono, rolling); "GitHub ↗" (12 px `text-ink-3`, 28 px tall, from 768 px, while the branch is on GitHub).
- **Folding** leaves the header alone; the fold isn't kept. Going to a match or a change in a folded file opens it.
- **Above the lines**, when the file was renamed or its mode changed and it also has lines: a strip in 12 px `text-ink-3`, "Renamed from `old.rs`" and "Mode 100644 → 100755: executable now". Mode changes are explained in words (`modeChange`): "executable now", "no longer executable", "a symbolic link now", "no longer a symbolic link", or the two modes alone.

### Hunks and lines (`components/diff.tsx`, `lib/diff.ts`)

`DiffLines` draws the hunks; the transcript's edits use it too, without the live parts.

- **Type.** JetBrains Mono 12.5 px on a 20 px line (`leading-5`); every line at least 20 px; tabs 4 columns wide; ligatures off ("code as it is written: no arrows for -> nor spaced-out ::"). Text without highlighting is `text-ink-2`.
- **Gutter.** One below the other, two number columns: the line's number before and after, as the file has them. Each column is as wide as the longest number in the diff (at least 2 digits) plus 20 px, numbers right-aligned in 11.5 px `tabular-nums` with 10 px padding, `text-ink-4`. The gutter is sticky at the left while long lines scroll under it, opaque (it paints the diff's background, then the line's tint over it), with a hairline at its right (an inset box-shadow). Side by side, each half has one column. Gutters and marks are `select-none`, so a copied selection is code alone.
- **Mark.** A 20 px column: `+` or `−` (the minus sign, U+2212), colored, `role="img"` with `aria-label` "Added" or "Removed"; empty and `aria-hidden` for unchanged lines.
- **Code.** `flex-1`, 16 px right padding (12 px side by side).
- **Words that changed.** Between a line taken out and the line added in its place, the words that differ get a stronger tint (`.diff-word`, 3 px corners, `box-decoration-break: clone` so a wrapped mark keeps its ends). Only when the two lines share at least 40% of their trimmed text ("two lines that share nothing are just different") and neither is over 1,000 characters. Marks separated by nothing but spaces join into one (`skipped = []` is marked once, not in three), without spaces at their ends.
- **Pairing.** Lines taken out pair with added lines by what they have in common, not by position: a new comment above a changed signature stands alone, and the old signature sits beside the new one (`align`). Past 200 pairs to compare (lines out × lines in), lines pair by position.
- **Hunk header** (`HunkHeader`): at least 28 px, the brand blue's faint tint over the diff's background; in the gutter "⋯" (11 px, spaced 0.2 em), then "@@ −3,3 +3,4 @@" in 11.5 px `text-ink-4` (a count of 1 written as the line alone) and git's section, the function or heading it is in, in `text-ink-3`, truncating; `sr-only` "2 unchanged lines before". A file whose only hunk starts at its top without a section (a new or deleted file) shows no `@@` line: it says nothing the numbers don't.
- **No newline at end of file**: a 12 px slashed circle after the last line, `text-ink-4`, `role="img"`, labelled.
- **Side by side** (`layout="split"`): a two-column grid; the right half has a hairline at its left; a half without a line is hatched (`repeating-linear-gradient(135deg, transparent 0 5px, var(--c-line) 5px 6px)`). Side by side, lines always wrap.
- **Wrapping.** Scrolling (`.diff-scroll`): each file scrolls sideways on its own (`overflow-x: auto`, `white-space: pre`, content `w-max min-w-full`). Wrapping (`.diff-wrap`): `pre-wrap` with `overflow-wrap: anywhere`.
- **Highlighting** (`useTokens`, `lib/highlight.ts`). Shiki, loaded lazily, grammars per language, in two themes at once (`github-dark-default`, `github-light`) as CSS variables (`--shiki-dark`, `--shiki-light`), so a theme switch needs no new render. The language comes from the file's name, extension or first line (a `#!` line, a lockfile's format; `lib/languages.ts`). Each hunk's lines before (unchanged and taken out) and after (unchanged and added) are highlighted as two pieces of code, so a comment or string that spans lines colors as it does in the file; unchanged lines take their colors from the file as it is now. Hunks are highlighted one after another with a pause between them (a zero timeout) to let the page breathe. A language Shiki doesn't know stays plain text. Lines show plain until their colors come (except in a live new version, [How a new version arrives](#how-a-new-version-arrives)).
- **Line identity.** Each row carries `data-kind` (`add`, `del`, `context`) and `data-l="h:j"`, its hunk and place in it. `lib/diff.ts`'s `patchLines` numbers the raw patch the same way without parsing the rest, so finding and stepping from change to change work across every file at once, drawn or not.

### Shared with the rest of the session page

- **The transcript's edits** (`components/session/tool.tsx` `DiffView`) draw the same `DiffLines`, not live: in a bordered `rounded-md` box on `bg-sunken`, at most 420 px tall and scrolling, under a line with the path and `+A −D`. They are numbered as the file is when Claude Code's result carries its hunks (`structuredPatch`), with `@@` lines only when there are several hunks; otherwise they are what the edit's strings make, without numbers or headers ("go without numbers when nobody knows them").
- **`Rolling`** (`diff-live.tsx`) also rolls the figures of the new view's glance.
- **`changeOf`** (`diff-files.tsx`) gives every list of changed files its letter, word and color: the rail, the dialog's list and its headers.

## What to show, and how much

| What | Limit | What happens past it | Why |
|---|---|---|---|
| A file's diff kept by the session | 512 KB; 8 MB per session, smallest files first | "This diff is too large to show here" with the CLI command | The control plane keeps code only for its viewers |
| Lines the agent reads per file | 50,000 changed lines; 16 MB per refresh | `too_large` | ADR 0074, `docs/architecture.md` |
| Files a repository lists | first 500 by path | not listed | keeps the state small (inferred) |
| Rail list | first 10 files; the button from 12 | "Show N more files" | A button for one file saves no room |
| Filter field | more than 6 files | none shown | Short lists don't need one |
| Highlighting | 6,000 lines in a diff | plain text | It would hold the page up |
| Word marks | lines up to 1,000 characters, 40% in common | no marks | Marking most of a line says nothing |
| Pairing by similarity | 200 comparisons per block | pairs by position | Cost |
| Following versions | 20,000 lines in two versions, 4,000 edits, 100 ms | the new version shows as it is, without motion | "Too far apart to tell what became what" |
| Lighting a change out of sight | 60 rows | only rows from 200 px above to 600 px below the view light | A new file's thousand lines needn't all glow |
| Matches counted | 10,000 | "1 of 10,000+" | Cost |
| Selection used as the query | one line, up to 200 characters | ignored | As editors do |
| Files drawn | those within 1,600 px of the view (and those gone to) | a placeholder of their estimated height | Many files open quickly |

Room before a file draws (`roomFor`): 20 px a line plus 28 px a hunk header (when there is more than one) plus 8, once its lines are known; 220 px when its diff came without lines (binary, too large, a rename) or the file has no digest; otherwise (additions + deletions + 6) × 20 px, at most 4,000. Estimates keep the scrollbar honest and the reader's place holds when the real lines replace them ([Holding the reader's place](#holding-the-readers-place-componentssessiondiff-livetsx-uselive)). On #388's test sessions, 55 files opened in about 0.65 s with a simulated 200 ms network, and "diff" (894 matches) was found in about 75 ms.

There is no control to show the unchanged lines between hunks. That follows from keeping diffs rather than files (inferred: the code doesn't say so).

## States

- **Opening.** If the cache lacks any file's diff, one request asks for all of them (`GET /api/v1/sessions/{id}/diff`), which fills each file's cache; meanwhile no file asks on its own. Each file shows shimmering lines (`Loading`): as many as its change plus two, 3 to 10, of varied widths behind a 32 px number block, 12 px tall, 10 px apart, each 7% fainter than the one before, `aria-busy`, with an `sr-only` "Loading the diff". While they come, the find bar shows a spinner beside its count and says "None so far" rather than "No matches".
- **Far from the view.** An empty block of the estimated height (`aria-hidden`), until the file comes within 1,600 px. Its lines then fade in (`animate-fade`, 300 ms).
- **Live.** Section 6.
- **Unchanged since the last step.** The page lists the files anew at each step the agent takes; a file whose key, link, status, digest and counts are the same keeps its entry object, and its (memoized) section draws nothing again. Its diff, cached by digest (`staleTime: Infinity`, kept 10 minutes), is never asked for again.
- **The diff isn't there yet.** The agent sends a file's diff before the state that lists its digest, but the session may still hold the one before: while the digest the page got differs from the one listed, it asks again every 1.5 s (up to 8 times), keeping the file's previous diff on screen meanwhile (`placeholderData`). A 404 is asked again four times, after 0.6, 1.2, 2.4 and 4.8 s, other errors twice (TanStack Query counts failures from 0). Then: "The session doesn't have this diff yet. The agent sends it with its next look at the repository." with "Try again", or for another error "The diff didn't load" with its message and "Try again" (spinning while it asks).
- **Too large.** "This diff is too large to show here. 900 lines added and 300 taken out: more than the session keeps. The CLI prints it:" and a copyable box with `fctl diff 'web#12' package-lock.json` (the reference quoted for the shell, `--repo` for another repository, `--` before a path starting with `-`).
- **Binary.** "A binary file. git shows no lines of it." A file that changed type to or from binary (a binary file that became a symbolic link) shows the other half's lines instead, with its mode change above them.
- **No lines.** Renamed only: "Renamed, its lines as they were. From `old.rs`." (", its mode 100644 → 100755: executable now" when that changed too); mode only: "Only its mode changed. 100644 → 100755: executable now."; "An empty file. It has no lines."
- **From an older agent.** "No diff of this file. Diffs come from the session's agent, and this one sent none: its runner runs an older version of fctl."
- **Opened at a file that no longer changes.** It opens at the first file.
- **Everything reverted while open.** "No changes any more. The agent's work no longer changes any file."
- **Folded.** The header alone.

Notes (`Note`) share one shape: centered, 24 px around, a 36 px round icon on `bg-sunken` with a hairline, a 14 px medium title, 13 px `text-ink-3` prose up to 448 px wide, then an action. They fade in. They say why there are no lines and what to do instead, never just "Error".

**The voice of its copy.**
- Titles say what is so, in sentence case, without a full stop: "A binary file", "Only its mode changed", "The diff didn't load". The line under them gives the reason or the way on, as a sentence: "The agent sends it with its next look at the repository."
- Things are named as people see them: "lines added and taken out", not insertions and deletions; "the session doesn't have this diff yet", not a status code; mode changes in words ("executable now").
- Signs of change are one or two words: "Updated", "New", "Just changed", "3 new changes below", "End of the changes", "No changes any more".
- Every button's label says what it does, with its key in parentheses: "Next file (j)", "Wrap long lines (w)", "Close (Esc)", "Find in the diffs (⌘F)"; key caps show the platform's own (⌘ on Apple systems, Ctrl elsewhere; ⌥ or Alt).
- Placeholders say what the field holds and how much: "Filter 34 files", "Find in the diffs".

## Live changes

While the agent works, fctl-agent reads the repositories soon after tool calls that can change them (a burst costs one refresh, at most one every 10 s, about 2 s after tool results) and sends each changed file's diff ahead of the state that lists its digest. Each refresh can change several files' diffs at once. The dialog shows each new version in place.

### How a new version arrives

1. The file's listed digest changes. The list's row and the header's counts roll; the list row's dot says "Just changed".
2. The file's query fetches the new diff, showing the previous one until it comes.
3. A live diff waits up to 450 ms (`WAIT_FOR_COLORS`) for the new version's colors before showing it, so new lines are written in already colored instead of coloring after they arrive; past that it shows without them and colors them later.
4. `nextLive` (`lib/diff-motion.ts`) matches the new version's rows to those on screen and says how each came ([Matching one version to the next](#matching-one-version-to-the-next)). Rows that stay keep their React keys, so their elements, and the reader's place, stay.
5. On commit, `play` (`components/diff-play.ts`) plays the rows that came, went or changed ([Where it plays, and where it doesn't](#where-it-plays-and-where-it-doesnt), [Each animation](#each-animation)). Every file whose diff changed in the same React commit plays together, gathered over a microtask: measured once where they end up, one hold, one wave.
6. At 920 ms (`SETTLE_MS`) the version settles: rows that went are removed (they finished closing) and every row is plain "kept" again. The lights finish on their own clock and are cleared 200 ms after the last.

### Matching one version to the next

The file as it was before the session doesn't change, so an unchanged line or a line taken out is the same line in both versions when its old line number and text agree. An added line is the same when it reads the same and sits by the same unchanged line on at least one side. On those terms the two versions' lines are compared (`diffArrays`), giving each row a `How`:

| How | Meaning | What plays |
|---|---|---|
| `kept` | as it was (its numbers may have moved) | nothing |
| `entered` | new: the agent's change, or the unchanged lines that came with it | the row opens; added code is written in, a line taken out turns red; unchanged lines only open |
| `gone` | not in this version | the row closes, then goes; `aria-hidden`, no `data-l` |
| `rewritten` | a line the agent added before, written over | written in over what it said before, from where it changed |
| `marked` | an unchanged line, taken out now | turns red from the left |
| `unmarked` | a line taken out before, unchanged again | its red fades to plain; never lit or counted |
| `moved` | an added line the lines taken out beside it moved past (git writes those first) | opens where it is now as its old row closes |

Added lines that went beside added lines that came pair up in order as rewrites (the same text is simply kept). Each new hunk takes the `@@` line of the old hunk its first kept line was in, so a hunk header stays put when hunks join or split; a hunk that is new opens with its header, one no hunk took closes. In side by side, a row opens or closes when both its halves do.

### Where it plays, and where it doesn't

Motion only where the reader sees it. At each version, after holding the reader's place:
- **Rows that show play**: those in the band, plus those below it that rows opening above them bring into view as they open (the opening rows' heights are added to the band's reach).
- **Rows above the view** take their room at once, out of sight, and the reader's line stays put ([Holding the reader's place](#holding-the-readers-place-componentssessiondiff-livetsx-uselive)).
- **Rows below** are left as they are; rows that go there go at the settle.
- **Code changed out of sight** isn't played. Adjacent rows (side-by-side halves count as one row) group into one change, and each change goes on the waiting list that the "new changes" buttons count ([Changes out of sight](#changes-out-of-sight)). A file changed while not drawn (far away, its lines not shown yet) waits as its whole section; going to it goes to its header, and its lines then show as they are, without writing in.

### Each animation

| Animation | What it tells the reader | How | Duration | Easing | Delay |
|---|---|---|---|---|---|
| Row opens | a line came here | Web Animations on the row: `height` 0 → its measured height, `min-height: 0`, opacity 0 → 1, `clip-path: inset(0)`; fill backwards | 300 ms (`OPEN_MS`) | `--ease-out` | its place in the wave |
| Row closes | a line went | the reverse; fill forwards | 240 ms (`CLOSE_MS`) | `--ease-in-out` | none: all close together |
| Writing in | the agent wrote this | the code's mask edge moves right, driven by `--diff-x` | 7 ms a column, kept within 220–560 ms | cubic-bezier(0.32, 0.08, 0.24, 1) | wave + 90 ms when its row opens |
| Caret | where the writing is | a 2 px bar in the accent with a soft glow, at the middle of the mask's soft edge | as writing; opaque until 80%, then fades out | linear | as writing |
| What it said before | a rewrite, not a new line | the old text, in `text-ink-3`, shows ahead of the caret under the inverse mask | as writing | | |
| Turning red | this line is taken out now | the row's red moves to a layer that grows from the left (`scaleX(0)` → 1) | 520 ms | `--ease-out` | wave |
| Fading to plain | a line taken out is back | that layer's red fades to nothing | 700 ms | `--ease-out` | wave |
| Lit | what changed, for a moment | a wash of the highlight from the left, fading out by 70% of the width (at most 56 rem), and a 2 px bar at the gutter's left edge | 2,600 ms: in by 4%, held to 45%, out by 100% | linear | as writing |
| Header light | this file just changed | a glow 32% of the header's width runs along the header's bottom edge, from off its left (`translateX(-100%)`) to off its right (`320%`), fading over its last 20% | 1,100 ms | `--ease-in-out` | |
| "Updated" / "New" | this file just changed / the agent just made it | a pill in the header with a pulsing dot | shown 2,600 ms, fades in over 300 ms | | |
| Rolling counts | a count moved, and which way | the new figure rolls in from 0.75 em below out of a 2 px blur as the old rolls up and out (the other way when it shrinks) | in 300 ms, out 220 ms | `--ease-out` | |
| New file | a file joined | its section fades in; its lines are written in from nothing; its list row steps in from 3 px above | 300 ms; 220 ms | `--ease-out` | |
| "New changes" button | changes out of sight, and on which side | slides in from 8 px toward its edge, 96% → full size; out the same way to 98% | in 260 ms, out 180 ms | `--ease-spring`; `--ease-in-out` | |

Timing values and why:
- **The wave.** Rows open one after another from the top, 26 ms apart (`STAGGER_MS`), closer when many come: the last starts within 380 ms (`CASCADE_MS`), so a screenful arrives as quickly as a few lines (with 30 rows, about 13 ms apart). Rows at the same height (side by side) start together.
- **Writing pace.** 7 ms a column reads as typing without slowing reading; the 220 ms floor keeps a one-word edit visible, the 560 ms ceiling keeps long lines from dragging. A line's width is the longer of what it says and what it said, tabs counting four.
- **From where it changed.** A rewritten line is written from the start of the first word that differs (`unchanged`: "/// What it comes to." → "/// What it came to." starts at column 12, the start of "came", not at the changed letter). The part before stays as it was, clear of the 2.5-character soft edge, and the pace counts only the rest.
- **Lit for 2.6 s** (`LIT_MS`), the same as the "Updated" pill and the list's "Just changed" dot (`useChanged`'s default), so every sign of one change lasts as long.
- **Settling at 920 ms** is the longest cascade (380 ms) plus an opening (300 ms) plus 240 ms to spare.
- **The place holds** each frame for as long as rows move, plus 32 ms.

How the writing is built, since the pattern is easy to get wrong: one registered custom property, `--diff-x` (a `<length>` that inherits, at rest 100,000 px so a line shows whole), is animated from the start column to past the end. The text's mask, the old text's inverse mask and the caret's position all read it, so they can't drift apart:

```css
@keyframes diff-write {
  from { --diff-x: calc(var(--diff-from) * 1ch + min(var(--diff-from) * 100ch, var(--diff-edge))); }
  to   { --diff-x: calc(var(--diff-w) + var(--diff-edge)); }
}
[data-play="entered"] .diff-text { mask-image: linear-gradient(90deg, #000 calc(var(--diff-x) - var(--diff-edge)), transparent var(--diff-x)); }
[data-play="entered"] .diff-code::after { left: calc(var(--diff-x) - var(--diff-edge) * 0.5); /* the caret */ }
```

`--diff-edge` is 2.5 characters; `--diff-w` is the line's width (its columns × `1ch`); the `min(…)` adds the soft edge only when the line is written from a column past 0, so the part it keeps stays clear of it. `play` sets `--diff-chars`, `--diff-from`, `--diff-write-ms` and `--diff-delay` on each row, and `data-play` says which look applies. A row that plays is `position: relative; isolation: isolate`, so its washes sit behind its code and above its own background, and its code box clips with a 3 px margin (`overflow: clip`) for the caret and the old text.

### One version, from the top

Three lines the agent added in view, about 40 characters each:
- 0 ms: the place holds (rows above take their room); the three rows start opening at 0, 26 and 52 ms.
- 90, 116 and 142 ms: each line starts writing in, behind its caret, for 280 ms; its light comes up within about 100 ms.
- About 420 ms: the last line is written; carets have faded.
- 920 ms: the version settles; rows that went are gone.
- About 1.3 s to 2.7 s: the lights fade; the "Updated" pill goes at 2.6 s.
- About 2.9 s: the rows' play state is cleared, unless the agent changed them again meanwhile (a row lit again keeps playing).

### Holding the reader's place (`components/session/diff-live.tsx` `useLive`)

The line the reader reads must not move, whatever the agent does above it.
- **The anchor** is the first row (line or hunk header) under the header of the file at the top of the view, with its section, its `data-l` and its distance from the top of the diffs. It is picked again on every scroll.
- **Holding**: a `ResizeObserver` on the column of files calls `hold()`, which scrolls by however far the anchor moved. While rows open and close, `moving(ms)` holds it every frame. So rows that come or go above the anchor, and files above it that draw their lines in place of an estimate, change nothing on screen; changes below the anchor push the rest down, as reading expects. It holds at the very top of the diffs too, which the browser's own scroll anchoring wouldn't; that anchoring is off (`overflow-anchor: none`) so the two don't fight.
- **Drawn anew.** When the anchor's row is replaced (the layout switched between one below the other and side by side), it finds the line with the same `data-l` in the same section. If that file went (the agent put it back as it was), it picks a new anchor rather than taking the same line of the next file.
- **A file gone to stays at the top** (the pin): after a jump to a file, its header stays at the top while files above it draw and take their room, until the reader scrolls (wheel, touch, a press, or a scrolling key in the diffs). The pin also places the file opened once the dialog has a size (the first trap in [Edge cases and traps](#edge-cases-and-traps)).
- **Code that scrolls the diffs itself** (going to a file, a change, a match) calls `pick()` afterwards so the new place is the one held.

### Changes out of sight

- Each waiting change is counted as above or below the band, and two buttons say so: "3 new changes below", "1 new change above". Centered, the one above 52 px from the top of the diffs (under the 40 px file header), the one below 16 px from the bottom, over the headers (`z-[4]`).
- The button: 28 px, round, `bg-raised`, a `line-strong` hairline, 12 px medium `text-ink`, a shadow `0 8px 28px rgb(0 0 0 / 0.32)`, an arrow in a 16 px `bg-highlight` circle. It slides in from its edge and stays 200 ms as it fades out once its count reaches zero. It keeps the focus in the diffs.
- A press goes to the nearest change on that side: into the middle of the view (gliding when near, jumping when far), or to its file's header when the file isn't drawn.
- **Seen** is decided at the next frame after a scroll: a change whose first row is in the band leaves the list and its rows light up ("seen": the same wash and bar as a write, for 2.6 s). For a change of 60 rows or more, only the rows near the view light. While rows are opening or closing, nothing counts as seen: rows that move past a change are no sign the reader saw it.
- A row the agent changes again while it is lit plays on; one changed again out of sight waits again and lights when the reader comes to it.

### Signals around the lines

What the lines can't say alone:
- **The header's light** runs along the bottom edge of a file's header each time its diff changes, even when the change is out of sight under it.
- **"Updated"** (its diff changed) or **"New"** (the agent made the file while the dialog shows): an 11 px pill, `bg-accent-soft text-accent`, with a 6 px pulsing accent dot, for 2.6 s.
- **"Just changed"** in the list: the pulsing dot on the file's row.
- **Rolling counts** in the dialog's header, each file's header and each list row: the figure that changes rolls up as it grows and down as it shrinks; the old figure is `aria-hidden`.
- **New files**: the section fades in, its lines write in from nothing (it shows no loading skeleton, since its lines come in as they come), and its list row steps in. Files there when the dialog opened never step in again.

### Reduced motion

`prefers-reduced-motion: reduce` keeps what each sign says and drops the movement.
- Rows don't open or close: `play` checks the setting and runs no Web Animations (which the stylesheet's rule can't reach), so new rows take their place at once and rows that went go at the settle.
- Code isn't written in and there is no caret: each row that would be written or turned red gets the "seen" light instead; a line put back isn't lit.
- The light shows at full strength at once and goes at once after 2.2 s: `diff-lit-still` is a 1 ms animation delayed 2,200 ms, since the app's global rule (`animation-duration: 0.01ms !important`, one iteration) cuts durations but not delays.
- The header's light doesn't show at all (it animates only under `no-preference`).
- Pills, dots, rolling figures, the button and new rows appear and disappear without moving; going to a match never glides.

## Keyboard, navigation and finding

### Keys

| Key | Does | Where |
|---|---|---|
| `c` | opens the changes at the first file | a session's page |
| `j` / `k` | next / previous file; `k` goes to the top of the file in view first when the reader is down in it | the dialog |
| ↑ ↓ (and `j` `k`), Home, End | file to file, the focus with them | the list |
| `n` / `p` | next / previous change, across files | the dialog |
| `s` | side by side, or one below the other (kept) | the dialog |
| `w` | wrap or scroll long lines (kept) | the dialog |
| `/` | shows the list and focuses its filter (which lists of more than 6 files have) | the dialog |
| ⌘F (Ctrl+F) | opens the find bar, its text selected; again in the bar, the browser's own find | the dialog |
| Enter / Shift+Enter | next / previous match | the find field |
| ⌘G / ⌘⇧G, F3 / Shift+F3 | next / previous match | while the bar is open |
| Alt+C, Alt+W, Alt+R (⌥ on a Mac) | match case, whole words, regular expressions (kept) | while the bar is open |
| Escape | closes the find bar while it is open; in the filter, clears it first; else closes the dialog | the dialog |

- Single keys never act while typing in a field, with ⌘, Ctrl or Alt held, or during an IME composition.
- ⌘ counts as the modifier everywhere, Ctrl only off Apple systems, for a Mac whose browser claims to be something else.
- The Alt toggles go by the physical key (`e.code`), since ⌥C types "ç" on a Mac; Ctrl+Alt is left alone (AltGr on Windows).
- The dialog is marked `data-shortcuts="changes"`, so the shortcuts sheet (`?` or ⌘/) opened over it lists "In the changes" and "Finding" first. `lib/shortcuts.ts` lists every key above with its label except F3 and Shift+F3, which `diff-dialog.tsx` takes on its own (so the shortcuts sheet and `aria-keyshortcuts` name only ⌘G and ⌘⇧G); the dialog handles them all itself, since the app's global shortcuts leave keys in open dialogs to the dialog.

### Going to files and changes

- **A file**: its header goes to the top, and it stays there ([Holding the reader's place](#holding-the-readers-place-componentssessiondiff-livetsx-uselive)). The file in view is otherwise the one whose section is under the top of the view, found by binary search once a frame while scrolling.
- **A change** is the start of a run of lines added or taken out (`changeStarts`). `n` goes to the first change after the line three lines (60 px, `CHANGE_MARGIN`) under the header at the top of the view, and puts it 60 px under its file's header, so three lines of context show above it. Repeated `n`/`p` step from the change last gone to while the reader hasn't scrolled (within 2 px), else from where they are now.
- **Going somewhere not drawn yet**: the file is unfolded and forced to draw, and the dialog tries once a frame, for up to 120 frames, until the line exists.
- **Bringing a match or a change into view** (`bringIntoView`): sideways first in a scrolling diff, so the match clears the sticky gutter by 20 px and sits about a third of the way in; then, unless it already shows clear of the header and 10 px from the edges, up or down to the middle of the view. Further than one and a half views it jumps, as a browser's find does; nearer it glides; with reduced motion it always jumps.

### Finding (`components/session/diff-find.tsx`, `lib/diff-find.ts`)

- **The bar** sits over the diffs column, under the header: a 32 px field (`rounded-md`, `bg-sunken/60`, `line-strong` border; focused, an accent border at 70% and a 3 px `accent-soft` ring; `danger/60` when the expression is wrong) with a search icon, the query in 12.5 px mono (placeholder "Find in the diffs" in the sans face), the count, the three toggles (24 px, `rounded-[5px]`; on: `bg-accent-soft text-ink` with an inset `line-strong` hairline), then previous, next ("Previous match (Shift+Enter)", "Next match (Enter)", disabled with no matches) and "Close the search (Esc)". It is a `<search>` landmark and fades in.
- **The count**: "3 of 12", "1 of 10,000+" when capped, "No matches", "None so far" with a spinner while diffs are still coming, or what is wrong with a regular expression ("Unterminated group"), in red with `aria-invalid` on the field. `aria-live="polite"` and the field's description.
- **Matching** is what code editors do, not the transcript's find: literal, case ignored unless asked, a whole word when asked (letters of any script count as word characters when the query is literal, so "café" is a whole word), a regular expression when asked. Empty matches (`^`, `x*`) are skipped rather than looping. The transcript's find also ignores accents and the amount of whitespace; code search is more useful exact (#388).
- **From where the reader is.** A new query goes to the match nearest the one the bar was at, if the reader is still there, else the nearest after the top of the view. Stepping goes on from the current match while the reader stays; once they scroll away (wheel, touch, press, scroll keys), the next step starts from where they are.
- **Diffs change under it**: the bar keeps its match by key (file, line, start) or takes the nearest, without moving the page. A step always moves the page, even to the same single match.
- **The words selected in a diff** become the query when ⌘F opens the bar. The field takes the focus and selects its text at each ⌘F, before the next key arrives, and only then, so typing on replaces nothing again.
- **Lighting the matches** uses the CSS Custom Highlight API (`CSS.highlights`): two highlights, all matches and the current one, named apart from the transcript's (`fctl-diff-find`, `fctl-diff-find-current`) so the page behind keeps its own. Nothing is inserted into the code. They are repainted (once a frame at most) as a `MutationObserver` sees files draw, colors arrive or the layout change, and removed when the bar closes. Side by side, a match on an unchanged line lights on both halves.
- **The list** counts matches per file and dims the files without any.
- **Closing** returns the focus to the diffs and leaves the current match selected, as a browser's find does.
- `/` stays the list's filter; ⌘F is the way into finding (#388).

### Focus

- Opening: the `<dialog>` element carries `autofocus`, so `showModal()` focuses the dialog itself rather than its first button (presumably to keep a ring off that button, as the app's other dialogs had to), and the diffs then take the focus without scrolling, so the arrow keys, Page Up and Down and Space scroll at once.
- Closing: the native dialog gives the focus back to what opened it. When a click had focused that (it wasn't `:focus-visible`), it gets `data-quiet-focus`, which hides its ring until it loses the focus: browsers ring an element that gets the focus back after keys were used (Escape closes the dialog), even a row the person had clicked. "The ring is for the keyboard." The opener is read as the dialog first renders, before it takes the focus.
- Buttons that act on the diffs don't take the focus from a click; Tab still reaches them.

## Phone and narrow layouts

| Width | What changes |
|---|---|
| under 640 px | the dialog fills the screen; long lines wrap unless the person chose to scroll; the header loses the file count and totals and the rule; the list covers all of the diffs when open, starts closed, closes on a pick; no `/` key cap |
| 640 px | the dialog sits 20 px in from the window's edges with corners and a hairline; the list opens as a 340 px panel over the diffs |
| 768 px | a file's header adds "from old/path" and the GitHub link; turn rows show their arrow on hover |
| 900 px | the side-by-side control appears; below it the diffs are always one below the other, whatever was chosen |
| 1024 px | the list becomes a 288 px column beside the diffs, shown or hidden as kept; key hints show at its foot; the details rail (with Changes) shows beside the session |

- The default to wrap is read once, as the dialog opens; a choice made with `w` wins after, at every width, in that browser.
- Heights use `dvh`, so mobile browsers' toolbars don't hide the bottom. The dialog's top and bottom follow `--viewport-shift`, which corrects for Safari on iOS keeping a keyboard that isn't there (`lib/viewport.ts`).
- Touch lets go of a pinned file and of the find bar's place like a wheel does. `overscroll-contain` on the diffs and the list keeps a scroll from reaching the page.
- On phones the details (with Changes) are a sheet; the dialog opens over it, and closing the dialog doesn't close the sheet (`own` in `lib/dialog.ts`).

## Colors and theming

Additions are a fresh green, as people know additions by: not a brand color, and only for changes to files. Lines taken out (and deleted files, and counts of lines taken out) use danger's red: an exception to the rule that red is for danger only (destructive actions, errors, failures), since people read diffs in green and red. Additions became green everywhere a session's lines are counted (rail, transcript, session rows) so the same numbers have the same color everywhere (#386); before, they were yellow. Attention (the caret, lights, pills, the file in view, matches) is the brand's accent and highlight alone. The brand blue tints hunk headers and marks modified and renamed files.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--c-added` (`text-added`) | `#4ade80` | `#15803d` | `+` marks, letters A, counts |
| `--diff-add` | rgb(74 222 128 / 0.09) | rgb(34 197 94 / 0.11) | an added line |
| `--diff-add-gutter` | 0.15 | 0.19 | its gutter |
| `--diff-add-word` | 0.25 | 0.28 | words that changed in it |
| `--diff-del` | rgb(255 77 77 / 0.08) | rgb(255 77 77 / 0.07) | a line taken out |
| `--diff-del-gutter` | 0.12 | 0.11 | its gutter |
| `--diff-del-word` | 0.25 | 0.2 | words that changed in it |
| `--diff-del-mark` | `#ff6b6b` | `#cc1f1f` | `−` marks |
| `--diff-hunk` | rgb(0 126 255 / 0.075) | rgb(0 126 255 / 0.055) | hunk headers |
| `--diff-bg` | `--c-sunken` (`#050505`) | `--c-surface` (`#ffffff`) in the dialog; `#f1f1f1` in the transcript | what lines sit on |
| `--diff-caret` | accent `#ffff5d` | accent `#171717` (ink) | the caret |
| `--diff-caret-glow` | accent at 55% | accent at 25% | its glow |
| `--diff-lit` | highlight at 15% | highlight `#eaff81` at 60% | the wash |
| `--diff-lit-bar` | highlight | highlight mixed with 32% ink | the bar, the header's light |
| `::highlight(fctl-diff-find)` | highlight at 24% | highlight at 45% | all matches |
| `::highlight(fctl-diff-find-current)` | highlight, `highlight-ink` text | highlight with 14% ink, a 2 px ink underline | the current match |

- Gutter numbers on added and removed lines mix 70% of the green or the mark's red with `ink-4`; context numbers are `ink-4`.
- **Lines on white.** In the light theme the dialog's diffs sit on white (`.diff-on-surface`), as code on a white page reads; the transcript's edits keep the sunken grey in their bordered boxes. In the dark theme they keep the sunken well (`#050505`) under `#121212` headers. The light theme's green is a different, deeper hue at stronger tints, so it reads on white.
- **Lights on white.** The lime is faint on white, so the wash is 60% strong, the bar takes 32% ink, and the current match is underlined in ink.
- **Opaque tinted surfaces** (gutters, hunk headers): the diff's background as `background-color` with the tint as a `background-image` over it, so code scrolling under them never shows through:

  ```css
  .diff-gutter { position: sticky; left: 0; background-color: var(--diff-bg); }
  .diff-line[data-kind="add"] .diff-gutter {
    background-image: linear-gradient(var(--diff-add-gutter), var(--diff-add-gutter));
  }
  ```
- The pills and the list's match count use `accent-soft` with `text-accent` or `text-ink` (yellow on dark; ink on lime on light).
- Shiki's colors come per theme through `--shiki-dark` and `--shiki-light`, `github-dark-default` and `github-light`.

## Accessibility

- A native modal dialog labelled "Changes"; sections labelled by their file's heading, which starts with an `sr-only` change ("Modified: src/a.rs"); the find bar a `<search>` landmark; the list an `aside` and the file stepper a `nav`.
- Lines: marks are images named "Added" and "Removed"; hunk headers say how many unchanged lines lie before them; a missing final newline is named. Rows on their way out are `aria-hidden` and carry no `data-l`, so neither finding nor screen readers meet them. A rewritten line's old text is a pseudo-element, so the code's text is only what it says now, for finding, copying and reading out.
- State: the file position and the find count are `aria-live="polite"`; toggles are `aria-pressed`, the list and folds `aria-expanded`, the file in view `aria-current`; "Just changed" and "N matches" are spoken where they show as dots and pills; a rolling figure's old value is hidden.
- The keyboard does everything a pointer does ([Keys](#keys)), and the list is a single Tab stop with arrows inside.
- Motion follows `prefers-reduced-motion` ([Reduced motion](#reduced-motion)).
- Not yet checked: forced colors, and a few labels; see the open questions at the end.

## Edge cases and traps

Handled in the code:
- A CRLF file's lines lose their carriage return. A hunk that only takes lines out starts after line 0. A count left out in `@@ -40 +41 @@` is one.
- A path starting with `-` comes after `--` in the CLI command; the session reference is quoted, since `#` starts a shell comment.
- Lines that wrap get no caret (`data-wraps`): it would have to jump from line to line.
- The play state lives in data attributes and inline custom properties that `play` sets and the components don't render, so the settle's re-render, which drops `data-how`, can't cut a light short; it is cleared only when its time is up, and a row played again since keeps playing.
- A pressed toggle in the find bar keeps the focus in the field, so one can type on.
- A new file listed while the dialog shows comes in; a file reverted while it shows leaves, and the reader's place is picked again if it was in it.
- Pressing `s` under 900 px changes the kept choice without a visible change (observed in the code; unsure whether intended).

Traps found building it, and their fixes:
- **The dialog has no size when its layout effects run.** It calls `showModal()` in a passive effect, after the layout effects ran on a dialog still `display: none`: the scroll to the file opened did nothing. Whatever scrolls or measures at open must apply again once it has a size; the pin does, through the `ResizeObserver`. React's StrictMode runs effects twice in development and hides this: check opening without StrictMode, as production runs.
- **Nothing scrolls in a dialog that isn't showing.** The list scrolls the file in view into sight a frame later; a test pins that it happens with the dialog open.
- **The caret ran ahead of the code.** A caret moved by `transform` runs on the compositor, while an animated registered custom property (`--diff-x`) runs on the main thread; under load they drifted apart. Both now move from `--diff-x` (the caret's `left` is computed from it).
- **One-shot flags fired late.** A ref meaning "go to the match after the next render" stayed set when the state it waited for didn't change (the same match again) and fired on an unrelated render later (#388's review). Every ask is now a counter that changes each time (`focusAsk`, the goal's `ask`), with a layout effect keyed on it.
- **Browser scroll anchoring** competed with holding the place; it is off.
- **App styles beat utilities.** `app.css` rules are unlayered, so a Tailwind class like `[--diff-bg:var(--c-surface)]` can't override a custom property an `app.css` rule sets; the white background is an `app.css` rule (`.diff-on-surface`).
- **The page stayed locked on phones** after closing the diffs opened from the details sheet: React let go of the sheet's hold first (#392). Holds are counted, and the page scrolls once the last overlay goes.
- **React passes a dialog's close and cancel events on through portals**, so a dialog opened from a sheet would close the sheet too; `own()` keeps them to their own dialog.
- **`animate-rise` leaves a transform** on the dialog once it ends (`matrix(1, 0, 0, 1, 0, 0)` and `blur(0px)`), making it the containing block for `position: fixed` descendants: place such things from the dialog's corner.
- **Production's Content Security Policy once blocked Shiki's WebAssembly** and with it all highlighting (fctl#387); the dev servers don't send that policy, so check under `vite preview` with the `_headers` policy.
- **Stray focus rings** (#388): clicked list rows, header buttons and the row the dialog was opened from showed the yellow ring; fixed by buttons that don't take the focus, the rows' own inset outline and quiet focus return.
- **Recording it.** `web/src/demo/diffs.tsx` shows the dialog over nothing for the video of diffs following an agent (`xtask/demo/diff-video.mjs`). It waits for every file's grammar first, since the dialog waits for colors and a grammar loads on the machine's clock, not the recorder's. Don't edit `web/` while it records (Vite reloads). Playwright's WebKit reports a Mac user agent even on Linux, so ⌘ is the modifier there.

## Where it lives

- `web/src/components/session/diff-dialog.tsx`: the dialog, header, file sections and headers, states, keys, going to files, changes and matches.
- `web/src/components/session/diff-files.tsx`: the list, grouping, filter, change letters (`changeOf`), `DiffGroup`, `DiffTarget`.
- `web/src/components/session/diff-find.tsx` and `web/src/lib/diff-find.ts`: the find bar and its matching.
- `web/src/components/session/diff-live.tsx`: holding the reader's place, changes out of sight and their buttons, `useChanged`, `Rolling`.
- `web/src/components/diff.tsx`: lines, gutters, hunk headers, side by side, highlighting, live versions.
- `web/src/components/diff-play.ts`: what plays where, and its timings.
- `web/src/lib/diff.ts` (parsing, word marks, pairing, `changeStarts`) and `web/src/lib/diff-motion.ts` (matching versions).
- `web/src/styles/app.css`: "Lines added", "Diffs", the live diff block, the find highlights, `step-in`, `roll-in`/`roll-out`, and the global reduced-motion rule. Easing, `rise`, `fade`, `pulse-soft` and the color tokens come from `@hyperstructure/design`'s `tokens.css`.
- `web/src/lib/highlight.ts`, `web/src/lib/languages.ts`: Shiki and languages.
- `web/src/lib/queries.ts`: `useFileDiff`, `useSessionDiffs`, `fileDiffQuery`. `web/src/lib/git.ts`: `repoChanges`, `blobLink`, `whereCommits`. `web/src/lib/shell.ts`: `diffCommand`. `web/src/lib/hold-page.ts`, `web/src/lib/dialog.ts`.
- `web/src/components/session/changes.tsx` and `web/src/routes/session.tsx` (`Details`, `useDiffGroups`, the `c` shortcut); `web/src/routes/session-next.tsx`; `web/src/components/session/turns.tsx` (`Outcome`, `EditedRow`, `changeOf`); `web/src/lib/shortcuts.ts`.
- Tests beside each: `diff-dialog.test.tsx`, `diff-live.test.tsx`, `diff.test.tsx`, `diff-play.test.ts`, `diff-motion.test.ts`, `diff.test.ts`, `diff-find.test.ts`, `changes.test.tsx`.
- `docs/architecture.md` (Diffs), `docs/adr/0074-sessions-keep-their-changes-diffs-for-their-viewers.md`.

## Building one like it

- [ ] One scroll for everything the reader compares, in the order of the list beside it; the list marks what is in view and goes to anything in it.
- [ ] Draw only what is near the view, with honest placeholder heights; load all of it in one request when the cache lacks any.
- [ ] Give every row a stable identity (`data-l`), the same in the data you search and the DOM you draw, so finding and stepping work on what isn't drawn.
- [ ] Hold the reader's place yourself: an anchor under the sticky header, a `ResizeObserver`, a per-frame hold while things animate, `overflow-anchor: none`, the anchor found again after a redraw.
- [ ] For live data, match versions so unchanged rows keep their elements; show a version only once its colors are ready, or after a short wait.
- [ ] Animate only in view; count what changed out of sight on a button at the edge it is past; light it when the reader arrives, not before, and not while rows move.
- [ ] Bound every motion: a staggered wave that finishes within a fixed time, writes paced by length within a floor and a ceiling, everything settled within a second, lights of one length for every sign.
- [ ] Drive things that must move together from one custom property.
- [ ] Under reduced motion keep the information: a still light for a while, then gone.
- [ ] Copy says why there is nothing and what to do: the CLI command, Try again, the reason.
- [ ] Keys like an editor's; buttons that don't steal the focus; a single Tab stop for lists; Escape peels one layer at a time; focus returns without a ring after a click.
- [ ] Remember layout choices per browser, defaults by device; hide what doesn't fit rather than squeezing it.
- [ ] Color means one thing each: green and red for the content, the accent for attention, the blue tint for structure. Check both themes, and on white make faint colors stronger.
- [ ] Check without StrictMode, with production's CSP, in Chromium and WebKit, at a phone's width, with reduced motion and forced colors.
- [ ] A new `localStorage` key needs a line in fctl-site's `legal/privacy.md` (this one keeps `fctl.diff.layout`, `fctl.diff.wrap`, `fctl.diff.list` and `fctl.diff.find.case`, `.word`, `.regex`).

### How to check a change

- **Unit tests run without a layout.** happy-dom lays nothing out, so `diff-live.test.tsx` places rows by hand (each row's `getBoundingClientRect` and each section's `offsetTop` from a map, moved as rows are inserted above) and asserts the scroll position that holds a row at 140 px. `diff-dialog.test.tsx` removes `IntersectionObserver` so every file draws at once, seeds the query cache with each file's diff, and draws the dialog again with new groups to play an agent's step. Shiki is mocked (no colors, or fixed ones to test waiting for colors). `diff-motion.test.ts` describes each version as rows like `"+let b = a + 3; rewritten (was let b = 3;)"`, the clearest statement of the matching rules.
- **In the running app.** `cargo xtask dev` or `cargo xtask demo`, a session that edits files, and the dialog open on its page. To watch versions arrive at a known pace, the notes describe a second runner whose agent replays recorded edits with pauses between them (each pause lands as one refresh). Look in both themes, at a phone's width, with reduced motion emulated, in Chromium and WebKit, and once without React's StrictMode (a scratch page), since opening and focus behave differently under it.
- **The video** of diffs following an agent: `xtask/demo/diff-video.mjs` drives `web/src/demo/diffs.tsx` frame by frame on a paused clock; draw every frame and load the grammars first, or renders differ from run to run.
- **Under production's policy**: `vite build` and `vite preview` with the `_headers` Content Security Policy, since highlighting depends on WebAssembly the policy must allow.

## Principles at work here

1. **The reader's place is sacred.** What they read never moves; changes above take their room out of sight, and changes below push down.
2. **Show change where it is seen, count it where it isn't.** Motion in view; a count and a way there elsewhere; a light on arrival.
3. **Motion explains what happened.** Code is written in from where it changed, a line taken out turns red from the left, one put back fades to plain, a row that came opens. Each animation says one thing.
4. **Quick and bounded.** A screenful arrives as fast as a line; everything settles in under a second; the lights last 2.6 s, the same for every sign of one change.
5. **One signal color.** The accent and highlight carry attention; green and red belong to the code's content; blue to its structure.
6. **Everything at once, drawn as needed.** One scroll, one request, lines drawn near the view, search over data rather than DOM.
7. **An editor's keyboard.** `j`/`k`, `n`/`p`, ⌘F with Alt toggles by key, `s`, `w`; focus stays where the keys work.
8. **Say why there is nothing.** Every empty, large, binary, missing or failed file names its reason and the next step.
9. **Respect the person's settings and device.** Kept choices, wrapping on phones, side by side only with room, reduced motion that keeps the meaning.
10. **Use the platform.** A native dialog, the Custom Highlight API, Web Animations for heights, sticky gutters, IntersectionObserver and ResizeObserver: less code, fewer ways to break.

## Known gaps
What reading the code couldn't settle; check before relying on it.
- **Forced colors.** The list's keyboard focus (an inset box-shadow with `outline-none`), the gutter's rule, the side-by-side rule and the selected layout segment are box-shadows, which Windows' contrast themes drop. The app's later rule (fctl#470) draws focus rings as outlines and lines as borders. Not checked with `page.emulateMedia({ forcedColors: "active" })`.
- **Labels.** The wrap button changes its label ("Wrap long lines" / "Scroll long lines") and is `aria-pressed` at once, which a screen reader may read as a contradiction; the list (`aside`) and the file stepper (`nav`) share the name "Changed files". Not checked with a screen reader.
- **`s` on a narrow window** changes the kept layout without a visible change, so a wider window later opens side by side. Possibly intended (the key keeps working everywhere), possibly not.
- **Reduced motion and rows that go.** Without animation, a row the agent took out stays at full height until the settle (920 ms) and then disappears at once; whether that brief stale row is wanted wasn't recorded.
- **Unchanged lines between hunks** can't be shown. That follows from keeping diffs, not files, but no decision about it is written down.
