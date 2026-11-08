# Verifying a change to the interface

A change to what people see isn't done until it has been seen: in both
themes, at a phone's width and a computer's, in Chromium and in WebKit
(Safari's engine), with real data, and, for anything that moves, frame by
frame. Tests catch logic; only looking catches a mark that sits 4 px above
its line, or a pill that flickers when a count changes. These recipes are for
hyperstructure/fctl's web app; its `.claude/skills/screenshots/SKILL.md` has
the pull request side (which screenshots to take, how to publish them).

## A world to look at

- **`cargo xtask demo`** loads a made-up company with people, projects,
  sessions, reviews, memory and retrospectives into a local stack, and
  serves the working tree's web app at `http://localhost:5173` (changes show
  as you save). From a cold sandbox it takes about 12 minutes to build;
  warm, a few. `.fctl-demo/shots.json` holds a signed-in cookie and the
  app's address.
- **Live sessions on demand**: agents in the dev and demo stacks run
  fake-claude, which acts out words in its prompt: `explore 4` (thoughts
  with token counts, folded runs of calls), `slow` (streams for ten seconds),
  `watch 25` (one call that lasts 25 s), `background 60` (a shell command in
  the background; the session waits for it), `delegate … in the background`
  (a subagent), `retro`, `revise` (a retrospective and its update), `ask
  Ship it? / Yes / No` (a question). Start one with `POST
  /api/v1/projects/<slug>/sessions` (the cookie as a `Cookie` header, an
  `Origin` of `http://localhost:5173`, `{"prompt": "explore 3 then
  background 30"}`); send more with `POST /api/v1/sessions/<id>/messages`.
- The demo's runner has few slots. Sessions waiting on long background
  tasks hold theirs; stop old ones (`POST /api/v1/sessions/<id>/stop`) when
  new ones sit in "Waiting for a runner".
- For pages that only need a few API answers, run vite alone and answer
  `/api/` with Playwright's `page.route` (fctl's notes list which routes each
  page needs).

## Both engines

- **Chromium** is Playwright's default. For shortcuts shown with ⌘, give
  the context a Mac user agent.
- **WebKit** can't keep the `__Host-` sign-in cookie over plain http: serve
  the app over https on a second port (vite's `createServer` with a
  self-signed localhost certificate) and add the cookie with
  `url: "https://localhost:5174"` and `ignoreHTTPSErrors`.
- Headless WebKit on Linux draws what's behind a `backdrop-filter` surface
  as if it were see-through. Judge translucent surfaces in Chromium or a
  real Safari, and make popovers that must stay readable solid.
- Playwright's current WebKit is ahead of the Safari people have: a bug
  in Safari 26 (a `min-h-0 flex-1` child given no height in a fit-content
  column) doesn't reproduce there. Install the older WebKit build to chase
  one.
- Playwright's WebKit reports a Mac user agent even on Linux, so the app's
  shortcuts take ⌘ there: check Ctrl shortcuts in Chromium or Firefox.

## Sizes, themes and preferences

- A phone: a 390 × 844 viewport, `isMobile` and `hasTouch` (touch changes
  hover and tap behavior). A computer: 1280 or 1440 wide.
- Both themes: `colorScheme: "dark" | "light"` on the context, which the app
  follows unless a choice is kept in `localStorage` (`fctl-theme`). Preferences
  such as the session view (`fctl:session-view`) go in through
  `addInitScript`.
- Forced colors (Windows' contrast themes): `page.emulateMedia({
  forcedColors: "active" })` in Chromium. Check that focus rings and
  dividers survive.
- Reduced motion: `page.emulateMedia({ reducedMotion: "reduce" })`. Check
  that nothing loops and that still states still say what motion said.

## Stills

- Take screenshots at `deviceScaleFactor: 2` (or 3 for a close look), and
  clip to the component (`clip` or `locator.screenshot()`), with some
  context around it.
- **Settled stills**: `page.screenshot({ animations: "disabled" })` fast-forwards
  finite animations and resets loops, so a still isn't caught mid-roll.
- Sticky headers and footers cover what scrolls under them: scroll the
  component into the middle of the view before shooting.
- **Before and after**: serve `main` beside the branch against the same
  stack: `git worktree add /tmp/main-wt origin/main`, give it a
  `node_modules` of symlinks to the workspace's, except the fonts package,
  which must be a real copy (vite refuses files whose real path is outside
  the worktree, and the page falls back to a system font), and run vite on
  another port there.

## Motion, frame by frame

- **Recordings are 1x**: Playwright's `recordVideo` and Chromium's CDP
  screencast capture at CSS pixels whatever the scale factor. For a crisp 2x
  clip of a small region, loop `page.screenshot({ clip })` (about 40 ms a
  shot for a 780 × 120 region), keep each shot's time, and assemble them with
  ffmpeg's concat demuxer (each shot lasting until the next one's time) into
  an animated WebP (`-c:v libwebp_anim -loop 0`).
- **Look at the frames**: a contact sheet (`magick montage`) of every frame
  around a change shows what a person would only half-see: an old label
  collapsing mid-roll, two labels overlapping, a blank moment, a jump.
  Keeping only the frames that differ (`magick compare -metric AE`) makes the
  sheet readable.
- **Log what it says** while it changes: poll the component's text every
  250 ms (minus copies on their way out) and print each change with its time.
  This found a pill that vanished for 300 ms and a "Your turn" that flashed
  during a 5 ms status.
- The sandbox's ffmpeg can encode animated WebP but not decode it: check
  frames from the source shots, not from the WebP.

## Measure, don't eyeball

When alignment matters, measure it in the page:

- An icon against its line of text: compare the icon's
  `getBoundingClientRect()` center with the first line box of the text
  (`document.createRange()` over its contents, `getClientRects()[0]`).
- Closed against open: read the columns' x positions before and after a
  toggle; they should be equal to the pixel.
- What's on top: `document.elementFromPoint()` at a control's center tells
  whether something covers it (a footer that passes taps through, a row
  that isolates its stacking).

## Before you call it done

- [ ] Both themes, phone and computer, Chromium and WebKit.
- [ ] Every state: empty, one, many, too many, too long, loading, failed,
      live, ended.
- [ ] Keyboard: Tab order, Escape, focus returning where it came from.
- [ ] Touch: nothing that needs hover; targets big enough.
- [ ] Reduced motion and forced colors.
- [ ] Motion checked frame by frame; alignment measured.
- [ ] Screenshots before and after in the pull request, a clip for motion.
