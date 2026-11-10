# Lists, rows and the pages built from them

How fctl's web app shows collections (sessions, projects, pull requests, notes, people, runners, settings) and the pages built around them: the Agent Floor, the pull requests page, a project's page, a workspace's page and Settings. Written from the code on `main` (hyperstructure/fctl, `web/src`), its commit messages and the notes earlier agents left. How pages explain a feature and invite people to set it up (the workspace's Runners tab, a project's Schedules and Reviews tabs and its tickets) is in `explaining.md`; this page covers their lists once in use.

Conventions used below:

- Paths are relative to `web/src`. Sizes are CSS pixels; Tailwind 4 spacing is 4 px a step (`h-9.5` is 38 px).
- The design package overrides Tailwind's radii: `rounded-sm` 6, `rounded-md` 9, `rounded-lg` 13, `rounded-xl` 18 px (`rounded-2xl` stays 16).
- Breakpoints: `sm` 640, `md` 768, `lg` 1024, `xl` 1280. Container queries: `@2xs` 288, `@xl` 576, `@2xl` 672, `@4xl` 896. "Phone" means below 640 px.
- Curves: `--ease-out` `cubic-bezier(0.16, 1, 0.3, 1)` for what arrives, `--ease-spring` `cubic-bezier(0.34, 1.36, 0.64, 1)` for what responds, `--ease-in-out` `cubic-bezier(0.65, 0, 0.35, 1)`.
- Copy examples use the demo world (the Romanesco workspace, its Shop project); `{name}` and `{address}` stand for a person's.

## Foundations

- **The page column.** One centred column, `max-w-[920px] px-6 pt-12 pb-24` (Settings 1000 px, the create pages 640-680 px). The `h1` is the display face, medium, `leading-[1.1] tracking-[-0.022em]`: 38 px on a project and on the pull requests page (32 on a phone), 36 on a workspace (28 on a phone), 40 for the Agent Floor's greeting, 34 for Settings and the create pages. Under it, a 15 px `ink-3` description at most 672 px wide.
- **Arrival.** Headers, sections, empty states, banners and field errors arrive with `animate-rise`: 420 ms `--ease-out`, from 6 px lower, 0.5 % smaller and 2 px blurred.
- **Lists are lines, not cards.** Rows sit on the canvas between hairlines (`border-line`) under a 13 px semibold `ink` heading, with a quiet note at its right in 12 px `ink-4` ("3 active"). Cards are kept for what asks something of the person (an invitation, a notice, an agent's question, a choice to make), so those stand out from the lists. No card grids for prose. No numbered or uppercase labels above headings: sections are grouped by their headings alone, since numbered labels read as generic AI design.
- **The type ladder of a row.** Title 14.5 px / 22 px `ink`; second line 12 px / 18 px `ink-4`, with identifiers (`shop#231`, `acme/shop#12`, branches, repositories) in JetBrains Mono `ink-3`; times 12 px `ink-4`. Every count is `tabular-nums`, so it doesn't jitter as it changes. Settings' rows use 13.5 px titles over 12 px facts.
- **Color means state.**
  - Accent (yellow on dark, ink on light, since yellow can't be read on white): at work, or "this one".
  - Blue: waiting for a person, or asking. Pink: paused.
  - Amber (the lime on dark, olive on light): caution, and "needs you". Red (`danger`): failure and destruction only.
  - GitHub's own colors (`pr-open`, `pr-merged`, `checks-failed`…) appear only on pull request and check icons, so people recognise them at a glance.
  - Hover fills use `hover`, a translucent tint, never `raised`, which is white in the light theme. A selected item is `raised` plus an inset hairline, so selected and hovered never look alike.
- **Signs of work are one color, and calm.** A spinning ring in the brand's three colors looked out of place on the session page; work shows in the accent alone: a dot that pings every 2 s, a dot wave, a comet arc.
- **Reduced motion.** The end of `styles/app.css` cuts every animation and transition to 0.01 ms and one iteration under `prefers-reduced-motion: reduce`. Scrolls started from script must check the media query themselves (`behavior: "instant"` or `"auto"`). The rule probably doesn't reach the router's 220 ms page cross-fade (view-transition pseudo-elements); unverified.
- **People's own order.** Workspaces and their projects come in the order each person drags them into in the sidebar (`lib/sortable.ts`: a mouse drags after 4 px, a finger after holding still 320 ms, Alt+↑/↓ moves the focused one), kept by the control plane (`lib/order.ts`). Every other list of projects follows it, and a list fetched while a new order saves keeps the new one, so nothing jumps back.
- **Freshest references.** A session summary carries a copy of its workspace; rows draw the workspace from the person's own list when it has it (`freshest` in `lib/workspaces.ts`), so a rename or a new color shows in every row at once.
- **Times.** Lists say `agoShort` ("now", "4m", "3h", "2d", then "Oct 3"); sentences say `ago` ("5 minutes ago", "yesterday"). The full time goes in the `title`, prefixed with what it is ("Last active Oct 27, 2026, 7:40 PM", "Merged …", "Started …"), and in `<time dateTime>`. Write times with `clock()` and `stamp()` (`lib/format.ts`), never `toLocaleTimeString`: browsers hide the system's 12/24-hour setting, so the app honours the clock chosen in Settings → Appearance.

## Three kinds of list

| Kind | For | Look | Behavior |
|---|---|---|---|
| Cover-link rows | Things you open: sessions, a workspace's projects, reviews, tickets lately | Rows between hairlines that fill as a tile | The whole row is one link; links inside it lie above it |
| Hairline lists | Things you act on in place: repositories, members, people, secrets, notes, retrospectives, schedules, runners, connections, most Settings rows | `border-y` with `divide-y` (or a `border-t` list of `border-b` items), flush with the column | No row fill, since the row isn't a link; its actions are buttons |
| Boxed lists | Choices inside a form you edit before saving (review repositories, apps, Linear teams, schedule runs); Settings rows that hold a form of their own (email addresses, workspaces) | A `rounded-lg` or `rounded-xl` border with `divide-y` | Saved with the form, or each row with its own |

Row actions follow how often the row is used:

- Read-mostly rows (notes, retrospectives) hide a ⋯ menu until hover or keyboard focus, and always show it on touch.
- Operational rows show their main action (a schedule's "Run now").
- Configuration rows edit in place, with small Selects and a trash icon that names what it removes ("Remove acme/web").

## The list row (components/ui/list-row.ts)

**Purpose.** A row that opens one thing as a whole. It has no arrow: an earlier hover arrow "said nothing the row didn't", and every row kept a column free for it, so times stopped short of the list's edge. The row says it opens by filling under the pointer and around the keyboard's focus.

**Anatomy.** Three class strings rather than a component, so any markup can use them:

- `ROW` on each row: `relative isolate -mx-3 rounded-lg px-3`. The tile reaches 12 px past the list's edges, so its contents line up with the heading above (status dots on the left edge, avatars on the right edge under the "3 active" note) while the fill has room around them.
- A hairline above each row: `before:border-t border-line`, inset 12 px, so it spans exactly the list's width. A border rather than a fill, because forced colors (Windows' contrast themes) keep borders and outlines and drop fills and shadows. A unit test fails if the line becomes a `bg-` or the ring a shadow.
- `ROW_COVER` on the link that opens the row, marked `data-cover`. Its `::after` is `absolute inset-0 z-[1] rounded-lg`, so a press anywhere opens the row, and it draws the focus ring round the whole tile: a 2 px accent outline, inset 2 px. The link's own `outline-none` doesn't reach it, since Tailwind registers `--tw-outline-style` as non-inheriting.
- `ROW_ABOVE` (`relative z-[2]`) on whatever must stay clickable or show a tooltip over the cover: links inside the row (pull requests, tickets) and marks whose `title` matters. A link can't hold links, so a row with links puts the cover on its title link and lifts the rest. Before they were lifted, the time's and the avatar's tooltips never showed.

**States.** `bg-hover` on hover (only where hover exists), while pressed (`active:`, since touch has no hover) and while the cover has keyboard focus (`has-[[data-cover]:focus-visible]`). The lines on both sides of a filled row give way: its own, and the next row's through `[:hover+&]`, `[:active+&]` and `[:has([data-cover]:focus-visible)+&]`. Transitions are 150 ms on color and opacity.

**Trap.** Tailwind 4 wraps `hover:` in `@media (hover: hover)` but not arbitrary sibling variants, and a touch screen leaves the last tapped row hovered: the next row's line would vanish for good. Wrap the sibling rule: `[@media(hover:hover)]:[:hover+&]:before:opacity-0`.

**Building one like it.**

- One cover link per row, marked `data-cover`; `ROW_ABOVE` on every other link and on tooltip-bearing marks.
- Rows as siblings, so the line rules can see their neighbours.
- Lines as borders, the ring as an outline on `::after`.
- Check with `page.emulateMedia({ forcedColors: "active" })` in Chromium, and on a touch screen that tapping a row and coming back leaves no line missing.

## The session row (components/session/row.tsx)

**Purpose.** A session in a list (the Agent Floor, a workspace's "Recently", a project's Sessions tab): what it is, whether it needs you, and where its work went, without opening it.

**Anatomy, in reading order.**

1. **Status dot**, 8 px, centred on the title's 22 px line (`mt-[7px]`), not on the row, so it stays put when the row grows a question line.
2. **The title line**, which is the cover link: the title (truncated), then at its end the last-moved time (`agoShort`, at least 32 px wide and right-aligned so times form a column) and the starter's 18 px avatar. Both sit inside the link (a click on them opens the session) but over the cover, so their tooltips show ("Last active …", "Started by {name}"). Ending the title's line with them gives the line below the row's whole width: on a phone, titles keep about a third more of their text.
3. **The question line**, only when its agent asks something: 12.5 px blue after a question bubble, on one line. A waiting question is the most urgent thing a row can say, so it gets a line of its own and the only color besides the dot.
4. **The facts line**, 12 px `ink-4`, with `aria-hidden` "·" between parts:
   - the workspace (14 px avatar, its name up to 160 px, "/"), only where the list mixes workspaces;
   - the reference in mono, `shop#231`, or `#231` in the project's own list;
   - a repeat icon when a schedule started it ("Started by the schedule {name}"), the ticket's key (`ENG-12` after Linear's mark) when a ticket did;
   - in a project's list, the branch;
   - the status reason, when it says more than the dot;
   - `+120 −14` (additions in `added`, deletions in `danger`, both at 80 %);
   - its pull requests, `fctl#120` after GitHub's state icon, with marks for checks and fctl's review while they say something the state doesn't.

**What it leaves out.** No status word (the dot and screen-reader text carry it); no "Waiting for a message" (`statusReason` returns nothing for a running session, or one that simply waits for you); no model, runner or description; no arrow. On a phone the workspace's name goes (its avatar stays and stops shrinking, so a long reason can't push it into the reference), and so do the counts and the pull requests, except in a project's list, where the shorter reference leaves room.

