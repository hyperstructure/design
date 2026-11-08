# The session view: reading a session in turns

A session is a conversation between people and an agent that can run for
hours: hundreds of calls, dozens of messages, background work, plans,
retrospectives. The new session view (`/s/<id>`, hyperstructure/fctl
`web/src/routes/session-next.tsx` and `web/src/components/session/turns.tsx`)
is designed for two ways of reading it:

- **Following** it live: what is the agent doing now, did it finish, is it
  my turn?
- **Catching up** on it: what was asked, what came of each ask, what changed,
  and where to look closer.

It reads the session as **turns**, each a chapter: what someone asked, the
work the agent did about it, and how it ended. It keeps the classic view's
transcript parts (calls, runs, thoughts, notices; see
[transcript](transcript.md)) and the details rail, so finding, loading
earlier activity and opening things all work the same in both views.

## Two views, one switch

The classic view stays the default while the new one proves itself:
people switch with `v`, with the ⋯ menu ("Try the new view" / "Back to the
classic view") or in Settings → Appearance. The browser keeps the choice
(`localStorage` `fctl:session-view`, synced across tabs), and the switch is a
view transition, so the page cross-fades rather than jumps. When a second
design competes with a working one, ship it beside the first behind a
switch people can flip back, and let them compare on real sessions.

## The page, top to bottom

1. **The header** (sticky): the session's orb, its title, its status
   ("Working", "Waiting · Waiting for a background task"), and its actions.
   It has no border: the transcript blurs as it scrolls under it. While the
   agent works, a soft line of the accent runs along the header's lower
   edge, out of nowhere and back into it (a 1 px gradient sweeping), the
   only line there; where motion is reduced it doesn't show, and the status
   says the agent works.
2. **The turn bar** (sticky, under the header): once the reader scrolls
   past the start of the turn they're in, a bar slides out from under the
   header with who asked and what ("Ada · Fix the flaky login test") and a
   "Turns" button that lists every turn. A click on the bar goes back to the
   turn's start. Like the header, and the find bar that takes its place
   while the reader searches, it has no border.
3. **The cover**: the session's title (large), its description, who started
   it and when, its branch, and **the session at a glance** (below).
4. **The turns**, one after another, with the gap between two marked when
   the next came much later.
5. **The footer** (sticky): the [now line](now-line.md) and the way back to
   the newest work, over the message box.
6. **The details rail** on the right on a computer (a sheet on a phone, `d`
   toggles it): changes, pull requests, the plan, the turns, the
   retrospective, memory, work figures, the session's facts. It is
   `bg-surface/40`, a shade lighter than the canvas, with no border at its
   edge, and its sections are divided by space and their headings, not by
   lines.

## The cover and the glance

The cover answers "what is this session and how far did it get?" before the
reader reads a word of the transcript.

- **The title** is the session's, large. The header shows it too, at the top
  of the page as everywhere else: a header that hid its title while the
  cover's showed, and faded it in as the cover's scrolled under it, looked
  as if its title were missing. Screen readers hear it once, from the
  header's `h1`; the cover's is `aria-hidden`.
- **The figures**: turns, the agent's time, steps, files changed with lines
  added and removed (`+120 −34`, green and red). The counts roll to their new
  value as the session moves (the same rolling number as everywhere).
- **The ribbon**: every turn as a stretch of a thin bar, each as wide as the
  square root of its time (an hour's turn shows beside a minute's without
  crushing it), colored by how it went: finished in `ink-4`, cut short in
  amber, failed in red, stopped in `line-strong`, and the turn under way in
  the accent with a light running through it. A stretch is a button (a full
  24 px tall for fingers) that goes to the turn, labelled "Fix the login
  test: finished in 4m 3s". Past 24 turns the stretches close up to a pixel
  apart; past 150 the ribbon goes, and the figures and the turn list remain.
  When earlier activity isn't loaded, the ribbon waits (it would lie).
- **The pull requests**: one chip each, with its state icon, `#123`, "Open ·
  checks running", and its checks' icon, linking to GitHub.

## A turn

```
╭─────────────────────────────────────────────╮
│ (Ada) Ada Lovelace  08:52                 ⧉ │   the ask card
│ Fix the flaky login test. It fails on CI.   │
╰┬────────────────────────────────────────────╯
 │ ⬡ Sandbox ready in 183 ms                       milestones
 │ I'll look at the test first.                    what the agent said
 │ ▣ Ran 7 commands, searched for 4 patterns  3 s  a run of calls
 │ ▣ Edit login.test.ts           +3 −1             a call
 │ The test waits for the redirect now.
 ◎ Finished in 1m 5s   14 steps   Edited 2 files +12 −3 ⌄   ⋯   the outcome
```

### The ask card

What someone asked opens the turn, in a card: avatar, name, the time,
where it came from when it wasn't the web (" · from the CLI", " · from the
Claude app"), and the message, whole, with its line breaks, and its
attachments; a note fctl added (a schedule's) sits under a hairline. A
copy button sits at the card's corner where a pointer rests on it (not on
touch screens: nothing rests there, and selecting the text works). In the
light theme the card lifts off the page with a soft shadow; the thread hangs
from its lower left corner, which is all but square there.

Messages from fctl itself (a review's findings, a pull request merged, a
Linear ticket delegated) keep the classic transcript's look, which shows
what happened there. A turn the agent started on its own (a background task
ended, a schedule fired) has no card: it starts with a quiet line, "The agent
went on without a message", with a sparkle on the rail.

### The thread

What the agent did about the ask hangs from the card on a **thread**: a 1 px
vertical line down the rail where the steps' icons sit (24 px wide, the line
at 11.5 px), with the agent's words beside it, set in from the rail.

