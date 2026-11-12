# Autopilots: a project that runs itself

How fctl's web app shows an autopilot (experimental): an agent that runs a project, or its whole workspace, on its own,
from a direction people give it. It plans the work, starts sessions to do it, sets up what they need, wakes when
something needs it, and asks people what only they can answer, without waiting for them. People put it on, watch it,
steer it with notes and answer it, on the project's **Autopilot** tab; its sessions, and the sessions it starts, show
it wherever they appear.

Written from the code (hyperstructure/fctl `web/src/components/project/autopilot.tsx`,
`web/src/components/session/autopilot.tsx`, `web/src/lib/autopilot.ts`), its tests and fctl#1040. Paths are relative
to `web/src`. The control plane's side, and why the autopilot reaches the API without a token, are in fctl's
`docs/architecture.md#autopilots` and ADR 0080.

Words: the **autopilot** is the agent; its **own session** (`pilot`) is where it plans and steers; the sessions it
starts are its **sessions** (`crew` in the code, never in copy); **powers** are what it may do besides starting and
steering sessions; a **wake** is fctl handing it what's new; a **check-in** is the wake it gets when nothing else woke
it; an **ask** is a question or a secret it asks people for; a **note** is what people steer it with.

## The idea

**Autonomy shown, not hidden.** An agent that acts on its own, with a maintainer's powers, on someone's subscription,
is only acceptable if people can see at a glance where it stands, what it did and what it needs, and change its course
in one move. So everything it does lands somewhere people already look: its tab, its transcript, the sessions it starts,
session lists, *Needs you*, notifications.