**Truncation.** Title and facts are one line each. The reference, marks and counts never shrink; the workspace name, branch and reason truncate. The pull request links keep `-m-1 p-1` inside their truncating span, so their focus rings aren't clipped.

**Order** (`lib/sessions.ts` `sections`).

- "Working now": every session that hasn't ended, newest *created* first, so rows keep their places while they work instead of jumping on every event.
- "Recently": ended in the last 24 h (`RECENT_MS`), the span in which `agoShort` reads in minutes and hours, by when they last moved.
- "Older": the rest, the same way.
- A session that appears in two lists counts once, as its newest summary has it (`updated_at`, which moves on every change), so one that ends or resumes moves at once.

**Accessibility.** The visible time and avatar are `aria-hidden`; an `sr-only` sentence after the link reads "Working. Started by {name}, last active 5 minutes ago." The question starts with an `sr-only` "Asks:". Pull request links have `aria-label`s and two-line titles ("hyperstructure/fctl#120: Fix the flaky login test", then its state and checks).

**Building one like it.** A dot; a cover-link title with the time and avatar lifted at its end; an optional colored line for what needs the reader; one muted facts line whose parts drop by priority on a phone; `sr-only` sentences for whatever shows only as icons. Use one row component for every list of the thing, so a new mark shows everywhere (an earlier, separate project list missed new marks).

## Status dots, pills and reasons (components/ui/misc.tsx, lib/status.ts)

| Status | Word | Dot | Pings |
|---|---|---|---|
| queued | Queued | `ink-3` | no |
| provisioning | Starting | `ink-2` | yes |
| preparing | Preparing | `ink-2` | yes |
| running | Working | `accent` | yes |
| idle | Waiting | `blue` | no |
| paused | Paused | `pink` | no |
| stopping | Stopping | `ink-3` | yes |
| stopped | Stopped | `ink-4` | no |
| failed | Failed | `danger` | no |

- `StatusDot` is 8 px. Live statuses add a halo of the same color at 60 % running `animate-ping` slowed to 2 s. Scaled to 75 % beside smaller text (sidebar lines, a project tile's corner, pull request rows).
- `StatusPill` is the dot and its word, 12.5 px medium, in the status's tone. It takes another `label` where the word would mislead (a review agent's session waits for nobody).
- `statusNotes` are the words beside a status, the most pressing first: reconnecting, the agent's work not coming through, the runner short of disk, when a paused session resumes, then the reason. Warnings in amber, danger in red; a phone shows only the first.
- `waitsForYou`: idle, and waiting for nothing else. An idle session whose agent waits on its own background work counts as working.
- Color is never alone: a dot comes with a word somewhere (a runner's row repeats its state after its name: "draining", "driver not ready"), in text or for screen readers.
- Trap: between a background task's end and the turn that takes up its result, a session reports idle "Waiting for a message" for a few milliseconds. Whatever reacts to a hand-over should let that state last (the session view waits 400 ms) before telling the reader it's their turn.

## Avatars, workspace avatars and project icons

**People** (`Avatar` and `AvatarStack` in components/ui/misc.tsx).

- Round. 18 px at a row's end, 20 in pull request rows, 22 in stacks, 24 by default, 28-30 in member lists, 44-64 in profiles.
- The uploaded picture shows only from the control plane's own avatar path or from another site: an address on the app's own origin would be fetched with the reader's cookies and act for everyone who sees it.
- Otherwise, or when the image fails to load: up to two initials (first and last name), semibold at 40 % of the size (at least 9 px), blackish on one of the four brand fills, picked by a hash of the user's id, so a person keeps their color everywhere.
- The `title` is the name, unless the caller says more ("Started by {name}").
- Stacks overlap by 6 px with `ring-2 ring-canvas` cutting each face out of the one under it; at most 4, then a `+N` chip (`bg-raised`, 10 px `ink-3`). The pull requests page shows at most 3, hidden on phones, with one tooltip naming everyone ("Started by {A}, {B} and {C}").

**Workspaces** (`WorkspaceAvatar`, components/workspace/avatar.tsx).

- A rounded square, since people are round: radius 24 % of its size (at least 4 px), and an inset 1 px `line-strong` hairline, so an ink square keeps its edge on the dark canvas and a white image on the light one.
- Its image, else up to two initials from the first two words ("Side project" → SP), in the display face at 38 % of the size for two letters and 48 % for one.
- Its color: one of the brand's four, theme-aware (yellow fills with the `highlight` token, the lime on light; ink fills with the theme's ink and writes in the canvas color), or a `#rrggbb` of its own, drawn exactly as chosen in both themes, as an image would be, with initials in whichever of blackish and whiteish has more contrast (`ownFill`).
- Sizes: 14 in rows, chips and pickers; 18 in a project's breadcrumb; 24-36 in notices and invitations; 60 in a workspace's header (48 on a phone); 72 in the new workspace form.

**Projects** (`ProjectIcon` and `ProjectMark`, components/project/project-icon.tsx, lib/project-icons.ts).

- A glyph from the IconMCP set (16-unit grid) in a style (outline, duotone, solid) and a color (ink, yellow, pink, blue, or one of its own).
- Alone (`size`), 13-16 px, in lines, pickers and the sidebar. As a tile (`tile`), the glyph at 60 % on a soft fill, its corners at 28 % (at least 5 px): 26 px in the folded sidebar, 34 in a workspace's project list, 38 in forms, 48 in a project's header, 52 in the picker's preview. `muted` draws an ended thing's icon in `ink-4`.
- Strokes are about 1.25 px at 16 px and grow by 0.03 px per pixel above that, so large icons don't look spindly.
- **Every project has a fitting icon before anyone picks one.** `suggestIcons` reads the name's words first (a table of patterns: "shop" → store, bag, cart; food words before software words, so a recipe app gets the chef's hat before the phone), then emoji in the description (🥕 → carrot), then the description's words, then icons named like the name's first word, then a generic one (cube, hexagon, layers…) picked by a hash of the id. Each word's best icon comes before any word's second. Unchosen icons draw in ink outline.
- **A color of its own stays readable.** `lib/color.ts` keeps its hue and moves only its OKLCH lightness, as little as it must, to stand 4.5:1 against each theme's hardest background (`#232323` on dark, about a hovered raised row, the lightest one icons sit on; `#fafafa` on light). The two shades travel as custom properties that the `pi-own` class picks between per theme (styles/app.css), so a theme switch needs no re-render. Draw icon colors through `iconPaint`, never from the color table directly; grayish colors get the hairline ink's tile has.
- **What this version doesn't know degrades instead of failing:** an unknown glyph becomes the fitting one in the chosen color and style, an unknown color draws as ink, an unknown style as outline. For an icon with a color of its own, the control plane also keeps the nearest workspace color, for older clients.
- `Glyph` is memoized: the picker draws about two hundred, and dragging a color through them shouldn't redraw them all (16.7 ms down to 7 ms per update).

## Choosing an icon and a color

### The icon picker (components/project/icon-picker.tsx)

**Purpose.** Choose a project's glyph, color and style while seeing it as the sidebar and the project's page will show it. Nothing changes until Save.

**Anatomy, top to bottom.**

- A wide `Dialog` (672 px), "Icon for Shop", described "It shows in the sidebar, on the project's page and in search, for everyone in Romanesco."
- A preview: the 52 px tile beside a mock sidebar row (16 px glyph, the name, its active count in accent), captioned "The icon that fits its name" or the icon's label.
- Beside it (under it on a phone, where they share a row without their names) two radio groups: Color (the four swatches and the custom-color swatch, 32 px, 30 on a phone) and Style (a segmented control).
- A search field: "Search icons: server, rocket, leaf…".
- The grid, a `listbox` of 40 px cells (46 on touch) in sections with sticky headings: "Fits Shop" (12 suggestions), then Build, Business and Life; a search shows one section, "14 icons".
- A caption naming the icon under the pointer or in focus with four of its tags (`aria-live="polite"`; hidden on touch, where the preview names it).
- A footer: "Icons from IconMCP, MIT licence.", "Use the one that fits" (when another is chosen), Cancel (hidden on a phone, where the dialog's × does it: three buttons don't fit a row), and Save with its `⌘↵` or `Ctrl↵` keycap (hidden on a phone, which has no keys).

**Behavior.**

- The keyboard does it all. Typing anywhere searches; Enter in the search picks the best match; ArrowDown enters the grid. Arrows move through a 2-D grid whose up and down cross into the next section at the same column (up from the first row returns to the search). Home and End; Enter or Space picks; ⌘/Ctrl+Enter saves from anywhere; Escape first clears a search, and only then closes. The focused cell is the only one in the tab order.
- Double-click picks and saves. Save is disabled until something changed, and is sent once even if two keys arrive in one tick.
- On a touch screen the search doesn't take the focus as the picker opens: the keyboard would cover the icons.
- Saving is optimistic (`useSaveIcon`): lists show the new icon at once and go back if the control plane refuses it.

**Fit.** The dialog is `fit`: a column no taller than the screen in which the grid gives up height first (`h-[min(44vh,340px)] min-h-28`, about two rows at least), so Save stays in view on a phone. Use `min-h-0 flex-auto` there, never `flex-1`: Safari 26 (WebKit bug 289876) takes `flex-1`'s 0 % basis for zero in a column as tall as its contents, which left the picker as a 50 px strip. Chromium and current Playwright WebKit don't show the bug, so they can't catch it.

**Empty search.** "No icon here is called “gardening”." Under it: "Try what it shows rather than what it means: a leaf rather than nature."

### The color popover (components/ui/color-popover.tsx)

**Purpose.** A color of one's own, for a project icon or a workspace, chosen in a small popover under the swatch that opens it. Its owner gets each change as it is made.

**Anatomy.**

- A saturation and brightness square: 144 px tall, 160 on touch, 112 on screens under 600 px tall, so the rest shows under it.
- A hue strip that looks 12 px tall and catches 24 (16 and 32 on touch), "taller than it looks, so that it's easy to catch".
- A hex field with a live chip, and an eyedropper button only where the browser has `EyeDropper`.
- A preview slot: the icon or avatar on each theme's background, with the reason it differs: "Darker in the light theme, to read on white", "A shade for each theme, to read on both", "As it is, in both themes".
- "In Romanesco": up to 12 colors of their own that other projects in the workspace use, most used first, each with a tooltip naming them, so things can be matched.
- 248 px wide (272 on touch), `bg-raised/95` with a backdrop blur; it opens with `listbox-in` (200 ms) and closes with `listbox-out` (140 ms).

**Behavior.**