- The thread is drawn per row, as a `border-left` on a `::before` (a border,
  not a background, so Windows' contrast themes keep it), behind the row's
  content (`isolation: isolate` on each row, `z-index: -1` on the line). The
  icons sit on a disc of the page's color, so the line runs behind them, not
  through them.
- **Flat rows, not nested chapters.** Each part of the transcript stays one
  row of one list, with the classic transcript's keys; the turn is drawn
  with classes on those rows (`thread-start`, `thread-end`, `thread-live`).
  Nesting parts inside turn elements would remount them when earlier
  activity gives a turn its ask, and the logic that keeps the reader's place
  measures the list's direct children.
- A consequence: a dropdown inside a row is covered by the rows after it
  (each isolates its stacking), so menus in the thread open upward.
- The end of the turn under way fades out (a mask over its last 3 rem): what
  comes next isn't there yet.
- **Arrivals draw**: a part that comes while the reader watches draws its
  stretch of thread down to it (560 ms) and settles in. Parts that loaded
  with the page don't.

### The outcome

Where the thread ends, the turn says how it went, beside a rail icon in the
outcome's color: "Finished in 1m 5s" (or "Ended after…", "Failed after…",
"Cut off after…", "Stopped after…"), its steps, how many failed, and "Edited 2
files +12 −3", which opens into the list of files, each a click from its
diff. Its facts wrap beside the icon, separated by space, not dots (a dot
would start a wrapped line).

When a turn ends while the reader watches, a light runs down the last ten
rows of its thread to its end (2.5 s), and the end's icon pops.

The ⋯ at its end (opening upward) copies the turn as Markdown, to paste
where people talk about it (who asked what, what the agent said, how it
ended, the files it edited), or a link that opens the session at that turn
(`/s/<id>?turn=<seq>`). Copying says whether it worked: browsers refuse the
clipboard on plain http and without focus.

### Between turns

When the next turn came half an hour or more later, a line between them says
so: "35 minutes later", "8 hours later", "2 days later", with hairlines fading
in from both sides and the exact time on hover.

## Finding your way

- **`j` and `k`** go to the next and previous turn's start; the turn bar's
  button and the details list every turn.