**It never blocks on people.** Every ask says so ("It goes on with what it can meanwhile, and hears your answer at
once"), and the status says it too ("Waiting for you · It asks you 2 things, and goes on with what it can
meanwhile"). The blue of *your move* is there, but nothing about the page suggests the work stopped.

**Experimental, said once where it matters.** A pink *Experimental* pill (flask icon) beside the feature's name where
it's introduced or switched on: the intro, the form, the tab's header, the workspace setting. Not on every row.

## The tab

(`components/project/autopilot.tsx` `AutopilotTab`.) It shows where the project's workspace lets projects have an
autopilot, or the project has one (`Project.autopilot`): first among the tabs after Sessions, with the autopilot's
mark before the word (lit while it works, pink while paused) and a blue count of what it asks.

### Before it's on: the intro

The shape every feature intro has ([pages that explain](explaining.md#the-shape-they-share)), with one exception: the
*Experimental* pill sits above the headline, where that shape puts nothing, so people know what they're trying before
they read on:

- The pill, then the headline that names the outcome: **"A project that runs itself"**.
- The lead, from this place's facts: "Give {project} a direction, and an agent takes it from there: it plans the work,
  starts sessions to do it, and sets up what they need. It acts as you, on your Claude subscription, and asks you when
  only a person can decide."
- Four points, each with its verb first in ink: **Plans and delegates.** (up to 3 sessions at a time, each with a pull
  request it merges once checks pass, so the next builds on it) **Sets up what the work needs.** (settings,
  repositories, schedules, secrets, as far as you let it) **Keeps going.** (wakes when a session finishes or you steer
  it, every hour at least; a fresh session if its own stops) **Asks without waiting.** (decisions and credentials come
  here; secrets never into a transcript).
- Under the points, as wide as them, the [token hungry notice](#the-token-hungry-notice).
- The preview (300 px, hidden on phones): a card "At work · Checks in every hour" with the comet on its mark and a
  three-item plan, one ticked; a card of two sessions with their status dots; and a blue "It needs a secret" card with
  `CLOUDFLARE_API_TOKEN`. Made up, drawn with the app's own parts, `aria-hidden`.
- **Start from a direction**: four complete directions as row-wide buttons (Build a product from a brief, Keep it
  healthy, Work through the issues, Polish the UI and UX), and *Write your own*. Each is a careful direction ("Ask me
  before choosing anything that's hard to undo: a framework, a data model, a paid service."), so starting from one
  teaches how to write one. The build idea keeps `[placeholders]` in brackets, which the form asks to fill in.
- A quiet last line: what it acts with and on whose subscription, and that it can be paused or taken off any time.
- For people who can't put it on: "The project's maintainers and owners put it on autopilot, on their own Claude
  subscription." Where the workspace doesn't allow it (a project that had one), an info banner says its admins allow it
  in the workspace's settings, with the link.

### Putting it on: the form

Inline in the tab, raised, scrolled into view, the direction focused. Top to bottom:

1. A header: its mark in a tile, "Put {project} on autopilot", the pill, and "Say where to take it. You can change the
   direction, and steer it with notes, at any time."
2. *Start from* chips (the four directions), then the direction: a large textarea (7 to 22 rows), Markdown. Its hint
   follows the text: amber "Fill in the parts in brackets: they're what makes the direction this project's." while
   placeholders remain, else "The more it knows of why, the better it decides what you didn't say."
3. **What it runs**, for the workspace's admins only, and only while the workspace has no autopilot of its own: two
   radio cards, "{project}" ("It works in this project's sessions, settings and repositories.") and "All of
   {workspace}" ("Every project of the workspace, from this one: it starts sessions in any and creates new ones.").
4. **What it may do**: a list of checkboxes, each a label and a line. The first, *Start and steer sessions*, is checked
   and disabled ("Always"), on a sunken background: what it always does is shown, not hidden. Then the powers, *Merge
   pull requests* first ("Its sessions merge their own once checks pass and the work is done, so the next builds on it.
   Repositories' rules still apply."): fctl's note on each session's task asks it to, or to leave merging to people.
   Under the list, what it never does: "Never: people and their roles, access tokens, runners, GitHub accounts,
   deleting projects."
5. **It checks in** (Every 15 minutes … Once a day; "At least: it wakes sooner when something needs it.") and **It
   runs** (1 to 8 sessions at once; "Each on your subscription and a runner's slot."), side by side.
6. **Its own sessions think with**: model and effort, the project's by default, with the advice that planning takes
   judgment.
7. The footer says whose subscription before the button: "It runs on your Claude subscription and acts as you: its own
   sessions and those it starts." [Cancel] [Put on autopilot] (primary, with the mark). ⌘Enter puts it on.

Putting it on is a sensitive action: the app's confirm-it's-you dialog comes first where the instance asks for it.

### Once it's on: the tab as a cockpit

From the top: the header, what it asks, steering, then the log beside a rail of its direction, plan, sessions and how
it works. On a phone the rail's cards come before the log.

**The header** is the status, the sentence that explains it and the controls. A surface card with a soft radial wash of
the status's tone from its top left corner:

| State | Word (tone) | The sentence |
|---|---|---|
| Its session works | **At work** (accent; the dot pings, the comet runs round its mark) | "It works in its session #7 now." / with a fresh session asked for: "It works in its session #7 now. A fresh session takes over once this turn ends." |
| Its session starts | **Waking** (accent) | "Its session #7 is starting." |
| It asks something | **Waiting for you** (blue) | "It asks you 2 things, and goes on with what it can meanwhile. It checks in at 14:20, unless something needs it sooner." |
| Resting | **On** (blue) | "It checks in at 14:20, unless something needs it sooner." / "It wakes at 14:05, as it asked…" / "It wakes now for what's new." / "A fresh session takes over now." |
| Paused | **Paused** (pink; the card's border too) | "{name} paused it 2m ago: {reason} It wakes again once someone resumes it." / "It paused: the direction is done…" |

Under it, the facts: whose subscription ("your" when it's yours), how many check-ins and the last, and a link to its
session. Controls: *Wake now* and *Pause* while on, *Resume* (primary) while paused, and ⋯ (Change how it works…, *Run
it on your subscription…* for those it doesn't run for, Watch its session, *Hand off to a fresh session* while on with
a session, Take off autopilot… in red). *Run it on your
subscription…* asks first: "From now on it runs on your Claude subscription and acts as you: its own sessions and those
it starts. {owner} no longer runs it." [Cancel] [Run it on mine]. It wakes at once to move, and the log says "Woke as
it was moved to another Claude subscription". Its own session (unless at work) goes on the new owner's connection, where
Claude continues its conversation. Of the sessions it started, those paused on a usage limit start again there at once,
and those queued, stopping, or stopped in the last week start there when they next start (at most 25 a wake, the rest
at later wakes); those at work or waiting for a message finish their run where they are. Its owner choosing or
connecting another connection moves it the same way. A problem (its owner can't run it any more, the plan
is at its limit) shows in an amber strip across the card's foot. The card clips nothing (no `overflow-hidden`): its ⋯
menu hangs past its foot, over what follows, and the wash and the strip round their own corners. Clipped, the card cut
the menu off at its foot, and *Take off autopilot…* couldn't be reached.

**It asks you** (with a blue count): a card per ask, the blue gradient of the session view's question card.

- A question: when it was asked, the question (15 px), the detail as Markdown in a sunken box that folds past 600
  characters ("Show all"), the answers as pills, and "Or answer in your own words" with a send button (⌘Enter). Under
  it: "It goes on with what it can meanwhile, and hears your answer at once." and *Decline…*, which asks for an
  optional reason in a dialog.
- A secret: a key icon, "It needs a secret", the name in a mono chip (and "for {project}" when it's another's), what
  it's for, then a masked field (`SecretInput`, mono) with **Save secret** (primary, shield icon), and the promise:
  "It goes into {project}'s secrets, encrypted. The autopilot hears only that it's set; sessions that start from now
  on have it as $NAME." On a phone the field and the button stack. People who can't set the project's secrets are told
  who can.

**Steer it**: a borderless textarea in a card ("A priority, a constraint, context it should know: “Focus on the
pipeline board this week”"), *Add note*, and the rule: "It hears it at once, and keeps it until you remove it. A newer
note wins." The notes under it, newest first: avatar, name, time, **Seen** (a check) or blue **Not seen yet**, the
note in Markdown, and an × to remove it (shown on hover, always on touch).

**The rail**, cards with a small icon and a medium 13 px title:

- **Direction**: the Markdown, clamped with *Show all*; "Set by {name}, 2h ago"; a pencil opens it in place to change
  (which tells it at once).
- **Its plan**: "1 of 4" from its checklist and a thin accent progress bar, the Markdown checklist, "Updated 12m ago".
  Empty: "It writes one as it starts: what it will do, in order. It keeps it current as the work goes."
- **Its sessions**: "1 working · 8 in all", each a row with its status dot, number (with its project's slug when it's
  another's), title, and in blue what it asks, else its pull requests' states. Five rows in all, those at work or
  waiting for a message first (all of them when there are more), then "Show 3 more" for the rest of the 20 newest.
- **How it works**: the configuration as sentences: "Checks in every hour, and runs up to 3 sessions at once",
  "Starts and steers sessions, which merge their pull requests; change settings, set up schedules" (or "which leave
  merging to people"), "Stays on Ada's subscription when others change or resume it" ("your" for its owner) where its
  owner keeps it, "Thinks with Opus at high effort", and when a fresh session takes over from its own: "A fresh session
  takes over after 12 hours", or "at 250K tokens of context, or after 12 hours", then, quieter, how full its session is
  now (" · its session holds 180K").

**The log**, grouped by day ("Today", "Yesterday", "Nov 3"), newest first, each entry an icon (or the person's avatar
for what a person did; an accent-soft circle for what the autopilot wrote down; red for a problem), its line (Markdown,
so `NAME`s show as code) and the time. A session it concerns shows under its line as a chip with the session's live
status dot, number, title and status word. A line about another project than its own names it ("Changed playground's
description", "Set the secret `KEY` in blog"; its own goes without saying, "the project's"), and that project, or one it
created, shows under the line as a chip with the project's icon, name and slug, a link to it. A schedule it ran names
the schedule ("Ran the schedule “Nightly deps” now"), the name underlined as a link to it on the Schedules tab, which
opens it with its runs, and the session the run started shows under the line as any session does: what a schedule run
did is a click away. A deleted schedule's name stays, unlinked. Its **wakes** don't get
rows: they divide the log, a thin line with the mark, "Woke for a new note" ("Woke as it was resumed" for a resume
alone), the session it woke in, and the time, so what it did from one check-in to the next reads as a block. *Show
earlier* pages back.

Everything polls while the tab is open: every 4 s while its session works, 15 s otherwise (the log 5 s and 20 s).

## In sessions

(`components/session/autopilot.tsx`.)

- **Its own session's turns open with a wake card** instead of an ask card: its mark, "fctl woke the autopilot", when,
  then what for in a sentence ("For a new note and session #41.", or for a resume alone "People resumed it: it reads
  what's new, then goes on.") with chips for the notes, answers and the sessions that moved (links). Its first turn says
  "It was put on autopilot: it reads its brief, then plans the work." with the direction quoted; a fresh session that
  takes over from the last (after 12 hours, past its handoff size, or as people asked) says "A fresh session takes
  over: it reads its brief, then goes on from its plan and log." instead. "What fctl told it" (or
  "Its briefing, and what fctl told it") opens the whole message in mono, in a sunken box. The turn bar and the list of
  turns title these turns as its log does ("Woke for …", "Woke as it was resumed") with the mark, not the briefing's
  first line.
- **What it did shows in its transcript as it does it**: a milestone ("Started a session") with, hanging on the
  thread, the session it started as a card: status dot, title, `project#n`, status word, its pull requests, what it
  asks in blue, kept live (5 s while it works, 30 s otherwise). A session started this way looks like a session, not
  like a log line: agents starting agents should read as native as a person starting one. A project a workspace's
  autopilot creates hangs on its milestone the same way, as a card with the project's icon tile, name and slug. So does
  the session a schedule it ran started, under "Ran the schedule “Nightly deps” now", whose underlined name opens the
  schedule and its runs.
- **The sessions it starts** open with its task in an ask card whose author is the autopilot: its mark, "{slug}'s
  autopilot", "for {owner}", when; fctl's note of who started it under a hairline, smaller. The cover says "Started by
  {slug}'s autopilot, for {owner}" (a link to its tab) where others say who started them; the details rail has an
  Autopilot row.
- **Its own session's details** (the rail on a computer, the sheet on a phone; `components/session/pilot.tsx`) lead
  with the autopilot, as its tab shows it, so that following it in its session takes no trips to the tab:
  - **Where it stands**: a card the rail's width, with the tab header's tone (its wash from the top left corner, a pink
    border while paused): its mark in a 32 px tile (the comet runs while it works), "Autopilot" ("{workspace}'s
    autopilot" for a workspace's), a link to its tab, and under it the phase's word beside its dot (pinging while it
    works). Then the phase's sentence, said of the session the reader is in: "It works in this session now.", "This
    session is starting." In an earlier session of its own the sentence names the current one ("It works in its
    session #20 now."), and a quieter line says "This is an earlier session of its own: fctl wakes it in #20 now.", the
    number a link. What it asks follows, up to three, each a blue row (the question, or "Needs the secret NAME", with a
    key) that opens the tab to answer, then "2 more on its tab". Those who steer it get *Wake now* and *Pause*, or
    *Resume*, the tab header's buttons. ↗ in the corner opens the tab too, for its direction, notes and log. A problem
    is an amber strip across the card's foot.
  - **Its plan**: "Updated 2m ago" at the heading's end, then the bar and "1 of 4" as the agent's own plan shows them
    in the rail, then the Markdown at 12.5 px, clamped to ten lines with *Show all*. The cut fades out with a mask
    rather than an overlay of the card's color, so it fades the same on the rail's lighter shade and in the sheet.
  - **Its sessions**: "1 working · 8 in all" at the heading's end, and the tab's list: five rows, those at work or
    waiting for a message first, then "Show 3 more".

  Below them the details go on as any session's, without what such a session doesn't keep: **Changes** shows only once
  it changed something (it plans and steers; its sessions change the code), and the **retrospective** and **memory**
  sections stay out, as its sessions record and read those. Its turns, work figures and facts stay.
- **The now line** doesn't say *Your turn* where it isn't the reader's: its own session at rest says **Resting** —
  "fctl wakes it when something needs it"; a session it started that waits says **The autopilot's turn** — "It hears
  that the agent waits". Both in ink, with the mark, not the blue of *your move*.

## Elsewhere

- **Session rows** (`components/session/row.tsx`): the autopilot's mark in a small round tile where the starter's
  avatar goes, titled "Started by {slug}'s autopilot, for {owner}". Its own sessions stay off session lists.
- **The sidebar**: an *Autopilot* line heads its project's lines while it is on or paused, on every page, and opens
  its own session (its tab until it has one): its mark, whose comet runs while it works, then *At work*, when it wakes
  next, *Paused*, or in blue how many things it asks you, a link to the tab
  ([the shell](shell.md#what-it-shows-and-how-much)). Its sessions carry its mark at the end of their row, where
  nothing else (a question, a pull request) sits.
- **Needs you**: what autopilots ask comes first, each with its project's mark badged with the autopilot's, "{project}'s
  autopilot", when, and in blue the question or "Needs the secret NAME", linking to the tab. The sessions an autopilot
  started stay out while it's on, unless the reader follows them: the autopilot looks after them. Paused or off, it
  doesn't, so they come back as any session its owner started.
- **Notifications**: an ask notifies the people who follow its own session (its owner does): "{project}'s autopilot —
  It asks you" with the question, opening the tab.
- **The workspace's settings**: an *Autopilots* section with the pill, a switch ("Let projects have an autopilot") and
  what it means; turning it off asks first, saying every autopilot pauses and their sessions carry on. A link card to
  the workspace's own autopilot when it has one; otherwise how to put the whole workspace on autopilot. Last, on or
  off, the [token hungry notice](#the-token-hungry-notice).

### The token hungry notice

(`components/project/autopilot.tsx` `TokenHungry`, fctl#532.) An autopilot spends its owner's Claude plan faster than
anything else in fctl: several sessions at once, kept going without anyone, and its own between them. Someone who
puts one on, or lets projects have one, learns that before, where they decide: under the intro's points, and last in
the workspace's *Autopilots* section, whether it's on or off. Once one is on, the tab doesn't repeat it: its header
says whose subscription it runs on, and a plan at its limit shows there.

- An amber card (amber is for limits): `border-amber/30`, the surface under an `amber-soft` wash that fades out by 60 %
  of its height, radius 18, as the intro preview's blue "It needs a secret" card is drawn.
- Its title in amber, 13.5 px medium, after a flame: **"Autopilots are token hungry"**, the AI lingo on purpose, so
  that it reads as the feature's nature, not an error. Then 13 px `ink-3`: "An autopilot runs several sessions at
  once and keeps them going on its own, so it can drain a Claude plan's usage quickly. On a fresh build at full speed,
  its sessions may hit the plan's ceiling and pause there until the limit resets."
- Under an amber hairline, the plans, each its name over its verdict: **Claude Pro** "May hit its five-hour limit"
  (amber, a gauge), **Claude Max** and **Claude Ultra** "Usually enough" (`ink-3`, a check). Each is as wide as its
  words, 32 px apart, and moves to the next line whole where they don't fit: on a phone, Pro alone, then Max and
  Ultra side by side.
- The plan of the reader's connection that new sessions run on (`planOf`: Ultra by its login's tier) has a small
  *Your plan* pill beside its name, its line no taller than the name's, so that the verdicts stay level. No
  connection, or one whose plan Claude didn't say: no pill.

## Edge cases

- **Off, then on again**: the tab shows the intro with *Put it on again…*, and the form keeps its direction, powers and
  rhythm. Its log, notes, plan and open asks stay; while it's off, its asks leave *Needs you*. A workspace's autopilot
  stays the workspace's: the form doesn't offer *What it runs*, and says "It ran all of {workspace} before, and what it
  kept reaches every project: it stays the workspace's."
- **Paused by fctl**: the reason is the control plane's sentence ("It acts as its owner, who no longer manages Shop:
  someone who does takes it over."), shown as the header's line and logged. It says "its owner" rather than a name, and
  people's lines in the log name them as it's read ("{who} resumed it"), so that a name leaves with its account.
- **Someone else's subscription**: changing how much it works, resuming or taking it over says it runs on yours from
  then on, as schedules do (a banner in the settings dialog before Save), and the toast after says what the control
  plane decided.
- **A fresh session takes over**: the settings dialog (*How it works*), after *Its own sessions think with*, has a
  Select: "After 12 hours" ("Whatever its context holds"), "At 150K / 250K / 400K tokens of context" and "At another
  size" (each "Or after 12 hours"), the last with a Tokens Input beside it (typed as 200K, 200000 or 0.2M). Its line
  says why it matters, then how full its session is: "Each wake reads its whole conversation again, uncached after an
  hour's rest. A fresh session starts from its plan and log, and costs far less at each wake. Its session holds 180K
  tokens now." Changing it changes how much it spends, so it takes it over as changing its model does. A size it can't
  read says so in the toast ("Not changed: type a size from 100K to 1M tokens, like 200K"). The put-on form leaves it
  out: a new autopilot hands off only after 12 hours until someone chooses a size.
- **A fresh session when people choose**: *Hand off to a fresh session* (⋯, no dialog: nothing is lost, the plan and
  log carry the work) starts a fresh session of its own, say after a release so that it works from what fctl and its
  briefing say now. Between its turns it takes over at once ("A fresh session takes over now"); while its session
  works, the turn finishes first ("A fresh session takes over once this turn ends", in the toast and the header's
  sentence until then), and what wakes it meanwhile waits for the fresh session. Its log says who asked ("Ada asked for
  a fresh session to take over"), then "Woke as someone asked for a fresh session".
- **Kept on its owner's subscription**: its owner's settings dialog ends with *When others change it*, a bordered
  checkbox, "Keep it on my subscription", and its line: "Those who steer it, the project's maintainers and owners (a
  workspace's: its admins), then change how much it works and resume it on your Claude plan, rather than taking it
  over, and it goes on acting as you. Only for a project whose people you all trust." Checking it shows a warn banner
  under it before Save: "Any of them can then run it as hard as they choose on your plan: up to 8 sessions at once,
  checking in every 15 minutes." Turning it on is a sensitive action. Others don't see the checkbox; their banner says
  "It runs on {owner}'s Claude subscription, which they keep it on when others change it: your changes run on theirs.",
  *Resume*'s title says it stays on the owner's, and *Run it on your subscription…* is how they take it over. Once its
  owner can no longer run it (the reasons fctl pauses it for), a resume or change takes it over as before; a new owner
  starts without it.
- **Many asks at once**: it keeps at most 10 open (asking more is refused until it takes one back), so all show, newest
  first. The tab shows them to everyone who reads the project, and says who answers them to those who can't, except a
  workspace's autopilot's, which only its admins see (below); *Needs you* lists them for those who can answer. The
  count is on the tab, in the heading and in *Needs you*, for those who see them.
- **A burst of answers** reaches it as one wake (5 s gathered), so its log reads "Woke for 2 answers", not two wakes.
- **An old session of its own**: wakes go to its current session; an earlier one's requests are refused, and its page
  still shows its wakes and actions. One fctl replaces (12 hours on) stops as the fresh one starts.
- **A workspace's autopilot, read by a member who isn't an admin**: what it does reaches projects they may not see, so
  its plan, notes, asks, sessions, log and own session are the admins' (`can.read`). The tab shows them the header,
  without a link to its session, and beside *How it works* a card, *What it does*: "It works across {workspace}, in
  projects you may not see, so its plan, sessions, asks and log are for the workspace's admins, who steer it. Its
  sessions in your projects show there, with its mark." Its admins see it all.

## Building one like it

Show an agent's autonomy where people already look, and give each kind of act a native home: a session it starts is a
session card, a change is a log line, a question is an ask card. Keep the human's moves (steer, answer, pause) one
click from where the agent's state is shown. Say plainly what it may never do, beside what it may. Never make people
wait on the agent or the agent wait on people.

## Known gaps

- The tab, and its own session's details, poll rather than listen on the feed: changes show within 4 s while it works and up to 15 s while it
  rests (its log, 5 and 20 s). *Needs you* polls every 30 s, and so do the session cards in its transcript while their
  session rests, so a new ask, or a session that starts working again, can take half a minute to show there.
- A workspace's autopilot lives on its home project's tab; the workspace page only links to it.
- Asks can't carry images uploaded by people in answers: answers are text.
