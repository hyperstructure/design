# Principles

The rules behind every screen of fctl's web app, each with the reason for it and
an example of it in use. When a new component needs a decision these pages
don't cover, decide it the way these rules would. The component pages
([README](README.md)) show the rules at work in detail.

## 1. Say what happens, plainly

Copy says what the person will see or what the system does, in plain words,
not what is possible or how good it is.

- "The agent reads your message at its next step", not "Messages are
  supported while the agent works".
- "Show 3 earlier turns", not "More…". "Looking for it earlier in the session",
  not "Loading…" where the page knows what it's looking for.
- Sentence case everywhere: buttons, headings, menu items, tabs. Never
  Title Case, never decorative uppercase labels above headings ("eyebrows").
- No numbered section labels (01, 02, …) above headings: they are a cliché of
  generated design and add nothing a heading doesn't. Headings alone group
  sections.
- No marketing tone, no exclamation marks, no emoji in the interface.
- Name things as the product does: a **runner** is a machine that runs
  sessions; the **host** is the `fctl host` service on it. A **session**, a
  **turn** (one ask and the agent's work on it), a **step** (one call or
  thought), a **task** (work Claude Code runs on its own in the background).
- Numbers carry their unit and agree with it: "1 step", "7 steps", "1 running".
- Time is short and exact where it's live ("12s", "4m 3s", "1h 2m"), relative
  where it's history ("2m ago"), and absolute on hover (`title`).
- Say who did what: "Ada asked", "the agent went on without a message",
  "fctl's review agent reviewed commit…".

## 2. One palette, used for meaning

The palette is fixed (yellow `#ffff5d`, lime `#eaff81` on light, hot pink
`#ff00d8`, blue `#007eff`, blackish `#171717`, whiteish `#fafafa`), and the app
uses the semantic tokens from [`src/tokens.css`](../src/tokens.css) (`canvas`,
`surface`, `raised`, `sunken`, `ink` to `ink-4`, `line`, `line-strong`,
`hover`, `accent`, `pink`, `blue`, `danger`, …), never raw colors.

- **Red is for danger only**: destructive actions, errors, failures. A
  stopped session is grey, a cut-off turn amber, a failed one red.
- **Signs of work are one color and calm**: the accent (yellow; ink on light
  backgrounds) for what's at work now: the dot wave, the comet arc around
  the pill's icon, the header's running light, a call in progress. A ring in
  the brand's yellow, pink and blue was tried there and read as out of place:
  the many-colored palette is for the brand's scenes, not for status.
- **The exception is the thinking mark**, deliberately colorful: a trace in
  the brand's blue turning pink (see
  [the now line](web-app/now-line.md#the-thinking-mark)). One sanctioned
  exception, not a license.
- A session's status has one color each, everywhere it shows: working in
  the accent, waiting (for a message, or for its background work) in blue,
  paused in pink, failed in red, and queued, starting, stopping and stopped
  in greys. The colors keep those meanings elsewhere: blue is "your move"
  (*Your turn*), pink marks what stopped to wait or what's new to the reader
  (the *New* line, a blocked retrospective), amber is a warning or something
  cut short.
- **Hovered rows and buttons fill with `hover`**, not `raised` (white in the
  light theme, so it would vanish).
- Light-theme text shades exist where a brand color can't be read on
  whiteish (`--c-blue` is `#0070e0` on light). Use the token; it switches.

## 3. Show the gist; the rest is a click away

Most of what fctl shows is long: transcripts of hours, retrospectives of four
paragraphs, fifty turns, a dozen background tasks. Every component shows the
part that matters at a glance, and keeps the rest one click (or one key)
away, in place.

- A run of calls folds into one line that says what they did: "Ran 7
  commands, searched for 4 patterns, read 1 file". It opens to every step.
- A retrospective in the transcript shows its outcome and each part in a
  line. A click opens all of it, where it is.
- The details list the newest six turns and the one the reader is in; the
  earlier ones are behind "Show 3 earlier turns".
- The pill names the one background task the agent waits for, and opens
  into the list of all of them.
- fctl's own long messages (a review's findings passed on) clamp to five
  lines with "Show all". What a person wrote always shows whole: what to skip
  of someone's words is the reader's call, not the page's.

What counts as the gist is a design decision, made per component: the
outcome and what the work was (retrospective), the verb and its object
("Reading src/lib/money.ts"), the newest and the current (lists).

## 4. Say a thing once

When two places say the same thing, the reader reads it twice and wonders
whether they differ. Give each fact one home.

- The new session view's pill is the one place for what the agent does at
  this moment. The transcript is the record of what it did. So a thought
  that streams in, a call being written, and "the agent is at work between
  steps" show only in the pill; they enter the transcript once they're done.
- The cover's title gives way to the header's as it scrolls under it, so
  the title is on screen once.
- A turn's end says how long the turn took. The ask card doesn't say it
  again.

## 5. Steady, not flickery

Live interfaces change many times a second. The reader should see each
change once, readably, and never see the interface stutter.

- **A step shows for at least 600 ms**, so quick ones don't flash past. A
  change that comes sooner waits its turn; a newer one replaces it in the queue.
