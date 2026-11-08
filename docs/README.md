# How fctl's web app is designed

These pages describe the design of fctl's web app (hyperstructure/fctl,
`web/`): the principles it follows, and its components one by one: what
each is for, what it shows and how much, how it behaves and moves, what it
says, which edge cases it handles, and the traps found while building it.
They're written for whoever builds the next component, person or agent, so
that it can be as considered as the ones before it.

The tokens, fonts and scenes those components use are this package's
([README](../README.md)); the code they describe lives in hyperstructure/fctl,
and file paths here are relative to that repository.

## Start here

- [Principles](principles.md): the rules behind every screen, with the reason
  for each. Read these first; they settle most decisions.

## The web app

- [The app shell](web-app/shell.md): the sidebar and what it shows, the
  phone layout, the command palette, keyboard shortcuts, *Needs you* and
  the app's badge, appearance.
- [Lists, rows and pages](web-app/lists-and-pages.md): session and project
  rows, status, avatars and colors, the Agent Floor, pull requests,
  project and workspace pages, Settings, forms, empty states.
- [Pages that explain](web-app/explaining.md): how settings teach and
  invite rather than list switches: the workspace's runners and their setup,
  the project's reviews, schedules and tickets showing what they do before
  they're on, and the patterns across them (commands to copy, previews
  before a switch, warnings before a risk, empty states that teach).
- [The UI kit](web-app/kit.md): buttons, fields, selects, dialogs, menus,
  sheets, the lightbox, feedback, icons, and the global styling rules: focus
  rings, forced colors, touch, Tailwind 4 conventions, browser quirks.
- [The session view](web-app/session-view.md): reading a session in turns:
  the cover and its glance, the ask cards, the thread, a turn's outcome,
  finding your way, coming back, the plan, retrospectives.
- [The now line](web-app/now-line.md): the pill that says what the agent does
  at this moment, the thinking mark, background work, *Your turn*. The most
  detailed page here, and a model for live components.
- [The transcript](web-app/transcript.md): the parts both session views
  share: calls and runs, thoughts, notices, the composer, the details rail,
  finding in a session, live behavior.
- [The changes viewer](web-app/changes.md): every changed file's diff in one
  place, the list of files beside it, finding in diffs, and how the agent's
  edits arrive live: written in behind a caret, lines turning red as they go,
  what changed staying lit, without moving what the reader looks at.
- [Motion](web-app/motion.md): every animation, what it says and how it's
  built, with the patterns behind them (rolls, glides, odometers, comets,
  synced loops) and how reduced motion is handled.
- [Verifying](web-app/verifying.md): how to look at a change before calling
  it done: a world to look at, both engines, themes and sizes, stills and
  clips, frame-by-frame checks, measurements.

## Keeping these pages true

When a pull request in fctl changes how a component looks or behaves,
change its page here in a pull request too, and link the two. A decision
made in a conversation (why a list shouldn't scroll inside its rail, why
status is one color) belongs here with its reason, not only in a pull
request's description, where the next person won't look.
