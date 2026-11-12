# The app shell and navigation

This covers how fctl's web app frames every signed-in page: the sidebar and its folded rail, the
phone drawer, page headers and view transitions, the command palette, keyboard shortcuts, "Needs
you" (with the tab title count, the app icon badge and notifications), and the per-browser
preferences behind Appearance. It is for agents who build components like these. They should
come out with the same care, not as copies.

Paths are in hyperstructure/fctl unless they say otherwise. Tokens and utilities come from
`@hyperstructure/design` v0.10.0 (`src/tokens.css`), which changes some Tailwind defaults:

- `rounded-md` is 9 px, `rounded-lg` 13 px and `rounded-xl` 18 px.
- `ease-out` is `cubic-bezier(0.16, 1, 0.3, 1)`, for things that arrive. `ease-spring` is for
  things that respond.
- `animate-rise` takes 420 ms: the element moves up 6 px, scales from 0.995 and loses a 2 px
  blur.
- The global focus ring is a 2 px `accent` outline, 2 px away.

The rationale below comes from code comments, commit messages (fctl#NNN) and notes earlier
agents left. Where something is a reading of the code rather than a stated decision, it says so.


## The shape of the shell

**Purpose.** Every signed-in page shares one frame. It gives a way to every place, shows what is
at work and what waits on the person, and holds the tools that work anywhere (search, shortcuts,
a new session). Pages then only need to be about their own subject.

**Anatomy.** `SignedInLayout` (`routes/two-factor.tsx`) renders `AppShell`
(`components/shell/app-shell.tsx`), or only the two-factor setup page, with no shell, when the
instance requires two-factor sign-in and the person hasn't set it up. `AppShell` holds:

- a fixed `<aside>` with the sidebar and its resize handle (on phones the same element is the
  drawer);
- a shade button for phones;
- the page column, padded by the sidebar's width (`--sidebar-w`, set on the root), which holds
  the phone top bar and `<main>`;
- the overlays that work anywhere, each mounted once: the command palette, the new session
  dialog, the keyboard shortcuts sheet and the sequence hint;
- app-wide hooks: the live feed, push subscription and notification clicks, the global
  shortcuts, and a one-time notice that the person's picture is now their Gravatar.

**Breakpoint.** There is one, `md` (768 px, `48rem`). From there up, the sidebar sits beside the
page and can be resized and folded. Below it, the sidebar is a drawer, a top bar holds the menu
button, and nothing folds.

**Stacking order.** Sticky bars are z-10, the shade z-20, the drawer z-30, menus z-40, and the
palette, toasts and sequence hint z-50.

**Details that hold it together.**

- **Overflow.** The page column uses `overflow-x-clip`, not `hidden`. Whatever is wider than the
  window scrolls in its own row, and sticky bars keep working.
- **Safari's phantom keyboard.** Everything pinned to the screen's edges uses
  `top-(--viewport-shift)` and `-bottom-(--viewport-shift)`: the drawer, the shade, the top bar,
  the palette, dialog backdrops and toasts. The variable is 0 except when Safari on iOS thinks
  a keyboard covers the screen and none does, which happens after the installed app comes back
  from the app switcher. It then moves those elements to where the screen really is
  (`lib/viewport.ts`, fctl#350).
- **Safe areas.** Safe-area insets pad the drawer, the page column and the sidebar's foot, which
  covers notches in landscape and installed apps.
- **Safari's status bar over the page.** The drawer and the top bar pad their tops by
  `--safe-top`, which is 0 except when Safari lays the installed app on an iPhone out under the
  status bar after the app switcher: their background then fills behind the bar, and what they
  hold starts below it (`lib/viewport.ts`, fctl#514).
- **Shared surfaces.** Sticky bars use `bg-canvas/80 backdrop-blur-xl`, with no border: the
  page blurs as it scrolls under them, which marks their edge. Beside the page, the sidebar is
  `bg-surface/80` with a blur and no border either: its lighter surface sets it apart from the
  canvas. Without the lines the app looks fresher (fctl#490); lines stay for what they divide
  within a surface (list rows, the sidebar's foot). On phones the sidebar is opaque ([Phones: the drawer, the top bar and the menu button](#phones-the-drawer-the-top-bar-and-the-menu-button)).


## The sidebar

**Purpose.** It answers three questions from any page: where do I go, what is at work now, and
what waits for me. It is a tree: views first, then each workspace with its projects, and under
each project the sessions the person is likely to switch between.

### Anatomy, top to bottom

```
[mark] fctl                    [fold]   header, 56 px (the logo links to the Agent Floor)
[ Search or jump to…        ⌘K ]        opens the palette
 Agent Floor                            "Views" nav
 Needs you                  (3)  >      opens in place into its list
 Pull requests                   2      how many are ready for review, in green
 [invitation card]                      "Workspaces" nav (scrolls; on phones with the views)
 [A] Acme                    + v        workspace: its page, new project, fold
   [i] Web app             o 2          project: icon, name, sessions at work
    | (A) Autopilot      At work        its autopilot, while it is on or paused
    | ----------------------
    | o Retry failed uploads            its sessions, hanging from a thread
    | o Fix the flaky test     [pr][ck]
 + New workspace
 ---------------------------------
 Admin                      (1)         instance admins only
 Settings
 (avatar) Name / instance        ^v     the person's menu, opens upward
```

The order runs from views that span everything, to places, to settings and identity at the
foot. The code describes it as "the Agent Floor, what needs you and the pull requests ready for
review at the top; then each workspace with its projects, each with its icon, its sessions at
work and those that ended in the last hour". Search and the foot never scroll out of reach. On
a computer or tablet only the middle nav scrolls (`md:min-h-0 md:overflow-y-auto`), so the views
stay too. On a phone the views scroll with the workspaces instead (one scrolling column around
both, `max-md:overflow-y-auto`): Needs you, open, can be as tall as half the drawer, which left
the workspaces a sliver to scroll in (fctl#501). A hairline
(`border-t border-line`) sits over the foot, where the nav scrolls away under it; the folded
rail has one there too, and one between workspaces.

### Sizes, type and colors

| Row | Height | Text | Leading mark |
|---|---|---|---|
| Header | 56 px | logo: 22 px mark and 15 px word (26 and 17 on phones) | fold button 32 px; close button 44 px on phones |
| Search button | 34 px, `rounded-lg`, `bg-sunken/60`, `border-line` | 13 px `ink-4` and a ⌘K keycap | 14 px |
| Views and foot rows | 32 px, `rounded-md`, `px-2.5` | 13.5 px | 16 px icon |
| Workspace header | 32 px | 13 px semibold | 20 px avatar |
| Project row | 32 px | 13.5 px | 16 px project icon |
| Session line | 28 px | 13 px | status dot, 8 px at 75 % |
| The page's project's own link | 28 px | 13 px | 14 px |
| A project's autopilot | 28 px | 13 px | 14 px autopilot mark |

- **Spacing.** Rows are 1 px apart (`gap-px`), workspaces 16 px apart, and the container has
  12 px side padding.
- **Counts.** 11.5 px with `tabular-nums`, so they don't jitter as they change.
- **At rest.** Text in `ink-3` and icons in `ink-4`.
- **On hover.** Text turns `ink`, the icon `ink-3`, and the row fills with the `hover` token.
  Never use `raised` for hover: it is white in the light theme, which made hover fills
  invisible there (fctl#65).
- **The current page.** It has one style, `HERE`: `bg-raised text-ink`, a 1 px inset `line`
  ring, and an `accent` icon. A project's row takes it only on the project's page with no tab
  chosen. On the project's other tabs, the row is `ink` but unfilled.

### What it shows, and how much

- **Order belongs to the person** (fctl#134). Workspaces, and the projects in each, come in the
  order the person drags them into. The order is stored on the server with their membership,
  so it is the same on every device and in the CLI. Before, projects were sorted by latest
  activity and swapped places whenever a session started. Now nothing moves unless the person
  moves it.
- **Sessions under each project, on every page, in every workspace** (fctl#383). It lists those
  that haven't ended (queued, starting, working, waiting, paused, stopping) and, for an hour,
  those that stopped or failed, dimmer. The newest come first, and a session keeps its place
  when it ends, then leaves an hour later. Before this, sessions showed only on their project's
  pages, so switching between workspaces meant finding each one again. `useMinute()`
  re-renders the sidebar every minute, so ended sessions leave on time.
- **What it leaves out.** Archived sessions, review agents' sessions, sessions of schedules that
  hide theirs, sessions the person hid, and the sessions of folded workspaces. The query asks
  for up to 100 sessions that haven't ended or ended within the hour. Until it returns, the
  sidebar shows what other cached lists already hold.
- **A project's autopilot, on every page** (fctl#498). While a project's autopilot is on or
  paused, an *Autopilot* line heads the project's lines, above its Pull requests link when it
  has one, so it holds its place as the project opens and closes; a divider sets it apart from
  the sessions, whose own lines carry its mark. It opens the autopilot's own session, the one
  fctl wakes it in, and is lit (`HERE`) there and on the project's Autopilot tab. Until it has a
  session, and for a workspace's autopilot to all but the workspace's admins (who alone may open
  its session), it opens the tab. Its end says where it stands, in the status colors: *At work*
  or *Waking* in `accent` while its session works, with the comet running round its mark's dim
  ring; when it wakes next while it rests, an alarm clock and the time (or the day, a day or
  more off) in `ink-4`; *Paused* in `pink`, with the line dimmed to `ink-4`. What it asks you
  takes that place: a blue question icon and count, a link of its own to the Autopilot tab, where
  people answer. The tooltip says it in a sentence ("Resting: it wakes at 22:56, unless something
  needs it sooner."), and screen readers hear the same. Its own session stays off the session
  lists, so this line is the way to it from anywhere.
- **The project the page is about.** That is the project of its own page, of a session's page,
  or of the pull requests page scoped to it. It opens into its own Pull requests link with a
  count, a divider, then its sessions. For a session no list holds, the sidebar reads the
  session page's cached query to find its project. A Tickets link that only led to settings was
  removed: it can come back once it has something of its own to show (fctl#452).
- **Counts, each with a tooltip that says what it counts:**
  - a project's sessions at work, as an `accent` number with a running dot ("2 sessions at
    work");
  - a folded workspace's header shows the same count, so folding never hides that work is going
    on;
  - Pull requests shows how many are ready for review in green (`pr-open`), or else all open
    ones in `ink-4`. Its tooltip reads "2 ready for review, of 5 open", plus "from your
    sessions" while Mine (the pull requests page's filter) is on;
  - Needs you has a blue pill ([Needs you, the title count, the app badge and notifications](#needs-you-the-title-count-the-app-badge-and-notifications)), and Admin a `highlight` pill of people waiting for
    early access;
  - the Agent Floor has no number. Its work shows as lit threads when a mouse hovers it.
- **Long names truncate.** The native tooltip holds the full title with its status, or with the
  agent's question.

### How rows show status

The whole app uses one small color language for status. Red means danger only (AGENTS.md).

| Meaning | Token | In the sidebar |
|---|---|---|
| Working | `accent` (yellow; ink in the light theme), pinging | session dot, project count, the rail's dot and its Agent Floor icon, an autopilot's comet and *At work* |
| Starting, preparing, stopping | `ink-2` or `ink-3`, pinging | session dot |
| The person's turn | `blue` | dot, Needs you pill and icon, "asks you" icon, rail dot |
| Paused on a usage limit | `pink` | dot, need reason, an autopilot's *Paused* |
| Failed | `danger` | dot, need reason |
| Ended | `ink-4` dot and title | session line |
| Pull request ready | `pr-open` (GitHub's green) | Pull requests count, rail badge |
| Closed to you (two-factor) | `amber` lock | workspace header |
| People waiting (admins) | `highlight` fill | Admin badge |

- **Questions.** A session line's title brightens to `ink-2` while its agent asks something.
  The row's end shows a blue question icon, or, if there is no question, its pull request's
  state and checks icons (12 px).
- **Live statuses ping** (`animate-ping`, 2 s, at 60 %).
- **One calm color.** An earlier multicolor rotating ring was judged out of place: signs of work
  stay one color, the accent, and calm.

### States

- **First paint from a kept copy** (`lib/sidebar.ts`, `fctl:sidebar`, fctl#210). The sidebar
  shows the lists it last showed, kept in localStorage. The copy holds only what the sidebar
  shows: names, colors, avatars, role, whether a workspace is closed to the person, project
  icons and descriptions, active counts, invitations and the workspace limit. It is versioned,
  validated item by item, and read only for the user who wrote it.
- **Switching to live lists.** The copy stays until both the workspaces and the projects lists
  arrive. The two are never mixed, so a workspace never shows without its projects. Dragging
  is off meanwhile, because a new order must name what the control plane has.
- **No false empty state.** Without a copy (first visit, after signing out), each list shows as
  it comes. "Create a project" appears only once the projects list is known to be empty.
  Before the copy existed, every workspace said "Create a project" until its projects loaded.
- **No workspaces.** "Create a workspace" in `ink-2`; otherwise a quieter "New workspace" in
  `ink-4`. Both go once the person is at their workspace limit.
- **Invitations.** A card per invitation in `accent-soft` with an `accent/25` border, reading
  "Invited · join on Agent Floor" and linking to the Agent Floor, where the person accepts.
- **A workspace closed until two-factor sign-in.** An amber lock, labelled "Closed until you set
  up two-factor sign-in". In place of the projects, a link to Settings → Security reads "Set up
  two-factor sign-in to open it".
- **An admin's empty workspace** gets a "Create a project" row. A folded workspace keeps its
  chevron visible. Which workspaces are folded is kept per browser (`fctl:folded-workspaces`).

### Behavior

- **Mouse.** The whole row is the link. Buttons appear on hover:
  - a workspace header shows "+" (new project, for its admins) and its fold chevron;
  - a project shows "Change its icon" for owners and maintainers, and its count fades out to
    make room;
  - a resting session shows its hide button, an eye with a line through it.

  The row stays lit while the pointer is on its button, because the hover belongs to the row's
  group. A session's title pads 28 px on hover so the button doesn't cover it, unless pull
  request icons are there to fade out instead.
- **Keyboard.** Tab goes from link to link. Focus inside a row shows its hidden buttons
  (`focus-visible:opacity-100`, `group-has-[:focus-visible]`). Alt or Option with ↑ or ↓ moves
  the focused workspace or project. After a session is hidden from the keyboard, focus moves to
  the next session, else the previous one, else the project.
- **Touch.** Taps open rows. Holding a row 320 ms lifts it, so a swipe still scrolls. There is
  no hide button and no conduit (below).
- **Reordering** (`lib/sortable.ts`).
  - Starting a drag: a mouse after moving 4 px, so a click still opens the row and the click
    that ends a drag opens nothing; a finger after holding still 320 ms (within 8 px), with an
    8 ms vibration.
  - During the drag: the lifted row scales to 1.02 on `raised` with a deep shadow, and the
    others glide aside over 220 ms. The list scrolls within 48 px of its edges, at up to 14 px
    a frame, and Escape puts the row back.
  - Saving: the new order shows at once and saves in the background, one save at a time; a
    newer order replaces one still waiting. If a save fails, a toast says "The new order wasn't
    saved: …" and the saved order comes back.

### Hiding a session (fctl#468)

This lets people clear finished work before the hour is up. A session can be hidden while its
agent rests (it waits for a message, stopped or failed) and asks nothing.

- **Staying hidden.** It stays hidden through stopping, as long as it has ended no new turn
  (`stats.turns`). It comes back once its agent works again: a run starts, it asks something,
  or it ends another turn, which also catches work done while the app was closed.
- **Lagging tabs.** A tab whose lists are behind may still see the session at work, so a hidden
  session is forgotten only when a summary newer than the one it was hidden from
  (`updated_at`) says it is back.
- **Expiry.** Hidden sessions are forgotten after 7 days and on sign-out
  (`lib/hidden-sessions.ts`, `fctl:hidden-sessions`).
- **What it doesn't touch.** Hiding never affects Needs you, the Agent Floor or the project's
  page.

The decisions behind it:

- It is kept per browser. Archiving would hide the session for everyone and stop pull request
  events from reaching its agent. A per-person server setting would need a migration and an
  API for a sidebar nicety.
- Waiting sessions can be hidden too, since they stay until their idle timeout stops them.
- Phones and tablets get no button: with no hover, nothing shows where it is, and a tap at the
  row's end would hide what the person meant to open.
- The icon is an eye with a line through it, not an X, which would read as stopping or deleting.

### The Agent Floor row (`floor-link.tsx`, fctl#216)

Under a mouse, the row powers on into the design package's WebGL "conduit": the foundry scene
squeezed into a bar. Each session at work lights a thread (up to 8, spread evenly). Each pulse
of agent activity from the feed sends a packet down its session's thread. The threads part
around the pointer, and a click sends a burst.

- **Cost.** The scene is made at the first mouse hover and kept. Once dark it is
  `display: none`, so it draws nothing. It dissolves over 220 ms when the pointer leaves.
- **Touch** gets a plain row (`pointerType !== "mouse"`). **Reduced motion** gets one still
  frame and an icon that holds still.
- **The label** is always semibold. When the weight eased in only while lit, the label's width
  shifted (fctl#220). A halo in the surface color and a soft drop shadow (`.floor-label`) keep
  it readable over the threads. The hover fill is `hover/60`, since the scene fills the row.

### Motion

| What moves | How |
|---|---|
| Row colors and fills | 150 ms |
| Hover-revealed buttons | fade in over 150 ms |
| Chevrons | rotate 90° over 200 ms ease-out |
| Needs you's list | opens over 200 ms ease-out (`grid-template-rows` from `0fr` to `1fr`) |
| Folding | width and the page's padding animate together, 200 ms ease-out; a resize drag follows the pointer with no transition |
| Lifting | scale and shadow over 150 ms; neighbors and the dropped row glide 220 ms |

Everything has `motion-reduce:transition-none`, and a global reduced-motion rule cuts any
remaining animation to 0.01 ms.

### Accessibility and copy

- **Landmarks and labels.** `nav aria-label="Views"` and `nav aria-label="Workspaces"`. Each
  workspace is a `section` labelled with its name. The lists are labelled ("What needs you",
  "Web app's recent sessions").
- **Status in words.** Each session line ends with screen-reader text (": Working", ": asks you
  something"), and its icons are `aria-hidden`.
- **Buttons name what they act on.** "Hide Retry failed uploads from the sidebar", "Change Web
  app's icon", "New project in Acme", and "Show Acme's projects" or "Hide Acme's projects" with
  `aria-expanded`.
- **Reordering.** Each row's link is described by a hidden line: "Drag to move it, or press Alt
  or Option with the up or down arrow." An assertive live region, created before anything is
  said in it so screen readers catch the first announcement, says "Moved Web app to 2 of 5".
- **Collapsed lists.** Needs you's closed list is `inert`, so it is out of Tab's way and away
  from screen readers.
- **Copy.** It says what happens, in sentence case, with plurals written out: "Hide from the
  sidebar until its agent works again", "Fold the sidebar (⌘B)", "1 session at work", "1 asks
  you something" and "2 ask you something", "2 people wait for early access". No uppercase
  section eyebrows.

### Traps

- **Hover-only buttons on touch screens.** Tailwind 4 wraps `hover:` and `group-hover:` in
  `@media (hover: hover)`, but an `opacity-0` button still takes taps. A hover-only button
  needs `[@media(hover:none)]:hidden` too, as the hide button has. Arbitrary sibling variants
  such as `[:hover+&]` aren't wrapped: write `[@media(hover:hover)]:[:hover+&]:…`.
- **The kept copy.** A sidebar change that shows another field must add it to the kept shape and
  bump `VERSION`. Otherwise the field is missing on every reload until the lists arrive. The
  drawer's finger drag gives way while a row is lifted, by checking `data-dragging` on
  `<html>`.

**Where it lives.**

- `components/shell/sidebar.tsx`: the tree and the rail.
- `sidebar-parts.tsx`: search, session line, foot rows, the person's menu, the resize handle.
- `floor-link.tsx`: the Agent Floor row.
- `lib/sidebar.ts`, `lib/hidden-sessions.ts` and `lib/sortable.ts`.
- `lib/workspaces.ts`: saving orders and folded workspaces.
- `lib/queries.ts`: `useSidebarSessions`, `recentSessions`.
- Tests: `components/shell/app-shell.test.tsx`.

**Building one like it.**

- [ ] Views that span everything first, then places, with settings and identity at the foot.
      Only the middle scrolls: on a phone the views with the places, so an open list of what
      needs you doesn't squeeze them.
- [ ] The person sets the order. Rows hold their places as their state changes, and finished
      things leave on a known schedule.
- [ ] Paint at once from a validated, versioned, per-user copy, and never claim "empty" before
      the data says so.
- [ ] One style for the current page. Hover fills with `hover`.
- [ ] Every count has a tooltip, `tabular-nums`, and plurals written out.
- [ ] Status uses the shared colors, and says itself in text.
- [ ] Hover-revealed buttons also show on keyboard focus, and are absent on touch screens.


## Needs you, the title count, the app badge and notifications

**Purpose.** It gathers, ranked in one place, what waits on this person in the sessions they
started or follow. It shows how many wherever they look: the sidebar, the browser tab and the
installed app's icon.

### What counts (`lib/needs.ts`)

It is computed in the browser from lists the app loads anyway:

- the person's sessions from the last day (200);
- the sidebar's sessions (100);
- the Agent Floor's active (50) and ended (12) sessions;
- the pull requests page's list (200, archived and hidden sessions included).

A session counts when the person started or follows it and it isn't archived or a review
agent's. It shows once, for its most pressing need. When lists disagree, its newest summary wins
(`updated_at`). Nothing counts until the app knows who the person is, since the lists hold other
people's sessions too.

| Rank | Kind | When | Its line says | Look |
|---|---|---|---|---|
| 1 | asking | its agent asked a question (`fctl ask`) | the question, up to two lines | blue, question bubble |
| 2 | failed | it failed in the last 24 hours | "Failed" | `danger` |
| 3 | checks | an open pull request's checks failed | "Checks failed on #12" | `danger` |
| 4 | ready | it stopped or waits, with an open pull request that isn't a draft | "#12 is ready for you" | `pr-open`, pull request icon |
| 5 | waiting | it waits for a message and its work isn't done | "Waiting for your reply" | blue, reply bubble |
| 6 | paused | it paused on a usage limit | "Paused on a usage limit" | `pink` |

Needs sort by rank, then newest first, by when each began to need the person.

- **Work that is done** (fctl#455). A session stops counting as waiting once all its pull
  requests are merged or closed and nobody has messaged it since. After a merge, fctl wakes the
  agent for its last steps. The agent then waits until its idle timeout, 10 minutes by default,
  in case someone has more for it. Without this rule, it sat in Needs you, the tab title and
  the app icon all that time.
- **An answer isn't new work** (fctl#496). What counts is when someone last asked the session
  for more (`requested_at`), not when they last wrote to it: a message that answers the agent's
  question (a click on one of its answers, or anything typed while it asks) only lets it carry on
  with what it asked for. An agent that asks after the merge, whether to re-run a failed deploy,
  say, and hears back has finished once its turn ends, rather than showing "Waiting for your
  reply" until its idle timeout. Someone who asks for more after the merge still gets the reply,
  even when they also answer a question the agent asks about it.
- **"Waits for you"** means idle with no reason, or with "Waiting for a message". Waiting on the
  agent's own background tasks doesn't count.

### Anatomy and behavior

- **Header.** A 32 px row: an inbox icon (blue while anything needs the person), "Needs you", a
  blue pill (18 px, white 10.5 px semibold, titled "2 ask you something") and a chevron. With
  nothing to show, the row stays, disabled and dimmed to `ink-4`, with no pill or chevron.
- **List.** It opens in place and starts open. Whether it is open is kept per browser
  (`fctl:needs-open`). It sits in an inset box (`bg-sunken/50`, `rounded-lg`, 4 px padding, a
  1 px `line` ring).
- **A need's row.**
  - The project's 26 px icon tile.
  - The session's title (13 px), with the need's age at the right: "now", "5m", "2h", "3d"
    (11 px, `ink-4`).
  - The reason, 11.5 px with a 12 px icon, colored by kind. A question gets two lines
    (`line-clamp-2`), because it is what the person answers; everything else gets one.
  - The tooltip holds the title and the reason, and the session the page shows is marked
    `HERE`.
- **Folded rail.** The rail shows the count as a blue pill titled "3 things need you". It is not
  a link. A project tile gets a blue dot while one of its sessions asks something.
- **G then N** goes to the next session that needs the person after the one on the page, and
  wraps around. With nothing there, a toast says "Nothing needs you".

### Outside the page

- **Tab title** (`lib/attention.ts`). The count goes in front of the title: "(2) fctl", or "(2)
  Retry failed uploads · web#12" on a session's page. Pages set their own title with
  `setPageTitle`, which keeps the count in front and resets as the page goes. Only the session
  page and Pull requests set one; other pages say "fctl".
- **App icon.** The same count goes on the installed app's icon through the Badging API. When
  the browser lacks the API, or refuses because the app isn't installed, nothing is said.
- **Always on.** The sidebar is always mounted, even as a closed drawer on phones, so the count
  works everywhere.
- **Clearing.** The count clears when the sidebar unmounts and as the person signs out. Signing
  out leaves the page without unmounting the sidebar, and an installed app's icon would
  otherwise keep the badge.

**Notifications are the push side of the same idea.** They are Web Push, per browser, turned on
in Settings → Notifications; on an iPhone or iPad only once fctl is on the Home Screen. People
who follow a session hear when it waits for a reply, asks, pauses on a usage limit or fails
(`crates/fctl-domain/src/notify.rs`).

- **Timing.** The first notification of a burst waits 10 s for the rest, and at most one goes
  out a minute. Several become a digest ("3 sessions need you") that replaces their earlier
  notifications.
- **Tags.** Each session has its own tag and alerts again (`renotify`).
- **Bodies are specific**: "web#12 waits for your reply" followed by the agent's last words, up
  to 140 characters, or the whole question, up to 300.
- **Clicking one** (`public/sw.js`) focuses a window already on that page, or tells an open app
  window to navigate without a reload. It opens a new window only when none is open.

### Edge cases

- **A brief "waiting".** Between a background task's end and the turn that takes up its result,
  a session reads idle "Waiting for a message" for a few milliseconds. The new session view's
  status line waits 400 ms before saying it's the reader's turn. Needs you has no such delay.
  Whether the count visibly flickers then hasn't been checked.
- **Hidden sessions still count.** A session hidden from the sidebar stays in Needs you.

**Building one like it.**

- [ ] Rank by what the person must do: answer, fix, review, reply, then wait.
- [ ] One entry per item, for its most pressing reason, with the age of that reason.
- [ ] Give a question room to be read, and keep everything else to one line.
- [ ] Mirror the count wherever the person looks, and clear every copy on sign-out.
- [ ] Leave out waits that need nobody (work that is done), so the count stays worth trusting.


## Resizing and folding into the rail

**Purpose.** People who want room for the page can narrow the sidebar or fold it into a rail of
icons, and find it as they left it. This only applies beside the page, from 768 px up.

**Sizes** (`lib/sidebar-layout.ts`). The sidebar starts at 288 px and can be dragged between 240
and 420 px. The rail is 60 px. Width and folding are kept per browser (`fctl:sidebar-width`,
`fctl:sidebar-folded`), and other tabs follow through `storage` events.

**The handle** (`ResizeHandle`) is a 12 px strip centered on the edge, with a `col-resize`
cursor. Its 1 px line shows `line-strong` on hover and `accent` when focused or dragged. It
follows the WAI-ARIA window splitter pattern:

- a focusable `role="separator"`, vertical, labelled "Sidebar width", with a value, minimum and
  maximum, and `aria-valuetext="Folded"` while folded;
- → widens it 16 px, or unfolds it; ← narrows it 16 px, or folds it at the least width; Enter
  folds or unfolds it;
- a double click restores the initial width.

**Dragging** (fctl#459):

- Passing halfway between the rail and the least width (150 px) folds it. It slides there with
  the fold's animation rather than following the pointer through widths it can't take.
- Folding by a drag keeps the width from before that drag, so unfolding brings it back as it
  was. Dragging out of the rail opens it where the pointer is, then follows the pointer.
- The handle is the same element on the rail and on the open sidebar, so it keeps pointer
  capture as the sidebar unfolds under it.

**Folding** also has buttons ("Fold the sidebar" in the header, "Unfold the sidebar" on the
rail) and a shortcut, ⌘B or Ctrl+B (fctl#461):

- Letters are the only keys that need no Shift or Option on every European layout.
- ⌘B is what VS Code, Cursor and Zed use, and it is free in browsers on a Mac.
- ⌘\\ still works, unadvertised, so nobody loses a shortcut they learned; on a Swedish Mac, \\
  is ⌥⇧7.
- The shortcut does nothing where the sidebar is a drawer.

**The rail, top to bottom:**

- the mark alone (labelled "fctl"), search, and the Agent Floor icon (`accent` while sessions
  are at work);
- Pull requests, with a green badge of how many are ready, then the Needs you count;
- each workspace, separated by a line: its 22 px avatar, then its projects as 36 px tiles with
  26 px icons. A tile's corner dot is blue when an agent there asks something, otherwise
  running. The current project's tile is `raised` with a `line-strong` ring;
- at the foot: Admin (with a highlight badge), Settings, Unfold, and the person's 28 px avatar,
  whose menu opens upward from its left edge.

Every rail item has `aria-label` and a native tooltip that includes its counts ("Web app · 2 at
work").

**Building one like it.**

- [ ] Every way to change the width (drag, keys, double click, button, shortcut) lands on the
      same few states.
- [ ] Snap at halfway instead of passing through widths that can't be used.
- [ ] Remember the chosen width separately from whether the sidebar is folded.
- [ ] Keep every signal of the tree in the rail, as dots and badges.


## Phones: the drawer, the top bar and the menu button

**Purpose.** On a phone the page gets the whole screen, and the sidebar is one thumb away.

**The top bar** (below 768 px). It is sticky, 56 px, `bg-canvas/80` with a blur and no border,
and holds the menu button and the large logo.

- **The menu button** is 44 px with a 24 px icon, Apple's minimum touch target. Before fctl#137
  it was 34 px in a 48 px bar and hard to hit. The icon's bars line up with the page's text,
  24 px from the edge.
- **The large logo** has a 26 px mark and a 17 px word. The sidebar's header shows the same
  logo, centered in its 56 px, so opening the drawer doesn't change it (fctl#141).

**A page's own header can hold the menu button.** The session page's header sticks to the top.
It used to slide over the top bar and cover the only way to open the sidebar, and sessions load
scrolled to their newest message (fctl#142). Such a page puts `HeaderMenuButton`
(`menu-button.tsx`) in its header. While any header holds one, the shell leaves its top bar out.
Headers register in a layout effect, which the shell counts, so the bar never paints under the
header. A session that fails to load has no header and keeps the bar.

**The drawer.**

- **Size.** `min(100vw − 48 px, 300 px + left inset)` wide, which always leaves a strip of shade
  to tap.
- **Opaque, and gone when closed** (fctl#149). Kept off screen with a blur, it sometimes stopped
  showing in Safari on iOS until a reload. Now it is opaque, `display: none` once closed, and
  drawn fresh each time it opens.
- **Motion.** It slides over 300 ms ease-out (`transition-discrete` for `display`, with a
  `@starting-style` start off screen), and the shade (`black/40`) fades in step. Neither moves
  with reduced motion.
- **States** (in `AppShell`): `open`, `closed` (slides away), `gone` (taken out at once) and
  `dragged`.
  - The close button ("Close menu", 44 px) and the shade slide it away.
  - A link in it, or a palette entry that opens a page, takes it out at once. The router's view
    transition snapshots the first frame after a click, and a drawer that had just begun to
    slide was caught open in that snapshot and faded out over the new page (fctl#221,
    fctl#348).
  - Toggle theme from the palette opens no page, so the drawer stays.

**The edge drag** (`drawer-drag.ts`, fctl#404).

- **Where it starts.** A finger within 32 px of the left edge (plus the notch's inset in
  landscape) drags the closed drawer in. The band keeps it from fighting code and diffs that
  scroll sideways. In a browser's tab the browser takes a swipe from the very edge for going
  back, as Android's back gesture does whatever the page does, so the band lets a finger start
  just inside it. In the app on an iPhone's or iPad's Home Screen there is no page to go back
  to (edge swipes, below), and the drawer comes in from the very edge. The open drawer drags
  out by itself or the shade.
- **When a touch becomes a drag.** After 8 px of movement, mostly sideways, toward where the
  drawer goes.
- **Letting go.** The drawer opens if it is more than half out, or goes the way it was flicked
  (faster than 0.4 px/ms over the last 100 ms). A finger that stopped before lifting flicks
  nothing.
- **Following the finger.** Inline styles move the drawer and shade with the finger. They are
  removed on release, so the CSS transition carries on from where the finger left them. The
  page doesn't scroll meanwhile, and the touch that dragged clicks nothing.
- **When it gives way.** It never comes in under a dialog or the palette, under a finger
  scrolling back a sideways row, while a row is lifted, or when a second finger touches.
- **Cost.** A non-passive `touchmove` listener exists only during a touch that could drag, so
  ordinary scrolling never waits for this code.

**Edge swipes** (`lib/history.ts`, fctl#493). iOS goes back when a finger swipes in from
the left edge of the screen and forward from the right, in the app on the Home Screen as in
Safari and Chrome. That fought the drawer's drag, so in the app on an iPhone's or iPad's Home
Screen neither edge leaves the page.

- **How.** WebKit starts the swipe whenever there is a page to go back or forward to
  (`ViewGestureController::canSwipeInDirection`), whatever the page does with the touch.
  Cancelling the touch as it starts (fctl#492) didn't stop it in the app on the Home Screen or
  in Chrome, and `touch-action` only holds back swipes that don't start at the edge. So there
  each page takes the place of the last in the browser's history: the router's history pushes
  as it replaces, the app's own page loads (signing in or out, going to Linear) replace rather
  than assign (`goTo`), and a link that loads a page in the same window (signing in with
  Google, installing the GitHub App) loads it in place (`linksInPlace`, after the router's
  links have taken their clicks). A link to a place on the same page moves there in place of
  where it was, keeping the router's state, which a page load would lose. With no page to go
  to, the swipe doesn't start, and the touch is the page's.
- **Where.** In WebKit on a touch screen (`GestureEvent` exists and `navigator.maxTouchPoints`
  is above 0), opened from the Home Screen (`display-mode: standalone` or
  `navigator.standalone`). That app has no back button to lose: people move about it with the
  sidebar and links.
- **What keeps its history.** Browsers' tabs, whose back buttons and swipes go through it as
  before; the app installed on Android, whose back gesture and button go through it; and a
  Mac's app in the Dock, which has no touch screen.
- **What still leaves pages behind.** Another site's own pages, such as a consent screen
  clicked through on the way back from signing in, until the app is opened afresh.
- **Scroll.** Pages open where they did: at their top, as the router resets the scroll by
  each location's own key, which a replace makes anew, and a session's at its newest work,
  which it scrolls to itself.

**Where it opens again** (`lib/reopen.ts`, fctl#525). iOS ends an app on the Home Screen that
has been in the background a while, and the next time it comes to the front it starts afresh at
its start page, the Agent Floor. So in the app on an iPhone's or iPad's Home Screen the page it
is on is kept, and a fresh start at the Agent Floor goes back to it, as an app that iOS never
ended would be.

- **What is kept.** The signed-in app's pages, with the tab or list they show (`tab`, `state`,
  `scope`, `q`, `workspace`), and when the app was last on screen with one: as it opens a page
  and as it goes to the background. Not signing in, a device to approve, or what a one-off link
  brought (`?github=installed`, a place found). Every way of signing out forgets it, and so does
  a sign-in that ended.
- **When it goes back.** Only on a fresh start (sessionStorage is empty: the app's own page
  loads, such as Back home on the error page, go where they go), at the start page itself, a
  minute or more after the app was last on screen. Closing the app from the app switcher as it
  is used and opening it again comes sooner and starts at the Agent Floor: iOS tells a page
  nothing as it ends it, so time is all that tells the two apart, and an app closed after
  longer in the background opens on its page.
- **Notifications.** A tap on one that starts the app opens its page instead: before going
  back, the app looks, for at most half a second, for the click the service worker keeps.
- **How.** Before the first page shows, which keeps the Agent Floor from showing first.

**What else differs on phones.** No fold, rail or resize handle; no hide button; no Keyboard
shortcuts in the person's menu or the palette. N goes to the Agent Floor, whose task box has
room, instead of opening a dialog. The palette loses its blurs and its rise ([The command palette](#the-command-palette-k)).

**Building one like it.**

- [ ] Primary touch targets are 44 px.
- [ ] A drawer that navigates leaves at once. It slides only when closed without navigating.
- [ ] Edge gestures start in a narrow band, and give way to scrolling, dialogs and other
      gestures.
- [ ] Leave the system's edge swipes nowhere to go rather than fight them for the touch: on
      iOS a page can't take the touch from them.
- [ ] Let a page with a sticky header of its own take over the top bar's job.


## Page headers and view transitions

### Two kinds of header

**The page header, in the flow** (Agent Floor, workspace, project, pull requests, Settings):

- **Column.** `mx-auto max-w-[920px] px-6 pt-12 pb-24`; Settings is 1000 px, and Pull requests
  uses `px-4 pt-8` on small phones.
- **Entrance.** The header rises in (`animate-rise`). The Agent Floor's hero line follows its
  heading 80 ms later.
- **Heading.** An Inter display h1 in medium weight: 34 to 40 px, or 28 to 36 px for a
  workspace, with leading about 1.1 and tracking about −0.022em.
- **Description.** 15 px `ink-3`, at most `max-w-2xl`.
- **Facts row.** 12.5 px `ink-3`, wrapping: the repository, the branch, "12 sessions · 2
  active", "2 of 3 runners online".
- **Breadcrumb.** A project's title has its workspace above it: 13 px `ink-3` with the
  workspace's avatar, as a link.
- **Tabs** follow as a bottom-bordered row. On phones it scrolls sideways out to the screen's
  edges (`-mx-6 px-6`, scrollbar hidden).
- **Loading** shows skeletons the shape of the header. **Missing or forbidden** shows a banner
  in a narrow column: "This project does not exist, or you cannot see it."
- On phones, the shell's top bar sits above all of this.

**The sticky app bar** (a session's page):

- **Size.** 56 px on phones, the top bar's height, with the menu button in the same spot; 60 px
  from 768 px in the new view.
- **Contents.** The agent's orb, the truncated title, and a line with the status pill and the
  most pressing note. While the agent works, light runs along the bar's edge.
- **On phones**, tapping the title or orb opens the details sheet. The classic page shows a
  chevron after the title.

The pull requests page keeps its tabs and filter in a similar sticky bar from 768 px up.

**Settings** lays out by its own width with a container query (`@2xl`), not the viewport's,
since the sidebar takes part of the width. A phone shows the list of pages, and each page opens
with a "‹ Settings" link back. Beside the page, its navigation uses the sidebar's row style,
with amber dots on pages that need the person.

### View transitions

- **Every navigation cross-fades.** `defaultViewTransition: true` (`router.tsx`) snapshots the
  page at the first frame after a click and cross-fades the whole page into the new one over
  220 ms ease-out (`::view-transition-old(root)` and `new(root)` in `styles/app.css`). The
  sidebar is the same before and after, so it seems to stay put while its highlight fades from
  one row to the next.
- **Trap: the snapshot.** Anything mid-animation at the click is in the snapshot and fades over
  the new page, which is why the drawer is taken out at once.
- **Trap: named elements.** An element with its own `view-transition-name` is drawn above the
  whole page during the transition and covers the labels it moves past. Settings' navigation
  instead opts out of the cross-fade: `::view-transition-old(settings-pages) { display: none }`
  and no animation on its group or new snapshot. One absolutely positioned highlight then
  slides from page to page with a CSS transition (260 ms).
- **Replacing the address in code.** Pass `viewTransition: false`. Otherwise the replacement
  cuts short the transition that opened the page, as the session page's search landing once
  did.
- **Theme and session view.** Both switches call `document.startViewTransition`, so the page
  cross-fades, unless motion is reduced.
- **In tests.** Navigating again before a transition ends logs "Transition was skipped"
  (Chromium) or an `AbortError` (WebKit). It is harmless: wait for the new page's h1, not its
  URL.
- **Unsure.** Reduced motion doesn't turn off the router's 220 ms fade, because the global rule
  matches `*`, `::before` and `::after`, not `::view-transition-*`. A fade is usually acceptable
  there.


## The command palette (⌘K)

**Purpose.** From anywhere: jump to a session, project, workspace or Settings page, run an
action, or find what any session said. The Agent Floor comes first, so ⌘K then Enter opens its
task box, and a session can be started from the keyboard alone: ⌘K, Enter, the task, ⌘Enter
(fctl#127).

**Opening.** ⌘K, and also ⌘P and ⌘⇧P, which code editors use for quick open and the command
palette (fctl#204), all while typing too. ⌘P takes the place of printing, and Firefox keeps
⌘⇧P for itself. The sidebar's search button and the rail's search icon open it as well, and
show only ⌘K.

**Anatomy.**

- **Backdrop.** `black/40` with a 3 px blur. The card sits 14vh from the top.
- **Card.** 576 px (`max-w-xl`), `rounded-xl`, a `line-strong` border, `surface/95` with a
  strong blur, and a deep shadow (`0 30px 120px rgb(0 0 0 / .55)`). It rises in.
- **Field.** 52 px, 15 px text, placeholder "Search sessions, projects, workspaces and actions".
- **List.** At most 52vh, with `overscroll-contain` so a swipe past its end doesn't scroll the
  page. It is `isolate`, which keeps the pulsing status dots' layers inside the list.
- **Footer.** "Finds what sessions said too · ↑↓ to move · ↵ to open".

**What it lists.** Group headings are 12 px medium `ink-4`, in sentence case.

| Group | Entries | Hint at the right |
|---|---|---|
| Go to | Agent Floor (found by "home", its old name, too), Pull requests | "new session", "what each needs next" |
| Sessions | the 50 newest, each with its status dot | `web#12` |
| Projects | named "Acme / Web app" when the person is in several workspaces | the repository |
| Workspaces | each | "3 projects" |
| Actions | New session; New project (workspace admins); New workspace; Settings; Toggle theme; Keyboard shortcuts (computers); Admin (instance admins) | |
| Settings | its pages, found by what they hold ("passkeys" finds Security); listed only while searching, so they don't crowd the list | |
| In sessions | what sessions said: from 3 characters (2 in Chinese, Japanese or Korean), 220 ms after typing pauses, 8 results not already listed | `web#12 · archived` |

**Ranking.**

- A substring match scores 100 minus its position. Otherwise the letters must appear in order,
  scoring 3 for each one right after the last and 1 for the rest.
- At most 40 entries show.
- Settings pages match only by substring, because each is one of many.
- **Unsure:** with nothing typed, those 40 are the Go to pair and then sessions, so someone
  with many sessions sees projects, workspaces and actions only after typing.

**Results from what sessions said.**

- The match is marked with `highlight` at 25 % in the dark theme and solid lime in the light
  one.
- A second line names who said it ("You:", a name, fctl, the agent) and shows 24 characters
  around the match.
- Opening a result lands on the session with its find bar on the match.
- Earlier results stay while new ones load, so "found for" can be an earlier query.

**States.** No matches: "Nothing matches “…”." While searching what sessions said: a spinner and
"Looking in what sessions said…" in a polite live region.

**Keys and pointer.**

- ↑ and ↓ move the selection, and so does moving the mouse. The selected row fills with `hover`.
- Enter runs the entry, with `preventDefault`, so the key doesn't arrive as a line break in the
  task box it just focused.
- Escape closes the palette, and so does a press that starts on the backdrop.
- On computers (`hover: hover`), an entry's shortcut shows as keycaps in place of its hint, and
  every entry carries `aria-keyshortcuts`.

**Touch screens** (`pointer: coarse`, fctl#154, fctl#163). Two WebKit workarounds, each
explained in a comment that should stay with it:

- Safari on iOS drops swipes in a native scroll view while the layers above it are rebuilt
  (WebKit bug 322849). The card's rise animates a filter and then keeps one, and the blurs and
  the card's clip make layers of their own. So on touch screens the palette only fades in, the
  backdrop is darker (`black/55`) with no blur, and the card is opaque and doesn't clip.
- Safari puts a field's caret views in the layer that draws the field. While that layer also
  holds the list, a swipe scrolls the page (as in WebKit bug 283804). So the field gets a layer
  of its own (`will-change-transform`).

**Trap.** The field takes the focus in a `requestAnimationFrame` after opening. A key pressed
at once, as in a test, can still reach the field that had the focus.

**Where it lives.** `components/shell/command-palette.tsx`, `lib/search.ts`, and
`lib/settings.ts` (the Settings pages' keywords).

**Building one like it.**

- [ ] Put the most common destination first, so the shortcut and Enter take people there.
- [ ] Let people find things by old names and by what they hold.
- [ ] Show each entry's shortcut where there is a keyboard.
- [ ] On touch screens, keep filters and blurs off everything above the scrolling list.


## Keyboard shortcuts

### One registry (`lib/shortcuts.ts`)

`SHORTCUTS` lists every shortcut: its label, group, keys, extra unadvertised keys (`also`) and a
note on where it works. Components take one with `useShortcut(id, fn)`. The sheet, tooltips,
the palette and `aria-keyshortcuts` all read this one list, so they can't disagree. The groups
come in the sheet's order: Anywhere, Go to, On a session's page, Writing, Finding, In the
changes, On the pull requests page.

| Keys | Does |
|---|---|
| ⌘K (also ⌘P, ⌘⇧P) | search or jump to… |
| N, or ⌘⇧O while typing | new session |
| ? or ⌘/ | keyboard shortcuts |
| ⌘B (also ⌘\\) | fold or unfold the sidebar |
| G F, G N, G P, G S | Agent Floor, next in Needs you, pull requests, Settings |

### The matcher (`lib/hotkeys.ts`)

- **One listener.** A single window `keydown` listener serves every binding, and the newest
  binding wins a key two take. It ignores keys the page already handled (`defaultPrevented`),
  keys an input method is composing, and bare modifiers.
- **⌘ and Ctrl.** On Apple's systems `mod` is ⌘ alone, because Ctrl moves the caret in text
  fields there (Ctrl+K deletes to the line's end, Ctrl+P goes up a line). Elsewhere `mod` is
  Ctrl or ⌘, so ⌘ still works on a Mac whose browser reports another system. ⌃⌘ combinations
  are never taken (⌃⌘F is full screen).
- **Typing.** Single keys stay with the field being typed in: inputs, text areas, selects,
  editable regions and comboboxes. ⌘ shortcuts work anywhere. Escape leaves a box, which frees
  the single keys again.
- **Dialogs.**
  - Keys in an open dialog are the dialog's unless a shortcut opts in (`inDialogs`).
  - A ⌘ shortcut that does nothing in a dialog still stops the browser's own: Chrome's ⌘K
    search, Firefox's Ctrl+B bookmarks.
  - After a click leaves the focus on the page's body, keys go to the dialog on top, which focus
    events track.
- **Layouts.**
  - A symbol such as ? or / matches the character typed, whatever modifiers the layout needs
    (/ is Shift+7 on Swedish and German keyboards).
  - A letter matches where the layout puts it, or its US key where the layout writes another
    script (Greek, Cyrillic) or ⌥ changes it on a Mac (⌥C types ç).
  - AltGr is not Ctrl+Alt.
- **Sequences.** After its first key, a sequence waits 2.5 s. Holding the first key keeps it
  waiting, and a click ends it. A held key fires once unless the binding repeats, as j and k do
  in lists.
- **Tests enforce it** (`shortcuts.test.ts`):
  - every shortcut sits in a group the sheet shows;
  - no two shortcuts take a key where both work;
  - no single key also starts a sequence;
  - letters that work anywhere or on a session's page need no Shift, ⌥ or AltGr on any layout.

### Making shortcuts known

- **Tooltips** name the first way to press one: "Fold the sidebar (⌘B)", or Ctrl+B outside
  Apple's systems. A letter alone is lowercase, "(d)", as on GitHub. A sequence reads "g then
  f".
- **Keycaps** (`Kbd`) are 18 px in hints and 22 px in lists (the larger with a darker bottom
  edge). They show ⌘ ⇧ ⌥ on Apple's systems and Ctrl, Shift, Alt elsewhere; named keys as ↵,
  Esc and arrows. A letter is a capital after a modifier (⌘B) and lowercase alone (j).
- **`aria-keyshortcuts`** says shortcuts with Meta or Control. It can't express sequences, so
  it leaves them out.
- **The keyboard shortcuts sheet** (`components/shell/shortcuts.tsx`).
  - **Opening.** ? or ⌘/ toggles it, from a text box too; ⌘K and the person's menu offer it as
    well. It is for computers only (`hover: hover`).
  - **Container.** A native `<dialog>`, 860 px wide (1180 px from `xl`), at most `min(760 px,
    100dvh − 3rem)` tall. It rises in over a `black/45` backdrop with a 3 px blur.
  - **Header.** "Keyboard shortcuts" in 22 px display type. Then: "Single keys work while you
    aren't typing in a box, and Esc leaves the box you are in." A filter searches labels,
    notes, group names, and keys as each system writes them. Escape clears the filter before
    it closes the sheet.
  - **Body.** Two columns from 768 px and three from `xl`; it fits a 1440×900 screen without
    scrolling. Anywhere and Go to come first, then the groups of the page it opened on, marked
    with an accent dot and "Here" (over the diffs, the changes' keys), then the rest. In each
    row the label keeps its line and the keys wrap first.
  - **Footer.** "Shortcuts follow your keyboard's layout: for ? or /, press the keys that type
    them, such as Shift and 7 for / on a Swedish or German keyboard."
  - **Closing.** A press that starts on the backdrop closes it; a text selection dragged out of
    the sheet doesn't.
  - **Trap.** Its scrolling body is `min-h-0 flex-auto`, not `flex-1`. Safari 26 gives a
    `flex-1` child no height in a dialog that is as tall as its contents (WebKit bug 289876),
    and current Playwright browsers don't show the bug.
- **The sequence hint.** 450 ms after G, a `role="status"` card at the foot of the window lists
  what can follow and where each goes. Someone who types the sequence quickly never sees it.

### A new session from anywhere (`new-session.tsx`, fctl#463)

**Keys.** N, or ⌘⇧O inside a text box, where N would type.

**What happens.**

- On a page with its own task box (the Agent Floor, a project's Sessions tab), the focus goes
  to that box.
- Elsewhere on a computer, the Agent Floor's task box opens in a dialog over the page, with the
  same draft, in the project the page is about. The dialog sits 13vh from the top, "where ⌘K's
  palette is: it grows down as the task does", and is as wide as the Agent Floor's box
  (872 px).
- On a phone, N goes to the Agent Floor.

**States.** A skeleton while loading. With no project to start a session in: "There's no
project where you can start sessions yet. The Agent Floor says how to set one up."

**Overlays belong to the page they opened on.** The dialog and the sheet close when the path
changes, and starting a session opens its page.

**Building one like it.**

- [ ] One registry drives the sheet, the tooltips and `aria-keyshortcuts`.
- [ ] Match characters by what the layout types, and letters by where it puts them.
- [ ] Single keys never fire while typing, and Escape gives them back.
- [ ] Tests reject keys that conflict.
- [ ] Teach shortcuts where people already look: tooltips, menus, the palette, the sheet's
      "Here", and a hint after a pause.


## Appearance and per-browser preferences

**Theme** (`lib/theme.ts`, `public/theme.js`).

- **Choices.** Dark or light; there is no third "system" option.
- **First visit.** It follows the system. A pre-paint script outside the bundle applies the
  theme before anything renders, so there is no flash and the Content Security Policy needn't
  allow inline scripts.
- **A chosen theme** is kept (`fctl-theme`). Choosing sets `data-theme` on `<html>` and the
  `theme-color` meta tag (the canvas, `#0a0a0a` or `#fafafa`), so the browser's and the installed app's
  title bars match. The page cross-fades unless motion is reduced.
- **Where to change it.**
  - The person's menu offers "Light theme" or "Dark theme", naming the result, with the
    result's icon.
  - ⌘K offers "Toggle theme".
  - Settings → Appearance shows two picture cards in a radio group. Each draws a small sidebar,
    a page and a primary button in that theme's own brand colors, whatever theme the page is
    in. The chosen card gets an `accent/60` border and a 3 px `accent-soft` ring, and keyboard
    focus outlines it in `accent`.
- **The light theme is not an inversion.** There, `accent` is ink, since yellow can't be read on
  white, and fills are lime. `raised` is white, so hovers need the `hover` token.

**Session view** (`lib/session-view.ts`, `components/session/view-switch.tsx`).

- **The default.** The classic session page stays the default "until people have compared the
  two". Each browser keeps its pick, as it keeps the theme (`fctl:session-view`: "new" is
  stored; classic removes the key). Other open tabs follow.
- **Switching.**
  - `v` on a session's page.
  - The ⋯ menu's "Try the new view", with a small "New" pill in `accent-soft`, or "Back to the
    classic view".
  - The "New session view" switch in Appearance. Its hint: "Sessions read in turns, and say
    above the message box what the agent does now. On a session's page, v switches between the
    two views."
- **Feedback.** A toast says what changed and how to undo it: "Sessions open in the new view.
  Switch back from the ⋯ menu." The page cross-fades.

**Clock.** "24-hour clock" (`fctl-clock`). Until it is set, times follow the browser's language,
since browsers hide the system's 12- or 24-hour setting from pages. Its hint shows both forms
("Times read 19:40 rather than 7:40 PM"). The Settings list sums the page up as "Dark · 24-hour
clock · New session view".

### How per-browser preferences are kept

Every module follows the same pattern:

- every `localStorage` call is in a try/catch, and a refused write still lasts for the page
  (private browsing);
- a module-level set of listeners and the window's `storage` event feed
  `useSyncExternalStore`, so components and other tabs follow;
- structured values are validated and versioned;
- whatever is the person's is forgotten on sign-out.

Each key also gets a line, in the same change, in fctl.sh's privacy policy
(hyperstructure/fctl-site, `legal/privacy.md`), which lists what the browser keeps, not only
what the server stores. New keys use the `fctl:` prefix; the older ones use a hyphen.

| Key | Holds | Until |
|---|---|---|
| `fctl-theme`, `fctl-clock`, `fctl:session-view` | Appearance | changed |
| `fctl:sidebar-width`, `fctl:sidebar-folded` | width, folding | changed |
| `fctl:folded-workspaces`, `fctl:needs-open` | what is folded or open | changed |
| `fctl:sidebar` | the kept copy of the lists, per user | sign-out, or a 401 or 403 from the server |
| `fctl:hidden-sessions` | hidden sessions | they work again, 7 days, or sign-out |
| `fctl:pulls-mine`; sessionStorage `fctl:pulls-left` | Mine; the tab and filter the pull requests page was left on | changed; the browser tab closes |
| `fctl:left`; sessionStorage `fctl:running` | on an iPhone's or iPad's Home Screen, the page the app was on and when it was last on screen; that this run started | the next page, or sign-out or a 401 or 403 from the server; the app closes |
| `fctl:app-log`, `fctl:app-log-owner`, `fctl:app-beat` | the app log (300 entries at most, each with its run's ID) and the account it is kept for, or after a sign-out the run that signed out; in an installed app, when the run was last heard from and whether on screen | sign-out (the person's menu, the two-factor page, deleting the account), which keeps the log for its own run alone, or someone else signing in; Clear empties it and keeps whose it is |
| sessionStorage `fctl:log-running`, `fctl:recovered-at` | this run's ID (a random one), and when it last reloaded to recover | the app or browser tab closes |

**Signing out** (the person's menu) ends the browser's push subscription, forgets drafts, signs
out on the server, clears the query cache and the title count and badge, and forgets the kept
sidebar and hidden sessions last, so that no list arriving meanwhile is kept again. Then it
clears the app log and keeps it for a new run of its own, and loads `/login` as a whole new page
of that run. Another tab still open may add to the log after it, about the account that signed
out: as anyone signs in next, the log keeps only the lines of the run that signed out.


## The app log, and coming back from the background

The app on an iPhone's Home Screen has come back from the background black, and stayed so until
it was closed, again and again (fctl#274, #350, #514, #515), and nobody has watched it happen.
`lib/app-log.ts` keeps what each run goes through, in localStorage, for Settings → App log.

- **What it keeps.** How each run started (a fresh run or a page load of its own, the navigation
  type, where it runs, the page, the build, the viewports); in an installed app, how the run
  before ended, from its heartbeat every 2 seconds on screen (it stopped on screen, or ended in
  the background); each trip to the background and back, with how long it was away and the
  viewports then (Safari's broken ones read like a visual height of -59); the main thread stuck
  for over 3 seconds on screen; errors and unhandled rejections, the error page's errors and
  React's crashes; WebGL losing a scene's context, getting it back or giving none; a page
  unloading, the page cache, freezing and going offline. Nothing that looks like a secret
  (`lib/redact.ts`).
- **Tabs.** They share the log, each adding to what is stored; they keep no heartbeat, as they
  run side by side. Settings → App log reads the stored log as it opens, and again as another
  tab writes, rather than what its own tab read before.
- **Whose.** The log notes the account it is kept for, and goes when someone else signs in. A
  sign-in that ends leaves it (a signed-out browser gets a 401 on every load, and the log may
  tell why). Each entry notes its run (a tab's random ID in sessionStorage, which outlasts the
  run's own page loads). Signing out clears the log and keeps it for its tab's run alone, under a
  new ID (`forgetLog`): a duplicated tab copies sessionStorage, and with it the ID it had. The
  next sign-in, in whichever tab, keeps only that run's lines, its start and the sign-in page,
  not what other tabs logged about the account that signed out. Clear empties it and keeps
  whose it is.
- **Coming back with nothing.** 3 seconds after the app comes back, it looks: a root with no
  page loads the page again (`reloadToRecover`), and no part of the page at the screen's middle
  is logged. React's `onUncaughtError`, an error that took the whole app down, reloads too. At
  most once a minute, so that a reload that doesn't help isn't tried again and again, and never
  where sessionStorage can't note it; the log says when it held back.
- **In bounds.** The same entry again counts on the one it repeats (`Error: boom (×3)`), and
  errors are kept ten a minute at most, so that a handler failing on every frame doesn't push
  out the starts and returns the log is for.
- **WebGL.** `GLCanvas` and the error pages' stream let a scene's context go as its canvas
  leaves the page (`WEBGL_lose_context`), rather than when the browser collects it, and log what
  happens to it. A canvas still on the page keeps it: React's development mode mounts a scene
  again on the same canvas.


## Known gaps
Found reading the code and not yet confirmed on a device. They are not decisions: they describe
what the code does now. Fix one when you're near it, and don't copy it.

- **Marking the current page.**
  - `HERE` is a background and an inset shadow, both of which forced colors (Windows' contrast
    themes) drop. Lines and rings that must survive should be borders or outlines, as the app's
    focus rings are.
  - Only the Pull requests links and the rail's links carry `aria-current="page"`. Session,
    project, workspace, Agent Floor and Settings rows don't.
- **Invisible but tappable buttons.** The workspace header's "+" and fold chevron, and a
  project's "Change its icon", are `opacity-0` hover reveals with no
  `[@media(hover:none)]:hidden`. On touch screens they are invisible but still take taps.
- **The phone drawer** is an `<aside>`, not a dialog. Opening it doesn't move the focus into it,
  Escape doesn't close it, and Tab can reach the page behind the shade.
- **The palette** doesn't announce its arrow-key selection: no combobox or listbox roles, no
  `aria-activedescendant`. Tab can leave it.
- **The person's menu** is reached with Tab; arrow keys don't move between its items.
- **The theme** doesn't follow other open tabs (no `storage` listener), unlike the session view
  and the sidebar's preferences.
- **Touch targets.** Sidebar rows keep their computer heights on touch screens (32 and 28 px),
  while the menu and close buttons are 44 px.
- **The ⌘K keycap on phones.** The search button shows it there. The pull requests page hides
  its "/" keycap on touch screens.
- **The resize handle's focus** shows as a 1 px background line, which forced colors drop.
- **Edge swipes on an iPhone** in the app on the Home Screen haven't been tried on one since
  fctl#493, which leaves them no page to go to. Another site's own pages, left behind on the
  way back from it, still give them one until the app is opened afresh.


## Checking it

Look at both themes and at a phone width ([verifying](verifying.md) has the recipes). In Playwright:

- touch styles need `isMobile` and `hasTouch` (a 390 px viewport alone has a fine pointer);
- WebKit reports a Mac user agent even on Linux, so `mod` is ⌘ there: check Ctrl in Chromium;
- the shell runs on vite alone if `page.route` answers `/api/v1/auth/me` and leaves the rest
  pending. Shoot the sidebar on `/w/<slug>` with a tall viewport, and use
  `locator('aside').first()`, since a session's rail is an `<aside>` too;
- judge blurs in Chromium or a real Safari: headless WebKit on Linux draws them as if clear;
- the app on an iPhone's Home Screen needs `GestureEvent`, `navigator.maxTouchPoints` and
  `(display-mode: standalone)`, which no headless browser has on Linux: stand them in with
  `addInitScript`, and check that `history.length` stays as it was as links open pages.


## Principles at work here

1. **Rank what needs the person, and show the count wherever they look**: the sidebar, the tab
   title, the app icon, a notification. Leave out waits that need nobody, so the count stays
   worth trusting.
2. **Nothing moves unless the person moves it.** Their order lives on the server. Rows hold
   their places as their state changes. Finished things leave on a known schedule, or sooner
   when hidden.
3. **Paint at once and never lie about emptiness.** Show a validated copy of the last lists
   until fresh ones arrive, and offer "Create a project" only once the data shows there is none.
4. **Shape each interaction for the input in use.** Hover reveals and WebGL delight are for a
   mouse. Touch gets 44 px targets, hold-to-lift and edge swipes that give way. Keys get one
   layout-aware registry.
5. **Make capabilities discoverable where people already are.** Tooltips carry shortcuts, menus
   and the palette repeat them, the sheet lists the page's own first, and a hint appears after a
   pause.
6. **Motion confirms, never competes.** 150 to 300 ms, ease-out for what arrives. Remove what is
   mid-animation before a view transition snapshots it. Honor reduced motion everywhere.
7. **Status speaks one small color language, plus words.** Accent means working, blue means your
   turn, pink paused, red failure only, GitHub's green a ready pull request. Each comes with
   screen-reader text and a tooltip that says what is counted.
8. **The shell yields to the page.** A page with a sticky header takes over the top bar's job.
   Overlays belong to the page they opened on. Layouts follow the page's own width.
9. **Preferences are the browser's, handled with care.** Store them safely, follow other tabs,
   forget them on sign-out, list them in the privacy policy. What matters across devices, such
   as order, lives on the server.
10. **Fix browser bugs at their source, and leave the reason beside the fix.** Name the WebKit
    bug, the snapshot timing or the layout trap in a comment, so nobody "cleans it up" later.