- Placed under its swatch (over it where there's more room above) and kept inside the dialog it is in, 24 px from its edge; it follows the viewport as it scrolls. It is in the top layer (`popover="manual"`), so it shows over the dialog.
- It closes on Escape, on Enter in the hex field, on a press outside, or when the focus leaves it, and it tells its owner what the outside press landed on, so a press on another swatch can choose that one instead.
- Escape closes the popover, not the dialog under it: the popover has `tabIndex={-1}`, so a press on its padding keeps the focus inside, and its own Escape handler calls `preventDefault`.
- Opened from the keyboard, the hex field takes the focus; opened by pointer, nothing moves. The swatch tells them apart by `event.detail` (0 for Enter and Space).
- The square and the strip are `role="slider"` with an `aria-valuetext` that names the color in words ("dark teal: saturation 62%, brightness 40%"). Arrows step 1 % (Shift 10 %), the hue 1° (Shift 10°), with Home and End.
- The hex field keeps only hex digits (so a pasted `#FF8800` or `ff 88 00` reads as one color), applies six digits as they are typed and three once done, and goes back to the color it was when what's typed isn't one. Hex shows in capitals, as design tools show it.

### A workspace's color (components/workspace/color-field.tsx, routes/new-workspace.tsx)

- In a workspace's settings: a fieldset "Color" with the four brand colors as 26 px avatars of the workspace in each color (a 2 px accent ring on the chosen one, a hairline on hover), then the custom swatch: a hue wheel until there's a color of its own, then the avatar in it with a small wheel at its corner that turns 90° on hover (200 ms, `--ease-spring`).
- Brand colors save as they are clicked. A color of its own saves once, as the popover closes, while avatars elsewhere on the page preview it as it is dragged. Saves queue one after another, so the last color chosen is the one kept; a failure toasts. A brand color pressed while the popover is open wins over the dragged one; a color of its own the workspace had comes back in one press.
- With an uploaded image: "Its image shows instead, until you use its initials again."
- In the new workspace form the colors are pills, each with a 20 px preview showing the real initials and its name (Yellow, Pink, Blue, Ink, Custom), `aria-pressed`, the chosen one with an `accent/50` border, the `accent-soft` fill and a 3 px `accent-soft` ring. It starts on a color the person's other workspaces don't have.

**Building one like it.** Preview the result in context and in both themes before anything is saved; let the keyboard do everything; put a popover that sits inside a dialog in the top layer, with its own focus and its own Escape; offer the colors others in the same space already use; save brand choices at once and free-form ones on close.

## Narrowing, ordering and counting

- **Chips** (the Agent Floor's workspace filter, routes/home.tsx).
  - Only with two or more workspaces. Pill buttons 28 px tall, 12.5 px: "All workspaces", then each workspace with its 14 px avatar, each followed by its number of active sessions (11 px `ink-4`, only above zero).
  - The chosen chip is `bg-raised` with a `line-strong` border and an inset hairline; the others are `ink-3` and fill with `hover`. `aria-pressed`, in a fieldset labelled "Show the work of".
  - One line that scrolls sideways (`-mx-6 px-6`, scrollbar hidden) rather than wrapping. Workspaces closed to the person (two-factor required) aren't offered.
  - It sits up in the gap above the lists and narrows both "Working now" and "Recently". It also moves the task box: choosing a workspace puts the box in that workspace's first project where the person may start sessions, in their own order, even from another of its projects; a project picked afterwards stays until another workspace is chosen, and nothing moves while a session is starting.
- **Segment pills** (a project's sessions, memory, retrospectives): round, `px-3 py-1`, 12.5 px, a count in `ink-4` where it helps ("Current 42", "Stale 3"). The chosen one is `bg-raised` with an inset hairline (which keeps a white pill readable in the light theme) and `aria-pressed`.
- **Tabs with counts** (the pull requests page).
  - A `role="tablist"` of Open, Merged and Closed, each with its count in a small pill (11 px; `bg-hover` on the chosen tab, `ink-4` on the others). While loading, a pulsing 20 px placeholder holds the count's place.
  - A 2 px accent underline slides to the chosen tab, inset 8 px each side, over 300 ms `--ease-out` (`motion-reduce:transition-none`), measured again when the counts change the tabs' widths.
  - Arrows, Home and End move between tabs, with a roving `tabIndex`. The counts are of what the text filter finds, so they say where the rest of a search is.
- **Page tabs** (a project's, a workspace's and the admin page; `components/page-tabs.tsx`).
  - Links, not buttons: each tab is an address (`?tab=memory`); the default tab has none, so the page's address stays clean.
  - 13.5 px, `ink-3` turning `ink` on hover, 10 px either side; the open one `ink` over a 2 px accent bar inset 6 px. Each tab draws its own bar; the page cross-fades rather than the bar sliding.
  - Each tab leads with a 16 px icon, 6 px before its label, drawn as the rest of the app draws what the tab holds: `ink-4`, `ink-3` under the pointer, in the accent on the open tab, as its bar is. A tab whose icon says how something is (a project's Autopilot) keeps its own color. Linear's filled mark draws at 85 %, so it weighs as much as the outlined icons. A project's are listed under its page below. A workspace's: folders for Projects (a new project is a folder with a plus), people for People, the chip runners are for Runners, GitHub's and Linear's marks, the sidebar's gear for Settings, a clock turning back for Audit log. The admin page's: people, the grid Settings draws workspaces with for Workspaces, GitHub's mark, the chip for Runners, an open door for Access (who gets in), the inbox requests land in for Early access, the gear, the clock.
  - A count on a tab (a workspace's runners waiting for approval, the admin page's early-access requests, a project's autopilot's asks) is a 16 px pill after the label, read by its meaning ("2 waiting for approval"), not as a bare number.
  - On a phone the strip scrolls sideways to the screen's edges (`-mx-6 px-6 overflow-x-auto`, scrollbar hidden, the inner row `w-max min-w-full`, so the bottom line spans the page either way), and the open tab scrolls into view as the page opens; the page itself doesn't move.
  - Tabs the person can't use aren't shown; asking for one by address shows the page's default tab.
  - The open tab says so (`aria-current="page"`, set by the page, with `activeOptions.exact`), and its bar turns `CanvasText` under forced colors. Gap, on a workspace's page: tabs that wait on data (its Audit log and Linear) appear late and shift the strip.
- **A text filter.**
  - A 28 px field after a search icon, `bg-sunken/60`, a `border-line` that darkens on focus. The placeholder says what it searches ("Filter by title, repo or #"). A `/` keycap shows until there's text (hidden where there's no hover), then a clear ×.
  - `/` focuses it from anywhere; Escape clears and leaves it; ArrowDown goes to the first row.
  - Every word must match somewhere (title, reference, link, sessions, who started them, what their agents ask), and the matches are marked in the rows with `<mark>` (`bg-highlight/30`, 3 px corners).
- **Mine.** A toggle beside the filter, `aria-pressed`, `accent-soft` when on, titled "Only those of sessions you started". On the pull requests page it starts on and stays as the person leaves it (localStorage `fctl:pulls-mine`, which drives the sidebar's count too); where the browser can store nothing, the page still toggles for its lifetime.
- **Scope pickers.** A `Select` of "All projects", then each workspace as a section ("All of Romanesco", then its projects with their icons), reading "Romanesco / Shop" in the trigger and "Shop" on a phone (`narrow="fit"`).
- **Order by what is needed next, not by date alone.** The pull requests page groups open ones by need: waiting for your answer, ready for review, checks failing, agents at work, in a merge queue, drafts. Merged and closed ones go in Today, Yesterday, This week and Earlier. Moving things (sessions at work) keep stable places; finished ones sort by when they last moved, matching the time each row shows.
- **What persists where.**
  - A view's tab and filter go in the address, with `replace: true` so the back button isn't flooded.
  - A page reached from elsewhere (the sidebar, ⌘K) without them reopens as it was left in this browser tab (sessionStorage `fctl:pulls-left`); a new window starts plain.
  - Personal preferences (Mine, the task box's last project `fctl:last-target`) go in localStorage. Every new localStorage key needs a line in fctl.sh's privacy policy, which lists what the app keeps in the browser.

## Loading, empty, error, partial and live

- **Skeletons keep the shape.** `Skeleton` is a `rounded-md` bar whose gradient (`raised` → `line-strong` → `raised`) sweeps every 2.2 s. Lists show two bars of about a row's height (40 px for sessions, 44 for a project's sessions and repositories, 48 for projects, 64 for notes, 112 for retrospectives). The pull requests page draws four rows with the real row's places (a round icon, a title bar alternating 60 % and 40 % wide, a shorter second line, an avatar dot hidden on phones, a time), so nothing jumps as the list comes. Headers skeleton their title (320 × 40) and facts line. A loading list must never show its empty copy (access tokens do: a gap).
- **Empty states explain and offer the next step.** `Empty` (components/ui/feedback.tsx): an optional 24-28 px icon in `ink-4`, a 20 px display title, a 14 px body at most 448 px wide, an action 24 px below, 64 px of padding top and bottom, rising in.
  - Titles name what isn't there: "No projects yet", "No notes yet", "No open pull requests", "Nothing merged yet".
  - Bodies say how things will appear: "Agents open pull requests as they finish their work. They show here, with their checks and what each needs next."
  - Actions go only to those who can act; others are told who can: "Its admins create its projects, and add you to the ones you work in." Never "you don't have permission".
- **Empty because narrowed.** Say what narrows it and where the rest is: "None here", then a sentence built from the narrowing ("Nothing open from your sessions in Shop matches “safari”."), buttons to the other tabs that have results ("See 3 merged") and "Clear the filter".
- **An empty section on a page that has content** is one line between two hairlines, not a big empty state: "No agents are working. Give one a task above." Sections with nothing in them otherwise disappear ("Recently", "Older").
- **Errors.**
  - Nothing loaded: an error `Banner` ("The pull requests didn't load: …") with "Try again".
  - A refresh failed after something loaded: keep the list and say so above it, in a quiet line after a red icon: "This list didn't refresh: … Try again".
  - A page whose object can't be read: one sentence for both cases, so it doesn't reveal which: "This project does not exist, or you cannot see it."
  - Gap: several tabs show a failed load as an empty list (a project's sessions, repositories, memory, members; a workspace's people and GitHub). Copy the pull requests page instead.
- **Limits are stated.** When a list is capped, a centred 12.5 px line under it says how and what to do: "From the newest 200 sessions with pull requests. Narrow it to a project for older ones." Silent caps (a project's 50 active and 100 ended sessions, a new project's first 60 repositories) are gaps.
- **Folding long lists.**
  - Show the newest few and put the rest a click away, rather than scrolling a list inside a pane that scrolls (a scroll inside a scroll traps the wheel and the finger). The session page's rail lists six turns and folds the rest behind "Show 12 earlier turns", but only when more than two would fold (hiding one or two saves nothing), and the turn the reader is in always shows.
  - Longer histories page with an "Older" ghost button (20 retrospectives, 30 reviews, 100 audit entries a page, by `next_before`) or "Show all"/"Show less".
  - The transcript loads earlier activity by itself when its button comes within 400 px of the view (`lib/load-in-view.ts`), keeps the button to show progress, and after a failure waits for the reader to scroll away and back rather than retrying as fast as it fails.
- **Live changes show for a moment.** On the pull requests page, a row whose standing changes (its tab, need, checks or review) as the feed reports it fills with `accent-soft` and fades over 2 s (`animate-row-moved`, off under reduced motion). Not when the list first loads, nor when the page asks for another list; all lit rows go dark together 2 s after the last change, whatever else arrives meanwhile. A note a link points to (`#note-<id>`) scrolls to the centre and lights for 2.2 s.
- **Banners and toasts.**
  - `Banner` tones: info (blue), warn (amber), error (red, `role="alert"`), ok (accent); 13.5 px after an icon; long names wrap anywhere. Instance limits and missing setup are amber or blue, never red.
  - Toasts stack at the bottom right, at most four, 3.2 s (6 s for errors), with a colored dot and a dismiss ×, in an `aria-live="polite"` region. They say what now follows: "Added: agents start with it", "Saved: sessions take it when they next start or resume".

## Forms and controls

- **Field** (components/ui/form.tsx). A 12.5 px medium `ink-2` label over the control, an optional `action` at the label's right ("Use fctl's rules"), and under the control a 12.5 px `ink-3` hint that an error replaces while there is one (12.5 px red, `role="alert"`, rising in), so the field doesn't grow. Both wrap anywhere, so a long address can't widen a phone.
- **Controls that go with a field sit in its row.** Selects and buttons that belong to an Input go inside the Field's `children`; beside the Field they would line up with its label or its hint. Fields side by side align by their labels (`items-start`), so a hint or an error under one moves nothing. Earlier forms aligned to the bottom and pushed the Select and button out of line under a wrapping hint.
- **One height.** `fieldHeight` is 38 px (`h-9.5`), shared by Inputs, `md` Selects and `size="field"` Buttons. Other buttons: `sm` 28 px (rows, toolbars, notices), `md` 34, `lg` 44 (a create page's submit).
- **Buttons.** `primary` is the highlight fill (yellow on dark, lime on light) with ink text, one per form; `secondary` is raised with a strong border; `ghost`, `quiet`; `danger` is red-tinted. All press in to 97 % over 150 ms; `loading` swaps the icon for a spinner and disables. `IconButton` is 32 px with its label as `aria-label` and `title`. Emphasis follows what still needs doing: "Add a passkey" is primary until there is one, then "Add another passkey" is secondary.
- **Inputs.** `bg-sunken/60` with a `line-strong` border; on focus the border turns accent and a 3 px `accent-soft` ring appears; `aria-invalid` turns them red. `SecretInput` masks a text field rather than being a password field, since browsers fill saved passwords into password fields whatever `autocomplete` says, and offer to save what's typed there. Textareas grow with their content (2 to 14 rows by default).
- **Select, never a native select** (components/ui/select.tsx).
  - Its list opens in the top layer, so it shows over dialogs and outside anything that clips.
  - Motion: the list grows from the trigger (200 ms); options settle in one after another (18 ms apart, at most seven staggered); a highlight glides after the pointer and the arrows; the picked option flashes for 160 ms, as macOS menus do; the new value rolls into the trigger.
  - Typing an option's first letters jumps to it (letters within 700 ms make one search).
  - Options can have icons, a quieter second line, sections with labels and a `short` label for a phone (`narrow="fit"` makes the trigger as wide as its value there). `sm` is 28 px, for rows and toolbars.
  - A choice that has ended stays named rather than showing an id ("{name} (reconnect it)", "A connection you removed"); a prefix in a busy row reads in sentence case ("Claude: your default ({name})").
- **Switch.** 20 × 36 px; on, the highlight fill, with the 14 px knob springing across (250 ms `--ease-spring`, the track 200 ms). Its row puts the label in the person's voice ("Follow the sessions I start or resume") and a hint that says what the current state does, starting "Off:" when off ("Off: you follow only the sessions you choose."). In a project's settings (`SwitchRow`, components/settings/form.tsx) the words are a `<label>`, so tapping them turns it, and the hint describes it (`aria-describedby`). Gaps: Settings' own switch rows have neither, and 20 × 36 px is small for a finger.
- **Buttons in forms.** `Button` sets no `type`: any button in a `<form>` that isn't its submit needs `type="button"` (two buttons in a settings form once saved it). A disabled button over a stretched link keeps its pointer events (`disabled:cursor-default` with `enabled:hover:` fills): with `disabled:pointer-events-none`, a click fell through to the link and navigated. Don't wrap a `Button` in a `Link`: that's two tab stops for one action; style the link with `buttonClass` instead.
- **Save in the way that matches the risk.**
  - Brand colors, switches and per-row Selects save as they change, optimistically only where a refetch can roll back, with a toast that says what follows.
  - Text saves on an explicit submit whose button stays disabled until something changed.
  - Inline renames (passkeys, the authenticator app) save on Enter or blur and cancel on Escape, behind a pencil that fades in on hover or focus and always shows on touch ("Touch screens have no hover to show it on").
  - A page of settings that saves with a button shows a save bar at the bottom of the screen only once something changed, with what saving does, Cancel and Save, above the iOS keyboard, and asks before someone leaves it with changes unsaved ("Discard your changes?"): a project's settings pages (components/settings/form.tsx).
- **Where errors land.** Under the Field the control plane's error names (`ApiFailure.field`); a client-side check throws the same shape, so it lands in the same place. An error without a field goes in a banner by the form's buttons. A row's action reports in a toast. Gaps: an error naming a field the form isn't showing appears nowhere, and mutations without `onError` fail silently (there is no global handler).
- **Confirm only what loses something, and say what stays.**
  - Deleting a note, a retrospective, a schedule, a project, a workspace or an account; leaving a workspace; removing a member; taking over someone's subscription: a dialog whose title asks a question naming the thing ("Delete Shop?", "Leave Romanesco?"), whose body lists the consequences and what isn't touched ("The repository acme/shop on GitHub is not touched.", "Its admins can invite you again."), and whose confirm button repeats the title's verb.
  - The heaviest ask to type the slug, the name or the address ("Type shop to confirm"), with the confirm button disabled until it matches. Compare forgivingly (trimmed, and without case for an address), as the server does: the web asking for an exact-case workspace name the server doesn't need is a gap.
  - Reversible actions go straight through with a toast ("Current again: agents start with it"); a reversible "Turn off" is a primary button, not a danger one.
  - Some irreversible actions still act without a dialog (removing a secret, a member from a project, a Claude connection; revoking a device or a token). Nothing records that as a decision: treat them as open questions, not precedent.
  - A request the control plane answers with "verification required" opens one shared "Confirm it's you" dialog and is sent again once confirmed, so pages carry no code for it; downloads and links, which can't be sent again, confirm first.
- **Danger zone** (components/ui/danger-zone.tsx). Last on its page and only for those who may act: an 18 px-cornered `danger/30` border, 24 px padding, "Danger zone" in red 14 px semibold, then under a `danger/20` hairline what the action does (13.5 px medium title, 13 px `ink-3` description at most 576 px wide) and one `danger` button, beside it from 640 px and under it on a phone. A trailing "…" ("Delete project…") says a dialog follows.
- **Dialogs** (components/ui/overlay.tsx). The native `<dialog>` (focus trap and Escape for free), 448 px or 672 px (`wide`), 18 px corners, a 22 px display title, a 13.5 px description, a × top right; the backdrop dims to 45 % black with a 3 px blur; it rises in. It focuses itself as it opens rather than its first button (browsers ring what a dialog focuses, even after a click) and mounts its content only once open, so `autoFocus` inside works. Buttons sit right-aligned, ghost "Cancel" first. Wrap close and cancel handlers in `own()` (`lib/dialog.ts`): React 19 passes a nested dialog's close events up to the dialogs around it.
- **Menus.** The ⋯ menus are at least 192 px, `bg-raised/95` with a blur, items 13 px (taller on touch: `pointer-coarse:py-2.5`), a danger item in red with a `danger-soft` hover, separators as hairlines. They open upward (`side="top"`) where the trigger is near the window's bottom or inside rows that isolate their stacking.

## The Agent Floor (routes/home.tsx, components/session/task-box.tsx)

**Purpose.** The home page: see every agent at work, start the next one, and deal with what needs you, in that order.

**The hero.**

- 360 px tall (272 on a phone, so the task box and the sessions start higher), a WebGL foundry scene in which each active session is a thread of light, colored by status (working, waiting, paused, failed), pulsing as its events arrive, following the pointer, and fading into the canvas at the bottom, with no line under it.
- Over it, in the page column, a greeting by the time of day ("Working late", "Good morning", "Good afternoon", "Good evening", then the name the person chose for agents to call them), and 80 ms after it one summary line: "3 agents are working · 1 waiting for you", or "2 sessions are waiting for you", or "All quiet. Start something.", then in `ink-4` " · in 2 workspaces · 4 runners online, 1 draining, 1 low on disk". The working count is in accent; a session whose agent waits on its own background work counts as working.

**The task box.**

- Pulled 24 px up over the hero's edge: a 16 px-cornered form on `bg-surface/85` with a backdrop blur and a shadow that deepens on focus; its border turns accent while files are dragged over it.
- A 2-8 row textarea in the display face at 18 px, labelled "Task for a new session", with a placeholder picked at random as the page opens: some plain ("What needs doing?"), some playful ("Delegate the boring part"), some with the time of day ("What should we ship this evening?").
- One row of controls under it:
  - attach;
  - "in" and the project `Select`, labelled "Workspace / Project" only when the person has several workspaces, grouped in sections by workspace with their avatars, each project with its repositories as a mono second line whose name truncates before its "+2" count;
  - the model, effort and GitHub access pickers;
  - the hint "⌘+Enter" (or "Ctrl+Enter"), shown from 640 to 1023 px and from 1280, where the row has room;
  - a Schedule icon button, from 1280 px only, where it can't push Start onto a line of its own;
  - Start: a 36 px ink pill whose label rises away into "Starting" and a spinner while the button eases to its new width; a circle around an arrow on a phone.
- Under the box, a line when the chosen project's workspace has no runner online, and 12 px further down the plan usage strip: "Claude plan" and each limit as a 40-56 px meter with its percent, amber then red as it fills, with a sentence when a limit is close or used up ("Your weekly limit is used up. Sessions you start now pause until it resets tomorrow at 9:00 AM."). The strip links to Settings → Claude.

**Below it, 48 px apart, the most binding first.**

- Invitations: accent-tinted cards ("{name} invited you to Romanesco", "As {address}, a member · 2 hours ago", Decline and "Join Romanesco"). Where the workspace requires two-factor sign-in, Join is disabled and the line says "it requires two-factor sign-in: set it up to join".
- Workspaces closed until two-factor is set up: an amber card with "Set it up".
- Runners waiting for approval, then a runner update.
- "You aren't in a workspace yet" (or "Join a workspace to start" when invited) with "Create a workspace"; otherwise the set-up checklist.
- The checklist, "Set up your factory" ("A few steps, and agents start working for you."): four steps between hairlines, each a 24 px circle (a lime check when done), a title, a sentence and a small action. Done steps strike through in `ink-3` and lose their text and action; the section disappears once all four are done. Steps the person can't take say who can instead of offering a button: "A workspace admin adds a runner: a machine that runs its agents' sessions."
- The lists: the workspace chips, then "Working now" with "3 active" at the right (up to 50 sessions), then "Recently" (the 12 latest ended ones, only when there are any). Each row shows its workspace only when the person has several and the chips show them all. Empty: "No agents are working. Give one a task above." or "No agents are working in Romanesco."

**Behavior.**

- The task box takes the focus as the page opens, so a task can be typed at once, but not on a touch screen (it would raise the keyboard over the page) nor while the person types in another field. ⌘K's "Agent Floor" focuses it too; Escape leaves it, so the page's single-key shortcuts work again; on a Mac, ⌘← and ⌘→ go back and forward from it while it's empty, as they would anywhere else on the page.
- The draft (text, files, picked choices) stays in this browser, per person, until a session starts with it; the dialog that N opens anywhere is the same box with the same draft.
- The project it starts in is, in order: the draft's own, the page's project, the last one picked (`fctl:last-target`), then the first the person may start sessions in (not as a viewer, not in a workspace closed to them).
- Pasting or dropping files attaches them. A second click or ⌘↵ can't start a session twice.

**Responsive.**

- The controls row wraps on a computer but never on a phone: there the project's and the model's names truncate, never the symbols or Start. The project picker's flex basis is 0, so its widest option can't push Start (whose "Starting" is wider) onto a new line.
- Invitation cards use a container query: under 576 px of their own width, Decline and Join go under the text and Join takes the rest of the line, 36 px tall for a finger; beside the text, Join may take at most half the card, and its long name truncates first. Without the query, a `flex-wrap` row with a `min-w-0 flex-1` text squeezed the text to a letter a line instead of wrapping the buttons.

## The pull requests page (routes/pulls.tsx, lib/pull-list.ts, lib/pulls-view.ts)

**Purpose.** Every pull request agents opened in the person's projects, each once, sorted by what it needs next, so the next thing to do is at the top. States, checks and reviews change live as GitHub reports them.

**What it lists.** Every session that lists a pull request (200 at most, archived ones and those of schedules that hide their sessions included, since neither closes the pull request), merged into one entry per pull request as the session that heard of it last has it. The tabs' counts and the sidebar's count read the same query, so they agree.

**Anatomy.**

- The header: "Pull requests", and "What agents opened in your projects, sorted by what each needs next. Their states and checks change here as GitHub reports them." (naming the workspace or project when narrowed).
- A toolbar on a hairline: the state tabs at the left; the filter, the scope Select and Mine at the right (full width under the tabs on a phone). From 768 px it is sticky at the top on `bg-canvas/85` with a blur, so tabs and filter are at hand anywhere in a long list.
- Sections, each a 13 px heading with an icon for its need, a count pill and a hint (hidden on phones): "Waiting for your answer · Their agents asked something, and wait", "Ready for review · Their agents finished, and nothing failed", "Checks failing · What the agent pushed last didn't pass", "Agents at work", "In a merge queue", "Drafts". When no open pull request needs a person, one line says so above the rest: "Nothing waits for an answer or a review: agents are still at work on these."
- From 768 px, a keyboard legend at the foot of the page.

**The row.**

- One link that opens the newest session listing it (the link is the row here: `hover/40` on hover, `hover/60` and a 1.5 px inset accent ring on focus), and beside it a 28 px arrow button that opens the pull request on GitHub.
- Inside: GitHub's state icon (16 px); the title (the pull request's, else the session's); a facts line that wraps:
  - `acme/shop#12` in mono;
  - the project's icon, its session's status dot and `shop#231` ("and 2 more" when several sessions list it);
  - "Archived" when its session was archived ("The pull request stays here until it's merged or closed.");
  - its checks ("2 of 5 checks pending", with a 32 × 3 px bar of passed and failed while they run);
  - fctl's review in a few words after an eye: "Reviewing" (a reading eye), "Reviewed, no issues" (green), "Review found 3 issues" (blue), "Review waits for a runner";
  - its size, `+120 −14`, with the files in the tooltip.
- At the end: up to three starters' faces and the time (Updated, Merged or Closed in its tooltip, by tab).
- On a phone the dots between facts go and gaps separate them; the review, the size and the faces are hidden.

**Answering from the list.** When a session's agent asks something, the row carries its question in a blue-tinted card under it (three lines at most, its time at the right), with the answers the agent offers as pill buttons that send the answer as the reply ("Sent to shop#231: the agent reads it at its next step"), and "Answer otherwise" (or "Answer in the session"). Someone who can't message the agent gets no answer buttons and "Open the session". Answered, the row moves on as the feed reports it.

**Keyboard.** `j` and `k` (or the arrows) move through the rows and repeat when held; Enter opens the session; `o` opens the pull request on GitHub; `c` copies its link ("Copied the link to acme/shop#12"); `/` filters. The arrows only move within the list once a row has the focus, so they scroll the page everywhere else. Tabs take the arrows, Home and End.

**Persistence.** The tab, the filter and the scope are in the address; reached from elsewhere without them, the page shows the tab and filter it showed last in this browser tab; Mine lasts until changed.

## A project's page (routes/project.tsx, components/project/*)

**Header.**

- The workspace as a breadcrumb link (18 px avatar and name, 13 px `ink-3`).
- The 48 px icon tile beside the 38 px name, which wraps anywhere, so a name without spaces can't widen a phone.
- The description (15 px `ink-3`, 672 px max).
- A facts line (12.5 px `ink-3`, wrapping): the primary repository in mono as a GitHub link, then "+2 more" to the Repositories tab (or "No repository"); the default branch after a branch icon; "42 sessions · 3 active", the active count in accent.
- For owners and maintainers the tile is a button ("Change Shop's icon") that grows 4 % on hover and shows a 20 px pencil badge on hover or keyboard focus (never on touch, where the tile still opens the picker). Toasts: "Shop has its icon", "Shop shows the icon that fits it".
- Loading: a 320 × 40 title bar and a shorter line under it. Unreadable: one error banner, "This project does not exist, or you cannot see it."

**Tabs.** Sessions (the default), Autopilot (where the workspace lets projects have one), Schedules, Reviews, Memory, Repositories, Members and Settings: what agents do in the project, what and who it has, then how it's set up. It had ten (Tickets, Retrospectives and Secrets were tabs too), which read as cramped, a lot of options in one row, and ran off the right edge of a computer's screen, so that Secrets was out of sight. Tickets and Secrets are pages of Settings, and Memory holds the retrospectives beside the notes. Each tab takes 10 px either side (all page tabs do), so that all eight, Autopilot's count included, fit the 872 px of a project's column; beside an open sidebar, below about a 1,200 px window, the strip scrolls.

- Each tab leads with a 16 px icon, 6 px before its label, drawn as the rest of the app draws what the tab holds: the Agent Floor's mark for Sessions, the autopilot's own mark, the Schedule button's calendar clock for Schedules, an eye in a scan frame for Reviews (the app's sign for a review), the bookmark of kept notes for Memory, a folder with a branch for Repositories, people for Members, the sidebar's gear for Settings. Icons are `ink-4`, `ink-3` under the pointer, and in the accent on the open tab, as its underline is. The autopilot's mark keeps saying how it is: pink while paused, `ink` with its comet while it works. Settings' General page takes sliders rather than a second gear right under the tab's.
- Everyone sees every tab; Repositories and Members are read-only below maintainer. Settings shows each person the pages they may read (below).
- Each value of `?tab=` is a tab or a page under one (`lib/project-page.ts`): `retrospectives` is Memory's second part, `tickets`, `secrets` and the other pages' names are Settings' pages, so the old addresses (a GitHub comment's "Review agent settings", Linear's way back to `?tab=tickets&linear=…`, a note's `?tab=memory#note-…`) land where their page is now. An unknown value opens Sessions; a page of Settings someone can't see opens Settings.
- The open tab is underlined for its page's pages too, and says so (`aria-current`): TanStack's `Link` matches search partly, so the tabs match their address exactly (`activeOptions.exact`), or Sessions, with no `?tab=`, would read as open on every tab. Where the tabs don't fit (phones), the open one scrolls into view sideways as the page opens; the page itself doesn't move. The underline turns `CanvasText` under forced colors.
- Known gap: only the start form, Tickets, Memory's parts, Repositories, Members and Settings' pages are keyed by the project's id, so Schedules and Reviews carry local state into the next project when only the slug changes (TanStack Router keeps the component mounted).

**Sessions.**

- The project's own task box first, for anyone but viewers: the Agent Floor's anatomy at 17 px, with a placeholder naming the project ("What's broken in Shop?"), a Schedule button that hands the task to the Schedules tab, and "Start a session". Its draft is kept per person and project (`fctl:draft:<user>:<project>`, its files in IndexedDB, since localStorage holds only a few megabytes). It doesn't take the focus as the page opens; N focuses it. A file dropped anywhere on the page lands in it, so a near miss never opens the file in the tab.
- Then All, Active and Mine, and the sections: "Working now" always (with "3 active"; when empty, "No agents are working.", plus " Give one a task above." only for those who can), "Recently" and "Older" only when they have rows.
- Up to 50 active and 100 ended sessions; the active ones come from the same request the sidebar makes for the project. Rows are session rows with `inProject`: `#231` and the branch instead of `shop#231`, pull requests kept on phones.
- Empty: "No sessions yet", "Describe a task above and an agent starts on it in a fresh sandbox." (shown to viewers and under Mine too: a copy gap).

**Memory** (what agents know, and what they did): two parts, the notes (`?tab=memory`) and the retrospectives (`?tab=retrospectives`), one at a time behind a segmented switch at the top: a 34 px `sunken` track with an inset hairline, each part a link with its 14 px icon (a bookmark, a scroll), the open one `raised` with a soft shadow and its icon in the accent. Two lists that each scroll for hundreds of entries, filter and page don't stack well on one page, and counts in the switch would repeat the pills under it. A part opens with what it holds; off, its banner says so, and for the project's owners and maintainers ends in words that turn it on there and then ("Turn it on", "Turning it on…", then the toast "Memory on: sessions that start from now on keep it"), rather than sending them to Settings.

*Notes* (kept for the agents after them):

- An intro; the banner when memory is off ("Its maintainers can turn it on." for others); a composer for editors ("Add a note for this project's agents: a command that works, a trap to avoid, a decision…", "Markdown · one fact per note", turning into "{n} characters left" under 200, red below 0; 2,000 characters counted as code points).
- A toolbar: pills "Current 42" and "Stale 3", a spacer, and "Find a note" (256 px from 640 px, full width on its own line on a phone). It also finds a note by its `mem_…` id pasted from a transcript.
- Each note is a hairline-separated item: its Markdown (stale ones in `ink-3`); a meta line (16 px avatar, "{name}'s agent in #231 {title cut to 60}", the time, "edited by {name}"); for a stale note a sunken box ("Stale since 2 days ago, marked by …: {reason}", or a button "a newer note takes its place" that switches the view and lights that note); a ⋯ menu (Edit, Mark stale…, Copy text, Delete…). Editing happens in place.
- Empty: "No notes yet", "As this project's agents learn what its repository doesn't say, they note it here for the agents after them. You can add one too." Empty views: "No note has those words.", "No stale notes. Agents mark a note stale when it turns out wrong or out of date."

*Retrospectives* (one per finished piece of work):

- Pills "All 31" and one per outcome with its icon and count; pressing the active one again clears it.
- Each entry: the outcome icon (completed in accent, partial in blue, blocked in pink; the label beside it carries the meaning), the label, `#231` and the session's title as a link, the starter's avatar, the time ("Updated 2 hours ago"), and a ⋯ menu for those who may delete. On a phone the title takes a line of its own and the time moves beside the outcome.
- Then a description list of the parts that say something (Worked on, Approach, Challenges, Insights), labels in a 92 px column beside the text from 640 px and above it on a phone. Under Insights, "Remember for later agents" opens a dialog with the insight prefilled.
- Pages of 20 behind "Older"; skeletons in the page's shape (a pill bar, two 112 px blocks).

**Settings** (components/project/settings.tsx, lib/project-page.ts). It was one long form of five sections (project, agents, pull requests, memory, sandbox) under a single Save, with Tickets and Secrets as tabs of their own. It is now six pages in three groups, laid out as personal Settings is, with the same lists (components/settings/nav.tsx):

- **The project:** General (name, description, icon, default branch, and for owners the danger zone).
- **How its agents work:** Agents (instructions; Model: model and effort; Access: agents on GitHub, claude.ai connectors, Remote Control; Memory: project memory, retrospectives), Pull requests (opening one when done, descriptions, the rules for pull requests and issues; Commits: who they credit; Screenshots; Follow-ups), Tickets.
- **Where they run:** Sandbox (setup script and package caches; Image; Size; Idle sessions; Environment), Secrets.
- Owners and maintainers see all six; everyone else in the project reads Tickets, where they link their Linear account. With one page to see, Settings is that page alone: no list, no way back.

**One container query decides the layout**, as in Settings: from 672 px of the tab's own width, the list of pages (180 px, 40 px gap) beside the page open, and Settings itself (`?tab=settings`) shows the first page the person sees; below it, `?tab=settings` is the list alone and a page shows alone under "‹ Settings". The list's highlight slides from page to page as Settings' does (the same view-transition name: the two are never on screen together). On a phone the list is inset cards whose rows say what each page holds now: "Sessions start from main", "Opus · high effort", "Opened when done · 4 follow-ups", "Linear · SHOP", "Each runner's own image", "2 secrets"; a count still loading leaves the name alone.

**A page.** `SectionLayout` "subpage": the page's h2 at 22 px display under the project's own header (it doesn't grow on a phone, as Settings' does where it heads the screen), one sentence under it, then what the page starts with and its parts as 15 px semibold h3s, 56 px apart. Switches sit in flush hairline lists, each row a `<label>` around the name (13.5 px) and what it does (12.5 px `ink-4`), so a press on the words turns it too, and the words describe the switch (`aria-describedby`); the switch keeps to the first line. Fields appear only when they apply ("Model ID", the image reference or the file to build from, how long screenshot links work).

**Saving.** Each page that edits saves on its own, and only what it edits, merged into the project's settings as they are now, since a `PATCH` replaces all of them. Its draft holds what it shows; empty text counts as nothing typed, and Environment lines that set the same variables (a blank line, a comment) are no change. Once something changed, the save bar rises at the bottom of the screen (shared with Tickets: `ui/save-bar.tsx`) with what saving does ("Sessions that start from now on take it.", "Follow-ups change at once, for pull requests agents opened already too.", "Sessions that start from now on start from develop."), Cancel and Save; Enter in a field saves too. Leaving a page with changes unsaved, for another page, tab or anywhere in the app, asks first: "Discard your changes?", "Your changes to Agents aren't saved. Leaving this page drops them.", [Keep editing] [Discard changes]; the browser asks before the tab closes or reloads, but not as Tickets leaves for Linear's sign-in on purpose, which brings the browser back to the choice it left. Once saved, the page shows what was stored (the control plane trims text), so nothing is left to save; a change someone saves elsewhere replaces what the page showed. Errors land under the field they name; others in a banner under the form.

**Repositories and Members** (their tabs).

- Repositories: an intro says what agents do with them ("Agents start in the primary repository and clone the others when they need them, into `~/repos/<owner>/<name>`. … changes apply to sessions that start afterwards."). For maintainers, a Field "Add repositories" whose row holds the multi-select repository picker (chosen repositories as chips with remove buttons; the first 50 choices, then "{n} more: type to find them"; a polite live region announcing "acme/web chosen"), an access Select ("Read only", "Read and write") and "Add" at field height, which stay by the field's first line as the chips fill more. The list: hairline rows with the repository in mono linking to GitHub, a second line ("Primary: agents start in it", "Added by {name} 3 days ago"), a small access Select per row and a trash icon (a spacer keeps the column aligned on the primary row). Empty: "No repositories. Agents work in an empty directory."
- Members: a Field "Add someone by email" whose row holds the address, a role Select (Viewer "Follows sessions", Editor "Also starts sessions and messages agents", Maintainer "Also manages settings, secrets and members", and Owner, which only owners may give) and "Add". Rows: a 28 px avatar, the name and "you" on one's own, the address, the role as a small Select for maintainers, a trash icon named for what it does ("Remove Ada Lovelace", "Leave Shop" on one's own). A footnote restates the roles.

**Settings' other pages.**

- Secrets: the page's sentence says what happens to them ("fctl encrypts them, hands them to sandboxes as environment variables, and never shows them again, not even to you."), then name and value side by side from 640 px, aligned by their labels so an error under the name moves nothing (the value goes under the name on a phone; "Names fctl manages, such as ANTHROPIC_* and GH_TOKEN, are refused." under the name); the value is a `SecretInput`; rows say "updated 3 days ago by {name}". Errors land under the field they name, others in a banner; toasts say what follows ("Saved: sessions that start from now on have it", "Deleted STRIPE_KEY: sessions that start from now on don't have it").
- General's danger zone, for owners: "Delete this project", "Deletes the project with its sessions, their transcripts, its secrets and its members' access. The repository on GitHub stays. This cannot be undone.", "Delete project…". Its dialog refuses while sessions run ("Stop the project's 2 running sessions first.") and otherwise lists the consequences and asks to type the slug.

**Tickets (in Settings), Schedules and Reviews** are in [pages that explain](explaining.md), with how they explain themselves before they're set up. Once in use their lists follow the same grammar:

- "Tickets lately" (at most 10) and the Reviews list are cover-link rows: a status or state icon, the ticket's key or the pull request's title, `agoShort` and an avatar at the end, and a `Meta` facts line in which each fact carries its own dot in a margin the line hides, so a wrapped line never starts with a dot (a fact hidden on a phone takes its dot along).
- Schedules are disclosure rows: a 32 px tile whose icon says the kind, the name as the toggle, facts such as "Every Monday at 09:00 · Next in 3 hours", an always-visible "Run now" and a ⋯ menu; open, a panel of facts, runs (5 a page, "Older runs") and edits.
- Lists edited before saving (review repositories, apps, Linear teams) show changes in place: "New" badges, rows struck through with "Undo", live-region announcements ("Renovate added. Save to let its pull requests start reviews."), a save bar only once something changed. A removed row stays in the DOM, so the focus stays put.

## A workspace's page (routes/workspace.tsx, components/workspace/*)

**Header.**

- The 60 px avatar (48 on a phone) beside the name (36 px, 28 on a phone, truncated).
- A facts line (12.5 px `ink-3`, wrapping): the person's role in `ink-2` ("Primary admin", "Admin", "Member"), "as {address}" (the address they joined with), "4 people", a 6 px dot (accent with a glow when a runner is online, else `ink-4`) with "2 of 3 runners online" or "no runners yet", for admins an amber link "1 waiting for approval", and "Two-factor required" after an accent shield. The name first, then the person's relation to it, then facts about it; every count carries its unit and its plural.
- Admins get "Invite" at the right, hidden on a phone: "The People tab has the form; on a phone the name needs the room."
- Loading: skeletons of the avatar and two bars, with the tabs a member would see already in place. Any failure: "This workspace does not exist, or you aren't a member of it." Closed until two-factor is set up: no tabs, an amber banner that ends "Set it up in Settings.", and "Leave Romanesco", since leaving works while it's closed too.

**Tabs.** Projects (the default), People, Runners (with a 16 px highlight badge counting the runners that wait for the person's approval, read as "N waiting for approval"), GitHub, Linear (where the instance has a Linear app), Settings, and Audit log for admins. A member who asks for an admin tab sees Projects. Tab links replace the whole search, so an outcome banner's parameters drop on the next tab.

**The set-up checklist.** At the top of Projects, for admins, until everything is done: "Set up Romanesco" (22 px display) and "2 of 4 done". Steps between hairlines, each a 24 px marker (a highlight circle with a check when done, else a ring around a dot), a 14.5 px title and a 13.5 px `ink-3` sentence; the action goes under the words on a phone and at the row's edge from 640 px.

- "Invite the people you work with" ("They join with the address you invite, and see its projects as the base role lets them."): Invite, and "Skip for now", since a workspace for one has nobody to invite. The skip holds for every admin and toasts "Skipped: invite people from the People tab any time".
- "Bring a machine online": "Add a runner".
- "Connect a GitHub account", left out where the instance has no GitHub App.
- "Create a project": "A repository plus what agents need to know to work in it."
- Done steps stay where they are, struck through without their text, so progress shows where it happened; only the invite step can be skipped. Gap: the done state is only visual (the check is hidden from screen readers and a line-through isn't announced), so only "2 of 4 done" carries it.

**Projects.**

- "Projects" and, for those who may create one, a ghost "New project".
- Cover-link rows: the 34 px icon tile with, while sessions are active, a 6 px running dot on a 10 px canvas-colored disc at its corner; the name (14.5 px); "acme/shop (+2 more) · 42 sessions · 3 active" (the repository in mono, the active count in accent, or "No repository"); the last activity's `agoShort` at the right. No description, members or menu.
- In the person's own order, with no sort or filter. Two 48 px skeleton bars while loading.
- Empty: "No projects yet" with "A project is a repository plus what agents need to know to work in it." and "Create a project" for those who can; "Its admins create its projects, and add you to the ones you work in." for the rest. When projects exist but none is theirs: "Romanesco has 3 projects you aren't a member of". Under a list: "And 2 projects you aren't a member of: its admins add people to projects."
- Then "Recently": the workspace's 8 newest sessions, only when there are any.

**People.**

- For admins, the invite form first: "Invite someone" (an email field with the hint "An address they sign in with. They join from their home page, once this instance lets the address in; …"), a Role Select (Member "Works in its projects, as the base role allows", Admin "Also manages people, runners, GitHub and settings") and "Invite" at field height, in one row from 640 px aligned by their labels; on a phone the role goes under the address.
- Every address gets the same answer ("Invited {address}"), so nobody can learn who uses the instance by inviting addresses. Only instance admins hear that an address can't sign in yet, with an offer to invite it to the instance too, which yields a one-time link in a copy box.
- The list: hairline rows with a 30 px avatar, the name, "you" on one's own, for admins an accent shield "Has two-factor sign-in", then "{address} · joined Oct 3" and, for admins, an amber "closed to them until they set up two-factor". At the right: the role (a small Select for admins, saving at once; text for others), "Make primary admin" for the primary admin, and a trash icon "Remove {name}". Controls drop under the text on a phone.
- Order: the primary admin, admins, members, each by name, then pending invitations (admins only): a dashed circle, a dimmer address, "Invited as member by {name} · 2 days ago · until Nov 22", and "Take back". Members see a read-only list.
- Removing asks ("Remove {name} from Romanesco?", "They lose access to its projects and sessions at once. Their sessions here stop, …"); handing over asks ("Make {name} the primary admin?", "Hand it over").

**Runners** (the third tab; its explanations and setup guide are in [pages that explain](explaining.md)). Once runners exist they are a hairline list of management rows, not links, so they don't fill: an 8 px status dot (accent with a glow online, amber draining or when the driver isn't ready, red disabled, `ink-4` otherwise) always repeated in words after the name; pills only for exceptions ("Only your sessions"; a runner for everyone's sessions carries none); "Romanesco's docker runner · 1/2 sessions · seen 3m ago"; an amber line when its driver isn't ready; a ⋯ menu (Rename…, Drain, Disable, Replace token…, Remove…). Oldest first.

**GitHub.**

- The tab reads a sign-in's outcome from the address (`?tab=github&github=refused&account=acme&reason=no_repos`) and shows a banner that says what happened and what to do next, naming controls by their labels: "Romanesco works in acme now: shop, web and 2 more."; "You didn't sign in to GitHub, so nothing was connected."; "That link to connect acme ran out. Connect it again."; refusals that need someone else say who ("An admin of its repositories, such as an owner of acme, connects it."). Refusals are errors except "nothing there to connect yet", which is info, since that isn't anyone's mistake. After a choice the address is replaced with the result, so a reload or Back says what happened instead of reopening the flow.
- A choice card, for 10 minutes after a sign-in: "Choose what Romanesco works in on acme", radios "Every repository, also those the app reaches there later" and "Only the ones you choose", a checklist that gains "Find a repository" and All/None above 8 repositories and scrolls past 288 px, "12 of 40 chosen" (at most 100), "Connect acme" and "Not now".
- Connections: square-cornered 32 px avatars (as GitHub draws organizations), the account as an external link, "Only shop, web" or "Every repository the app reaches there", "Connected" in accent or "Not connected", a pencil to choose repositories and a trash icon; disconnecting an active account asks first.
- The ways to connect sit in two columns from 768 px, texts in one row and buttons in the next, so the buttons line up whatever the texts take. Once an account is connected the section becomes "Add another account", with "You don't need one unless …", since under a connected account the old forms read as a step left to do.

**Linear.** Loading (a 128 px skeleton), an error banner, or "This instance has no Linear app yet." Not connected: a card, "Romanesco isn't connected to Linear yet", with "Connect Linear" for admins and "Romanesco's admins connect it: …" for members. Connected: a card per Linear workspace with "Connected" in accent or "Access revoked" in amber, and its projects as chips linking to their settings' Tickets pages; while no project takes its tickets, "No project takes its tickets yet: choose Linear in a project's settings, under Tickets." and dashed chips (not yet) for the projects the person could set up.

**Settings** (the `beside` layout).

- "You", for everyone ("How this workspace knows you, and what your sessions here run on."): the Claude connection Select (saved at once: "Saved: sessions take it when they next start or resume"), the "Only on my runners" switch, and "Leave Romanesco" (the label truncates rather than pushing off a phone; the dialog says "You lose access to its projects and sessions at once. … Its admins can invite you again.").
- "General", for admins: the avatar (64 px, "Upload an image", "Use its initials"), the color field, and Name and Address with a live preview of the address (`app.fctl.sh/w/romanesco` in mono) and a Save disabled until something changed.
- "Access": the base role Select (No base role, Viewer, Editor, Maintainer, each with a line saying what members may then do), "Require two-factor sign-in" (asking first when some members lack it, listing them: "Romanesco closes to them until they do; they keep their other workspaces.", "Require it"), and a strip "3 of 4 members have two-factor sign-in".
- "Primary admin": "Hand it to", a Select and "Hand it over" in one row.
- The danger zone: "Delete Romanesco" ("Deletes its projects, their sessions and transcripts, for everyone in it. …"), confirmed by typing the workspace's name.

**Audit log** (admins). "What happened in Romanesco: people joining and leaving, roles, runners, GitHub accounts, projects and sessions. Kept for a year." Pages of 100, newest first, behind "Older". From 640 px each entry is a line of columns: when (96 px), who (160 px, "system" for none), the action key in 12.5 px mono, the target in 12 px mono `ink-4`, truncated. On a phone, two lines: what happened and when, then who and to what. "Nothing yet." when empty.

**Creating a workspace or a project** (routes/new-workspace.tsx, routes/new-project.tsx).

- Narrow forms (640 and 680 px) under a 34 px h1 ("A new workspace", "A new project") and one sentence ("A project is a repository plus what agents need to know to work in it.").
- The new workspace's avatar (72 px) previews beside its Name, level with the input rather than centred on the field, which grows when its hint wraps. The Name (44 px, 17 px text, focused on arrival, placeholder "Side project") has the address as its live hint (`app.fctl.sh/w/side-project`, plus "· side-project is taken, so it gets a random ending" when it is). "You join it as" appears only with several addresses. The footer: "You are in 2 of the 5 workspaces you can be in." beside a large "Create workspace →".
- The project form offers three tiles (Existing repository, New repository, No repository), disabled with a banner that says why when the workspace has no GitHub account; a repository picker (search over a list that scrolls past 256 px; private ones with a lock; rows that are "already a project" disabled); the 38 px icon tile, which follows the name until someone chooses one; a description hinted "Optional. Shown to people, not to agents.". People who can't create projects get an explanation instead of a form: "Its admins create a workspace's projects".

## Settings (routes/settings.tsx, lib/settings.ts)

**Why pages.** Settings was one column of thirteen sections, about 5,000 px tall on a computer and 7,400 px on a phone. It is now ten short pages in three groups, each a `?tab=` as other pages' tabs are: Profile, Email addresses, Workspaces, Claude, Linear (where the instance has a Linear app); Notifications, Appearance; Security, Access tokens, Your data. Rare and risky parts moved behind a step: the password changes in a dialog, so the page no longer shows two empty password fields, and advice that applied to every row is said once under the list.

**One container query decides the layout.**

- The frame (`@container`, at most 1000 px, `px-6 pt-12 pb-24`) measures its own width, not the window's, so a narrow window, or one beside an open sidebar, gets the phone layout. With the sidebar at its default width, two columns start at about a 1008 px window (780 with the sidebar folded).
- From 672 px of content (`@2xl`): the 34 px "Settings" heading, then the list of pages (180 px; 200 from `@4xl`) beside the page open (gap 40 px; 56), and plain `/settings` shows Profile.
- Below it: `/settings` is the list alone; `/settings?tab=…` is the page alone, with "‹ Settings" as the way back (32 px tall, 14 px `ink-3`, its chevron hanging in the margin). The h1 stays for screen readers only, and the page's h2 grows from 22 to 28 px because it now heads the screen.
- A page's parts must work from about 340 to 700 px, so they use container queries of their own (Profile's picture beside its details from 288 px, workspace rows side by side from 576 px).

**The list beside the page.** Both lists are components/settings/nav.tsx (`SettingsNav`, `SettingsList`), which a project's Settings uses too, with its own pages.

- A `nav` labelled "Settings", sticky 32 px from the top. Three groups split by a hairline with 12 px either side; rows 32 px tall at 13.5 px with a 16 px icon, 2 px apart, hung 10 px into the margin so their icons line up with the page's title.
- The open page is a `bg-raised` card with an inset hairline and an accent icon; hovered rows take the translucent `hover` fill, so the two never look alike in the light theme.
- The card is one absolutely positioned highlight that slides to the chosen page over 260 ms `--ease-out`, only from page to page, never on first paint. The nav is left out of the router's 220 ms cross-fade (`view-transition-name: settings-pages`, its old snapshot hidden, its new one not animated): a highlight given a transition name of its own is drawn above the whole page.
- Pages that need the person (Claude not connected or ended, a workspace closed until two-factor is set up, three or fewer recovery codes left) carry a 6 px amber dot with a soft glow, its words in the `title` and in `sr-only` text: "Claude: Not connected yet".

**The list alone, on a phone.** Modelled on a phone's own settings app.

- A profile card first: 44 px avatar, the name at 15.5 px, "Profile · {address}".
- The three groups as inset cards (18 px corners, rows split by hairlines). Rows at least 58 px tall: a 32 px icon tile, the page's name (14.5 px), its gist (what it says now: 12.5 px `ink-4`, amber where it needs the person) and a chevron. A row fills on `active:` when tapped.
- Gists: "{address} and 2 more"; "3 workspaces"; "Not connected yet", "Needs reconnecting", "2 connections"; "Linked in Romanesco"; "On in this browser"; "Dark · 24-hour clock"; "Two-factor sign-in on · 2 passkeys", "Few recovery codes left"; "None yet", "2 tokens"; "Export it, or delete your account". A gist still loading leaves the name alone; the 58 px row barely moves when it arrives.

**A page.**

- `SectionLayout` "page": an h2 at 22 px display (28 on a phone), one 14 px `ink-3` description up to 64 characters wide ("How fctl looks in this browser."), content 28 px below.
- Pages of several parts (Security: sign-in methods, passkeys, two-factor, devices) use "part": 15 px semibold h3s, 56 px apart.
- A page's actions ("New workspace", "New access token") sit beside its title and wrap under the description where they don't fit.
- Page bodies remount when the tab changes, so unsaved text on one page is dropped on leaving it (a gap worth a warning).

**Rows in Settings.**

- One grammar: a 32 px icon tile, lit (`accent-soft` fill, `accent/30` border, accent icon) where what it stands for is set up or current, else `bg-raised`; a 13.5 px title with a small tag where it helps ("Primary", "used for new sessions", "this device", "Experimental", "Recommended"); a 12 px `ink-4` line of facts joined by " · " ("Synced · added 3 days ago · last used just now"); small ghost actions; a trash icon at the end that names what it removes.
- Two list styles: a bordered card split by hairlines where a row holds a form or wraps into two parts (email addresses, each with its commit address; workspaces, whose Claude picker sits beside the workspace from 576 px of the card's width); a flush hairline list for everything else.
- Emphasis follows what still needs doing: "Set a password" secondary, then "Change password" ghost; "Set up" two-factor primary, then "Replace" and "Turn off" ghosts; "Get new codes" secondary only when three or fewer remain.
- Inside a page a broken connection is a failure, in red ("needs reconnecting"); in the navigation and the phone list the same fact is something that needs the person, in amber.

**Saving and confirming here.** As in "Forms and controls": switches and Selects save at once with a toast; Profile, the commit address, the password, new tokens and deletion save on submit; names rename inline. Confirmation titles ask a question naming the thing ("Remove {passkey}?", "Leave Romanesco?", "Get new recovery codes?"); task dialogs have plain titles ("Change your password"). The new token dialog says what the token will do before it's made: an `aria-live` sentence rewrites itself as choices change ("Runs sessions in Shop; their agents review and comment on GitHub, and push nothing. It expires on Dec 8.").

**Notable flows.**

- **Appearance.** The theme is two radio cards, each a 16:10 picture of the app in that theme's own colors (sidebar, page, primary button), the real radio `sr-only` so the card draws the focus ring; switching cross-fades, except under reduced motion.
- **Two-factor setup.** A wide dialog: a 200 px QR code (dark on white in both themes, drawn ring by ring) beside the steps; "Can't scan it? Type in a key instead"; a six-box code field that submits itself on the sixth digit, shakes on a wrong code and says what to check on the second ("check that your phone sets its clock automatically"). On a touch screen it offers "Open in your app" and doesn't raise the keyboard. Recovery codes come with Copy all, Download and Print (a page of only the codes), and "Done" waits for "I saved my recovery codes".
- **Your data.** What the export holds as eleven short items in two columns from 576 px; the export link disabled until its weekly turn ("You can export it once a week: again from {day}, {time}."); then the danger zone. Deleting the account lists exactly what goes and what stays ("Repositories on GitHub are not touched."), offers "Want a copy first? Export your data.", and asks to type the address.

**Old addresses still land.** `askedTab` takes the address's tab first, then a hash from before Settings had pages (`#claude`, `#connect-claude`), then the way back from Linear (`?linear=`) and from Google (`?linked=`, `?error=`; Google's return address can't carry a tab). A mistyped `/settings/passkeys` suggests Security, and ⌘K finds a page by its keywords ("2fa", "passkeys", "pat").

**Unverified.** Settings has no forced-colors handling of its own: the sliding highlight, the switch, the chosen theme card and lit tiles are fills and shadows, which forced colors drop. Check them with `emulateMedia({ forcedColors: "active" })` before copying them.

## Traps and their fixes

- **Hover on touch.** Tailwind 4's `hover:` applies only where hover exists, but arbitrary variants don't: wrap sibling rules in `[@media(hover:hover)]`. An `opacity-0` hover button still takes taps on a phone: add `[@media(hover:none)]:hidden`, or show it there (`pointer-coarse:opacity-100`).
- **Forced colors.** They drop fills and shadows: draw lines as borders, focus rings and selection as outlines, and check `emulateMedia({ forcedColors: "active" })`. Tab underlines and Settings' highlight don't yet.
- **`cn()` is plain `clsx`, without tailwind-merge.** A class passed to a component that has a conflicting one of its own loses or wins by the stylesheet's order, not by `cn()`'s: a width passed to `Input` loses to its `w-full`, a smaller size to `IconButton`'s `size-8`, `hidden sm:inline-flex` shows on phones. Size from a wrapper (Memory's search sits in a `sm:w-64` div, a ticket label's Input in a `sm:w-60` span), show a state through a variant on an attribute (`aria-invalid:`, `data-invalid:`), and choose between conflicting classes with a condition.
- **Safari 26 and `flex-1`.** In a column as tall as its contents (a fit-content `<dialog>`), `min-h-0 flex-1` gets no height: use `min-h-0 flex-auto`. Playwright's WebKit can't show it; reproduce with WebKit 26.0.
- **Wrapping rows.** A `flex-wrap` row wraps buttons beside a `min-w-0 flex-1` text only when the buttons alone overflow, so the text shrinks to a letter a line first. Stack by the component's own width with a container query. An item wraps by its flex basis, not its minimum width: give a grow item holding a wide picker `basis-0`.
- **Same route, new params.** TanStack Router keeps a route's component mounted from `/p/a` to `/p/b`: `useState` carries over. Key per-entity state by its id (`key={project.id}`) or reset it during render.
- **Dialogs inside dialogs.** React 19 passes a `<dialog>`'s close and cancel events up through portals: wrap handlers in `own()`. A popover inside a modal dialog needs `tabIndex={-1}` and its own Escape handler with `preventDefault`, or a press on its padding sends the focus to the body and Escape closes the dialog.
- **Buttons.** `type="button"` on every non-submit button in a form; no `disabled:pointer-events-none` over a stretched link; no `Button` inside a `Link` (use `buttonClass`).
- **Mutations.** Put toasts and invalidations in `useMutation`'s options: callbacks passed to `mutate()` don't run once the button that called it unmounts, as live state can make it do. Give every mutation an `onError`: nothing catches them globally.
- **Lists of session summaries.** To tell which of two summaries is newer, compare `updated_at`: `stats.turns` doesn't move when a stop or failure cuts a turn short, and `last_activity_at` moves on deliveries too. Summaries leave out fields that are empty, and cached lists merge them with a spread, so a field that clears without a status change keeps its old value unless it's deleted explicitly.
- **Tab strips on phones.** A deep link to a late tab lands with it off screen unless something scrolls it in. A project's page does, sideways only, by the strip's `scrollLeft` (`scrollIntoView` would move the page too); a workspace's doesn't yet.
- **Counts in a page's header.** The live feed refreshes the lists (`["projects"]`, `["sessions"]`), not a single project's query, so a project header's "3 active" can lag its own "Working now". Refresh whatever shows a count from the same events as the list it counts.
- **`aria-current` on default tabs.** TanStack's `Link` matches search partially and ignores keys that are undefined, so a default tab linked with `{ tab: undefined }` reads as current on every tab, and an active link's `aria-current="page"` overrides the one you pass. Set `aria-current` yourself and match the address exactly (`activeOptions={{ exact: true }}`), as a project's tabs do.
- **Loading versus empty.** A list that shows its empty copy while it loads (access tokens), or for a failed load (several tabs), tells the person something false. Keep three states apart: loading, empty, failed.
- **Motion from script.** CSS can't reach `scrollIntoView({ behavior: "smooth" })`: check `prefers-reduced-motion` before scrolling (the Schedules tab doesn't yet).
- **Keys named on screen.** Use `startKeys()`/`apple()` for ⌘ or Ctrl; a hard-coded "⌘+Enter" (Memory's composer) is wrong on Windows and Linux.
- **The hand-over flicker.** A session says idle "Waiting for a message" for a few milliseconds between a background task and the next turn: let that state last before reacting.
- **Browser storage.** A new localStorage key needs a line in fctl.sh's privacy policy (hyperstructure/fctl-site `legal/privacy.md`).
- **Testing phones.** Playwright needs `isMobile: true` and `hasTouch: true` for `pointer-coarse:` styles to apply; a 390 px viewport alone still has a fine pointer.

## Principles at work here

1. **A row opens one thing, or it is acted on in place.** Rows that open fill as a whole and carry no arrow; links inside them lie above the cover; rows you manage don't fill and show their actions as buttons.
2. **Put what needs a person first, and let them act from the list.** Sort by what's needed next (a question, a review, a failing check), mark it in the one color that means it, and offer the answer in the row when it's short.
3. **Say little, in a strict order.** One title line and one muted facts line; the full time and names in tooltips with `sr-only` sentences; on a phone drop facts by priority rather than wrapping the row.
4. **Color is state, never decoration.** Accent for work and "this one", blue for waiting, amber for needs-you and caution, red only for failure and destruction, GitHub's colors only for pull requests; signs of work in one calm color, and never color alone.
5. **Moving things keep their places; finished things sort by when they moved.** Light a row briefly when it changes, never as the list first loads.
6. **Every state tells the truth.** Skeletons in the row's shape; empty states that say how things will arrive and who can make them; narrowed empties that say what narrows them and where the rest is; failed refreshes that keep what loaded; caps that are stated.
7. **Ask in proportion to the loss.** Save reversible choices at once with a toast that says what follows; confirm losses in a dialog that names the thing and says what stays; ask to type the name for the irreversible; let button emphasis follow what still needs doing.
8. **Layout follows the space a component actually has.** Container queries on its own width, controls in their field's row and fields aligned by their labels so nothing shifts; phones move things under one another rather than hiding information, get larger targets, no hover-only controls, and no focus that raises the keyboard uninvited.
9. **Everything works from the keyboard and survives forced colors and reduced motion.** Roving focus in grids and tabs, `j`/`k` and `/` where lists are long, Escape that closes the nearest layer only; lines as borders and rings as outlines; motion short, on the design's curves, and off when asked.
10. **Views are addresses, and people's choices persist where they belong.** Tabs, filters and outcomes in the URL (replaced, not pushed); "as you left it" per browser tab; preferences in localStorage; people's own order in every list; old links that still land on the right page.