- **Identity excludes figures that move within it.** A thought is the same
  step whether it's at 3.8K or 4.2K tokens, so the count changes in place and
  the step doesn't roll in again. Re-keying a whole label on each count
  is what made the old pill flicker.
- **Only what changed moves.** A count's figures each roll in their own slot,
  as an odometer's do: 3.8K to 3.9K moves one digit.
- **Counts change no more often than they can be read** (every 450 ms), so
  each roll finishes before the next starts.
- **Transient states settle before they show.** Between a background task's
  end and the turn that takes up its result, a session says "Waiting for a
  message" for a few milliseconds; "Your turn" shows only once that has
  lasted 400 ms. Otherwise the pill flashes a false hand-over.
- **When two sources lag each other, prefer the one that's ahead, but bound
  it.** The transcript sees a task end before the session's status does; for
  that moment the task still counts as awaited, but only until the agent's
  next turn.

## 6. Motion is quick, purposeful, and optional

Motion shows where something came from and that something changed. It is
never decoration that loops for its own sake.

- Arrivals rise and settle with a little spring (`--ease-spring`); exits
  leave quickly with `--ease-out`. New steps roll in from below while the old
  roll away above. Widths glide rather than jump.
- Durations are short: 140 to 440 ms for state changes, 1.1 to 1.8 s for the
  loops that mean "at work" (the comet arc, the dot wave, the thinking sweep).
- Everything that loops is in step with its siblings: the app restarts each
  shimmer, wave and comet on the document's clock as it appears, so two
  "at work" marks on screen pulse together, never against each other.
- **Reduced motion is honored everywhere**: loops stand still (the comet arc
  becomes a still arc), arrivals happen at once (1 ms animations, so code
  that waits for `animationend` still runs), widths don't glide, and the
  thinking mark shows its whole trace still.
- The full catalogue, with keyframes and timings: [motion](web-app/motion.md).

## 7. Keep the reader's place

People read transcripts while the agent writes them. The page never moves
under a reader who isn't at the bottom.

- The page sticks to the newest work only while the reader is there;
  scrolling up lets go, and a button ("4 new", or "Latest") brings them back.
- Every jump the reader asks for (to a turn, to a task's call, to a find
  match) lets go of the bottom first, then scrolls, smoothly when near and
  instantly when far.
- Earlier activity loads above without moving what the reader looks at.
- What's new is counted by event sequence numbers, never by how many items
  there are, because loading earlier activity adds items that aren't new.
- A line marks where what came while the reader was away starts, once.

## 8. Phones are first-class

People follow sessions on their phones as much as on a computer, often
on an iPhone in Safari. Every component is designed for both, not shrunk to
fit.

- Tap targets are at least as tall as a line of text with padding
  (`pointer-coarse:py-1.5`), and the whole row is the target.
- Hover-only affordances don't exist on touch screens: Tailwind 4 puts
  `hover:` under `@media (hover: hover)`, but an `opacity-0` button still
  takes taps there, so it also needs `[@media(hover:none)]:hidden`.
- Where a label column would leave too little room, an icon stands in for
  the label (kept for screen readers): a retrospective's parts on a phone.
- Rails become sheets; wide popovers are `min(24rem, 100vw - 2rem)`.
- Words that only add detail hide on phones (`max-sm:hidden`), keeping
  the essential ones: the pill drops the call beside the plan step.

## 9. Accessible by construction

- Every interactive thing is a real `button` or `a`, with `aria-expanded`
  and `aria-controls` where it opens something.
- Focus rings must survive forced colors (Windows' contrast themes), which
  drop backgrounds and box-shadows but keep outlines and borders. Draw rings
  as outlines and dividers as borders.
- Live regions announce the step, not each second or token of it: times and
  counts inside a live region are `aria-hidden`.
- Where an icon stands in for a word, the word stays in the DOM as
  `sr-only`.
- A button laid over a component (the pill, a covering link) takes the
  focus; its ring goes around the component (`has-[:focus-visible]:outline`).

## 10. Edge cases are part of the design

The difference between good and great is what happens at the edges. Every
component in these docs lists the edges it handles; a new one should too.
The recurring ones:

- **Partial data**: the page loads the newest events first. A task, a turn or
  a plan may have started before what's loaded: look further back by itself
  (bounded), and say so while it does ("Looking for it earlier in the session").
- **Lag between sources**: the live transcript and the session's status
  arrive separately. Decide which wins for each fact, and for how long.
- **Failure**: offline loads fail. Don't retry in a loop; try again when the
  person asks (opens the list again).
- **Too many**: fold (newest six), cap (a ribbon of at most 150 turns),
  bound the work (look back at most 40,000 events).
- **Too long**: truncate where the meaning survives: a path keeps its file
  name, giving way from its start (`direction: rtl` on a `bdi`); a gist
  line ends in an ellipsis; the lead of a retrospective gets two lines.
- **Too fast**: hold, settle and throttle (principle 5).
- **Nothing**: an empty state says what will appear and when, in a sentence:
  "The agent records one as it finishes a piece of work…".

## 11. Check it like a person would

A change to the interface isn't done until it's been seen in both themes, at
a phone's width and a computer's, in Chrome and Safari's engines, with real
data, and, for motion, frame by frame. [Verifying](web-app/verifying.md) has
the recipes.
