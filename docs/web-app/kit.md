# The UI kit and global styles

This is the part of fctl's web app that every page is built from: the primitives in
`web/src/components/ui/`, the global stylesheet `web/src/styles/app.css`, and the rules that hold
across them (themes, motion, focus, touch, Safari). It says what each piece is for, how it looks and
behaves, and why, so that a new component can be built to the same standard.

Paths are in hyperstructure/fctl unless they name `src/` of this repository (`src/tokens.css`,
`src/fonts.css`, `src/gl/`). Sizes are given as the Tailwind class and what it comes to: Tailwind 4
counts 4 px a step, halves included, so `h-9.5` is 38 px. The code's comments carry most of the
reasons and are worth reading next to this. Where this document is unsure, it says so.

## How the styling is put together

- **Tailwind 4, configured in CSS.** `app.css` imports `tailwindcss`, then this package's
  `fonts.css` and `tokens.css`, whose `@theme` turns the tokens into utilities: colors
  (`bg-surface`, `text-ink-3`), radii (`rounded-md`), curves (`ease-out` and `ease-in-out` are the
  brand's, not Tailwind's) and animations with their keyframes (`animate-rise`). `app.css` adds
  `@theme` blocks for the kit's own animations (`animate-listbox-in`, `animate-shake`…) and `added`.
- **Utilities in components, CSS for the rest.** Pseudo-elements, keyframes driven by custom
  properties, `::backdrop`, `@starting-style`, `::highlight()`, view transitions and per-theme
  exceptions live in `app.css`.
- **`app.css` is unlayered**, so its rules beat every utility (those live in `@layer utilities`)
  whatever the specificity: to change what it sets, write another rule there. Markdown's
  `.prose-fctl` is the usual case: pass `prose-note` (which inherits size and color) and style a
  wrapper, since classes passed to it lose.
- **`cn()` doesn't merge.** `web/src/lib/cn.ts` is clsx without tailwind-merge, so of two classes
  that set one property the stylesheet's order wins, not the arguments': `w-32` on an Input loses to
  its own `w-full`, `size-6` on an IconButton to its `size-8` (Tailwind emits sizes in ascending
  order), and any variant beats a plain class. Size a component with a wrapper
  (`<span className="w-32"><Input/></span>`), put responsive display on a wrapper, choose between
  conflicting classes with a condition, and style states through attribute variants
  (`data-invalid:border-danger/60` with `data-invalid={invalid || undefined}`).
- **Tailwind writes only the classes it finds in the source**: write each variant out in full. It
  repeats declarations that use `color-mix()` in an `@supports` rule, where a shorthand
  (`background`) can reset a longhand beside it (`background-clip: text`): write longhands.
- **Arbitrary values are normal**: px font sizes (`text-[13.5px]`), shadows, properties
  (`[overflow-wrap:anywhere]`), variables in parentheses (`top-(--viewport-shift)`). Opacity
  modifiers on tokens (`bg-raised/95`) mix the variable, so they follow the theme.

## Color

The tokens are semantic and defined per theme in `src/tokens.css`. Dark is the default.

| Token | Dark | Light | For |
|---|---|---|---|
| `canvas` | #0a0a0a | #fafafa | The page |
| `surface` | #121212 | #ffffff | Cards, dialogs, sheets |
| `raised` | #1a1a1a | #ffffff | Menus, listboxes, popovers, toasts, secondary buttons, keycaps |
| `sunken` | #050505 | #f1f1f1 | What you type into or read code in (inputs at 60%, code boxes, diffs) |
| `ink` | #fafafa | #171717 | Primary text |
| `ink-2` | #c6c6c6 | #3d3d3d | Body text, labels, quieter controls |
| `ink-3` | #8d8d8d | #6b6b6b | Descriptions, hints, icons; 6.0:1 and 5.1:1, fine for text |
| `ink-4` | #5e5e5e | #a3a3a3 | Placeholders, disabled text, faint icons; about 3:1 and 2.5:1, not for text that must be read |
| `line` | ink 7.5% | ink 8% | Hairlines between things |
| `line-strong` | ink 14% | ink 15% | Borders of controls and overlays |
| `hover` | ink 5% | ink 6% | The fill under the pointer; translucent, so it shows on any surface |
| `accent` / `accent-ink` | #ffff5d / #171717 | #171717 / #fafafa | Yellow as foreground: text, icons, rules, focus rings, signs of work |
| `accent-soft` | yellow 10% | lime 55% | Focus halos, a row lit for a moment, the ok banner |
| `highlight` / `highlight-ink` | #ffff5d / #171717 | #eaff81 / #171717 | Yellow as a fill: primary buttons, a switch that's on, the current find match |
| `blue` (+ `-soft`) | #007eff | #0070e0 | Waiting for you, information |
| `pink` (+ `-soft`) | #ff00d8 | #ff00d8 | Paused, the Agent Floor's packets |
| `violet` (+ `-soft`) | #ff00d8 | #c800aa | The pink that can be read as text on light |
| `amber` (+ `-soft`) | #eaff81 | #6b6b00 | Caution: warnings, limits |
| `danger` (+ `-soft`) | #ff4d4d | #cc1f1f | Destructive actions, errors, failures |
| `pr-*`, `checks-*` | GitHub's | GitHub's | Pull request states and checks only |

**The dark page is near black.** Its canvas, `#0a0a0a`, is darker than the brand's blackish
(`#171717`, which stays the ink on yellow): on blackish the app read as grey and dim beside the
other apps on a phone, and the yellow, the scenes and the ink stand out more on near black. Each
step up is as much lighter than the one under it as before (2.7 points of CIE lightness from
canvas to surface, 3.8 from surface to raised), so a card still shows on the page and a menu on a
card. Sunken is a smaller step below the page (1.4 points, 2.3 before), as near black leaves little
room under it: what's sunken has a border or sits on a surface, which shows it. Not pure
black: OLED screens smear pure black as it scrolls, and a sunken well needs a shade below the
page. `brand.ts` has the backgrounds as values (`themes`) for what can't read the tokens: the
`theme-color`, the app manifest, a picture of one theme drawn in the other.

`app.css` adds the app's own: `added` (#4ade80, #15803d on light) for lines added in diffs, the
diff washes, `--thread` and `--hover-solid` (an opaque hover over the canvas, for icons that must
cover a line under them), `--composer-shadow`, and the project icon colors (`--p-*`, `.pi-own`).

- **Tokens, not raw colors**; a new need gets a new token. The kit's raw colors are deliberate:
  avatar fills (brand colors that read the same in both themes), the color picker's gradients,
  GitHub's colors. Native checkboxes take `accent-[var(--c-accent)]`.
- **Red is only `danger`.** Warnings are `amber`, information `blue`, success and work the accent.
- **Accent is foreground, highlight is fill.** Yellow can't be read on white, so on light the
  accent becomes ink and the highlight lime: a focus ring is yellow on dark and black on light, a
  primary button yellow on dark and lime on light, with ink text on both.
