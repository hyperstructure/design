# The now line: what the agent does at this moment

A pill above the message box of the new session view that says, at every
moment, what the agent is doing, for how long, and where it is in its plan.
When the agent waits for background work, it names that work and opens into
a list of it. When the agent hands over, it says it's the reader's turn.

It is the single home of "now" on the page (principle 4,
[say a thing once](../principles.md#4-say-a-thing-once)): nothing in the
transcript repeats it. Lives in hyperstructure/fctl at
`web/src/components/session/now-line.tsx`, fed by `web/src/lib/now.ts`
(`nowOf`, `waitingOf`), with the background list in
`web/src/components/session/background.tsx`.

## Anatomy

```
╭───────────────────────────────────────────────────────────────────╮
│ (◌✱)  Fixing the wait │ Reading src/login.test.ts  12s  ◔ 2/6  ⌃ │
╰───────────────────────────────────────────────────────────────────╯
  icon   plan step        the step: verb + target     time  plan  opens
  tile   (leads)                                             ring  (background only)
```

1. **The icon tile**: a 24 px circle (`bg-raised`) holding a 14 px icon for
   the kind of moment. While the agent is busy, a comet arc runs around the
   circle (the busy ring).
2. **The plan step** (only while busy and only if the agent wrote a plan in
   this turn): the step it's at, in the words the agent uses while doing it
   (its to-do item's `activeForm`: "Fixing the wait"), in medium weight with
   the shimmer. It leads because it's the most meaningful thing on the line:
   *why* the agent is reading that file.
3. **The step**: a verb and what it acts on ("Reading" `src/login.test.ts`,
   "Searching for" `redirect`, "Running" `npm test`). Beside the plan step
   it's quieter (`ink-3`) and set off by a hairline; on a phone it hides there,
   since the plan step says more.
4. **The figures**: how long the step has run ("12s", "4m 3s", "1h 2m"), and
   for a thought, its tokens ("· 4.2K tokens").
5. **The plan ring**: how much of the plan is done ("2/6") as a ring that
   fills, shown while there's plan left.
6. **The chevron**, only when the line opens into the background list.

The pill is 32 px tall (`h-8`), fully rounded, `bg-surface/85` with a
backdrop blur, a hairline border and a soft shadow, so it floats over the
transcript that scrolls under the footer's fade. It never wraps: everything
truncates on one line, the step's words first, then the plan step.

## The kinds of moment

| Kind | Says | Icon | Busy |
|---|---|---|---|
| setup | the sandbox's current step ("Pulling the sandbox image"), else "Waiting for a runner" or "Setting up the sandbox" | box | yes |
| thinking | "Thinking", with the thought's tokens | the thinking mark, animated | yes |
| writing | "Writing" | pen, accent | yes |
| preparing | "Preparing an edit", "Preparing a command", "Preparing a file", "Preparing a subagent", "Preparing Linear · create issue" | dot wave | yes |
| tool | the call in words (below), with what it acts on | the tool's own icon | yes |
| working | "Working", since the turn started | dot wave | yes |
| background | "Waiting for" + the task, or the status's words ("Waiting for 2 background tasks") | hourglass, blue | no |
| paused | the reason the session paused | circle-pause, pink | no |
| stopping | "Stopping" | square | no |
| stalled | why the work isn't coming through, and since when: "Runner not heard from since 14:02", "Sandbox paused since yesterday at 18:40", "Agent unreachable since 14:02" (`stallLabel` in `web/src/lib/stall.ts`) | unplug, amber, words in amber | no |
| (your turn) | "Your turn" · "The agent waits for your reply" | reply, blue on blue-soft | no |

Busy kinds shimmer their words and show the comet arc; the others are calm.
When the session waits for a message and the reader can reply, the pill
becomes "Your turn"; when nothing applies (a stopped session, a viewer who
can't reply), it goes away.

### A call in words

What a call does is said as it happens, as a person would say it
(`doing()` in `lib/now.ts`):

- A shell command says what it's for, when the agent gave a description
  ("Run the tests"); else "Running" and the command's first line in mono.
- Reads, edits and writes name the file, relative to the working directory:
  "Reading" / "Editing" / "Writing" `src/lib/money.ts`. A path truncates from
  its start, so the file name stays in view (a `bdi` with
  `direction: rtl` and `text-align: left`).
- Searches say what they look for: "Searching for" `redirect`; listings
  "Listing" `**/*.md`; fetches "Fetching" the address; web searches
  "Searching the web for" the query.
- Subagents: "Delegating" and the subagent's description. The plan:
  "Updating the plan". Anything else: "Using" and the tool's name as people
  read it ("Using Linear · get issue" for `mcp__claude_ai_Linear__get_issue`).

## What to show, and how much

- **One step at a time.** Never a list of what's in flight; the transcript
  holds the history. The step is the newest unfinished call, else the newest
  block streaming in, else "Working".
- **The verb leads, the object follows.** The object is the piece that
  changes most, so it's the one that truncates.
- **Time only when it's known and meaningful**: a call shows Claude Code's
  own count of seconds once it passes 1 s (it knows better than the page);
  other steps tick from when they started. Paused shows no ticking time.
- **Tokens only for thoughts**, and only once Claude Code says how far the
  thought got.
- **The plan step only while busy** and only from a plan written in the turn
  under way: an older plan stays in the details, as it was left.

## Steadiness

The pill changes many times a second while the agent works. It shows each
change once, readably (principle 5,
[steady, not flickery](../principles.md#5-steady-not-flickery)):

- **Hold**: a step shows for at least 600 ms (`STEADY_MS`). A newer one
  waits; a newer still replaces it in the queue.
- **Settle**: the empty state and "Your turn" show only once they've lasted
  400 ms (`SETTLE_MS`). Between a background task's end and the turn that
  takes up its result, the session says "Waiting for a message" for a few
  milliseconds; without settling, the pill would flash "Your turn" (or
  vanish) and come back.
- **Identity**: a step is what it does and to what (kind, words, target),
  never its figures. A thought stays the same step while its tokens grow.
- **Throttle**: the token count changes at most every 450 ms (`COUNT_MS`),
  so each digit's roll finishes before the next one starts.

## Motion

Every change of step **rolls**: the new step rises from below the pill's
bottom edge, out of a 3 px blur, and settles with a slight spring (420 ms,
`--ease-spring`, opacity reaching 1 at 40%); the old step rolls away above
(220 ms, `--ease-out`, into a blur). The pill clips both (`overflow: hidden`).
The icon rolls on its own inside its circle, only when the kind (or the
tool) changes; the plan step rolls on its own when the plan moves.

The outgoing copy is kept at **the width it had** (measured on the last
render) and positioned absolutely, so its words don't collapse into the new
step's narrower box ("Thinking · 25 tokens" once showed as "· 25 tokens"
mid-roll). It's removed on `animationend`, or after 600 ms in case the
animation never ends (a hidden element doesn't animate).

The pill **glides** to its new width (420 ms,
`cubic-bezier(0.25, 1.12, 0.45, 1)`): measured before and after (FLIP),
whenever its shape changes: a new step, a count that gains a figure, a time
that does ("59s" → "1m 0s"), the plan ring appearing. While it glides, its
row keeps its natural width (`min-width: max-content`), so the words are
clipped by the moving edge rather than ellipsized and un-ellipsized. A change
in the middle of a glide glides on from where it is.

**Figures roll like an odometer**: each character of "4.2K" sits in its own
clipped slot; a changed character rolls up (or down, if the count shrank)
360 ms, the others hold still. Slots count from the right, so the units stay
put as the number grows, and a new leftmost slot rolls in. From 1,000 tokens
the count keeps one decimal ("4.0K", not "4K") so its figures keep their places.

**The comet arc** around the tile (busy kinds): a faint full track in `line`
and a conic gradient of the accent rotating every 1.1 s, brightest at its
head. It fades in and out over 300 ms as the agent gets to work or stops.

**The pill itself** rises in when it first appears (`animate-rise`) and
doesn't roll its first step.

Reduced motion: rolls take 1 ms, the width doesn't glide, the comet stands
still, the thinking mark shows its whole trace.

## The thinking mark

The icon for a thought: a monitor's trace (a small wave, a spike, a slow
wave) in the brand's blue turning pink, the one colorful sign of work in the
app (thinking earns a little color, and a signal says "at work" better than
a picture of a thought). While a
thought streams in, the trace dims to 55% and a comet sweeps along it: a
13% head at full strength on a 36% tail at 70%, 1.5 s per sweep, eased, in
step with every other sweep on the page. Finished thoughts in the transcript
show the whole trace still. `ThoughtIcon` in
`web/src/components/ui/icons.tsx`; the sweep is `stroke-dashoffset` on two
copies of the path with `pathLength="100"`, one dash each, whose ends move
together.

Explored and set aside for it: a cloud with dots (read as weather), an EKG
burst (too busy at 14 px), voice bars (read as audio), broadcast arcs (read
as Wi-Fi), a neural net (a molecule at 14 px), a robot (says *who*, not
*thinking*). A flowing brainwave was the close second.

## Waiting for background work

When the agent ends its turn while work it started keeps running (a dev
server, a build, a subagent), the session waits for that work, and so does
the pill:

- **One task the page knows**: "Waiting for" + what it does ("Start the dev
  stack"), with how long it has run. A task is named by Claude Code's
  description, else its command (mono), else its kind ("a shell command").
- **Several, or one that started before the loaded activity**: the status's
  own words ("Waiting for 2 background tasks").

The pill then opens (chevron, a button laid over it with `aria-expanded`)
into a list, above it:

```
╭ In the background                         2 running ╮
│ [>_] Start the dev stack                       12m  │
│      npm run dev                                    │
│ [◎]  Review the images branch diff              1m  │
│      Reading src/images/resize.ts   (shimmering)    │
│ ─────────────────────────────────────────────────── │
│ When one ends, the agent takes up its result.       │
╰─────────────────────────────────────────────────────╯
```

- Each row: the call's icon in a tile like the transcript's, what it does,
  how long it has run (ticking), and a second line: the command for a shell
  command, what a subagent does at this moment (shimmering while that call
  runs), or the kind.
- **A row takes the reader to the call that started it**: the list closes;
  whatever folds the call opens (its run, the subagent whose work it is),
  and so does the call, to its command; the page lets go of the bottom and
  scrolls the call's line under the header with 40 px of context above; the
  line lights up in the accent's soft tint for a moment (held 30% of 2.6 s,
  then fading). If the transcript shows only the conversation, it shows
  everything first.
- **Tasks it misses** (the status counts more than the loaded transcript
  saw start) are looked for by loading earlier activity, 4,000 events at a
  time, up to 40,000: "Looking for it earlier in the session" with the dot
  wave, then the task appears in place. Past that: "It started earlier in the
  session". With everything loaded and still missing: "The transcript
  doesn't name it". After a failed load (offline) it looks again only when
  the list opens again, never in a loop.
- It closes on a press outside (`pointerdown`, which iOS delivers where
  `mousedown` isn't), on Escape (focus returns to the pill), on choosing,
  and when the agent stops waiting.
- It's solid `bg-raised`, not translucent: a blur behind a 95% surface adds
  nothing and headless WebKit draws it see-through.

**The lag between sources**: the transcript sees a task end (Claude Code's
`task_notification`) a moment before the session's status drops its count.
For that moment a task that ended since the agent's last turn still counts as
awaited, and it fills only the room the status leaves (a running task
always keeps its place).

**In the transcript**, a call that left work running says so on its line:
a pulsing accent dot and "In the background · 36 s" while it runs; "1m 30s in
the background", "Failed after 12 s" (danger) or "Stopped after 4m" once it
ended. A folded run says how many of its calls left work running: "● 1 in
the background".

## Your turn

When the agent hands the turn over and the reader can reply, the pill rolls
to "Your turn" (a reply icon on `blue-soft`, a `blue/30` border that
strengthens on hover), with "The agent waits for your reply" where there's
room. The whole pill is a button (laid over it, so the pill underneath stays
the same element and can roll): it focuses the message box. As the agent
hands over while the reader watches, the message box glows once (*invite*).

## Beside it: the way back

On the right of the same row, when the reader has scrolled away from the
newest work, a pill brings them back: "4 new" (the count rolling as it
grows) or "Latest", with an arrow down; or, with an arrow up, back to where
what came while they were away starts. It never shows while the reader is
at the bottom.

## Layout and stacking

The pill sits in an absolutely positioned row 40 px above the message box,
inside the sticky footer. The footer is `pointer-events: none` (the
transcript scrolls under its fade), so the pill, the way back and the list
opt back in with `pointer-events-auto`; a popover that forgets is a click
that falls through to the transcript. The list is `z-20` above the row, as
wide as `min(24rem, 100vw - 2rem)`, at most `min(60vh, 26rem)` tall with its
rows scrolling inside it (an overlay is the one place an inner scroll is right).

## Accessibility

- The pill is an `<output aria-live="polite">`: screen readers hear each new
  step. Times and token counts are `aria-hidden`, so they don't hear every
  second.
- The background toggle is a `button` with `aria-expanded` and
  `aria-controls`, labelled with the pill's words; the list is a
  `role="dialog"` labelled "In the background".
- The ring of a focused overlay button goes around the pill
  (`has-[:focus-visible]:outline-2`), as an outline, which forced colors keep.

## Edge cases it handles

- Quick steps (shown 600 ms), quick hand-overs (settled 400 ms).
- A new thought while the last one's count shows (the count rolls down).
- Tokens arriving after the step showed (the count rolls in by itself; the
  pill glides wider).
- A step change in the middle of a glide; two changes inside one roll (at
  most two outgoing copies).
- Long words on a phone (truncated after the glide, clipped during it).
- The session's status and the transcript disagreeing for a moment.
- Background tasks that started before what's loaded; loads that fail.
- A task inside a subagent (going to it opens the subagent).
- Animations that never end (removed by a timer).
- Reduced motion.

## Building one like it

1. Decide the one thing it says per moment, and a verb for each kind.
2. Give every moment an identity that excludes its moving figures.
3. Hold steps, settle transient states, throttle counts.
4. Roll the words, roll the icon separately, glide the width (FLIP), and keep
   the outgoing copy at its old width.
5. Roll figures in their own slots; keep formats stable in width.
6. Make it the only place for "now"; remove duplicates elsewhere.
7. Lay buttons over the pill rather than swapping its element, so it can keep
   rolling.
8. Live region for the words, `aria-hidden` for the ticking parts.
9. Check every kind live, at a phone's width, in both themes, frame by frame.
