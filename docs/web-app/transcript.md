# The session transcript and its surroundings

How fctl's session page shows an agent's work: the transcript's items (messages, the agent's
prose, tool calls folded into runs, thoughts, subagents, milestones and notices), what streams in
live and what happens when it stops, the composer and the question card under it, the details
rail beside it, finding in it, and the classic view's header and layout.

Both session views share all of this. The new view (`routes/session-next.tsx`) renders the same
parts through the same `PartView` and the same `Details` rail. Its own structure (cover, glance,
turns, now line, turn navigation, plan, retrospective card, thinking mark) has [its own
document](session-view.md), with [the now line](now-line.md) apart;
this one names those only where they change a shared contract. The changes viewer (the diff
dialog) is described in [the changes viewer](changes.md); this document covers how the page
opens it.

Most of the reasoning below comes from the code's comments, which explain each choice in plain
sentences. Values are those of fctl's main branch in November 2026. Each section names its files:
paths are under `web/src/`, and bare file names are in `components/session/`. The looks come from
`styles/app.css` (prose, shimmer, step-in, find highlights) and the tokens of
`@hyperstructure/design` (`rise`, `fade`, `pulse-soft`, `caret`, the easing curves).


## How the transcript is built

### Events become items (lib/transcript.ts)

**Purpose.** Turn the session's event log into things a person reads, as events arrive, without
re-rendering what didn't change.

The log holds stored events in `seq` order: people's messages, statuses, host logs, fctl's notices,
git states, Remote Control, interrupts, and Claude Code's own messages. What streams (deltas, tool
heartbeats, thinking counts) isn't stored; it feeds the live turn (see "What streams in").

Rules the builder keeps, each for a reason:

- **Stable identity.** `add()` copies the array but replaces only the items that changed, so
  memoized rows re-render only when their own content moves. Events already seen (by `seq`) are
  skipped: a snapshot and incremental frames can overlap.
- **Tolerant of anything.** Events come from the sandbox too, where anything can pose as the
  agent. Each event is applied inside `try`; one the app can't read is left out rather than
  breaking the page. Rendering adds a second guard (`Unreadable`, below).
- **One passage per message.** Consecutive text blocks of one assistant message merge into one
  prose item, a blank line between them.
- **No empty thoughts.** A thinking block without text is dropped (some models stream thinking
  with no visible text), so no line opens onto nothing.
- **Subagents nest.** A subagent's messages name the call that started it; its prose, thoughts and
  calls go into that call's steps, which count its calls and remember the last tool's name. When
  that call isn't loaded (it is in earlier activity), they are left out rather than shown without
  context.
- **Setup is one item.** Queued, provisioning and preparing statuses and the host's log lines
  before the agent starts gather into one setup item. It closes at running or idle, at Claude
  Code's `init`, or at the first top-level assistant message. A resume (queued again) opens another.
- **Only some statuses are lines.** Paused, stopped, failed and queued show in the transcript; the
  rest live in the header's status pill. Host log lines after setup merge with the line before.
- **Git lines only when a branch moved** (`lib/git.ts`). The agent reports git state often, and most reports only
  move files. A line shows for a new commit, a push, or a pull request not seen before.
- **Limits only when refused.** Claude Code reports usage as it moves and warns when a limit goes
  fast; only a refusal becomes a line. Its reset time comes in seconds or milliseconds and is
  normalized.
- **Nothing runs forever.** When Claude Code is gone (`claude_restarted`, `claude_crashed`,
  `turn_cut_off`, `background_tasks_stopped`) or the session stops or fails, subagents and
  background tasks still open end as "stopped".
- **Retrospectives keep their past.** An updated retrospective keeps the version before, so its card
  can say what changed.

### Items become parts: runs of work (lib/runs.ts)