- **Hover fills with `hover`, never `raised`**, which is white in the light theme as surface is and
  would show nothing. Hover is a little stronger on light (6% against 5%) to show as much.
- **One meaning per color.** A session's status: accent working, blue waiting for you, pink paused,
  danger failed, ink shades for the rest.
- **Small text needs 4.5:1.** On light, brand pink as text is 3.2:1 (`text-pink`, as "Paused" uses
  it); `violet` is the text-safe pink there (5.0:1), used so far only for the thread of a thought's
  lines (`border-violet/25` in `components/session/lines.tsx`), not for text.

## Type, radii and surfaces

**Type.** Inter Variable with optical sizing for text and headings (`font-display` is Inter again:
large text gets its Display cut by itself). JetBrains Mono for code, ids, hex values, counters and
small facts. The base sets Inter's `cv11`, `ss01` and `ss03` (by Inter's list: single-storey a, open
digits, round quotes) and antialiasing. Sizes in use, in px: 10.5 (small keycaps), 11.5 (list
section labels, mono facts), 12 to 12.5 (labels, hints, errors, small controls, facts), 13 to 13.5
(menu items, buttons, banners, toasts, descriptions), 14 (inputs), 15 (large buttons), 15.5
(prose), 19 (sheet titles), 22 (dialog and page titles), 28 (a page title heading a phone's screen).
Headings tighten tracking by 0.01 to 0.02 em; counts are `tabular-nums`; descriptions
`text-pretty`. Sentence case everywhere, with no uppercase eyebrows and no numbered labels (01, 02)
above headings: they read as generic, machine-made decoration, so sections go by their headings.

**Radii.** `xs` 4, `sm` 6, `md` 9, `lg` 13, `xl` 18 px; bare `rounded` is 4. Small buttons `sm`;
fields, buttons, menu items and options `md`; menus, listboxes, banners, toasts and large buttons
`lg`; dialogs, popovers and the danger zone `xl`; pills and dots `rounded-full`. `rounded-2xl` isn't
in the scale and falls back to Tailwind's 16 px, less than `xl`.

**Surfaces.** Canvas, then surface, then raised; sunken below. What floats is translucent and
blurred (`bg-raised/95 backdrop-blur-xl`: menus, listboxes, popovers, toasts). Shadows are large,
soft and black, written per component: from `0 12px 40px rgb(0 0 0/.35)` for a toast to
`0 30px 120px rgb(0 0 0/.55)` for a dialog; listboxes add a tight second shadow
(`0 2px 8px -2px rgb(0 0 0/.18)`) under the wide one. Backdrops are black at 45% with a 3 px blur
(75% for the lightbox). On light, raised is white like surface, so shadows, not fills, lift things;
on dark a shadow must be denser and closer to show at all (`--composer-shadow`).

## Themes

- `data-theme="dark"` or `"light"` on `<html>`, set before the first paint by `web/public/theme.js`
  (a file, so that the Content-Security-Policy needn't allow inline scripts) from the saved choice
  (`fctl-theme`) or the system's, with the title bar's `theme-color` set to the canvas color.
- `setTheme()` (`web/src/lib/theme.ts`) switches inside `document.startViewTransition`, a 220 ms
  cross-fade, unless motion is reduced; `useTheme()` reads it through `useSyncExternalStore`.
- Each theme sets `color-scheme`, so scrollbars and native controls follow.
- Components don't branch on the theme: the tokens flip. Don't use Tailwind's `dark:` variant,
  which follows the system's preference, not the app's choice. A rule that must differ goes in
  `app.css` under `:root[data-theme="light"]` (`.title-hot` becomes a highlighter stroke under the
  words there; the ask card gets a shadow). Shiki colors code through `--shiki-dark` and
  `--shiki-light`; WebGL scenes read tokens with `cssColor("--c-…")`.

## Motion

**Curves** (`src/tokens.css`): `--ease-out`, `cubic-bezier(0.16, 1, 0.3, 1)`, quick and long to
settle, for what arrives; `--ease-spring`, `cubic-bezier(0.34, 1.36, 0.64, 1)`, a little past and
back, for what answers a hand (the switch's thumb, Select's highlight and chevron, popping digits);
`--ease-in-out`, `cubic-bezier(0.65, 0, 0.35, 1)`, for what leaves or loops.

**Durations.** 150 ms for color, border and shadow on hover, focus and press. 140 to 260 ms for
small things coming and going (a listbox closes in 140 and opens in 200, page cross-fades 220, a
closing sheet 260). 300 to 420 ms for things with weight: a value rolling in 300; `animate-rise`, the
default entrance (6 px up, from 99.5% and a 2 px blur), 420; a sheet sliding in 420. Loops: 1.1 s
(busy ring), 1.4 s (dot wave), 2 s (status ping), 2.2 s (skeleton), 2.4 s (soft pulse), 4 s (text
shimmer: 2 s across, 2 s at rest).

**Patterns.**

- Come from where you came from: listboxes and popovers grow out of their trigger (the transform
  origin is the trigger's middle, and they start 4 px toward it), a sheet slides from its edge.
- Leave faster than you came (200/140, 300/220, 420/260 ms). Dialogs, menus, the lightbox and
  toasts go at once.
- Press feedback is a scale: `active:scale-[0.97]` on buttons, 0.95 on icon buttons, 0.9 on swatches.
- Stagger with an index: each item gets `style={{ "--i": i }}` and the CSS delays it by
  `min(var(--i), 7) * 18ms`, capped so that the end of a long list doesn't wait.
- Confirm a choice where it was made: Select flashes the pick, draws its check and rolls the new
  value into its trigger; CopyButton turns into a check; CodeInput pops each digit in.
- Gestures follow the finger exactly, then decide by distance or flick and settle with ease-out
  from wherever the finger let go.
- Drive what must stay together from one property: an animated `@property` runs on the main thread
  while transform and opacity run on the compositor, so under load a caret moved by transform ran
  ahead of the mask it should have led.
- Fill modes leave traces: `animate-rise` ends at `matrix(1, 0, 0, 1, 0, 0)` and `blur(0px)`, not
  `none`, which makes the element the containing block of anything `position: fixed` in it; in an
  open Dialog, a fixed element is placed from the dialog's corner.

**Reduced motion**, in four layers:

1. A switch at the end of `app.css` gives every animation and transition 0.01 ms and one run, so
   make each animation's end state (with `both`) or its resting style the right still picture: the
   text shimmer's resting gradient sits off the text, a spinner stops as a ring. Delays aren't cut:
   a diff line meant to stay lit for a moment keeps a 2.2 s delay, then goes at once.
2. Still versions where stopped would look broken: the dot wave holds its dots brightest in the
   corner the wave starts from, the busy ring's arc stands, the thinking mark shows its trace whole.
   Decorative loops sit inside `@media (prefers-reduced-motion: no-preference)` and never start.
3. Scripts ask `matchMedia("(prefers-reduced-motion: reduce)")`: Select skips its flash, theme
   switches skip the view transition, the lightbox doesn't glide.
4. WebGL scenes draw one still frame (`mount()` in `src/gl/core.ts`).

As far as the code tells, the 220 ms cross-fade between pages still runs (the switch doesn't reach
`::view-transition-*`); a fade without movement is generally acceptable.

**Signs of work** are one color, the accent (yellow on dark, ink on light), and calm: a rotating
ring in yellow, pink and blue looked out of place on the session page and gave way to the dot wave
and a one-color arc. They run in step: `syncShimmers()` (`web/src/lib/shimmer.ts`, started in
`main.tsx`) sets `startTime = 0` on every `text-shimmer`, `dot-wave`, `busy-ring` and
`thought-sweep` animation as it starts, so one that appears late moves in phase with the others.

## Focus, keyboard and forced colors

- **The ring.** The base `:focus-visible` rule in `src/tokens.css` draws a 2 px outline in the
  accent, 2 px out, with 4 px corners where the element has no radius. Most of the kit relies on it.
- **Rings are for the keyboard**: `:focus-visible`, not `:focus`. Fields are the exception, since
  you need to see where you type: an Input shows its accent border and a 3 px `accent-soft` halo on
  any focus, a Select's trigger on keyboard focus and while its list is open.
- **Who has the focus.** A dialog or sheet focuses itself as it opens ([Dialog](#dialog-overlaytsx)), a Select's list leaves
  it on the trigger (`aria-activedescendant`), a popover takes it, and a native dialog gives it back
  to its opener. When a click opened an overlay, the opener gets it back without a ring until it
  loses it (`data-quiet-focus`, as the diff dialog does): it had none before the click.
- **Escape belongs to the innermost thing**: a list, then a popover, then a filter field with text
  (which clears first), then the dialog. Whatever takes the key stops it (`preventDefault()`,
  `stopPropagation()`). The app's shortcuts leave keys in an open dialog to the dialog unless they
  opt in (`inDialogs` in `web/src/lib/hotkeys.ts`).
- **Forced colors** (Windows' contrast themes) drop shadows and backgrounds and keep outlines and
  borders, so rings are outlines and dividing lines are borders: list rows divide with
  `before:border-t` and ring their cover link with `focus-visible:after:outline-2`; the session
  view's thread is a `border-left`. An `::after` still draws an outline when its element has
  `outline-none`, because Tailwind registers `--tw-outline-style` with `inherits: false`. Check
  with Playwright's `page.emulateMedia({ forcedColors: "active" })` in Chromium.
- **A gap, found while writing this and not checked in a browser:** Input, Select's trigger and the
  color popover's thumbs show focus only with shadows and a border color, on `outline-none`, and
  forced colors draw neither. Tailwind 4's `outline-hidden`, unlike `outline-none`, adds a
  transparent 2 px outline under `forced-colors: active`, which those themes paint: likely the fix.

## Touch and pointer

- Tailwind 4 puts `hover:` and `group-hover:` inside `@media (hover: hover)`, so hover never shows
  on a touch screen, where what was tapped would stay hovered (Safari on an iPhone even hovers what a
  finger only scrolled over). It doesn't wrap arbitrary variants or plain CSS: write
  `[@media(hover:hover)]:[:hover+&]:…` (as `list-row.ts` does), and wrap `:hover` rules in `app.css`.
- `active:` isn't wrapped, so presses show on touch screens: buttons scale, list rows fill.
- What hover reveals needs a way in by touch and by keyboard. A button at `opacity-0` still takes
  taps where nothing shows it: show it on touch screens (`[@media(hover:none)]:opacity-100` or
  `pointer-coarse:opacity-100`, as an attachment's remove button does), or take it away there
  (`[@media(hover:none)]:hidden`) when a stray tap would do harm, as the sidebar's hide button
  would hide what a finger meant to open. Reveal it on focus too (`focus-visible:opacity-100`).
- Where nothing hovers, assume no keyboard: keycaps, shortcut hints and the Keyboard shortcuts menu
  item hide there.
- Coarse pointers get bigger targets (`pointer-coarse:`): menu items and options from 6 to 10 px
  of vertical padding, the color popover's thumbs from 16 to 24 px. The sheet's close button is a
  44 px target around a 28 px circle.
- Gestures listen to touch events, not pointer events: only a touch event can stop the browser
  scrolling meanwhile, and the mouse's drags stay the browser's (dragging a picture out, selecting a
  caption). A gesture starts once it is plainly one (past 10 px, more along its axis than across)
  and otherwise leaves the touch to scrolling; what takes fingers from the start gets `touch-none`.
- The page doesn't zoom: the viewport meta asks for none (which also keeps Safari from zooming into
  a text field), and `stopPinchZoom()` (`web/src/lib/zoom.ts`) cancels the gesture events Safari
  pinches with anyway. The lightbox zooms its pictures itself.

## Phones, Safari and the viewport

- **Nothing wider than the screen.** Long names, addresses and links wrap
  (`[overflow-wrap:anywhere]`) or truncate; what can be wider than a phone scrolls in a row of its
  own, bleeding to the edges (`-mx-6 px-6 overflow-x-auto [scrollbar-width:none]`);
  `fieldset { min-width: 0 }` in `app.css` stops a fieldset growing to its content's width. Look at
  a change 320 to 430 px wide with long names in its data, and beside the sidebar at 768 px.
- **Flex rows wrap by basis, not by min width.** A growing item holding a Select (as wide as its
  longest option) pushed a button onto its own line until it got `basis-0`; a `min-w-0 flex-1` text
  beside buttons shrinks to a letter a line rather than wrapping them. Lay a card out by its own
  width with a container query (`@container`, then `@xl:`, `@max-xl:`): from 768 px the sidebar takes
  288 px (240 to 420 if dragged, 60 folded), so a card is narrower at 768 px than at 767.
- **Safe areas.** What is fixed to an edge keeps clear of the notch and the home indicator with
  `env(safe-area-inset-*)` (the toaster, the sheet's body).
- **The keyboard covers, it doesn't shrink.** A phone's keyboard shortens only the visual viewport,
  so popovers are placed against `window.visualViewport` (`placeList()`) and follow its resizes and
  scrolls (`followViewport()`).
- **Safari's phantom keyboard.** The installed app on iOS can come back from the app switcher with
  WebKit taking a keyboard to cover the bottom of the screen though none shows; the layout viewport
  then lags the screen as the page scrolls, and what is fixed or sticky comes loose.
  `watchViewport()` (`web/src/lib/viewport.ts`) sets `--viewport-shift` on `<html>` meanwhile (0
  otherwise), and what is pinned to the screen moves by it: dialogs
  (`top-(--viewport-shift) -bottom-(--viewport-shift)`), the sheet, the lightbox (translated, so
  that its fixed buttons go along), the toaster and every `::backdrop`. New ones need the same.
- **Safari's status bar over the page.** The installed app on an iPhone can also come back laid
  out under the status bar, until it is closed: the layout viewport starts at the screen's top,
  and the bar covers whatever is pinned there (WebKit bug 301994 has other web apps' reports).
  iOS then draws a frosted band over the page's top too: it dims and blurs what is under the bar
  and fades out about 34 px below it, where the top bar's logo and the drawer's head would sit.
  `--safe-top` in `app.css` says how much of the page's top to keep clear: the bar, as Safari's
  top safe area says or, where that stays 0 though the layout viewport is as tall as the screen,
  as `watchViewport()` last saw it above the page (`--status-bar`, kept in `localStorage`), and
  on an iPhone's or iPad's Home Screen as much again as keeps what the top bars show clear of
  the fade (`--status-bar-fade`, 22 px: the fade's 34 less the 12 px at the bars' tops that show
  nothing), only while a bar covers the page. It is 0 everywhere else. A band of `canvas` covers
  it (`body::before`, above the drawer and the palette's shade), as the status bar's own band
  does while the page is below it, so that the frosting falls on one plain color, and the fade's
  end on the bars' plain tops. Sticky bars and the drawer pad their tops by it
  (`box-content h-14 pt-(--safe-top)`); dialogs start below it
  (`top-[calc(var(--viewport-shift)+var(--safe-top))]`, their max height less it), and the
  lightbox's buttons sit under it. New elements pinned to the top need the same, and show nothing
  in their top 12 px.

## Components

Most of the kit is exported from `web/src/components/ui/index.ts`; `color-popover.tsx` and
`list-row.ts` are imported by their own paths.

### Buttons (`button.tsx`)

**Purpose.** Every action that isn't a link. `Button` has words and an optional icon, `IconButton`
an icon alone, `buttonClass()` gives a link the look of a button (for one that leaves the app).

| Variant | Look | For |
|---|---|---|
| `primary` | `highlight` fill, ink text, inset ring; hover brightness 1.06, press 0.95 | The one action a view or dialog is for |
| `secondary` (default) | `raised` fill, `line-strong` border; hover border `ink-4` | Other actions |
| `ghost` | `ink-2` text; hover `hover/70` fill and `ink` | Cancel, toolbar and row actions |
| `danger` | `danger-soft` fill, `danger` text and a 25% border; hover `danger/15` | Destructive actions, behind a confirmation |
| `quiet` | `ink-3` text, `ink` on hover | The least of them, inline |

**Sizes.** `sm` 28 px tall (10 px sides, 12.5 px text, radius 6), `md` 34 px (14 px sides, 13.5 px,
radius 9), `field` 38 px (an Input's height, for a button beside one), `lg` 44 px (20 px sides, 15 px,
radius 13). `IconButton` is a 32 px square, radius 9, `ink-3`, filling with `hover`.

**States.** Hover and press over 150 ms. Disabled: the primary fades to 45%, danger to 50%, the
others turn `ink-4`, and the cursor is the default one (the base sets that on `button:disabled`).
`loading` puts a 14 px spinner in the icon's place and disables the button (one without an icon
grows by the spinner). The ring is the base one.

**Use.** One primary per view. A dialog's footer is `flex justify-end gap-2`: Cancel (ghost), then
the primary or danger action, named for what it does ("Delete project", not "OK"); a destructive
one can stay disabled until a typed confirmation. `IconButton`'s `label` is its `aria-label` and
its `title`: tooltips in the app are native titles, with the shortcut in brackets
(`withShortcut()` gives "Details (d)").

**Traps.** `Button` sets no `type`: in a form, every Button but the submit needs `type="button"`.
A smaller IconButton can't come from `className` (`cn()` doesn't merge); style a plain button. A
button over a stretched link ([List rows](#list-rows-list-rowts)) must not use `disabled:pointer-events-none`, as IconButton does,
or a click on it while disabled falls through to the link: use `disabled:cursor-default` and
`enabled:hover:` fills.

**Building one like it.** A real `<button>` with a type, a height from the scale, hover as a fill
or a border, a press scale, a disabled state without pointer tricks, loading that keeps the label.

### Fields and forms (`form.tsx`, `name-fields.tsx`)

**Purpose.** `Field` puts a label over a control and a hint or an error under it. `Input`,
`SecretInput` and `Textarea` are the text controls, `Switch` the on/off one.

**Anatomy.** The label is 12.5 px, medium, `ink-2`, with an optional `action` at the right of its
row; 6 px between the parts. The hint is 12.5 px `ink-3`; an error takes its place in `danger`,
rises in, and is `role="alert"`; both wrap anywhere. `children` is a function given the id that ties
the label to the control. An Input is 38 px tall (`fieldHeight`), radius 9, `border-line-strong`,
`bg-sunken/60`, 12 px sides, 14 px text, an `ink-4` placeholder. Hover darkens the border; focus
turns it `accent/70` with a 3 px `accent-soft` halo; `aria-invalid` makes it `danger/60` (with a
`danger-soft` halo on focus); disabled is 60%.

**Layout rules.**

- Buttons and Selects that go with a field share its row, inside `children`, as tall as it
  (`size="field"`, a `md` Select): beside the Field, they would line up with its label or its hint.
  `fieldHeight` is exported for that, and a test checks the three heights stay equal.
- Fields side by side line up by their labels (`items-start`), so that a hint or an error under one
  moves nothing. `NameFields` puts first and last names in two columns from 640 px, stacked on
  phones, with the `given-name` and `family-name` autocompletes.
- An error from the API shows under the Field it names, and in a Banner only when it names no field
  on the form. An error for a field the form doesn't show appears nowhere: map it to one that does.

**The other controls.**

- `SecretInput` (an API key, say) is a text field masked with `-webkit-text-security: disc`, not a
  password field: browsers fill saved passwords into password fields whatever `autocomplete` says,
  and offer to save what is typed there. Spellcheck is off too (some browsers send text away).
- `Textarea` grows with its text from 2 to 14 rows; `bare` drops the frame for composers. Browsers
  count an empty textarea's placeholder in its height, so a long one grows it until the first key.
- `TextareaControls` is the row under a bare textarea (over it, controls would cover the end of the
  text once it scrolls). A press between the controls focuses the textarea; presses on controls, and
  in lists they opened (`[popover]`), stay theirs.
- `Switch` is a `role="switch"` button, 36 × 20 px: off, a `raised` track and an `ink-3` thumb; on,
  `highlight` with an ink thumb 16 px along (250 ms, spring). Its `label` is its accessible name and
  the visible text sits beside it (Settings' `SwitchRow`: 13.5 px label, 12 px hint, `line` between
  rows).

**Building one like it.** Label above, help below; the error replaces the hint and is announced;
the control fills the width and is 38 px tall; whatever acts on it shares its row.

### Select (`select.tsx`)

**Purpose.** Every choice of one value from a list. Never a native `<select>`: its list can't show
icons, second lines or sections, and it looks like each system rather than the app. This list opens
in the top layer, above dialogs and outside anything that clips.

**Anatomy.** The trigger is a button: `md` matches an Input (38 px, `bg-sunken/60`, 14 px), `sm`
(28 px, 12.5 px, `line` border, `hover` fill) sits in rows and toolbars. It is as wide as its widest
option, every label laid invisibly in one grid cell, so that a new value never moves its neighbours;
its chevron's arms swing round to point up while the list is open (300 ms, spring). The list is
`bg-raised/95` with a blur, radius 13, as wide as the trigger at least and 352 px at most, up to
384 px tall. An option has an optional icon, a 13 px label, an optional 12 px `ink-3` description
and an accent check; options can sit under section labels (11.5 px). On phones `narrow` and
`compact` show shorter labels in the trigger, while screen readers still hear the full ones.

**Keyboard** (the WAI-ARIA select-only combobox; the focus never leaves the trigger). Closed: Down,
Up, Enter or Space open on the selection; Home and End open on the first or last; a letter opens on
the match. Open: arrows move and stop at the ends, Page Up and Page Down move ten, Home and End,
Enter picks, Space picks unless you're typing (then it is part of the search), Alt+Up picks, Escape
closes (and only the list, not the dialog around it), Tab closes. Typing jumps to the option that
starts with what was typed within 700 ms; the same letter again moves on to the next one. Disabled
options are passed over.

**Mouse and touch.** A mouse opens it on press and picks on release over an option, as a Mac's menus
do. Touch and pens open it on click, so a swipe that starts on it still scrolls the page. A click
from assistive technology (`detail` 0) opens on the selection, with the ring. It closes on blur, on a
press elsewhere, Escape and Tab.

**Motion.** The list grows out of the trigger (200 ms) and its options settle in one after another;
a highlight glides after the pointer and the keys (200 ms, spring); the pick flashes (160 ms), its
check draws itself (320 ms), the list shrinks away (140 ms) and the new value rolls in, up or down by
where it sits in the list, with a little blur. On opening, the selection is scrolled to the middle.

**Traps it handles, which a new popover needs too.** Safari doesn't focus buttons on click, so the
trigger focuses itself on press. A tap's mousedown would take the focus away, and the list would
close on that blur just before the click opened it again: the trigger cancels `mousedown`. The list
cancels `mousedown`, not `pointerdown`, which would cancel taps in WebKit. iOS keeps the focus where
it was after a tap, so blur isn't enough: a capturing `pointerdown` outside closes it too. Without
the Popover API it is a plain fixed element. In tests, a second pick waits for the list to close (a
flash, then an animation happy-dom never ends, so a 400 ms fallback): advance fake timers a second.

**Building one like it.** Reuse `placeList()`, `followViewport()`, `step()` and `typeahead()` (the
repository picker reuses the first three). Trigger as `role="combobox"` with `aria-expanded`,
`aria-controls` and `aria-activedescendant`; list as `role="listbox"` with `popover="manual"`;
reserve the widest width; open on a mouse's press and on a finger's click; keep the focus on the
trigger; stop Escape; flash the pick.

### Menu (`overlay.tsx`)

**Purpose.** A short list of actions on something (rename, copy a link, sign out), anchored to its
trigger. For choosing a value, use Select.

**Anatomy.** At least 192 px wide, `bg-raised/95` with a blur, radius 13, 4 px inside,
`line-strong` border, rising in. Under the trigger with a 6 px gap, or over it with `side="top"`;
lined up with the trigger's end (default), its start, or both (`stretch`). `MenuItem`: 13 px `ink-2`
text, 10 px sides, 6 px of vertical padding (10 on coarse pointers), a 14 px `ink-4` icon, `line` fill
and `ink` on hover; `danger` items are red with a `danger-soft` fill. An item can be a link (`link`)
and still run `onClick` to close. `MenuSeparator` is a `line` rule.

**Behavior.** The trigger is a render prop given `toggle` and `open` (for its `aria-expanded` and
`aria-haspopup="menu"`); items get `close`. It closes on a press outside, on Escape, and when an
item calls `close`. The focus stays on the trigger; Tab reaches the items, which follow it.

**Gaps, by reading the code.** No arrow keys or type-ahead, though `role="menu"` promises them to
screen readers. Its Escape listener doesn't stop the key, so in a Dialog the same Escape would
likely close the dialog too. It isn't in the top layer but inside its trigger's box, so a parent
that clips or isolates its stacking covers it: the session view's rows isolate theirs, so menus
there open upward (`side="top"`).

### Dialog (`overlay.tsx`)

**Purpose.** A short task or a question to answer before going on: a form, a confirmation. The
native modal `<dialog>` brings the focus trap, Escape, the backdrop and the focus's return.

**Anatomy.** As wide as the screen less 32 px, up to 448 px (`wide`: 672 px), radius 18, `surface`,
`line-strong` border, a deep shadow; the backdrop black at 45% with a 3 px blur. Inside, 24 px of
padding; a header with a 22 px display title, an optional 13.5 px `ink-3` description, and a close X
(28 px, `ink-4`, filling with `hover`), 20 px above the content. It rises in and goes at once.

**Behavior.** The owner holds `open`; Escape, a click on the backdrop and the X call `onClose`. As it
opens it sets `autofocus` on itself, calls `showModal()` and focuses itself: Chrome and Safari ring
whatever a dialog focuses even when a click opened it, and its first button is the X. What it shows
mounts only once it is open, so an `autoFocus` inside takes the focus (on a closed dialog it did
nothing, and the X got a ring). Its contents unmount while it is closed: keep what must last in the
owner. `fit` makes it a column no taller than the screen allows, where a child with
`min-h-0 flex-auto` takes what is left and scrolls while the header and footer stay; under 600 px of
height the description gives up its room too. Its title names it and its description describes it.

**Traps.**

- React 19 hands a `<dialog>`'s `close` and `cancel` events to the components around it, through
  portals: a dialog opened from a sheet would close the sheet too, and the sheet would take the
  dialog's Escape. Wrap the handlers in `own()` (`web/src/lib/dialog.ts`), which acts only when the
  dialog itself is the target.
- Safari 26 (WebKit bug 289876) takes `flex-1`'s 0% basis for 0 in a column as tall as its contents,
  such as an open `<dialog>` with `open:flex`: the icon picker showed as a 50 px strip. Use
  `min-h-0 flex-auto`. Playwright's WebKit and Chromium lay `flex-1` out fine; a test checks the class.
- Measure or scroll after `showModal()`, once the dialog has a size. A `position: fixed` element
  inside is placed from the dialog's corner ([Motion](#motion)).
- A popover in a modal dialog needs `tabIndex={-1}` on itself (a press on its padding would send the
  focus to the body) and its own Escape handler that stops the key.
- Chromium's `<input type="search">` in a modal dialog takes the first Escape to clear itself:
  handle Escape in the field. The `close` event comes later: undo page state where you call `close()`.
- A press that starts inside and ends on the backdrop (selecting text) clicks the dialog element and
  would likely close it; the Sheet, the lightbox and the shortcuts dialog remember where the press
  started, and a new modal should too.
- Check the fit at 402 × 812, 390 × 664 and 375 × 548 with `isMobile` and `hasTouch`; the native
  dialog's own max height, the screen less 2 em, is what `fit` shrinks into.

### Sheet (`sheet.tsx`)

**Purpose.** A panel for what the page has no room for, such as a session's details on a phone. The
owner shows it by rendering it, and stops on `onClose`, once it has slid away.

**Anatomy.** On phones, along the bottom, as tall as what it holds (up to 88% of the screen, and at
least 40 px short of it), with 18 px top corners, a 36 × 5 px grab handle and an upward shadow; from
768 px, along the right, 340 px wide and the screen's height. The header (19 px title, description,
a 44 px close target around a 28 px circle) stays; the body scrolls, contained, clear of the home
indicator.

**Behavior.** A modal `<dialog>` that focuses itself (Safari would ring the X after a tap). Escape
and the X slide it away before it closes; a click beside it closes it unless the press started
inside; the focus goes back to its opener. On phones a finger pulls it down by its top, or by
anything in it once that is scrolled to the top, if it moves down more than sideways: past a quarter
of its height, or with a flick (0.4 px/ms over the last 100 ms, and 16 px), it goes, and anything
less settles back; the backdrop brightens as it is pulled. It slides in with `@starting-style`
(420 ms, ease-out) and away in 260 ms from wherever the finger left it, with a timer for when it
can't slide. It holds the page still (`useHoldPage`, shared by overlays opened from one another,
keeping a classic scrollbar's room so that the page doesn't shift).

**Building an overlay like these.** A native `<dialog>` and `showModal()`; `autofocus` on the dialog
and focus it; mount its contents once it is open; `close` and `cancel` through `own()`; a backdrop
click counts only when the press started there; pin it with `--viewport-shift`; hold the page if it
covers it; come in from where it comes from and leave quicker; try it at 375 × 548.

### Color popover (`color-popover.tsx`)

**Purpose.** A color of one's own (a project icon's, a workspace's): a saturation and brightness
square, a hue strip, a hex field, the eyedropper where the browser has one, a preview slot, and the
colors others in the workspace chose. It is the model for a non-modal editor anchored to a control.

**Anatomy.** 248 px wide (272 on coarse pointers), radius 18, `bg-raised/95` with a blur, 12 px
inside. Thumbs are white rings with a soft shadow, 16 px (24 on coarse pointers), growing a little
while dragged. The hue strip shows 12 px but takes presses over 24, so that it is easy to catch; the
square is shorter on a screen under 600 px tall. The colors in use are 24 px swatches (32 on coarse
pointers), the current one ringed.

**Behavior.** Arrows move a thumb by 1%, Shift by 10% (the hue by 1° and 10°). The hex field takes
six digits as you type and three once you're done, reads a pasted `#FF8800` or `ff 88 00`, and goes
back on anything else. Escape (closing only the popover) and Enter in the hex field close it and
give the focus back to the swatch; a press outside closes it and says what was pressed, so that a
press on another swatch can switch to it; so does the focus leaving. Each opening starts afresh. The
sliders are `role="slider"` with value texts that name the color ("orange: saturation 80%,
brightness 90%"); swatches are toggle buttons named by color and by who uses them.

**Building a popover like it.** `popover="manual"` and `showPopover()` for the top layer, with a
fixed-position fallback; `role="dialog"` and a label; `tabIndex={-1}` on the box; its own Escape;
close on a press outside and on the focus leaving; place it with `placeList()` (kept inside its
dialog here) and follow the viewport; `listbox-in` and `listbox-out`, unmounting on `animationend`
with a timer for when it doesn't come.

### Lightbox and Gallery (`lightbox.tsx`, `gallery.tsx`)

**Purpose.** Screenshots and videos at full size over the page, stepping through all the pictures of
a page in the order it shows them.

**Gallery.** Wrap a page in `Gallery`; each picture calls `useLightbox(item)`, puts `ref` on what
shows it (its place in the order) and calls `open()`. Pictures that arrive while it is open join in;
one that moved (a message that was sending, sent) is found again by its address. Without a Gallery,
`useLightbox` gives a lightbox of its own to render. Thumbnails are real links (`cursor-zoom-in`):
`plainClick(e)` lets a plain click open the lightbox and leaves a modified one to open a tab.

**Thumbnail** (`thumbnail.tsx`). The picture in such a link, in a frame (border, radius,
`overflow-hidden`) that takes its size: as tall as its row (96 px for images an agent read, 144 px
for messages' and published ones) and as wide as the image's proportions make it, up to a widest
(288 or 320 px). A wider image shows whole at that width, shorter than the row, and a taller one
narrower, down to a third of the row on the short side: past that, the image is cut about its
middle (`object-cover`). One whose size is known takes its room before it loads; any other is as
tall as the row until it loads. On a screen narrower than it, the frame narrows and cuts the image.

**Anatomy.** A full-screen transparent `<dialog>`; the backdrop black at 75% with a blur, fading
in; the picture zooming in from 97%, within the screen less 8 rem of height, with a border and a
deep shadow. Round translucent pills: the X at the top right, "2 of 5" at the top left (mono,
announced politely), step buttons at the sides, and the caption with the name, dimensions, size and
a download button. Touch screens get neither the step buttons (fingers swipe) nor the download (iOS
answers a download with a sheet of its own).

**Behavior.** Arrow keys step, but not with a modifier (⌘← goes back); a click outside the picture
and its caption closes, unless the press started on them; Escape closes; the focus returns. At the
ends the step buttons are `aria-disabled`, not disabled, so they keep the focus. A swipe brings the
next picture in (a quarter of the width, or a flick), resisting at the ends; two fingers zoom an
image four times, or to its own size if that is more; one finger moves it and lets it glide; a double
tap zooms in three times or back out; past an image's edge a sideways move swipes on. The pictures
beside the current one wait out of sight, loaded and `inert`. A video alone leaves fingers to its
player. A file that fails says so ("This browser can't play x.webm.").

**Building a gesture like these.** A small class fed measurements (`Pull`, `Swipe`, `Zoom`), so that
tests can drive it; touch events with a non-passive `touchmove`; start past a slop and along the
axis; follow 1:1, resisting where there is nothing more; decide by a quarter of the size or a flick;
settle with a CSS transition from where the finger left, with a timer in case `transitionend` never
comes; leave the mouse's drags to the browser.

### CodeInput (`code-input.tsx`)

**Purpose.** A six-digit code from an authenticator app. One real input takes it, so pasting, the
phone's one-time-code suggestions and password managers fill it at once; it shows as six boxes in two
groups of three.

**Anatomy and states.** Boxes 40 × 48 px (44 × 52 from 640 px), radius 9, 22 px mono digits; the
transparent input lies over them (`inputMode="numeric"`, `autocomplete="one-time-code"`). The current
box has the field focus style and a blinking caret. A wrong code turns the borders red and shakes the
row (380 ms; an `errors` counter shakes it again); busy dims it; a right code fills the boxes with
`accent-soft` one after another, 35 ms apart. Digits pop in. The caret stays at the end: arrow keys
do nothing, since the boxes show where it is. `onComplete` fires on the sixth digit. The lesson for
anything like it: keep one real input, which autofill and paste understand, and draw the rest.

### Feedback (`feedback.tsx`, `danger-zone.tsx`)

- **Toasts**, `toast(text, tone)`: what just happened, in a sentence ("Deleted the note"). Bottom
  right, clear of safe areas, at most 384 px wide, `bg-raised/95` with a blur, a 6 px dot in the
  accent (ok), `danger` (error) or `blue` (info), and a dismiss X. They rise in, last 3.2 s (6 s for
  an error), keep the last four, and are read out politely. Call `toast()` from `useMutation`'s
  options, not from callbacks passed to `mutate()`, which TanStack Query skips once the component
  that called it unmounts.
- **Banner**: what the page must say until it changes: `info` (blue), `warn` (amber), `error`
  (danger), `ok` (accent), each a `-soft` fill, a quiet border, `ink-2` text and an icon in the tone;
  radius 13, 13.5 px, wrapping long words. `role="alert"` for errors, `status` otherwise.
- **Empty**: a centered 20 px title, a sentence or two of `ink-3` on what will be here and how it
  gets here, an optional action, and a large thin icon (`size-7`, stroke 1.5).
- **Skeleton**: a `raised` block with a gradient passing over it (2.2 s), sized like what it stands
  for (`h-8.5 w-40` for a button), so that nothing jumps when the real thing comes.
- **Spinner**: a 16 px ring with a quarter arc in `currentColor`; 14 px in buttons.
- **DangerZone**: a red-bordered section, radius 18, headed "Danger zone" in red, with a description
  and one `danger` button whose confirmation dialog goes in `children`.

### Signs of work (`dot-wave.tsx`, `misc.tsx`, `app.css`)

- **DotWave**: three by three dots on a 16-unit square (14 px) in the text's color, the new session
  view's sign of work in place of the Spinner (passed down as `BusyMark`). A wave of light runs
  through them from one corner to the other (1.4 s; each diagonal from the corner 0.1 s later), then
  rests; with motion reduced the dots hold still, brighter toward that corner. With `label` it is an
  image of that name, otherwise hidden from screen readers.
- **Text shimmer** (`.text-shimmer`): the label shows in `ink-3` while a soft band of ink passes over
  it (2 s) and rests (2 s), for what is under way ("Working", "Thinking", the step being taken). Put
  it on the text itself: on a wider box the light hurries past.
- **StatusDot and StatusPill**: an 8 px dot in the status color, its halo pinging every 2 s while the
  session is live (starting, preparing, working, stopping); the pill adds a 12.5 px label in the same
  color ("Working", "Waiting", "Paused", "Failed").
- The busy ring, the thinking mark's comet and the soft pulse (a 6 px dot breathing every 2.4 s)
  complete the set. A new one: one color, a cycle of a second or two with a rest, its name added to
  `SYNCED` in `shimmer.ts`, a still version, and silent for screen readers unless labelled.

### Kbd, CopyButton and CodeBox (`misc.tsx`)

- **Kbd** is a keycap: `sm` (18 px, 10.5 px text, `ink-3`) in hints, `md` (22 px, 11.5 px, `ink-2`,
  an inset line at its foot) where shortcuts are listed; `raised`, `line-strong` border, Inter. Keys
  are written as each system names them (`shortcutText()`: "⌘B" on Apple's, "Ctrl+B" elsewhere;
  Playwright's WebKit reports a Mac). Screen readers get the combination as text and the caps hidden
  (`Combo` in `components/shell/shortcuts.tsx`).
- **CopyButton**: 12 px `ink-3`, filling with `hover`; a click turns its icon into an accent check
  (200 ms) and "Copy" into "Copied" for 1.6 s. Nothing tells of a clipboard that refused.
- **CodeBox**: a command or secret shown once, 12.5 px mono on `sunken`, scrolling sideways, with the
  CopyButton at its end (at its top for several lines).

### Icons (`icons.tsx`)

Lucide (`lucide-react`) for almost everything: 16 px (`size-4`) by default, 14 px (`size-3.5`) in
dense controls, `size-7` with a 1.5 stroke for empty states. `icons.tsx` holds what lucide lacks:
GitHub's mark and octicons for pull requests, checks, conflicts and reviews, drawn as GitHub draws
them (16 units, filled) so that people know them at a glance; Linear's mark; and fctl's own, drawn on
lucide's grid (24 units, round 2-unit strokes) so that they sit beside its icons. Every icon is
`aria-hidden`; the button or text around it names it. Live variants animate through `app.css` and
hold still where motion is reduced: `AgentFloorIcon` (packets run down three traces into a core
that flashes as they land, while an ancestor has `data-lit`), `EyeIcon` (its pupil reads along a
line while a review runs) and `ThoughtIcon`, thinking as a monitor's trace (a small wave, a spike,
a slow wave) in blue turning pink, along which a comet runs while a thought streams in. It replaced
a cloud that didn't feel right, for something closer to a signal; a flowing sine was the runner-up.
`EffortIcon` draws Claude Code's own symbols for effort (○ ◐ ● ◉ ◈, a dotted circle for the
default), which people know from the terminal.

### Logo, Avatar, Section and Meta (`misc.tsx`)

- **Logo**: the mark (this package's `mark`) at 22 px and "fctl" at 15 px semibold; `large` makes
  them 26 and 17 px on phones, in the top bar.
- **Avatar**: the person's picture, or their initials in blackish on a brand fill (yellow, pink,
  blue, lime) picked by their id; 24 px by default. It shows only a picture uploaded to the app or an
  address on another site: one on the app's own origin would be fetched with the viewer's cookies
  and act for them. A picture that fails falls back to initials. `AvatarStack` overlaps them by
  6 px, ringed in the canvas color, and ends with "+3".
- **Section** lays out a part of a page: the title and description in a 260 px column beside the
  contents from 768 px, sections divided by `line`; in Settings (`SectionLayout`) stacked, the
  actions beside the title or under it where they don't fit.
- **Meta** is a line of facts with a dot between them. Each fact carries its dot in a margin the line
  hides, so that a wrapped line starts with a fact, and a fact hidden on phones takes its dot along.

### List rows (`list-row.ts`)

A row of a list that opens something as a whole (a session on the Agent Floor, a project). No arrow
says so: the row fills with `hover` as a tile 12 px wider than the list on each side, radius 13, so
that its contents line up with the heading above; the lines above and below it give way. `ROW` goes on
the row (it fills on hover, on press, and while its link has the keyboard's focus), `ROW_COVER` on the
link whose `::after` covers the row and draws its ring as an inset outline, `ROW_ABOVE` on links and
buttons inside the row, which lie over the cover (a link can't hold links). The line is a border, the
ring an outline, so that both survive forced colors; a test says so.

### GLCanvas (`gl-canvas.tsx`)

Mounts one of this package's WebGL scenes (`src/gl/`) on a canvas that fills its parent and takes no
pointer events. `mount()` renders at a reduced resolution (0.6 of the pixel ratio, itself capped at
2, or chunky with `pixel`), caps the frame rate, pauses when the tab or the canvas is hidden,
survives a lost context, draws one still frame where motion is reduced, and marks the canvas
`data-webgl="unavailable"` without WebGL (give the page a fallback). The factory and options are read
once: keep a handle from inside the factory to change the scene later (as the home page and the
Agent Floor's row do), and call its `invalidate()` after a change so that a still frame is redrawn.

### Choosing between them

| Need | Use |
|---|---|
| One value from a list | Select |
| A few actions on something | Menu |
| A short task or a question that must be answered | Dialog |
| What the page has no room for, on a phone especially | Sheet |
| An editor anchored to a control, in or out of a dialog | A top-layer popover like the color popover |
| Pictures and videos at full size | Lightbox, in a Gallery |
| What just happened | toast |
| What stays true until it changes | Banner |

## app.css, block by block

| Block | What it does, and why |
|---|---|
| `fieldset { min-width: 0 }` | A fieldset as wide as its container, so a row in it wraps instead of widening the page |
| `--viewport-shift`, `::backdrop` | Backdrops move with the screen under Safari's phantom keyboard ([Phones, Safari and the viewport](#phones-safari-and-the-viewport)) |
| `--safe-top`, `body::before` | How much of the page's top the status bar and iOS's frosted band under it cover, and a band of `canvas` over it: 0, but when Safari lays the iPhone app out under the bar ([Phones, Safari and the viewport](#phones-safari-and-the-viewport)) |
| `.prose-fctl`, `.prose-note` | Agent answers and descriptions: 15.5 px, line height 1.7, accent links with a faint underline, code on `raised` and `sunken`; everything wraps anywhere except table cells, which break at words so that a column isn't one letter wide. `.prose-note` is the compact version |
| `.shiki`, `--c-added`, `.diff*`, `[data-play]` | Code in both themes; diffs with green additions (only for files), red removals and gutters that stay put, writing themselves in as the agent works |
| `[data-quiet-focus]` | No ring on what gets the focus back from an overlay a click opened |
| `.title-hot`, `--composer-shadow`, `.rule-fade` | Yellow headline words with a pink full stop (a lime highlighter stroke on light); the home composer's lift, deepening on focus instead of a ring; a hairline fading at both ends |
| `.text-shimmer`, `.dot-wave`, `.busy-ring`, `.thought-*` | The signs of work ([Signs of work](#signs-of-work-dot-wavetsx-misctsx-appcss)) |
| `::highlight(fctl-find…)` | Find in page: matches marked in yellow (lime on light), the current one filled |
| `.thread*`, `.step-in`, now line, `.floor-*`, `.eye-reading`, `row-moved`… | The session page's and the sidebar's live motion, each with a still version |
| listbox, `roll`, `draw`, `zoom-in`, `.lightbox-*`, `.sheet`, `shake`, `pop` | The kit's motion ([Components](#components)) |
| `.print-sheet`, `html[data-dragging]` | Printing recovery codes prints only them; a grabbing cursor and no selection while dragging |
| The reduced-motion switch | Every animation and transition cut to one 0.01 ms run ([Motion](#motion)) |
| `::view-transition-*(root)` | Pages and themes cross-fade in 220 ms |
| `settings-pages` | Settings' list of pages stays out of the cross-fade so that its highlight can slide: an element given a view transition name is drawn above the whole page and would cover the labels it passes |
| `.stream-screen*` | The not-found and error pages, with plain text where WebGL is missing |
| `--p-*`, `.pi-own` | Project icon colors per theme; a color of one's own shaded to 4.5:1 in each |

Whatever is on screen at the first frame after a click lands in the view transition's snapshot and
fades out over the new page: take transient things away at once (`display: none`, no transition),
as the phone drawer does.

## Testing the kit

- happy-dom lays nothing out, so tests check the classes that do (a Dialog's column is `flex-auto`,
  list rows use outlines and borders, field heights match) and drive gestures through `Pull`,
  `Swipe` and `Zoom`. It matches `:focus-visible` on any focused element: stub `matches` to test a
  pointer path. `components/session/transcript.test.tsx` mocks `@/components/ui` with a fixed list:
  a transcript component that uses another export needs it added there.
- In Playwright, `pointer-coarse:` applies only with `isMobile` and `hasTouch`; screenshots hide
  scrollbars unless launched without `--hide-scrollbars` (thin ones take 10 px where scrollbars always
  show); WebKit there draws translucency see-through and renders in software, so judge blur and frame
  rates in Chromium or on a device. Move the mouse away before a screenshot, or what opened under it
  shows hovered. Check both themes, a phone's width, forced colors and reduced motion.

## Principles at work here

1. **Semantic tokens, a shade per theme.** Accent is ink on light; red means danger only.
2. **Hover is a translucent fill, only where hover exists**, and what it reveals has a way in by
   touch and by keyboard.
3. **Native first**: `<dialog>` for modality, Escape and focus return, the top layer for what must
   escape clipping, `own()` to keep nested dialogs apart.
4. **The focus is always somewhere sensible**: overlays focus themselves, lists keep it on their
   trigger, the innermost thing takes Escape, and rings are for the keyboard.
5. **Rings are outlines and lines are borders**, so that forced colors keep them.
6. **Motion says where things come from and what changed**: grown from their trigger, gone faster
   than they came, easing out as they arrive and springing as they answer, each with a still version.
7. **Signs of work are one color and calm**, the accent, all in step.
8. **Touch is a first-class pointer**: bigger targets, gestures that follow the finger and decide by
   distance or flick, nothing that steals a scroll.
9. **Nothing jumps and nothing overflows**: one height per row, widths kept for the widest value,
   fields aligned by their labels, long words wrapped, cards laid out by their own width.
10. **Plain words, and the reason beside the code**: sentence case, no decorative labels, copy that
    says what happens, and every non-obvious choice explained in a comment and held by a test.
