# Motion

Every animation in fctl's web app, what it tells the reader, and how it's
built. The rules: motion shows where something came from, that something
changed, or that something is at work; it is quick; loops are calm, one
color and in step; reduced motion is always honored
([principle 6](../principles.md#6-motion-is-quick-purposeful-and-optional)).

The keyframes live in hyperstructure/fctl `web/src/styles/app.css` (each
block opens with a comment saying what it's for) and, for the shared ones, in
this package's [`src/tokens.css`](../../src/tokens.css).

## The easings and durations

From `tokens.css`:

| Token | Curve | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | most entrances and exits: fast start, long settle |
| `--ease-spring` | `cubic-bezier(0.34, 1.36, 0.64, 1)` | arrivals that should land with a little overshoot: a new step, a check, a digit |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | loops and sweeps that go and come back |

Rough durations: 140 to 220 ms for something leaving; 200 to 440 ms for
something arriving or opening; 1.1 to 1.8 s per cycle for a loop that
means "at work"; 2 to 2.6 s for a highlight that fades ("this is what
changed"); 4 s for the shimmer's cycle over a label (a 2 s pass, then 2 s at
rest).

## Shared building blocks (tokens.css)

- **`animate-rise`** (420 ms, `--ease-out`): fades in from 6 px below,
  sharpening out of a 2 px blur and growing from 99.5%. Anything that
  appears on its own: a popover, a pill, details that open, a notice.
- **`animate-fade`** (300 ms): fades in, in place. Content that replaces
  content (a retrospective opening to its full text).
- **`animate-pulse-soft`** (2.4 s loop): a gentle opacity pulse for a
  single dot that means "this one is at hand": the plan's current step, a
  call's background work.
- **`text-shimmer`** (a 4 s loop, app.css): a soft light passes over a label's
  text, left to right, in 2 s, then rests 2 s. Labels of work in progress: "Thinking", "Running the
  tests", a run's line while it goes on.

## Signs of work (loops)

All in the accent (yellow; ink on light backgrounds), all still where motion
is reduced, all restarted on the document's clock as they appear
(`web/src/lib/shimmer.ts` sets each new animation's `startTime` to 0 on
`animationstart`), so every one on screen beats in step with the others.
A label that appears mid-shimmer joins the shimmer where it is.

| Name | Where | What it does |
|---|---|---|
| dot wave | a call in progress, "Working" | a wave of light runs diagonally through a 3×3 grid of dots, 1.4 s; dots carry their `--i` index for delay |
| busy ring | the now line's icon tile | a faint track and a comet (conic gradient, brightest at its head) turning every 1.1 s; fades in and out over 300 ms with `data-busy` |
| thinking sweep | the thinking mark | a 13% bright head on a 36% tail sweeps along the trace in 1.5 s, eased; the trace dims to 55% beneath |
| header light | the session header's lower edge | a soft line of the accent sweeps in from nowhere and back out, 3.6 s |
| ribbon light | the turn under way, in the cover's ribbon | a light runs through its stretch, 1.8 s |
| floor packets | the Agent Floor's row in the sidebar | packets run down the icon's traces into its core, whose light flashes as they land, 1.8 s |
| reading eye | a review agent's icon while it reviews | its pupil reads along a line and darts back to the next, 2.4 s |
| diff caret | a file the agent is writing | the code comes in from the left behind a caret in the accent |

A many-colored ring was tried for the busy ring and read as out of place:
status is one color. The thinking mark is the deliberate exception (blue
turning pink).

## Arrivals and changes

| Name | Where | Timing | What it says |
|---|---|---|---|
| now-in / now-out | the now line's step, icon and plan step | in 420 ms `--ease-spring` from 1.2 em below, 3 px blur, opacity 1 at 40%; out 220 ms `--ease-out` 1 em up into a blur | "the agent moved on" |
| width glide | the now line | 420 ms `cubic-bezier(0.25, 1.12, 0.45, 1)`, measured before and after (FLIP) | the line's shape changed, smoothly |
| digit roll | token counts | 360 ms `--ease-out`, each figure in its own clipped slot, up as it grows, down as it shrinks | "this number changed", and by how much |
| rolling number | figures on the cover, "4 new" | the old value rolls out as the new rolls in, 300 ms | a figure moved |
| roll-in | a Select's new value, a step's words | 300 ms from below, blurred | a new value took the old one's place |
| step-in | a run's steps when it opens | 220 ms, staggered 14 ms each, at most 8 | the steps of a run, one after another |
| thread draw | a part that arrives in a turn | its stretch of the thread grows down to it, 560 ms; a turn's end pops its icon (420 ms spring, 240 ms late) | "this just came" |
| sweep | a turn that ends while the reader watches | a light runs down the last ten rows' thread to its end, 420 ms each, 55 ms apart | "the turn is over" |
| invite | the message box, as the agent hands over | a ring of the accent spreads out from it once, 1.6 s | "your turn" |
| draw | a plan step checked off | its check draws itself, 320 ms | "done" |
| listbox | a Select's list | grows out of its trigger 200 ms, options settle in one after another (18 ms each), the picked one flashes 160 ms, out 140 ms | |
| zoom-in | the lightbox | a screenshot grows into place, 220 ms | |
| sheet | the details on a phone | slides up 420 ms, follows the finger that pulls it, the page dims behind and brightens as it's pulled | |
| shake / pop | two-factor codes | a wrong code shakes 380 ms; digits pop in with a spring, 200 ms | |

## Highlights that fade

| Name | Where | Timing |
|---|---|---|
| landed | the call the page went to from the background list | the accent's soft tint held 30% of 2.6 s, then fading |
| row moved | a pull request whose state or checks changed (on /pulls) | `accent-soft` fading over 2 s |
| diff lit | lines the agent just changed | a wash of the highlight from the left and a bar at the gutter, 2.6 s; where motion is reduced, the bar alone, gone at once after 2.2 s |
| header scan | a file's header as the agent changes the file | a light runs along it, 1.1 s |

## Patterns

**Roll a step, not its parts.** Give the element a `key` of what it *is*
(the step), and animate it in on mount; keep figures that move within it out
of the key. To roll the old one out at the same time, keep a copy of what it
rendered (in a layout effect, after each commit), render it absolutely
positioned at **the width it had**, `aria-hidden`, with the out animation,
and drop it on `animationend` or after a timer (an element that isn't
painted never ends its animation). See `Roll` in `now-line.tsx`.

**Glide a width (FLIP).** Remember the element's width each commit; when its
shape changes, read the new width, set the old one explicitly, force a
layout, set the new one with a CSS transition, and clear it when the
transition ends. Don't let content shrink while it glides
(`min-width: max-content` on the row), or truncation flickers. Start a
glide that interrupts another from the current, animated width.

**Glide a height.** For a card that opens, measure its height before the
state changes (in the click handler), and after (in a layout effect), and
play the difference with the Web Animations API (`el.animate([{height}…])`).
Keep the closed and open layouts on the same grid so nothing moves
sideways. See `RetrospectiveCard`.

**Roll figures.** Split a formatted number into characters, key each slot by
its position from the right, and roll a slot when its character changes.
Keep the format's width stable (one decimal from 1K: "4.0K").

**Comet along a path.** Two copies of the path with `pathLength="100"`, each
with one dash (`stroke-dasharray: L 100`) whose end is the head; animate
`stroke-dashoffset` from `L` to `L − 136` so both ends travel together from
before the start to past the end. The shorter dash is the bright head, the
longer at lower opacity is the tail.

**Sync loops.** Infinite animations that mean the same thing should start
at the document's time zero, whenever their element appears: listen for
`animationstart` on the document, and set `startTime = 0` on that element's
animations of the synced names.

**Reduced motion.** Loops: `animation: none` (or leave them out); arrivals
whose end some code waits for: `animation-duration: 1ms`; widths and
heights: skip the glide (check `matchMedia("(prefers-reduced-motion:
reduce)")`); SVG animations that CSS can't reach: don't render them. A
still state must still say what the motion said: the comet becomes a still
arc, the thinking mark its whole trace, a changed line keeps its bar.