**Purpose.** Between the things it says, an agent mostly works: it runs commands, reads and searches
files, and thinks. The transcript folds such a run into one line that says what it did ("Ran 6
commands, read 2 files"), which opens into its steps.

- **What folds** (`folds`): thoughts and tool calls, except subagents (their own line already says
  what the subagent does, and opens into it) and the plan, `TodoWrite` (it is there to be read).
- **What comes aside** (`aside`): git lines, host logs, Remote Control, and notices of a note kept, a
  screenshot published or a retrospective. These come on their own time, beside the work rather
  than as a step of it: one that arrives mid-run goes after the run instead of cutting it in two.
- Anything else closes the run.
- A run keeps its first step's key, so it stays the same element, open state and all, as it grows.
  `lastRun` is the run that may still go on: the last, unless something other than an aside came
  after it.
- A run with fewer than two calls doesn't fold: a call on its own is a line of its own, and the
  thoughts around it are lines too.

### What is under way (transcriptParts in transcript.tsx)

- `running`: the status is running and the agent's work is coming through (no stall).
- `turnStart`: the last turn or status item. A tool call without a result runs only in the turn
  the agent works on, while its work comes through; one from a turn that ended (with a result, a
  stop or a failure) never gets one, so it never shows a spinner.
- `tail`: the newest run, while running, after `turnStart`, and while the agent isn't writing text.
  It is the run that goes on (`active`).
- `folded`: the tail has two calls or more. Thoughts and calls streaming in then show inside the
  run; otherwise they show after the transcript.
- `up`: Claude Code runs (running or idle, no stall). Background subagents work on after their
  turn, while the session waits for them.
- `cwd`: from `init`; paths are shown from the repository's root.

**Building one like it**

- Derive display items from the append-only log in one place; replace only what changed, so rows
  can be memoized by identity.
- Decide per event kind whether it is a line, part of another line, or header state. Most raw
  events are not lines.
- Group by meaning, not by arrival: let side events slide past a run instead of splitting it.
- Make "in progress" a function of the turn's state, so an orphaned step can't spin forever.


## The line system (lines.tsx)

**Purpose.** Every line besides prose and people's messages shares one geometry, so a long
transcript reads as one column with a quiet left edge.

**Geometry.** Icons sit in a rail down the transcript's left edge, 24 px wide. Text starts 10 px
after it, at 34 px, where people's messages, opened details and images start too. What a line opens
into hangs from a thread down from its icon: `Thread` is a 1 px left border at 11.5 px with 21.5 px
padding, which lands its content at 34 px. Inside a run or a subagent's work (`nested`) lines are
smaller: 13 px text instead of 13.5 px, a bare 14 px icon instead of a tile, an 8 px gap, so nested
content starts at 22 px (thread at 6.5 px, padding 14.5 px).

| Piece | What it is |
| --- | --- |
| `RailIcon` | A 24 px box for a bare 14 px icon, marked `data-rail` so the new view can draw its thread behind it |
| `Tile` | A tool call's icon on a 24 px tile: radius 7 px, `border-line`, `bg-raised`; red (`danger-soft` fill, `danger` border at 30%) when the call failed; bare inside a run. A run's tile is `stacked`: a second tile's edge shows under it (two offset 3 px shadows) |
| `OpenLine` | A button: icon, what it says (truncating, the chevron after it), facts at the right. With `wrap`, the text wraps instead and the chevron stays glued to the last word |
| `Thread` | What a line opened, under it; `tone="thought"` tints the thread pink at 25% |
| `Milestone` | A 12.5 px line with a rail icon and a tone: muted (`ink-4`), warn (`amber`), error (`danger`), info (`blue`), ok (`accent`) |
| `MilestoneButton` | A milestone that opens (setup, logs, "What fctl told the agent"); its chevron and `aria-expanded` appear only when there is more to show |
| `Unreadable` | An error boundary around every part and every step of a run: "This event couldn't be shown", as a warn milestone |
| `BusyMark` / `Busy` | A context for the sign that a step is under way: the spinner by default, the new view's dot wave there |

**Behavior.** `OpenLine` is one button, the whole line. Its hover fill (`bg-hover`, rounded) reaches
6 px past the column on each side (`-mx-1.5` with `px-1.5`), framing the text without moving it.
On coarse pointers it grows 4 px taller. A line is as tall as its icon (24 px, 20 px nested), so
the text and the facts line up with the icon's middle. Facts sit at the right in 11.5 px `ink-4`
tabular figures, separated by middle dots.

**Motion.** The chevron turns 90° over 200 ms (`ease-out`); hover colors change over 150 ms; what a
line opens rises in (`animate-rise`: 420 ms, from 6 px below at 99.5% scale and a 2 px blur).

**Accessibility.** `aria-expanded` on every line that opens; `aria-controls` only while the
controlled element exists. Chevrons and the dots between facts are `aria-hidden`. Threads are
borders, not backgrounds, so they survive forced colors (Windows' contrast themes drop
backgrounds and shadows but keep borders and outlines).

**Building one like it**

- Fix one rail width and one text start, and derive every indent from them.
- Put the opening affordance on the whole line, not on a small chevron.
- Wrap each independently failing piece of untrusted content in its own error boundary.
- Make "busy" a context, so another surface can restyle every sign of work at once.


## The agent's prose (components/markdown.tsx, .prose-fctl)

**Purpose.** Show what the agent says as calm editorial text, safely: its output is untrusted.

**Anatomy.** Inter at 15.5 px with optical sizing, line height 1.7, a hair of negative tracking,
blocks 0.78 em apart. Headings in the display cut at 1.45, 1.25 and 1.1 em. Links in the accent
with a 35% underline 3 px below. Inline code as a small chip (mono at 0.84 em, raised fill,
hairline border, 5 px radius). Code blocks on the sunken fill, highlighted in both themes, the
language at the top right and a copy button taking its place where the pointer rests. Block quotes
in italics behind a 2 px rule; list markers dimmer than the text. A new answer fades in (300 ms);
messages, cards and opened details rise.

**Long things.** Paths, URLs and ids wrap anywhere rather than widen the page. Table cells keep
words whole (with wrap-anywhere, a column of short words would shrink to one letter), paths in a
cell break after their slashes, and a table too wide scrolls on its own.

**Safety.** Markdown becomes React elements, not HTML, so agent output can't inject markup (the one
HTML is a code block's highlighting, which Shiki builds from the escaped code).
Links to web pages open in a new tab; app paths open in place; anything else (other schemes,
`//host` paths, the app's own sign-in pages and API however they are spelled) shows as text, since
such a link could have the reader approve someone else's sign-in. Pictures load only over https,
and from the app's own address only as a published screenshot: the browser sends the reader's
cookies there, and a picture must not act for them. In text from GitHub, pictures show as links,
as a picture from anywhere could tell who reads the page.

**Pictures.** One whose size the page knows (a screenshot the agent published) takes its room at
once and loads as the reader nears it; any other loads with the page, so it doesn't push the page
when it arrives as the reader scrolls up to it. A click opens it in the session's lightbox, unless
it sits inside a link.

**Code.** Highlighting is lazy and starts 60 ms after the code last changed, so a block still
streaming in shows as plain mono and colors in once it pauses. The language label is skipped by
finding.

Notes and retrospective parts add `.prose-note`: the size and color of the text around them, line
height 1.6, blocks 0.5 em apart, headings at 1 em.


## Runs: work folded into one line (Run in tool.tsx)

**Purpose.** Let a reader skim what the agent did between two things it said, and open it only
when they care.

**Anatomy.** A stacked tile with the first call's icon; the summary, which wraps rather than lose
any of it (a run's line has nothing else to say); the chevron after its last word; then facts at
the right, in order: lines changed ("+12 −3", colored only when not zero), failures ("1 failed", in
`danger` at 80%), work left in the background ("2 in the background" behind a pulsing accent dot;
new view only), and how long it took (first step to last result, once it no longer goes on, from
one second up).

**The summary's grammar** (`summary`):

| Kind | Done | Going on | Counts |
| --- | --- | --- | --- |
| Bash | ran | running | command, commands |
| Read | read | reading | file, files |
| Edit, MultiEdit | edited | editing | file, files |
| Write | wrote | writing | file, files |
| NotebookEdit | edited | editing | notebook, notebooks |
| Grep, Glob | searched for | searching for | pattern, patterns |
| LS | listed | listing | directory, directories |
| WebFetch | fetched | fetching | page, pages |
| WebSearch | searched the web (n times) | searching the web | |
| anything else | used | using | tool, tools |

Kinds go in the order they first came, joined by commas, the first word capitalized: "Ran 2
commands, read 1 file, searched for 1 pattern". A file counts once however often it was read or
edited ("Read 2 files, edited 1 file" for three reads of two files and two edits of one).

**While it goes on.** The line says what its finished calls did, and only while none has finished,
what they do: "Running 2 commands, reading 1 file". The active run's text shimmers. Folded, it
shows under its line what it does now: its calls in progress, the thought or call streaming in
("Thinking · 900 tokens", "Preparing Bash"), or else its newest step. So "Ran 1 command" sits over
"Run the tests" with a busy mark; once the turn ends, the line says "Ran 2 commands" and the step
goes. When the agent starts to write, the run stops being active: it closes up to its summary, its
duration appears, and the words stream in under it.

**Opening.** A click opens every step, nested and smaller, each settling in after the one before
(`step-in`: 220 ms from 3 px above, 14 ms apart, up to eight). A step the reader opened stays in
view, open or not, as the run grows and folds its other steps; closing the run forgets them.
Folded, a run shows the images its calls read under its line; open, each shows under its call.

**Edge cases.** The run is memoized with its own comparison (its steps by identity, running,
active, the heartbeat, the streaming blocks' indices and types), so a stream of deltas doesn't
redraw every run on the page.

**Building one like it**

- Summarize by verb and object, counting distinct objects, in the order they first happened.
- Past tense for what is done, present participle for what goes on; never both in one line.
- Never truncate a summary: wrap it.
- Keep the step under way visible under a folded line while work goes on, and remember what the
  reader opened inside it.


## A tool call's line and its details (ToolRow in tool.tsx)

**Purpose.** One quiet line per call that says what it did and to what, and opens into enough to
check it.

**What the line says** (`describe`):

| Tool | Line |
| --- | --- |
| Bash | Its description when Claude gave one ("Show the recent commits"); else "Ran" and the command's first line in mono; else "Ran a command" |
| Read, Write, Edit | "Read", "Wrote", "Edited" and the path |
| Grep, Glob | "Searched for", "Listed" and the pattern in mono |
| LS | "Listed" and the path |
| WebFetch | "Fetched" and the address without its scheme |
| WebSearch | "Searched the web for" and the query |
| Agent, Task | "Delegated" and the task's description, or "a task" |
| TodoWrite | "Updated the plan" |
| MCP tools | "Linear · create issue": server and tool in words, a middle dot between |
| others | The tool's name |

Paths read as people know them (`shownPath`): from the root of the repository Claude Code works in,
`~/` elsewhere in the home directory, the sandbox's `~/workspace/` dropped. The directory is dimmer
(`ink-4`) and gives way first when room runs out (`shrink-[1000]`), so the file's name (`ink-3`)
stays. A described command shows the command itself as a tooltip (first 500 characters).

**Facts at the right.** For a subagent, its steps and last tool: "12 steps · Grep". Lines an edit
added and took out. While a call runs, for how long, once past two seconds ("12 s", "1m 4s"); once
done, how long it took, from ten seconds up only, so quick calls stay quiet. In the new view, a
call that left work in the background says "In the background · 12 s" behind a pulsing dot, then
"12 s in the background", "Failed after 1m 2s" (red) or "Stopped after 30 s".

**States.** Pending: the busy mark in the tile, the verb shimmering. Failed: a red tile, red text.
Done: the tool's icon (`Terminal`, `FileText`, `FilePenLine`, `TextSearch`, a plug for MCP tools,
a wrench for the rest). A call of an ended turn that never got a result shows its icon, not a
spinner.

**Details when opened** (indented to the text, rising in):

| Tool | Opens into |
| --- | --- |
| Edit | The diff: Claude Code's own hunks, numbered as the file has them, when its result has them; else the diff of the strings it replaced, unnumbered. A failed edit shows its strings (what it meant to change) and the error |
| MultiEdit | One numbered diff from the result, or one diff per edit |
| Write | Over a file that was there, what changed in it; a new file's first 80 lines highlighted, "path · 120 lines" above |
| Bash | The command, highlighted, then its output |
| Read | "120 lines read", what images it read ("PNG image, 1440×900, 245 KB"), or the error; not the file, which is in the repository |
| TodoWrite | The checklist, open by default: done steps in an accent circle with a check, struck through; the step under way in a blue ring with a pulsing dot |
| others | The input as JSON, then the output and any images |

An inline diff sits in a sunken box headed by its path and "+A −D", scrolling past 420 px; hunk
headers show only when numbered and there are several. Output shows its first 24 lines with "Show
96 more lines" under them, scrolls past 480 px, turns red (text and a 25% red border) on error,
and says "No output" in italics when empty.

**Images a call read** (`lib/kept-images.ts`). Screenshots the agent read show as 96 px tall thumbnails under the call
(under the run's line while it is folded). The session keeps them for 7 days; after that the
thumbnail goes and the facts say "deleted after 7 days". A thumbnail that fails to load hides
itself. A plain click opens it over the page in the transcript's one lightbox, which steps through
all the session's pictures in page order; a click with a modifier key is left to the browser (a
new tab). Names come from the file read, else `image.png`, `image-2.png`.

**Building one like it**

- Describe a call by intent first (its description), mechanism second (its command).
- Give the object its own type: paths in mono with the name brightest, code in mono, words plain.
- Show durations only where they inform: while running past a short threshold, and for slow calls.
- Open into the least that verifies the call: a diff, a command and its output, a count.


## Subagents (SubagentDetails in tool.tsx)

**Purpose.** Show delegated work in place, as it happens, without flooding the main column.

**Anatomy.** The call's line ("Delegated" and the task) opens into a thread holding: a "Prompt"
line with the subagent's type in mono, which opens into what it was asked (a sunken box, scrolling
past 420 px); its work in runs, nested; its report as prose (left out when its last words already
say it, as a background subagent's do); "Working", shimmering, while it waits between steps; its
error output; and how it ended: "Finished in 2m 3s", "Failed after 40 s" (red), "Stopped after
12 s".

**States.** A subagent runs while its call has no result in the running turn, or, in the
background, while Claude Code runs. Its report is its call's own result (without Claude Code's
notes for Claude), or, from the background, what Claude Code passed on when it ended.


## Thinking (thinking.tsx)

A thought folds to "Thought it through" beside the thinking mark, and opens into the thought in
italics (`ink-3`, 14 px; 13.5 px nested) on a pink-tinted thread. Streaming in, it says
"Thinking", then "Thinking · 1.2K tokens" once Claude Code counts them (compact figures, "1 token"
in the singular), shimmering, the mark live. Thoughts always sit in runs, so a thought among the
calls folds with them.


## Messages

### A person's message (UserMessage in transcript.tsx)

**Anatomy.** A head line: the author's 20 px avatar in the rail (fctl's mark for messages from
fctl), their name, and, where the pointer rests on the message, the time and where it came from
("18:40 · from the CLI", "· from the Claude app"). Under it a bubble from the text column: 14.5 px
at line height 1.6, `bg-raised/50`, a hairline border, radius 18 px (`rounded-xl` in the tokens'
scale) with the top left corner at 6 px, pointing at the author. Line breaks are kept as typed; long words break anywhere. Attached
files follow: images 144 px tall, opening in the lightbox; videos as chips that play in a lightbox
of their own (its arrow keys belong to the player); other files as chips that download.

**States.** Sent but not stored yet: 70% opacity, "Sending…" in place of the time, images from
their local previews. A schedule's run shows its task, then fctl's note on the run under a
hairline, smaller and dimmer, behind a repeat icon.

**Whole, not clamped.** Only findings that fctl passed on in its older format (before such
messages carried the review) are clamped to five lines, with "Show all" / "Show less". People's
messages, a review agent's task and a schedule's long task always show whole: cutting what a
person wrote hides the task.

### Messages from fctl about pull requests (follow-up.tsx, findings.tsx)

A follow-up shows what happened on GitHub as GitHub has it: each person's comment with their GitHub
avatar, "commented on fctl#12", a verdict chip ("Approved" in the checks' green), the comment in a
bubble like a person's message, with a strip above comments on lines (the path and lines, "old
version" when the diff moved on). Failed checks, conflicts, merges and closes are lines of their own
in GitHub's colors: "Checks failed on fctl#12 at 3f2a1c9", the failed checks as small red chips.
Under it all, "What fctl told the agent" (fctl's mark) opens into the message word for word, in
mono. Follow-ups held back say so, muted: "Not passed on: the agent heard of failed checks three
times in a row, with no message from a person in between. Message it to have it look."

Findings passed on read "fctl's review agent found 3 issues in fctl#12 at 3f2a1c9", then a line per
finding (its title linking to the comment, "Severity · lines", "(old version)"), then what fctl
told the agent. Times on these show where the pointer rests, and not at all on phones, where
nothing rests and the time would take a line of its own.

### Tickets (ticket.tsx)

A delegated ticket shows as a card: its key, a state dot filled as Linear fills its circles, labels,
title, and a description clamped to six lines with "Show all". Replies and mentions show what their
person wrote. What fctl did in the tracker is a line, "Replied on ENG-12 in Linear", "Filed ENG-14:
<title> in Linear", "Moved ENG-12 to In Progress in Linear", or "Labeled ENG-12" with the labels
put on and taken off (struck through), opening into what it posted, with "Open in Linear ↗".


## Milestones and notices

| Item | Copy | Tone, icon |
| --- | --- | --- |
| Setup, under way | The host's current step ("Preparing the workspace", "Pulling <image>"), else "Setting up the sandbox", shimmering | amber busy mark; an hourglass and no shimmer while stalled |
| Setup, done | "Sandbox ready in 42 s"; opens into each step with its time and the host's log lines (warnings amber, errors red), in mono | muted, a box in the accent |
| Failed | "Failed — <reason>" | error |
| Paused | The reason, else "Paused", then " · resumes in 4 min" | warn, hourglass |
| Queued, stopped | The reason, else "Queued" / "Stopped" | muted |
| Host logs | "<first line> (+3 more)", opening into all | muted; amber at 80% with a warning among them |
| Git | "3 files changed +12 −3 · 2 commits · pushed · PR #12", led by "owner/repo: " for other repositories | muted, branch |
| Turn | "Turn finished · 1m 4s" between hairlines that fade at both ends; "Turn ended · 12 s" in amber when it didn't succeed | 11.5 px, `ink-4` |
| Claude Code started | "Claude Code 2.1.318 · claude-opus-5-5" | muted, sparkle |
| Limit | "Usage limit reached (five hour) · resets 18:40" | warn |
| Interrupt | "Interrupted by <name>" | warn |
| Remote Control | "Followable in the Claude apps · open", for the person whose subscription it runs on only | ok |
| Plain notice | Its message, " (until 18:40)" when it has one | by level: info, warn, error |
| Question asked | "Asked you", the question, the answers it offered as plain chips | info |
| Note kept | "Remembered for later agents · Memory" (a link to the note), the note in Markdown | ok, bookmark |
| Note marked stale | "Marked a note stale" or "Marked a note a duplicate", then "A newer note takes its place.", "It repeats another note." (a link) or the reason | muted, archive |
| Screenshot published | "Published <name> · anyone with the link can open it until Nov 8", the image (144 px tall), "1440×900 · 245 KB", "Copy Markdown", "Delete" for people who manage the session | info |
| Review posted | A card: "Review posted on GitHub: 2 issues" or "Review posted: nothing to point out", "1 earlier finding marked fixed", "Sent to the agent that opened the pull request", "View on GitHub ↗" | review icon |
| Summary added | A card: "Summary added to fctl#12's description", what fctl leaves as people wrote it, and the summary as GitHub's alert (Note, Warning, Caution by risk) | |

A published screenshot shows only when its link is this instance's own: what runs in a sandbox can
pose as the agent, and a notice could otherwise name any address. Expired or failing to load, it
says "its link no longer works"; deleted, "deleted". Deleting asks first ("Its link stops working
for everyone, in pull requests too. This can't be undone.") and toasts "Deleted <name>".
Retrospectives show as their card, described with the new view.

**Building one like it** (messages, milestones, notices)

- One short line per event, in a tone that matches its weight; a chevron only when it opens.
- Show what came from elsewhere as it looks there (GitHub's comments, avatars and colors), with the
  exact words the agent got a click away; never clamp what a person wrote.
- Check every link and picture from the sandbox before it shows.


## Live behavior

### The live store (lib/live.ts)

One WebSocket per open session, shared by every component through `useLiveSession`, closed 15 s
after the last one leaves (a quick return finds it still open). React reads it with
`useSyncExternalStore`; each update replaces the state object, unchanged fields keeping identity.
Never open another socket for the same session.

- **First frame**: a snapshot (the summary, recent events, presence, what streams in now, the
  runner's state). Then events, stream frames, summaries (with the viewer's role, which can
  change), presence and runner state come incrementally. Summaries also patch the cached session
  lists, so the sidebar and lists move with the page.
- **Reconnecting**: 400 ms doubling to at most 10 s with ±25% jitter, asking only for events after
  the last one it has; a ping every 25 s; the header says "Reconnecting…" meanwhile. Closed for
  access: "You no longer have access to this session." Deleted: "This session was deleted with its
  project."
- **Sending is optimistic.** A message shows at once (after the transcript, never inside the
  builder) and resolves when stored; the stored message retires its copy by its trimmed text and
  attachment ids, and the local previews are freed. If sending fails, the copy goes and the
  composer gets its text and files back. Without an open socket it falls back to HTTP, made
  idempotent by a client id.
- **Visibility**: the page tells the server whether the person can see the session (page open, tab
  visible); people who can see it get no notifications about it.
- **Typing**: sent at most every 2.5 s; others show as typing for 6 s after.
- **Activity**: stream frames per second over the last 3 s, which drives the header orb's energy.

### What streams in (applyStream, settleLive, LiveTurnView)

The live turn holds the message streaming in, rebuilt from stream frames:

- A new message drops the blocks of the one before. Each content block (text, thinking, a tool call
  being written, its tool's name known at once) is added as it starts, grows with its deltas and is
  marked done when it stops. A new tool call ends the heartbeat of the call before it.
- Claude Code's thinking count (about once a second) sets the newest thought's tokens; each count
  is of the whole thought, so the newest wins.
- Tool heartbeats say which call runs and for how long: that is the "12 s" on its line.
- Subagents' frames are ignored here; their stored steps arrive soon enough under their own line.
- When stored events arrive: a top-level assistant message drops the finished blocks it now stores,
  so the stored row takes the place of the streamed one without both showing; the agent's own tool
  result or the turn's result ends the heartbeat (a subagent's tool result doesn't); the turn's
  result clears everything.

What shows after the transcript (`LiveTurnView`):

- **Words being written**: the agent's Markdown with a caret after its last word (2 px wide, 1.05
  em tall, the accent, blinking every 1.05 s in steps; the last block is made inline so the caret
  follows the last word rather than starting a line).
- **A thought or a call being written**, unless the folded run shows it: "Thinking · 900 tokens"
  with the live thinking mark, or "Preparing Bash" on a tile with the busy mark, both shimmering.
  In the new view, these show in its now line instead, and words being written are indented to
  its thread.
- **"Working"**: while the agent works and nothing streams in, a dot in the accent that pings
  outward, and "Working", shimmering.
- **A stall, or a runner short of disk**, as status notices (next).

### Stalls (lib/stall.ts)

**Purpose.** Say plainly when the agent's work isn't reaching the page, and stop showing anything
as in progress meanwhile: the agent may well be working, and its events wait in the sandbox.

| Kind | Shows | The transcript says | The header says |
| --- | --- | --- | --- |
| Runner away | 10 s after the page learns of it (a host that restarts reconnects within them), or sooner, once it has been gone 60 s | "Runner <name> hasn't been heard from since 02:26." / "The agent's work shows up here when it's back, and messages you send reach the agent then." | "Runner not heard from since 02:26" |
| Agent unreachable | At once (its host waited 10 s before saying so) | "Runner <name> hasn't been able to reach the agent in its sandbox since 02:26: <reason>." / "It keeps trying. The agent's work shows up here when it gets through…" | "Agent unreachable since 02:26" |
| Sandbox paused for disk | At once | "Runner <name> has kept this session's sandbox paused since 02:26: <reason>." / "The sandbox keeps what the agent wrote. The agent carries on where it was once there is room…" | "Sandbox paused since 02:26" |

"since" names the day when it isn't today: "since yesterday at 23:10", "since 14 Oct 2026, 09:12".
The clause about messages appears only where the session takes messages. A runner short of disk
while work still comes through gets a notice of its own ("Runner <name> has been low on disk since
02:26: 12.3 GiB free, below the 20 GiB its host keeps free." in amber; "nearly out of disk" in red)
with what follows. It is left out while the sandbox is paused (the stall says so) or the runner is
away (what it said last is old news). Nothing is reported while the page's own connection is down.

While stalled: no caret, no shimmer, no busy marks (an hourglass instead), setup still, the rail's
agent time stopped at when the work stopped coming, the runner's dot amber (grey while it is away). Both notices are
`role="status"`, an amber title over a dimmer detail, an unplug, pause or disk icon in the rail.
The page re-renders by itself when a stall may first show (a timer to its moment).

**Building one like it**

- Give a brief disconnection a grace period, then name the cause, who, and since when.
- Say what happens next and what the reader can still do ("messages you send reach the agent
  then").
- While you can't know, show nothing as in progress: no caret, shimmer or spinner.

### Signs of work

- **One color, calm.** A rotating ring in the brand's yellow, pink and blue was tried and read as
  out of place on the session page; signs of work are one color, the accent (ink on light
  backgrounds), and small: the spinner or dot wave, a pulsing dot, the shimmer.
- **Shimmer** (`.text-shimmer`): a soft light passes over the text left to right in two seconds,
  then rests for two. Put it on the text itself, not on a box wider than it, where the light would
  hurry past. Every shimmer on the page runs in step (`syncShimmers` sets each new animation's
  start time to 0); otherwise a label that appeared later would shimmer out of step with the line
  above it. The dot wave, the busy ring and the thinking mark's sweep are synced the same way.
- **Reduced motion.** A global rule cuts every animation to one 0.01 ms iteration and every
  transition to 0.01 ms; `step-in` runs only with no preference. The shimmer then ends off the text,
  the thinking mark's trace stands still, the dot wave holds still, and finding jumps instead of
  gliding.

### Sticking to the bottom (lib/stick-to-bottom.ts)

**Contract.** The page keeps its bottom in view while work comes in, as long as the reader is
there. Scrolling up lets go at once, however small the step (wheel, trackpad, keys, scroll bar,
finger); scrolling back to within 64 px of the bottom sticks again (a couple of lines, as the agent
may add one on the way). End, or ⌘↓ on a Mac, sticks wherever the page is. The page doesn't move
under a pressed button or finger (selecting text, dragging the scroll bar), and what the reader
opens stays where they opened it.

**How.** A small state machine takes measurements, not the DOM, so tests can drive it. Resize
observers on the transcript and the page scroll to the bottom as either grows (a header whose
status wraps counts). While stuck, the browser's scroll anchoring is off: at the bottom it can hold
on to a stale position and drag the page along, even under a pressed button. Scrolled up, anchoring
is back on, keeping what the reader reads in place as things above change.

**Traps handled.**

- The wheel and keys are read before the page moves, so a step up can't be cut short by a step to
  the bottom.
- A click on a button in the transcript marks the next two frames: growth then is what the click
  opened, so the page lets go instead of chasing the bottom.
- When the page gets shorter at its bottom, the browser moves it up, which looks like the reader
  scrolling up. A mutation observer notes such moves as the page changes, looking only at changes
  that can shrink it (nodes removed, text shortened, an attribute that really changed: React sets
  some to the same value at every render).
- Wheels and keys in an open dialog (the lightbox), in a box that scrolls inside the page (long
  output) while it has room, in text fields, the space bar on a button, and a pinch (a wheel with
  Ctrl) are not the reader scrolling the page.
- Safari on iOS can report a visual viewport of no height, or a keyboard that isn't there, after
  the app switcher: the bottom is computed and clamped (`bottomOf`), never "scroll to the full
  height and count on clamping".
- Anything that moves the page for the reader (finding) calls the returned `letGo()` first, or what
  it opens grows the page and the page is taken back down.
- Another session starts at the bottom again, from wherever the last one was. The router leaves a
  session page's scroll to the hook (`scrollRestoration: ({ location }) => routerScrolls(...)` in
  fctl's `router.tsx`): it scrolled the window to the top as the next session came in, and the hook
  scrolled it to the bottom a frame later. On an iPhone, the next session then sometimes showed well
  above its bottom, no longer followed, as the hook took that for the reader's scroll; from the
  Agent Floor, whose page is usually at its top, the router's scroll moved nothing and the session
  always opened at its bottom. Other pages still open at their top, or back where the reader left
  them.

### Earlier activity (loadOlder in live.ts, load-in-view.ts, keep-place.ts)

**Loading.** As a session opens, its newest events can show next to nothing (a hundred calls fold
into one line), so the page loads earlier pages of 400 events until it has about a screenful of
parts (12), at most 5 pages a load. Above the transcript, a pill button says "Show earlier
activity"; it also loads by itself once it comes within 400 px of the view, and again after each
load that leaves it there. Loading, it shows a small spinner and "Loading earlier activity". A load
that brought nothing (offline) says "Earlier activity didn't load. Try again" and isn't tried by
itself again until the button leaves the view and comes back, or is pressed, so it never retries as
fast as it fails. Pages that came before a failure are kept. The transcript is rebuilt once, when
all the pages are in.

**Keeping the reader's place.** Earlier activity goes in above the reader, who stays where they
are, as in a chat. Browsers don't do this: Safari has no scroll anchoring, and the others anchor to
the first thing in view, which can be the button the older items go in under. So the transcript
notes the tops of up to eight items in view before the load, turns anchoring off in its list, and
once the items are in, scrolls by how far the first of them moved, before the browser paints. It
measures and scrolls before turning anchoring back on: Chrome anchors even at a forced layout, and
measuring with anchoring on moved the page by what went in above as well (jumps of 199 to 4,621 px
were measured before the fix).

**Building one like it**

- Treat "following the newest" as a mode the reader leaves at their first step up, not a position.
- Tell the reader's scrolls from the browser's, and own scrolling while following.
- Load history ahead of the reader, keep their line still when it lands, and back off on failure.


## Finding in the transcript (find.tsx, lib/find.ts)

**Purpose.** A browser's find sees only what is open on the page, and the transcript folds most of
what it says. Finding looks in all of it, steps from match to match, opens what folds each match
it gets to, and loads earlier activity to look there too.

**Anatomy.** A bar under the header, over the page (the page doesn't move when it opens), in the
transcript's 760 px column on a translucent blurred canvas: a search field ("Find in this
session") with the count inside it at the right, then buttons for the earlier and later match and
close. The field's focus shows as an accent border with a 3 px accent-soft ring.

**What it looks in.** Each piece of text the page shows once open is a region marked
`data-find="<kind>:<key>"`: people's messages, the agent's prose, each call's line and the command
behind a described one, the plan, thoughts, subagents' prompts, prose and reports, notes kept,
retrospectives' parts, notices, why the session stopped, and what fctl told the agent. Not what
calls returned, files or diffs. Each part carries `data-part`, on the page even while folded. Text
matches as typed, whatever the case, the accents of Latin, Greek and Cyrillic letters, and the
whitespace between words (as the search of all sessions does); Markdown matches as the page shows
it, not as written.

**The reveal contract.** Each region lists what has to open for it to show, outermost first: a step
a folded run shows on its own (`show`), or a line that opens (`open`). A `Revealer` holds what
finding wants open; lines subscribe to their own keys only, so a step to another match re-renders
only what it opens. What finding opened stays open: the reader closes it again.

**Behavior.**

- ⌘F (Ctrl+F) opens the bar, or takes the focus back to it; a second ⌘F in the bar opens the
  browser's own find. Words selected on the page (one line, up to 200 characters) become the query.
- The count reads from the newest: "1 of 12" is the newest match, with "+" while earlier activity
  could hold more. Enter or ↑ goes up to the earlier match, Shift+Enter or ↓ down; ⌘G and ⇧⌘G
  (F3, Shift+F3) step with the focus elsewhere; Escape closes and returns the focus where it was.
- Typing goes to the match nearest the reader (the newest that starts above the composer), but
  opens nothing until typing pauses for 350 ms, so what folds the matches of half a word stays
  folded. A step opens at once.
- A match comes into view in the middle of what the header, the bar and the composer leave, unless
  it is well in view already (32 px margin); boxes scrolling inside (a long command) scroll first.
  Near, it glides; farther than one and a half views it jumps, as a browser's find does.
- While nothing is found and the query has two characters or more, it loads earlier activity by
  itself, ten pages at a time after a 250 ms pause, up to 40,000 events ("Looking further back…",
  with a spinner). After that, or once something is found, stepping past the oldest match loads
  more ("Look further back" names the button then). A load that brought nothing stops it until the
  reader steps back again.
- From a search of all sessions (⌘K), the page opens with the bar on the query, loads back to the
  event it was found in and goes to its first match there. The bar takes the keys only on fine
  pointers, since a phone's keyboard would cover the page.
- Matches light up through the CSS Custom Highlight API, which marks ranges without touching the
  DOM React owns: every match in the highlight color at 24% (45% on light), the current one filled
  with it (on light, lime with some ink and a 2 px ink underline). A mutation observer repaints
  them once per frame as regions open, code colors in or earlier activity loads.

**Copy.** "None so far" (more could load), "No matches", "Looking further back…", "3 of 12+".
Buttons: "Earlier match (Enter)", "Later match (Shift+Enter)", "Close (Esc)".

**Accessibility.** A `<search>` landmark labelled "Find in this session"; the count describes the
field and is `aria-live="polite"`; on phones the buttons are 44 px and the bar opens from the ⋯
menu. Nothing fires while an input method composes.

**Building one like it**

- Index what the page would show, not the DOM; give each region a stable id and the list of what
  must open to show it.
- Separate "the bar moved" from "the page went there": open folds on a pause or a step.
- Highlight with ranges outside the DOM tree, repainted on mutations once a frame.


## The composer, the question card and the review footer

### The composer (composer.tsx)

**Anatomy.** Above it, a 16 px line kept for "<name> is typing…" (it fades in; the room is always
there, so nothing jumps). The box: radius 16 px, `border-line-strong`, `bg-surface/90` with a blur
and a deep soft shadow that deepens on focus. Inside: files waiting to go, the text field (14.5
px, 1 to 10 rows), and a row of controls: the paperclip, the model and effort pickers (for the
session's owner), the key hint ("↵ send · ⇧↵ new line", shown only while the box has focus, left
out on phones beside the pickers), then Interrupt and the round Send button. A press in the row
between controls focuses the field.

**What it says while the agent works.** The placeholder says what happens to a message: "Message
the agent (it reads it after this step)…" while it works or sets up, "Message the agent…" while it
waits, "Message the agent to resume the session…" when stopped, "Resume the session with a
message…" when failed (for its owner; Send is then labelled "Resume", the hint "↵ resume"). While
it works, an "Interrupt" pill with a filled square turns red under the pointer.

**States.** Send is a 32 px circle: grey at 90% scale while there is nothing to send, ink at full
size once there is, 105% under the pointer, moving on the spring curve over 200 ms; a spinner while
sending. Someone who can't write sees why instead of a box: "You can follow this session. Ask its
owner for the editor role to message the agent." or "This session failed. Its owner can resume
it." A failed send puts the text and files back and toasts the error.

**Keys.** Enter sends, Shift+Enter breaks the line, Escape leaves the box for the page's single-key
shortcuts, and `r` on the page comes back to it. Nothing fires while an input method composes.

**Attachments** (`attachments.tsx`). Files come with the paperclip, a paste (named for what was pasted), or a drop
anywhere on the page, so a near miss never opens the file in the tab; with two forms on the page,
the newest takes them. While a drag is over the page, the box shows a dashed accent border and
"Drop to attach". Up to 10 files ("Attach at most 10 files to one message") of 20 MB each ("<file>
is 31 MB; files can be at most 20 MB").
Each uploads as soon as it is added, as a 56 px chip (an image's thumbnail, else icon, name and
"Uploading 42%") with a 2 px accent progress bar; a failed one turns red with a retry; the remove
button shows on hover, and always on touch screens. Sending waits for uploads under way.

**Model and effort** (settings.tsx). Two small selects: the model ("Default model" for Claude's
default) and the effort ("High effort", "Extra effort", with the symbol Claude Code shows for each
level). On a phone they join into one control, the one in use in front so its border shows whole.
A change that makes Claude read the whole conversation again without its prompt cache (any model;
an effort level on models that send it for the whole conversation) asks first: "Switch to <model>?"
says what it costs ("…which takes longer and uses more of the plan's limits than reading from the
cache") and when ("At its next step"; "At its first step" for a stopped session). What was picked
shows while it is sent.

**Building one like it**

- Let the placeholder say what happens to a message right now.
- Keep the box steady (room for the typing line is always there) and never lose what was typed:
  restore it on failure.
- Take files from anywhere on the page, and ask before a choice that costs the person (the cache).

### The question card (question.tsx)

What the agent asks the people following it (`fctl ask`) shows until someone answers. Where the
window has room for it (at least 768 px wide and 512 px tall), it floats above the composer, on a
translucent surface with a deep shadow, so it stays in view wherever the reader is in the
transcript. On a phone, either way up, a long question with its answers would cover most of the
transcript there, so it ends the transcript instead, on a plain surface, and scrolls away with it:
a reader at the bottom sees it just above the composer, and one who scrolls up gets the transcript
back. A card in the info blue (a soft blue wash from its top, a blue border, a round icon): "The
agent asks you" and how long ago ("4m"), the question at 15 px, its offered answers as pill
buttons, and how to answer: "Or write your own answer below. Any reply answers it.", "Your next
message answers it.", or, for people who can't message, "The people who can message the agent
answer it." A click sends that answer as the reply; its pill fills and spins while it goes. The
card rises in, and a new question mounts anew. In the transcript the question stays as "Asked you".

### The review footer (components/review.tsx)

A review agent's session takes no messages, so the composer's place says what it does and what
came of it, with a link to the review or the pull request: "This review agent takes no messages:
it reviews fctl#12 at 3f2a1c9 and posts what it finds there.", then "Reviewed fctl#12 at 3f2a1c9
and posted 2 issues there.", "…: nothing to point out, and its check passed.", or why it ended
without posting.


## The details rail (Details and RailSection in routes/session.tsx)

**Purpose.** What the session changed and what came of it, beside the transcript: the same content
in a rail on a computer and in a sheet elsewhere.

**Layout.** From 1024 px, a 340 px column at the right, sticky, as tall as the screen, scrolling on
its own, on `bg-surface/40` behind a hairline. `d` shows or hides it; narrower, `d` opens the sheet,
and with the sheet open it puts it away, sliding, as Escape does. The sheet also opens from a header
button, and on phones from the title. Each section is a `RailSection`: a hairline under it, 20 px
at the sides, 16 px above and below, a 12.5 px medium title in `ink-3`, in sentence case. Facts are
`Row`s: the key in `ink-4` at the left, the value in `ink-2` at the right, truncating. The rail is
keyed by the session, so what it opened resets for another one.

**Lists don't scroll inside the rail.** The rail scrolls itself, and a scroll inside a scroll traps
the wheel; long lists show their first few, with the rest a click away.

| Section | Shown | What it holds |
| --- | --- | --- |
| Overview | In the sheet only, first | The status pill and its notes, workspace / project#number, the branch with a copy button: what the phone header has no room for |
| Review | A review agent's session | How the review went, its first look's risk, the commit, the session that opened the pull request, the review on GitHub, "All reviews in <project> →" |
| Pull requests | When there are any; first in the sheet (on phones they are what people open), after Changes in the rail | A card each (below), then how follow-ups bring the agent back: "Mention `@fctl` or `@agent` on GitHub to bring the agent back" |
| Changes ("Changes reviewed" for a review) | Always | Each repository's changed files (below) |
| Retrospective, or "Retrospectives (3)" | When there is one, or the project keeps them | The latest (below) |
| Memory | When the project keeps a memory, or the agent left notes | The notes it left and marked stale (below) |
| Work | Always | Turns, Tool calls, Agent time, Tokens in / out, Cache reads, and the context meter |
| Session | Always | Started by ("Runs on" for a review), Created, Schedule, Ticket, From (the base branch), Model, Effort, On GitHub, Issues, Runner, Billing ("Claude subscription") |
| Follow along | Always | "Open in the Claude app", claude.ai, and `fctl attach` to copy |
| Watching (2) | Always | Who has the session open, "×2" for two tabs |

The new view puts its plan first and its list of turns after the pull requests.

**Pull request cards** (`pull-request.tsx`). One link each to the pull request, its border brightening on hover: the
state icon in GitHub's color, the title (else "Pull request #12"), `hyperstructure/fctl#120` in
mono, the state ("Open", "Merged 2 hours ago") and checks ("All 5 checks passed", "2 of 5 checks
failed", "1 check pending", behind GitHub's check icon), an arrow at the right. GitHub's colors are
used for pull requests only, so people know them at a glance; they are not brand colors. When
another session reviewed it, a line under it says how fctl's review stands ("fctl's review agent
found 2 issues", "…is reviewing it", "…waits for a runner", "…found no issues"); the whole line
opens the review's session, an arrow sliding in on hover, with a "Review again" button for people
who may ask for reviews (it toasts "Reviewing fctl#12 at 3f2a1c9"). When fctl held the findings back from the agent, or they reached no agent, the card
ends in an amber strip with `role="status"`: "Paused after 3 review rounds" ("fctl held these
findings back, as nobody wrote to the agent in that time.") with "Continue for 3 more rounds", or
"Sent to no agent" with "Pass on to the agent", for people who may message it.

**Changes** (changes.tsx). Each repository, titled `owner/name` when there are several, "read only"
where the agent can't push. Rows: a status letter (A green, D red, M and R blue), the path in mono,
and a 48 px bar of lines added (green) and taken out (red), scaled to the largest change in the
list. The first 10 files show; "Show 14 more files" only when more than one would hide, since a
button shouldn't take the place of a single file; folding a long list scrolls its button back into
view. Totals: "+120 −34 · 3 commits · pushed", or "not pushed yet", "kept in the sandbox", "#12
merged, 2 commits since, not pushed". Empty: "No changes yet." A row opens the changes viewer.

**Retrospectives** (kept.tsx). The latest one as a button: an outcome pill ("Completed", "Partly
done", "Blocked"), when ("Updated 2 hours ago", exact times in a tooltip), what it worked on (four
lines), then "Read it" or "Read all 3", which opens a wide dialog with all of them in full, newest
first, scrolling inside the dialog. Empty: "The agent records one as it finishes a piece of work:
what it worked on, how, what got in the way and what a future agent should know." A retrospective
that arrives in the transcript and isn't in the list yet makes the list read again, once; one
deleted since stays in the transcript and out of the list.

**Memory** (kept.tsx). The notes the agent left (a bookmark in the accent, three lines each, struck
through once stale) and the notes it marked stale ("Marked stale:", "Marked a duplicate:", behind an
archive icon), each linking to the note in the project's Memory tab; then "The project's 41 notes".
Empty: "Its agent left no notes yet. What it learns that a future agent should know goes in the
project's memory."

**Work** (`lib/work.ts`). Turns count the one under way. Agent time counts up each second during a turn and stops
at the moment the work stopped coming through. Tokens are compact ("412K / 38K"). The context meter
reads "412K / 1M" over a 4 px meter split where Claude compacts the conversation, each part as wide
as its share of the window, `ink-3`, amber from nine tenths of the way; under it "Compacts at 967K
· compacted twice"; exact figures in tooltips.

**Session and Follow along.** The runner's row has a dot: the accent when connected, amber when it
can't reach the agent, paused the sandbox or runs low on disk, red when nearly out of disk, grey
when away; its tooltip says which, in the stall's words. "Issues: GitHub's too" explains itself in a
tooltip ("Its agent reaches the GitHub issues of the repositories it writes to, whatever the
project's tracker says."). The Claude app link is only for the person whose subscription the
session runs on; others read why ("Only <name> can follow it in the Claude apps: it runs on their
Claude subscription.").

**Building one like it**

- Order sections by what the reader came for (what changed and what came of it) before numbers and
  facts; one section style, rows with the key at the left and the value at the right.
- Show a few, the rest a click away, never an inner scroll; give an empty section a sentence that
  says what will appear there and when.
- Reuse the same sections in a sheet where the rail doesn't fit, reordered for what phones open.


## The changes viewer, in short

A dialog over the session page with every changed file's diff in one scroll, the list of files
beside it, keys from file to file (`j`, `k`) and change to change (`n`, `p`), finding in the diffs
(⌘F), side by side (`s`) and wrapping (`w`). It follows the agent: as a file changes again, its
diff changes where the reader looks while the line they read holds its place, and a pill counts
the changes made out of sight. The full account is in [the changes viewer](changes.md).

The page opens it from a row of the rail's Changes list, at that file; with `c`, at the first
changed file (or a toast: "No changes yet", "No changes to review yet" for a review); and, in the
new view, from the files a turn edited. It belongs to the session it opened on: a link or Back to
another session closes it in the same render. An edit's own diff shows inline when its call opens;
both draw lines with `components/diff.tsx`, so they look alike (added lines on green, taken-out
lines on red, changed words a shade stronger, marks announced as "Added" and "Removed").


## The classic view: header and layout (routes/session.tsx)

**Layout.** A sticky header; the transcript in a centered column at most 760 px wide with 24 px
sides; a sticky footer holding the composer, and on a computer the question card above it, on a
gradient of the canvas (solid at the bottom, still 95% at its middle, clear at the top, with 24
px of room above the composer), padded above the phone's home indicator, so the transcript
scrolls under it softly; the rail at the right. Sticky elements move with `--viewport-shift` for
Safari's phantom keyboard. While the session connects with nothing to show, three skeleton shapes
stand in for the transcript.

**The header**, on a translucent canvas with a strong blur and a hairline under it:

- **Computer.** The orb (44 px; its color is the session's state, its motion the agent's activity),
  the title (21 px, display weight), the description (13.5 px, one line, whole in a tooltip), then
  one wrapping row: workspace / `project#12`, the status pill, schedule and ticket links, what the
  agent may do on GitHub when less than push, the status's reason, "resumes in 4 min", the branch
  in mono, each pull request (state icon, `fctl#12`, checks icon, review mark), and, in amber or
  red, "Reconnecting…", a stall or a short disk. At the right: who else watches, "Open in Claude ↗"
  (for the subscription's person), find, follow (a bell that rings in the accent while following),
  share (owner), details, and ⋯.
- **Phone.** 56 px tall, the menu button where the top bar has it, the orb (36 px), the title (16
  px, a chevron after it), and one line: the status pill and the most pressing note, else
  `project#12`. Orb and title are one button that opens the details; find, follow and share move to
  the ⋯ menu.
- **The ⋯ menu**: Open in Claude (phones), Open on claude.ai, Stop the session (or review), Resume,
  Find in this session (phones), Follow or Stop following, Share (phones), Copy `fctl attach`, Copy
  link, then the switch to the other view.

The notes beside the status pill (`lib/status.ts`) come most pressing first: "Reconnecting…", the stall, the disk,
when a paused session resumes, then the status's reason; a phone has room for the first.

**Behavior.** The page title is "<title> · project#12". Following toasts what it means
("Following: you get a notification when it waits for you, pauses or fails", or, without a
device, "Following. Turn on notifications in Settings to get them in a browser."). The router
keeps this page when a link leads to another session, so its overlays (sheet, share, changes)
reset in the same render rather than sliding away over the next session.


## Copy conventions in this area

- Past tense once done ("Ran", "Read", "Edited", "Searched for", "Delegated", "Thought it
  through", "Remembered for later agents"), present participle while going on ("Running",
  "Preparing Bash", "Thinking", "Working").
- Sentences say what happens next, not what is possible: "The agent's work shows up here when it's
  back", "it reads it after this step", "Any reply answers it."
- Facts join with " · "; changes use a true minus ("+12 −3"); counts agree in number ("1 file",
  "Searched the web 2 times"); durations read "640 ms", "4.2 s", "12 s", "1m 4s", "1h 3m"; token
  counts are compact ("1.2K tokens"). An ellipsis only for what is under way ("Sending…",
  "Reconnecting…", "Looking further back…").
- Failures say what failed, briefly ("1 failed", "Failed after 40 s"), in red, which is for
  failures and danger only; amber is for caution (stalls, limits, warnings).
- fctl calls itself "fctl", Claude Code's process "the agent", the machine "the runner", and never
  says "AI". Sentence case everywhere; no eyebrows above headings.

## Accessibility notes

- Every line that opens is a button with `aria-expanded`; `aria-controls` only while its target
  exists.
- Live state speaks politely: stall, disk and held-findings notices are `role="status"`; find
  counts are `aria-live`.
- Icon-only controls have labels that include their shortcuts ("Find in this session (⌘F)"), and
  `aria-keyshortcuts` where a global shortcut exists.
- Images carry their file's name as `alt`; their links say "View <name>".
- Touch: lines grow on coarse pointers; find and menu buttons are 44 px on phones. Hover styles
  apply only where a pointer can hover, so times shown on hover never show on touch screens (and
  are left out on phones where they would take a line); a chip's remove button, which would be an
  invisible tap target there, always shows on touch screens.
- The focus goes back where it came from when the find bar closes.
- Lines that must survive forced colors are borders.

## Traps learned (and the fix)

The scrolling traps (anchoring at a forced layout, scrolls undone by following the bottom, a page
that shrinks looking like the reader scrolling up) are under "Sticking to the bottom" and "Earlier
activity". The others:

- **The router keeps the page across sessions** (`/s/A` to `/s/B`), so state such as an open sheet
  carries over. Reset per-session state while rendering when the id changes, and key the rail by
  the session.
- **Class merging**: `cn()` doesn't merge Tailwind classes, and variants are emitted later, so a
  `focus-within:` border beats a plain one. Choose state classes by condition (the composer's drag
  border).
- **A textarea counts its placeholder** in its height at mount and isn't measured again when the
  placeholder changes later; keep status placeholders short.
- **Escape in a search field**: handle it in the field's `keydown` and stop it there, or the field
  clears itself or the dialog around it closes first.
- **Real sessions can stream thoughts without text**, which the builder drops, so a real session
  may show no thoughts at all; the development stand-in for Claude streams thoughts with text, so
  check both.
- **Test mocks**: the transcript's tests mock the UI module's exports; a component using a new
  export renders "This event couldn't be shown" there until the mock lists it.


## Principles at work here

1. **Fold the work, never the words.** Tool calls and thoughts collapse into a line that says what
   they did; what people and the agent say shows whole.
2. **Say it in words, not tool names.** "Ran 2 commands, read 1 file"; a command's purpose before
   its text; paths from the repository's root.
3. **Show only what is really under way.** In progress follows from the turn and the stream: an
   orphaned step never spins, and a stall replaces every sign of work with what is wrong and since
   when.
4. **Keep the reader's place above all.** Follow the bottom only while the reader is there, let go
   at their first step up, and keep their line still when history loads above it.
5. **One geometry for everything.** A 24 px rail, text at 34 px, threads hanging from icons, facts
   at the right: a long transcript reads as one calm column.
6. **Quiet by default, detail on demand.** Times on hover, durations only when slow, outputs and
   diffs a click away; the reader chooses how deep to go, and what they open stays open.
7. **Calm, single-colored motion with a purpose.** Things arrive with a short rise, steps settle in
   order, signs of work shimmer in step in the accent; reduced motion keeps the meaning without the
   movement.
8. **Find what is folded.** Search the model, not the DOM; every region knows what must open to
   show it, and finding opens exactly that.
9. **Untrusted input can't break or betray the page.** Events are guarded at parsing and at
   rendering; links, pictures and published screenshots are checked before they show.
10. **Sentences that say what happens next.** Copy states consequences ("it reads it after this
    step", "Any reply answers it"), in sentence case, red only where something failed.