- **A turn's row** (in the bar's list and the details) shows who started it
  (avatar, fctl's mark, or a sparkle for the agent itself), its title (the
  ask's first line without Markdown's marks, cut at 160 characters; for
  fctl's messages what happened: "SHOP-419: Danish for the shop"), when, its
  steps and files, how it ended (an icon), and a hairline as long as its
  share of the session's time. The current turn is marked with the accent.
- **The details list** shows the newest six turns, and always the one the
  reader is in; "Show 3 earlier turns" opens the rest in place. It never
  scrolls inside the rail, which scrolls itself: a scroll inside a scroll
  traps the wheel and hides that there's more.
- **A link to a turn** opens the page there, loading earlier activity until
  it has the turn, then the address forgets the turn (so the same link works
  again). A turn that can't be found goes nowhere rather than somewhere wrong.
- **Going to a turn** lets go of the bottom and scrolls its start under the
  header, smoothly unless motion is reduced.

## Coming back

- **The way back** ("4 new", "Latest", or up to where the new part starts):
  see [the now line](now-line.md#beside-it-the-way-back).
- **The new line**: when the reader comes back to the tab, a pink hairline
  with "New" marks where what came while they were away starts, once. It's
  placed by event sequence number (never by counting items) before the first
  row from there on that shows, even when that is a turn's end or when the
  conversation alone shows.
- **Your turn**: when the agent hands over while the reader watches, a ring
  of the accent spreads out from the message box once (*invite*, 1.6 s), and
  the now line rolls to "Your turn".

## Only the conversation

The speech-bubbles button in the header (in the ⋯ menu on a phone) leaves
out the agent's work: what remains is what people asked, what the agent
said and asked, its retrospectives, the screenshots it published, reviews it
posted, and failures. Opening the find bar shows everything again (finding
must reach every match), and asking for the conversation alone puts the find
bar away.

## The plan

When the agent keeps a to-do list (Claude Code's `TodoWrite`), the details
show it: a bar of how much is done ("2 of 6"), then the steps, each with a
mark: a filled accent check (drawn in as it's checked off while the reader
watches), a ring with a pulsing dot for the one at hand (in the words the
agent uses while doing it), an empty ring for those to come. The now line
leads with the step at hand and ends with a ring that fills ("2/6").
Only a plan written in the turn under way leads the now line; an older one
stays in the details as it was left, without its step pulsing.

## Retrospectives

When the agent finishes a piece of work it records a retrospective (what it
worked on, its approach, what got in the way, what a future agent should
know, and how the work ended). The transcript shows each **at a glance**
(`web/src/components/session/retrospective.tsx`):

```
╭───────────────────────────────────────────────────────────────╮
│ ▤ Retrospective  (✓ Completed)                     Show all ⌄ │
│ Worked on   Moved the app from Django 4.2 to 5.2 and fixed    │
│             the three deprecations it hit (bookings#51).      │
│ Approach    Fixed the deprecations while still on 4.2, wher…  │
│ Challenges  index_together needed a migration; RenameInde…    │
│ Insights    Run the tests with python -Werror manage.py t…    │
╰───────────────────────────────────────────────────────────────╯
```

- **The gist**: the outcome, then each part in a line beside its name, its
  Markdown read as plain text and its lines run together; what it worked on
  (the lead) gets two lines, in `ink-2`; the rest one line each, quieter.
  A four-paragraph card became about half as tall, and a phone's about a
  third.
- **A click anywhere** opens it to all it says, where it is, gliding to its
  full height (320 ms, `--ease-out`); the header closes it. The gist shares
  the full view's grid (a 5.75 rem name column, a 20 px gap, 13.5 px text on
  22 px lines), so opening only grows it: nothing shifts sideways.
- **On a phone**, the name column would leave each line about twenty
  characters; a mark stands in for each name instead (a checklist for what
  it worked on, a route for the approach, a mountain for challenges, a
  lightbulb for insights), the name kept for screen readers. The mark's cell
  keeps a line's height so the mark centers on the first line.
- **An update** says "Retrospective updated", shows a changed outcome as
  "Partly done → Completed", marks the parts it changed with an accent dot,
  and steps the unchanged ones back (`ink-4`). The transcript keeps each
  retrospective's previous version to tell. An update that changed no part
  dims none.
- **Finding** opens a card to a match in it.

The details keep the latest retrospective (outcome, time, what it worked
on, "Read it" / "Read all 3"), opening all of them in a dialog, where an
insight can go into the project's memory ("Remember for later agents").

## Edge cases the page handles

- Earlier activity not loaded: the cover waits, the first turn may have no
  ask ("Earlier activity"), the ribbon hides, links to turns load until
  found.
- A message that comes while the agent works stays in the turn it works on,
  rather than starting a new one.
- What comes after a turn's end (a push, the session stopping) belongs to
  that turn, under its outcome.
- A session that stops or fails mid-turn ends the turn with that status.
- Another session opened in the same tab: overlays, choices and the find
  bar reset.
- Hundreds of turns: the ribbon steps aside, the list folds.

## Building a page like it

1. Decide the unit of reading (here a turn) and give it a start, a body and
   an end the reader can see at a glance.
2. Keep the units visual (classes on flat rows), not structural, so live
   updates and keeping place stay simple.
3. Give "now" one home (the pill) and "history" another (the transcript).
4. Summarize at the top (cover, glance) and at each end (outcome).
5. Make every summary a way in: figures, ribbon stretches, turn rows,
   files, all go somewhere.
6. Keep the reader's place; count what's new by sequence; mark where they
   left.
7. Fold what's long, in place, with the count of what's folded.
8. Check it live, on a phone, in both themes ([verifying](verifying.md)).
