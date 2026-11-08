# Pages that explain and invite

How fctl's web app introduces a feature before anyone turns it on, walks people through setting it up, and keeps
explaining itself once it runs: a workspace's Runners tab and settings, a project's Reviews, Schedules and Tickets
tabs, connecting Claude, GitHub and Linear, two-factor sign-in, memory and retrospectives, and the hints, warnings
and empty states around them.

Written from the code on `main` (`web/src`, whose comments carry most of the reasons), the project's docs, ADRs and
tests, and the notes earlier agents left. Paths are relative to `web/src` unless they say otherwise. Sizes are CSS
pixels. The companion page on lists and pages covers rows, status dots, `Field`, `Empty`, `Banner`, dialogs and the
danger zone; this page uses them.

Words: a *runner* is a machine that runs sessions; the *host* is the `fctl host` service on it. An *intro* is what a
tab shows before its feature is on. A *preview* is a small, made-up picture of what the feature produces, drawn beside
the intro.

## The idea

### Why these pages teach instead of listing switches

Most of fctl's features act on someone's behalf, somewhere else, and that shapes every page here:

- **They spend someone's subscription and machines.** Review agents run on an owner's Claude plan; schedules start
  sessions on their owner's; a runner gives agents its CPUs, its disk and every session's code and secrets. The
  switch says so beside it, by name ("They run on your Claude subscription."), not in a help page.
- **Their result shows up outside the app.** A review is posted on GitHub, a ticket moves in Linear, a runner is set
  up in a terminal. Nobody can see that from the switch, so the page draws it: the review as it will look on the pull
  request, the ticket as it will look in Linear, the schedule's week.
- **Responsibility is split.** Workspace admins add runners and connect GitHub and Linear; project owners turn review
  agents on; maintainers choose the tracker; members can only ask. A greyed-out button leaves people stuck, so every
  page says who can act, and names them where it can.
- **The first visit is to an empty page.** Switches with nothing behind them give no reason to start. The first visit
  shows what the feature does, what it would look like here and a place to start: an idea, a command, one button.
- **Mistakes are costly and quiet.** A runner token in the wrong hands reads every session's secrets; a Claude
  sign-in on someone else's runner can hand over the login. The warning sits where the risk comes up, with the safer
  way beside it.

So these pages read like a short, specific briefing that ends in one action, not like a form.

### The shape they share

1. **A headline that names the outcome**, not the feature: "A review of every new commit", "Sessions that start on
   their own", "Where agents track their work", "Delegate Linear issues to fctl". Display face, 28 px (26 on a phone
   on the tracker pages), sentence case, nothing above it.
2. **A lead paragraph built from this place's facts**: its repositories, the apps that open its pull requests, its
   admins. It says what would happen *here* (15 px `ink-3`, at most 576 px wide).
3. **Three or four points**, a 16 px icon and one sentence each (13.5 px `ink-2`): what it does, what it leaves
   alone, its limits.
4. **A preview at the side**: the result, small and made up, drawn with the app's own components.
5. **One primary action** with a quiet note of what it costs and who can change it; for people who can't act, one
   sentence saying who can.

Once the feature is on, the intro goes. In its place: the configuration as a sentence ("They review each new commit
of the pull requests in acme/web, on your Claude subscription, with Opus at high effort."), what the feature did
(reviews, runs, tickets lately) and the settings a click away. Explanations shrink to hints under fields, and an
empty list says what will fill it, and when.

## A workspace's Runners tab

(routes/workspace.tsx `Runners`, `AddRunner`; components/workspace/runners.tsx; components/runner-driver.tsx;
lib/enrollment.ts; lib/install.ts)

**Purpose.** Bring machines online for the workspace, see whose each is and whose sessions it runs, and look after
them, after teaching a model that's easy to get wrong: whose runner runs whose sessions, and what a runner sees.

**Anatomy, top to bottom.**

1. **The model in one paragraph** (14 px `ink-3`, at most 672 px), for everyone: "Runners are the machines that run
   sessions: on each, the `fctl host` service runs every session in a sandbox of its own. Sessions in {workspace}
   start only on these, which see their code, secrets and Claude tokens while they work. A runner belongs to the
   person who registered it, who can let it work for several workspaces, or to {workspace} itself when it enrolled
   with one of its enrollment tokens for everyone's sessions. Its own and the ones its admins add run everyone's
   sessions; one a member adds, or enrolls with a token of their own, runs only theirs." One more sentence shows only
   to those it concerns, with a link: "Your sessions here run on the Claude token you keep on your runners, so only
   on yours that keep it (Settings → Claude)." or "You run your sessions here only on your own runners (Settings)."
2. **Runners that wait for your approval**: an amber card, only while some do.
3. **Register a machine**: a name field ("studio mac") with Register in its row; beside it, when you have runners that
   aren't here, "Or add one of yours", whose options say where each works already ("Also runs Side project").
4. **The runners**, then **how to bring a machine online** (straight under the form while there's none), then
   **enrollment tokens** (`#enrollment-tokens`), for machines nobody signs in on.

**A runner's row.** An 8 px dot; the name and a state word (12 px `ink-4`: "online", "offline", "draining", "driver
not ready", "disabled"); pills only where they matter: "Only your sessions" or "Only {name}'s sessions", "Keeps your
Claude token" (accent-soft, with a shield). Facts: "{workspace}'s docker runner · 1/4 sessions · seen 5 minutes ago"
("never connected" for one that never was). Lines that show only when true: the driver problem in amber, "Enrolled
with “Build fleet”", "Removed once offline for 5 minutes", "Also runs" with the other workspaces' avatars. At the end,
a ⋯ menu for the workspace's own runners and your own that enrolled here (Rename…, Drain, Disable, Replace token…,
Remove…), Take out for a runner added from elsewhere, Remove for a member's runner that enrolled here.

**The setup steps** (`AddRunner`): a 20 px display heading, a lead, then numbered steps between hairlines (a 24 px
circle with the number in mono 11.5 px, a 14.5 px medium title, a 13.5 px `ink-3` body that stacks its CodeBoxes).

- Heading and lead follow the situation: "No runners yet" with "{workspace}'s sessions wait until one of its runners
  is online."; an admin with runners gets "Add another runner" with "With more runners, more of {workspace}'s sessions
  run at once."; a member gets "Add a runner of yours" with "Its admins add runners for everyone's sessions ({name} is
  its primary admin); one you add runs only yours, on a machine you control." The lead ends pointing into the steps:
  "To bring a machine online:", or "Add one of yours above, or bring another machine online:".
- 1, "Choose a machine that stays on": "A Mac with Apple silicon or a Linux machine. Agents work there in sandboxes:
  install Apple's container on macOS 26 or later, Lima on older macOS, or Docker on Linux." A prerequisite, not a
  command, and it comes first.
- 2, "Install fctl on it": the installer's one-liner in a CodeBox, then "Or with Homebrew:" and the brew command.
- 3, "Register it for {workspace}" (a member's: "Register it for your sessions in {workspace}"): "Sign in, then
  register it as a runner and start its host service, which runs the sessions it takes. It shows up here as online
  within seconds." CodeBoxes `fctl login {this app's origin}` and `fctl host install --workspace {slug}`. Under them,
  in 12.5 px `ink-4`, the two other ways, each put as the question that leads to it: "Rather not sign in there? Name
  it above and choose Register for a command with a token. Many machines, or ones that autoscaling starts? Enroll
  them with an enrollment token." (a link down the page).
- 4, only while your sessions run on a Claude token kept on your runners: "Keep your Claude token on it", with
  `claude setup-token` and `fctl host claude set-token`.
- Register itself opens "Bring {name} online": "Run these on the machine. It runs {workspace}'s sessions. The token is
  shown once and lets the machine run sessions: keep it private.", the two commands (the second with the token), and
  "It shows up here as online within seconds. Add it to your other workspaces from their Runners tab."

**Enrollment tokens.** The paragraph says what they're for before what they are: "For machines that autoscaling
creates, or that you set up without signing in on them: each enrolls itself with a token, and gets a token of its
own.", then whose the runners will be, and "How enrollment works ↗" (fctl.sh's guide). Token rows carry state pills
("Full" in amber, "Revoked", "Expired"), a sentence of what the token does and facts ("3 of 20 runners · 1 waiting ·
last enrolled one 2 hours ago · made by you"); ended ones fold behind "Show 2 revoked or expired". The form explains
each choice inside its options rather than above them:

- Name ("What it's for, which the runners it enrolls show."); Runs, for admins ("Everyone's sessions": "The
  workspace's runners, which its admins manage"; "Only my sessions": "Your runners, for Only on my runners and a
  Claude token kept on them"); Runners at once (empty for no limit, "Removed and rejected ones free their place.").
- When they go offline: each option says when to pick it. "Keep them" ("They stay until someone removes them."),
  "Remove after 5 minutes" ("For machines autoscaling destroys without uninstalling."), after 15 minutes ("The same,
  through a short network outage."), after a day ("For machines that are off overnight."), after a week ("Through a
  weekend.").
- Approve each runner: "Runners it enrolls wait on this tab, with where they enrolled from, until an admin approves
  them; until then they run nothing. {workspace}'s admins get a notification."
- **A live summary** in a sunken box (`aria-live="polite"`), rewritten as the form changes, in the CLI's words
  (`describeEnrollment` mirrors `fctl_domain::enrollment::describe`): "Enrolls up to 20 runners at a time, which wait
  for an admin's approval and are removed once they have been offline for 5 minutes. It expires on February 6, 2027."

Created: an amber "Copy it now: it is shown once. Whoever has it enrolls machines in {workspace}, which wait for an
admin's approval." over the secret, the steps (the enroll command one variable a line, ready for a boot script), and a
footnote for what bites: "on Linux, where nobody logs in, run loginctl enable-linger for that user first. Run again,
the install keeps the runner the machine enrolled."

**States.**

| State | What people see |
|---|---|
| Loading | Nothing about adding a runner until the list has loaded (a test pins it), so "No runners yet" never flashes on a workspace that has some. |
| None yet | "No runners yet" and the steps right under the form; the workspace's header says "no runners yet" beside a grey dot. |
| Online | Accent dot with a soft glow; the header counts "2 of 3 runners online". |
| Offline | Grey dot, "offline", and "seen 3 hours ago" or "never connected". |
| Busy | No word of its own: the facts say "4/4 sessions", and a session waiting for room says "Waiting for a runner". |
| Draining | Amber dot, "draining"; the toast says what it means: "Draining {name}: no new sessions start on it". |
| Driver not ready | Amber dot and an amber line with the host's own reason, backticked commands in the code font, and what follows: "Its docker driver isn't ready: {reason}. No new sessions start on it until it is." |
| Disabled | Red dot, "disabled". |
| Waiting for approval | Out of the list, in an amber card above the form; a count in a highlight pill on the tab; an amber "2 waiting for approval" link in the header for admins; a notice on the Agent Floor. |
| Short of disk | Not on this tab: the instance admin's runner list, the Agent Floor's summary and the session page say it ([Why sessions wait: runners elsewhere](#why-sessions-wait-runners-elsewhere)). Whether the workspace's list should too is open. |

The approval card (an hourglass in a 28 px amber circle): "A runner waits for your approval", then "Until an admin
approves it, it runs nothing and gets none of {workspace}'s code, secrets or tokens. Approve only machines you know:
fctl host status on each shows its id." Each runner shows what it said of itself (its machine, "ip-10-0-3-17 ·
linux/x86_64 · docker · 4 CPUs, 8 GiB · fctl 0.28.0", and its id in mono), "Enrolled 3 minutes ago with “Build fleet”
from 203.0.113.7 (Stockholm, SE)." and "Removed in 2 days unless approved." [Reject] [✓ Approve].

**Behavior.** Approving says what follows ("{name} runs {workspace}'s sessions now"); rejecting asks first ("It is
removed, and its token stops working… could enroll again while the token works."). Disabling a runner that runs
sessions offers the gentler way as the dialog's other button: "The 2 sessions it runs stop within ten minutes;
draining it first lets them finish." [Drain instead] [Disable]. Taking one out says who can undo it ("You can add it
again." or "Only its owner can add it again."). A replaced token is shown once, with "On the machine, as the user its
host service runs as:".

**Edge cases.** Commands are made for this instance: the installer comes from the site beside the app (an app at
app.{domain} uses {domain}'s, any other host fctl.sh's), and `fctl login` and `FCTL_SERVER` carry the app's own
origin, so a self-hosted instance gives commands that work there. Your runners that enrolled in another workspace
aren't offered: they run that workspace's sessions alone. The steps lead with signing in on the machine and keep the
token for "Rather not sign in there?"; a likely reason (no comment says so) is that this keeps a secret off the clipboard.

**Building one like it.** Open with the model: what the thing is, what it sees, whose it is. Put the steps where the
empty list would be, and under the list once there are items. Order steps as people do them (prerequisite, install,
connect), one command per CodeBox. Offer the other ways as questions under the main path. Show a secret once, in a
warn banner that says what it lets its holder do. Give each state a dot, a word and, where it blocks work, a line of
what follows. Never show "none yet" before the list has loaded.

## Why sessions wait: runners elsewhere

A missing or unready runner is the commonest reason nothing happens, so the app says so wherever work starts.

- **Under every start form** (`NoRunnerNote` in components/workspace/no-runners.tsx, under the task box and a
  project's start form): one 12.5 px `ink-3` line after a 14 px chip icon, ending in a link to the right place.
  Nothing while a runner that would run *your* sessions is online, or while runners load; it counts only those (not
  another member's own; only yours while your sessions run only on yours or on a token your runners keep). Variants:
  "{workspace} has no runners yet: sessions you start here wait until one is online. Add a runner"; for members,
  "…wait until its admins add one (ask {name}, its primary admin), or you add one of yours."; "None of {workspace}'s
  runners is online: sessions you start here wait until one is. See its runners"; "A runner waits for your approval
  in {workspace}: sessions you start here wait until it is approved and online. Review it"; "None of your runners in
  {workspace} keeps your Claude token yet: sessions you start here wait until one does. Keep it on a runner".
- **A queued session's reason**, written by the control plane (`fctl_domain::schedule::Wait`) in the same voice:
  "Waiting for a runner: the ones online are draining or low on disk", "Waiting for a runner: this workspace has none
  yet. Its admins add one on its Runners tab.", "No runner can give this session 8 GiB of memory (the most is 7.9
  GiB)".
- **The Agent Floor**: its summary ends "· 4 runners online, 1 draining, 1 low on disk". Notice cards come and go
  with their cause (a container query puts their buttons under the text below 576 px of card): approvals in amber ("A
  runner waits for your approval", "mini in Acme: it runs nothing until approved" [Review →]) and updates in blue
  ("Update your runner to fctl 0.32.0" [Skip this version] [How to update ⌄], which unfolds the command, what follows,
  "the sessions running there carry on", and the exception: "Homebrew's fctl doesn't update itself.").
- **The session page** (lib/stall.ts) says what is wrong, then what happens next: "Runner mini has been low on disk
  since 14:02: 12.3 GiB free, below the 20 GiB its host keeps free." / "No new sessions start on it until there is
  room, and its host removes stopped sandboxes to make some. If its disk fills up, the agent's writes fail." A quiet
  runner is reported only after 10 s, since a restarting host is back within seconds: "Runner mini hasn't been heard
  from since 14:02." / "The agent's work shows up here when it's back, and messages you send reach the agent then."
- **The instance admin's runner list** (routes/admin.tsx) has the fullest words ("drained", "low on disk", "out of
  disk") and says who did what and what still runs: "{name} started draining it 2 hours ago: no new sessions start on
  it, and 1 session still runs." Its empty state counts the work: "Register one above, then run two commands on it."

## Set-up checklists

**A workspace's "Set up {name}"** (routes/workspace.tsx `SetUp`), above its projects, for its admins: a 22 px display
heading with "2 of 4 done" at the right, then steps between hairlines, each a 24 px circle (a dot while open, a check
in the highlight color when done), a title, a sentence and its own action: "Invite the people you work with" [Invite]
[Skip for now]; "Bring a machine online" ("Its sessions wait until one of its runners is online: register a Mac or
Linux machine, or add one of yours." [Add a runner]); "Connect a GitHub account" [Connect]; "Create a project" ("A
repository plus what agents need to know to work in it." [Create]).

Done steps strike through in `ink-3` and lose their sentence and action; the section goes once all are done. Steps
that can't apply drop out: GitHub where the instance has no GitHub App ("Without a GitHub App on the instance there
is nothing to connect."), invites once skipped ("A workspace for one has nobody to invite: its admins skip the
step."). The skip is saved on the workspace and says "Skipped: invite people from the People tab any time"; a test
pins that no other step can be skipped. On a phone the actions go under the words; wider, at the row's edge.

**The Agent Floor's "Set up your factory"** (routes/home.tsx): "A few steps, and agents start working for you." Four
steps done by facts, never by ticking: a workspace, an active Claude connection, a runner online, a project. Steps
someone can't do say who can instead of offering a button: "A workspace admin adds a runner: a machine that runs its
agents' sessions." Its sentences are the warmest in the app: "A runner is a machine that runs your agents' sessions
(your spare Mac is perfect): install fctl on it and register it for your workspace."

**Building one like it.** Compute each step from state; drop steps that can't apply; allow a saved skip only where a
step can truly be unnecessary; give each step its own action; disappear when done; show it only to those who can act.

## A workspace's settings and People tab

(routes/workspace.tsx `WorkspaceSettings`, `People`)

Settings sections put their title and a one-line purpose ("What everyone sees: in the sidebar, on the home page and
in lists.") in a 260 px column beside the controls from 768 px.

- **You.** "You are a member as {address}", then why it matters: "Its people see this address. Your commits in its
  projects credit the commit email you chose for it in Settings → Email addresses." The Claude connection's hint gives
  the case it exists for: "Your sessions in this workspace run on it: a company's seat here, your own plan
  elsewhere." **Only on my runners**' hint states the risk and the immediate effect: "Your sessions here run only on
  runners you registered, not on other people's, which see their code, secrets and your Claude token while they work.
  Turning it on stops the ones running on other people's runners; they resume on yours."
- **General.** "A square picture works best: we keep its middle, 256 px a side."; the address's hint is the address,
  live.
- **Access.** Base roles each say what members may do ("Members start sessions and message agents in every
  project"). Under the two-factor switch, a fact that informs the choice: "3 of 5 members have two-factor sign-in".
  Turning it on while some lack it asks and lists them: "These members haven't set it up yet. {workspace} closes to
  them until they do; they keep their other workspaces." [Require it].
- **Primary admin.** "You. Other admins can't demote or remove you; you can hand the role to one of them." With no
  admin to hand it to, a precondition instead of a disabled control: "Make someone an admin first (People): the role
  goes to an admin."
- **Danger zone.** What goes *and* what stays: "Deletes its projects, their sessions and transcripts, for everyone in
  it. Its runners stay with their owners, and its GitHub accounts keep the app. This can't be undone." The dialog
  counts it ("4 projects and every session in them go, for its 6 members. Stop its sessions first.").
- **People.** The invite hint: "An address they sign in with. They join from their home page, once this instance lets
  the address in; Settings shows which of their addresses they joined as." When the address can't sign in to the
  instance yet, only instance admins hear it, with a way out ("You are an instance admin: invite them to it and to
  {workspace} at once."); "to everyone else the invitation waits, whoever the address is", so the form reveals
  nothing about who has an account. Removing someone lists what follows: "They lose access to its projects and
  sessions at once. Their sessions here stop, and so do its sessions on their runners, which leave it."
- **Audit log.** What it holds and for how long: "What happened in {workspace}: people joining and leaving, roles,
  runners, GitHub accounts, projects and sessions. Kept for a year."

## Connecting GitHub and Linear

(routes/workspace.tsx `Github`, `Returned`, `Choice`; components/workspace/review-app.tsx, linear.tsx; lib/tickets.ts.)
Both connect a service elsewhere through a round trip to its site, and say what connecting leads to beforehand.

**GitHub.** The paragraph says what a connection gives and its limits: "{workspace}'s projects use repositories of
the GitHub accounts it works in: ones the fctl-sh app is installed on. Agents get tokens for the project's
repositories only, for an hour at a time." Admins get the two ways side by side, each a heading, a sentence and a
button: "Install the app on an account" ("…GitHub brings you back here to choose what {workspace} works in.") and
"Connect an account it is installed on" ("GitHub shows you the accounts it's installed on and what you may connect of
each, and you choose here."), "each column's text above and its button below, so that the buttons line up whatever
the texts take". Once one account works, the section becomes "Add another account" and starts by saying when it isn't
needed: "You don't need one unless {workspace}'s projects use repositories outside acme."

Back from GitHub, a card asks for the choice: "Choose what {workspace} works in on acme", "Signed in to GitHub as
@{login}", then "Every repository, also those the app reaches there later" ("It reaches acme/web, acme/api
now.") or "Only the ones you choose" (a checklist, a filter past eight, "4 of 12 chosen"). What the admin can't give
is named, not hidden: "It also reaches 3 repositories there that you aren't an admin of: their admins can connect
them." [Connect acme] [Not now].

Under the accounts, **"Reviews on GitHub"** explains the second app with a preview: "Review agents post their findings
as fctl-review and your agents answer them as fctl-sh, so that each pull request shows who said what. Where
fctl-review isn't installed, reviews post as fctl-sh too." Beside it, a two-comment thread drawn with the instance's
real app logos: fctl-review's finding ("Retries never stop when the server is down.") and fctl-sh's reply ("Fixed in
3f2a1c9: it gives up after five tries."). Each account then says which app posts there ("Except in docs, which
fctl-review doesn't reach: its reviews post as fctl-sh.") with [Install fctl-review] or [Add docs].

**Linear.** "Delegate Linear issues to fctl", with a lead whose words change once connected (a test pins that it
says what connecting leads to, not what already happens): "Connect a Linear workspace, and people there delegate
issues to fctl: each one starts a session of the project that takes the issue's team, as whoever delegated it, and
the agent reports back in the issue." Not connected, a card says so plainly ("Acme isn't connected to Linear yet")
and who can connect: "Connecting takes an admin of your Linear workspace: Linear asks them to install fctl's app
there and choose the teams it may see." Members read "Acme's admins connect it: ask one who is an admin of your
Linear workspace too." Below, **"Once Linear is connected"**: three steps (each project chooses its teams in its
Tickets tab; people link their Linear account once, in Settings; in Linear they assign or mention fctl) beside the
delegated-ticket preview ([A project's Tickets tab](#a-projects-tickets-tab)). Connected, each Linear workspace lists the projects that take its tickets, and
until one does, points at those that could, as dashed chips: "No project takes its tickets yet: choose Linear in a
project's Tickets tab."

**Building one like it.** Say what the connection gives and never reaches; show what follows connecting before
anyone connects; say when another connection isn't needed; end the round trip on a choice made here.

## A project's Reviews tab

(components/project/reviews.tsx, review-repos.tsx, review-drafts.tsx, review-bots.tsx; components/review.tsx)

**Purpose.** Turn on agents that review every new commit of the project's pull requests, on an owner's Claude
subscription, and follow the reviews they ran.

**The intro**, only while review agents were never on and no review exists: text on the left, the preview in a
320 px column on the right from 768 px, centered on each other.

- Headline "A review of every new commit". Lead, from the project's facts: "When a pull request in acme/web opens or
  gets a new commit, a review agent reads it and posts what it finds there, in one review, with a check on the
  commit." Then, only while drafts are off, "Drafts wait until they're marked ready for review." Then who waits:
  "Pull requests by apps other than Dependabot and Renovate, and by people who can't write to the repository, wait
  until someone here asks for their review." (the apps with their logos inline).
- Points: "It reviews what the pull request changes and what that affects, not the code around it." / "It points out
  bugs, security problems and breaks of the repository's rules, such as its AGENTS.md, and leaves out nitpicks." /
  "When a new commit fixes what it found, it marks its finding fixed and resolves the thread." / "Its check passes
  when there's nothing to point out, and stays neutral when there is: acting on it is up to you."
- Action: [Turn on review agents] (primary, large) beside "They run on your Claude subscription. / Another owner can
  take them over." Everyone else reads "The project's owners turn them on, on their Claude subscription." A problem
  the control plane reports shows here in an info banner ("This instance has no GitHub App, so nothing reviews pull
  requests. Its admins set one up first.").

**The preview**: the review as GitHub will show it. A header with the app reviews would post as, its real name and
logo where every repository's reviews post as one app, else fctl's mark: "fctl-review reviewed". A file path
(`src/sync/upload.rs`), two added lines of a retry loop, then the finding: "Retries never stop when the server is
down", "High severity. `upload` tries again until a send works, so a server that stays down keeps the worker busy for
good." A smaller card under it is the check on the commit: "fctl review · Found 1 issue".

**Turning them on** is one request; the toast says what follows: "Review agents are on: the next commit of each pull
request gets a review". Without a Claude connection the server answers with what to do ("Connect your Claude
subscription first (Settings → Claude): reviews run on it.") and the page adds a "Connect Claude" link to it.

**Once on: the status card.** A dot (GitHub's green), "Review agents are on", and the configuration as one paragraph:
"They review each new commit of the pull requests in acme/web, on [avatar] your Claude subscription, with Opus at high
effort. They skip acme/docs. Drafts wait until they're marked ready for review. Before each review, they sum the pull
request up at the end of its description." and who waits. Buttons: [Review a pull request] for people who start
sessions, [Settings ⌄] for owners. A line under it says which app posts on GitHub and why ("On GitHub they post as
fctl-review, apart from what your agents write as fctl-sh."), with [Install fctl-review] where it doesn't reach.

**The settings** fold open under the card, for owners:

- "Runs on", with the person's avatar, and [Run them on mine] for another owner. Repositories, a switch each: "Turn off
  one that another project's review agents review already, so that its pull requests aren't reviewed twice."
- Drafts, whose sentence states the current behavior. On: "Each new commit of a draft gets a review, as other pull
  requests' commits do. Turn it off to wait until a draft is marked ready for review." Off: "Drafts get no review
  until they're marked ready for review, which starts a review of their newest commit." While off, a small timeline
  shows what off changes: "Opened as a draft · No review", "2 new commits · No review", "Ready for review · fctl
  review Reviewing".
- Model and effort, whose first option is "The project's", described with the project's current value. Instructions
  for reviews: "Review agents get these after fctl's own review instructions: what matters most in this project, or
  what to leave alone." (placeholder: "Check that database migrations can be rolled back. Don't comment on the
  generated files in web/src/gen.").
- Summary in the description: "Before reviewing in depth, the agent adds how risky the pull request looks, what it
  does and what deserves a closer look at the end of its description, and rewrites it for each new commit. The rest
  of the description stays as people wrote it." Switched on, an example rises in under it: a medium-risk summary of
  the intro's upload-retry pull request, footed "fctl review's first look at 3f2a1c9 · 3 files, +120 −4 · Review agent settings".
- Apps that start reviews: "Pull requests these GitHub Apps open from the repository's branches get a review without
  anyone asking. What they say reaches the agent before anyone here reads it, and it runs none of their code."
  Suggestions come from the project's own pull requests first ("3 pull requests here lately, the newest 2 days ago"),
  then apps many repositories use; typing asks GitHub ("Did you mean this one?"). Added apps are marked New; removed
  ones strike through until saved ("Taken off the list when you save: its pull requests will wait until someone
  asks" [Undo]).
- The footer says, before saving, the consequence people miss: "Saving runs them on your Claude subscription, instead
  of {name}'s." Save stays disabled until something changed.

**Other states.** Off after running: "Review agents are off", "Pull requests get no new reviews. The reviews they had
stay below." On with none yet: "No reviews yet", "The next commit pushed to a pull request in acme/web that isn't a
draft starts one, as does marking a draft ready for review. Its check shows on the commit, and its findings on the
pull request." A review row shows its outcome in its tone, its risk ("Medium", titled "At first sight: …") and, when it
went wrong, why ("Its findings went to no session. fctl passes them on to the session that opened the pull request
once one lists it."). Turning off asks with a primary button, not a red one, since it destroys nothing: "Reviews under
way finish and post. New commits get no review until one of the project's owners turns them on again."

**Building one like it.** Headline the outcome; build the lead from the project's settings; draw the result as it
will appear where it lands; name the subscription it spends next to the button; once on, say the configuration in
one paragraph; show an example of a setting's effect beside the setting, at the moment it matters.

## A project's Schedules tab

(components/project/schedules.tsx; lib/schedules.ts)

**Purpose.** Tasks that start sessions on their own (once, again and again, or when another tool asks) on the Claude
subscription of the person each runs for.

**The intro**, whenever there are none and no task was handed over:

- "Sessions that start on their own": "Give an agent a task and a time: once, or again and again. Each run is a session
  of its own, on your Claude subscription, that you follow like any other."
- Points: when it can run ("Every hour, day, weekday, week or month in your time zone, once at a set time, on any cron
  schedule, or only when asked."), "Runs don't pile up: one is skipped while the last is still at work, or while the
  plan it runs on is at its limit.", and "Run one when you choose, here or with fctl schedules run…".
- The preview (300 px): the first idea as a schedule card, "Update dependencies", "Every Monday at 9:00 AM" in the
  reader's own clock, a week strip with Monday lit in the highlight color with a play mark, the cron `0 9 * * 1` in
  mono, and a smaller card of sessions it started ("#41 Update 12 dependencies 6d", "#37 Update 3 dependencies 13d",
  each with its status dot). Hidden on phones: "On a phone the ideas below say it, and come sooner."
- **Start from an idea**: ready tasks as row-wide buttons, each an icon tile, a name, a one-line result and its cadence
  in words: "Update dependencies" ("A pull request with the week's patch and minor releases, tested."), "Triage new
  issues" ("Labels, questions and links for each issue opened since the last run."; offered only where the project's
  agents reach a tracker, and marked "Triage only"), "Tidy the project's memory" ("Duplicate and outdated notes
  marked, overlapping ones merged."), "Learn from the week's reviews" ("What agents keep tripping over, added to
  AGENTS.md or filed as issues."). Each idea's task is a careful prompt ("…Leave major versions out: list them in the
  pull request's description, with what upgrading would take."), so starting from one also teaches how to write a
  task. [Start from scratch] sits by the heading; people who can't read "People who start sessions in this project set
  up schedules."

**The form** opens inline in the tab, raised, scrolled into view, its task focused:

- "Start from" chips of the same ideas along the top, so they stay reachable after the intro has gone.
- The name: a borderless 20 px display field whose placeholder is the name the task would give it, else "Name it".
- The task box ("What should an agent do each time?") with the model, effort and GitHub access pickers.
- **When**, a segmented control: Repeats, Once, Cron, When asked. Repeats reads as a sentence of fields: "Every
  [week] on [Mon][Tue]… at [09:00]", "Every [month] on [the 31st]" (described "Months without it are skipped"); "each
  word stays with its field where the sentence wraps". Once offers quick picks: "In an hour", "This evening" (before
  17:30), "Tomorrow morning", "Monday morning". Cron says what it read as you type ("Runs every weekday at 09:00."),
  or the grammar when it can't: "The minute, the hour, the day of the month, the month and the day of the week, like
  0 9 * * 1-5 for weekdays at 09:00." When asked explains itself: "It has no time of its own: it runs when someone
  runs it, here or with fctl schedules run, or when another tool does with an access token, such as an issue tracker
  sending what it knows of the case."
- The time zone as a sentence with a Change link ("In your time zone, {city} ({offset})"), and **its next runs**,
  recomputed as you choose, in a sunken box, each also in your own time when the zone isn't yours. A problem takes
  their place in red ("That time has passed: choose one ahead").
- "Keep its sessions off session lists", whose sentence says what each position does and when to use it: "Its
  sessions show in session lists like any other. Turn it on for a schedule that runs often, such as an hourly
  triage."
- The footer says whose subscription, before the button: "Its runs start on your Claude subscription." ("Each run
  starts on the Claude subscription of whoever runs it." for When asked). [Set up schedule]; the toast: "Set up: it
  runs in 25 min". A task box elsewhere hands its task here with Schedule beside Start (with files attached, disabled
  and titled "Schedules take no files: start it now, or remove them to schedule it").

**Once there are some.** "3 schedules · Update dependencies runs next, in 25 min" and [New schedule]. Each row: an
icon tile in its state's tone (a green dot while active, amber when fctl paused it), the name, facts ("Every weekday
at 08:00 · Triage only · Tokyo · Next in 3 hours · Last run 2 days ago") and a problem in amber ("fctl paused it.
{reason}"). [Run now] is titled "Run now, on your Claude subscription"; a paused one shows [Resume] instead
("Paused, it starts nothing: what it needs is to be resumed."). Opened: the task, its facts, and its runs, each the
session it started or why none, and who started it ("On time", "A tool, with {name}'s token"); with none yet, "None
yet. The first starts in 25 min." "Run it from another tool" unfolds a ready curl request with Copy and its rule:
"its agent takes what context says as information, not instructions." It starts open for When asked schedules,
"which is what it's for". Taking one over asks: "It ran on {name}'s Claude subscription. From now on its runs start on
yours, and it's yours to change." Deleting says what stays: "The sessions it started stay, with their transcripts."

**Building one like it.** Offer complete, good ideas, filtered to what the project can use; turn settings into a
sentence of fields; show the computed result (the next runs) live; say whose subscription every run uses.

## A project's Tickets tab

(components/project/tickets.tsx; lib/tickets.ts)

**Purpose.** Choose where the project's agents read and write tickets (none, GitHub Issues or Linear); for Linear,
which teams delegate work to fctl and how tickets move.

**The choice.** "Where agents track their work", with a lead that states the boundary: "The project's ticket tracker
is where its agents read what a ticket asks, file what they find and answer the people there. Agents reach this one
alone: fctl holds its credentials, and their GitHub tokens reach issues only where it says." Three radio cards (arrow
keys move between them), each an icon tile, a name, a check-mark circle and a summary: "None" ("Agents read and write
no tickets, GitHub's issues included."), "GitHub Issues" ("Agents read, open and comment on issues in the project's
repositories."), "Linear" ("Delegate issues to fctl in Linear: each starts a session, which reports back there.").
Without a Linear app the Linear card fades and says "This instance has no Linear app yet."

**What a choice comes to.** Under the cards, the chosen tracker's details rise in as points:

- None: "Their GitHub tokens carry no issues permission, so GitHub refuses them the issues of private repositories. A
  public repository's issues are open to anyone: there, what agents are told keeps them away." (honest about which
  limit GitHub enforces and which is only an instruction).
- GitHub Issues: an "Issues of" Select and how agents use them ("Agents read, open and comment on issues with gh
  issue, and write Fixes #12 in a pull request that does what an issue asks.").
- Linear, not connected: "Connect a Linear workspace", saying what installing does and who can ("Installing fctl's app
  in a Linear workspace takes one of its admins. Linear then lists fctl as an agent that people there assign issues to
  and mention, and {workspace}'s projects choose the teams they take tickets from."), or whom to ask.
- Linear, connected: the teams ("Delegating one of its issues to fctl, or mentioning fctl on one, starts a session
  here."); **Ticket states**, three switches named with the states of the team's own workflow ("● In Progress as its
  session starts", "● In Review when its pull request is up", "● Done once its pull requests merge"), each with a hint
  ("Once one that completes it (Fixes, not Part of) merged and none is open."), under "fctl moves the tickets its
  sessions work on through {team}'s workflow, never back and never out of done or canceled. Turn off what Linear's GitHub
  integration does for the team already."; and the label that asks for an exploration, whose hint quotes the label as
  typed: "A ticket labelled explore gets an exploration: the agent finds out what it needs and replies with a plan,
  without changing code, until someone replies to go ahead." (emptied: "No label asks for one: every delegated ticket
  gets the work done.").

**Saving.** A sticky bar rises once something changed, with a hint of what happens or what's missing ("Running
sessions take it within the hour." or "Choose a team first.") and [Cancel] [Save]. Back from installing Linear's app,
Linear is chosen again, "as it was when the browser left for it".

**Delegating a ticket**, once Linear is saved: four steps whose words follow the settings. "In Linear, assign one of
ENG's issues to fctl, or mention @fctl in a comment on one." / "fctl starts a session in Web for whoever asked, on
their Claude subscription, and starts the ticket." / "Its steps show in the ticket as it works, its pull requests link
to it, and each of its replies lands in the ticket's thread. The ticket moves to In Review when its pull request is
up, and to Done once a pull request that fixes it merges." (the last sentence drops what the switches turned off) /
"Reply in the thread to steer it, or press stop there to interrupt it. Only people fctl knows in Linear reach it."
Then the reader's own standing: "fctl knows your Linear account in Acme: issues you delegate there start sessions as
you.", or a blue card: "Link your Linear account. fctl starts sessions only for people it knows in Acme, as them. It
takes a Linear sign-in, which fctl forgets at once." [Link Linear account].

**The preview** (`DelegatedTicket`, beside the steps, and on the workspace's Linear tab before anything is
connected): a Linear issue with the project's first team key ("ENG-142" when there's none), "In Review" and fctl's app
as Linear names it; "Fix the login redirect loop", "Signing in on Safari sends people back to /login."; fctl's note
"Working on this in fctl session web#12, as {a made-up first name}." with the project's own slug; "Opened a pull
request web#45"; the agent's reply ("The session cookie lost its SameSite setting on Safari: I set it again and added
a test. Fixes ENG-142."); a teammate's "Thanks! Ship it."; and a small card for the label: "explore asks for a plan
first". With nothing yet, "Tickets lately" says "No ticket has started a session yet. The first one you delegate shows
here."

**Building one like it.** Present a few exclusive choices as cards with a one-line summary each; under the chosen
one, say what it comes to, its security consequences included; save with a sticky bar that says what saving changes
and when; show the flow as steps in the words of the current settings.

## Settings → Claude

(routes/settings.tsx `Claude`; components/claude/connect.tsx, guide.tsx, on-runners.tsx, stand-in.tsx)

**Purpose.** Connect the subscription sessions run on. Every choice trades convenience against exposure, so the page
lays the trade-offs out before the steps.

- The description sets the rules first: "Sessions you start run on your own Claude subscription. fctl refuses API
  keys and stops a session before it would draw on paid extra usage. Removing a connection stops the sessions that
  run on it." (Removing then asks nothing more, presumably because the description says it up front.) Each
  connection says what it is: "Full login · Remote Control", "Kept on your runners · never given to fctl · no Remote
  Control", and "Plan usage shows here once a session runs on this connection."
- **Keep my token out of sandboxes**, marked "Experimental": off, its hint states the risk ("Off: your token is in
  each of your sessions' sandboxes, where their agents can read it."); on, how it works ("Claude gets a stand-in that
  Anthropic refuses. The runner puts your token in as each of Claude's requests leaves for the Anthropic API…").
- **Two ways to connect, as radio cards** that list what each gives (a check) and lacks (a minus) before it's chosen.
  "Long-lived token", marked Recommended and open from the start for someone with no connection: "Lasts a year:
  agents work around the clock without a new sign-in", "fctl keeps it, or your runners do and fctl never sees it",
  "No Remote Control or claude.ai connectors". "Sign in with Claude": "Follow and steer sessions from claude.ai/code
  and the Claude apps", "Agents can use your claude.ai connectors, in projects that turn them on", "Claude ends it
  after a while: sessions stop until you sign in again". The chosen card opens its steps under it; the other's are
  hidden, not removed, "so that a pasted token or a sign-in under way is still there on coming back".
- **Who keeps the token**, a two-option control with its consequence: "fctl keeps it" ("Encrypted, and given only to
  your sessions, on whichever runner runs them.") or "My runners keep it" ("fctl never has it: your sessions run only
  on your runners that keep it, and wait while none of them is online."). Under both, the recommended way's risk:
  "Agents can read the token they run on: one talked into handing it over gives away a year of access, not the hours
  a sign-in's token lasts. Use it where you trust everyone who can message your agents."
- **Guides that tick themselves off** (`Step`: numbered 24 px circles joined by a line, turning into accent checks as
  the state comes true). Pasting: "Create a token" ("On any machine with Claude Code. It opens claude.ai to sign in,
  then prints a token that starts with sk-ant-oat01-."), done once something is pasted; "Paste it here". Signing in:
  "Start the sign-in", "Approve on claude.ai" ("The link shows here once Claude Code is ready."), "Paste the code
  claude.ai shows" (Finish waits for a code with a #), with "Starting Claude Code in a sandbox…" and "Verifying with
  Claude…" as status lines. On runners: create, keep it on the runner (where it's kept, who can read it), then "Check
  your runners", a live list ("Updates as your runners report", a pulsing dot) saying per runner "Keeps your token",
  "No token yet" or "Update its fctl first", and only then [Use the token on my runners].
- **The warning before risk.** When a sign-in runs on a runner that isn't yours, a warn banner appears inside step 1,
  before anything is approved: "This sign-in runs on {runner}, {owner}'s runner that runs your sessions, because none
  of yours is online. Its machine sees your Claude login's long-lived tokens as they pass to fctl: it could keep
  them, or connect a Claude account of its own in place of yours, on which your sessions would then run. Go on only if
  you trust {owner} with your Claude account; otherwise start one of your runners and start again, or use a
  long-lived token." Warning was chosen over refusing such sign-ins outright.
- **A login Claude ended** gets a red banner with both ways back, the lasting one first: "Claude ended this login, so
  sessions can't run on it. Sign in again, or connect a long-lived token, which lasts a year." Meanwhile Settings'
  list of pages marks Claude with an amber dot ("Needs reconnecting").

**Building one like it.** List each way's gains and losses before its steps; recommend one, with the reason; keep
progress while people compare; tick steps from real state; warn inside the step where the risk arises.

## Two-factor sign-in

(routes/settings.tsx `TwoFactorSettings`; components/two-factor/setup.tsx; routes/two-factor.tsx)

- Why, in one line: "A code from an app on your phone after your password, so that a password alone can't sign anyone
  in." Rows say where you stand: "Off: your password alone signs you in", "Not set up: your passkeys are your second
  factor", "Set up 3 months ago · last used 2 days ago". Recovery codes count down with their meaning: "8 of 10 left,
  each signs you in once", then in amber "2 of 10 left: get new ones before they run out", then "None left: get new
  ones, or a lost phone locks you out".
- Setup: a QR code beside two numbered steps. "Any authenticator app works: 1Password, Google Authenticator,
  Microsoft Authenticator, Authy, or the passwords app on your phone." A way out: "Can't scan it? Type in a key
  instead"; on a phone, "Open in your app". The code's hint says how codes behave ("It changes every 30 seconds; any
  current one works.") and a second failure gets the likely cause: "That code doesn't match either. Codes depend on
  the time: check that your phone sets its clock automatically."
- Done, a check draws itself in a ring, "Two-factor sign-in is on", then the recovery codes: "Keep them somewhere
  safe, such as your password manager: they are shown only now." Done stays disabled until "I saved my recovery
  codes" is ticked.
- Where the instance requires it, a page replaces the app and says why and how long it takes: "{instance} asks
  everyone to confirm their sign-ins with a second factor. A passkey takes a moment; an authenticator app, about a
  minute." Two cards: "Add a passkey" (marked Quickest: "Your fingerprint, face or screen lock confirms it's you.
  Nothing to type, and nothing a fake site can catch.") and "Use an authenticator app".

## Memory and retrospectives

(components/project/memory.tsx, retrospectives.tsx; routes/project.tsx `Settings`)

- The switches in a project's settings describe the loop and what off means: "Each session's agent starts with the
  notes earlier agents and people left, adds what a future agent should know, and marks notes that turned out wrong
  stale. People read and change them under Memory. Off, agents neither read nor add notes, and the ones there stay."
- Each tab opens with what it holds ("Notes this project's agents keep for the agents after them: what they learned
  that the repository doesn't say."); off, a banner says so and who turns it on: "This project's agents keep no
  memory: they don't start with these notes or add any. Turn it on under Settings."
- Empty states teach: "No notes yet", "As this project's agents learn what its repository doesn't say, they note it
  here for the agents after them. You can add one too." / "No retrospectives yet", "Agents record one as they finish a
  piece of work. They show here, and on each session's page." Off, they say what turning it on brings: "Once its
  maintainers turn them on, agents record one as they finish a piece of work."
- Adding a note: the placeholder lists what makes a good one ("Add a note for this project's agents: a command that
  works, a trap to avoid, a decision…"); the counter says "Markdown · one fact per note" until 200 characters are left.
  Toasts say what follows ("Added: agents start with it", "Marked stale: agents no longer start with it"); deleting
  points at the gentler option: "To keep it for the record, mark it stale instead."

## Smaller places that explain themselves

- **Appearance.** Each theme is a radio card holding a small picture of the app in it (sidebar, page, primary
  button), drawn in that theme's brand colors whatever the page's theme. The clock switch shows a sample: "Times read
  19:40 rather than 7:40 PM. Until you change it here, it follows this browser's language."
- **Notifications.** Device help where it applies ("On iPhone and iPad, notifications come to fctl on the Home Screen.
  Tap Share, then Add to Home Screen, open fctl from there and turn them on."), [Send a test], and the delivery rules:
  "Several that arrive close together come as one, and at most one a minute. Sessions you're looking at don't notify
  you."
- **Your data.** A checklist of what the export holds ("Claude connections, without their secrets"…) above the
  button, and how often under it: "You can export it once a week: again from Nov 14, 9:10 AM."
- **Access tokens.** A live summary like enrollment tokens': "Runs sessions in Web; their agents review and comment on
  GitHub, and push nothing. It never reaches your account, your workspaces' people and settings, or your other
  tokens." Created: "Copy it now: it is shown once." and an example of using it.
- **A project's settings.** Switch rows whose sentence is the whole contract: "When a check of the pull request's
  newest commit fails, the agent fixes what its changes broke and pushes: up to three times in a row while nobody
  messages it." Instance gaps show in amber under the switch they affect ("This instance's admins haven't allowed it
  yet (Admin → Settings)."). Placeholders are good values ("Run `npm test` before you commit. Keep components
  small.", "ghcr.io/acme/agent:1").
- **Approving a CLI sign-in** (routes/device.tsx): what it will do, until when, and the rule that protects people: "It
  will act as {address} until you revoke it in Settings. Approve only a sign-in you started yourself, just now: if
  someone sent you this link or code, deny it, or they get into your account."
- **Plan usage** on the Agent Floor turns a meter into a sentence when it matters: "Your weekly limit is used up.
  Sessions you start now pause until it resets tomorrow at 9:00 AM."

## Patterns across them

### Previews: how they're made

- **Drawn, not pictured.** JSX beside the feature (`Preview` in reviews.tsx and schedules.tsx, `DelegatedTicket`,
  `Thread`, the drafts `Timeline`, the summary `EXAMPLE`, `ThemePicture`), never screenshots: they follow the theme,
  stay sharp and take live values.
- **Built from the real parts** (`ReviewStateIcon`, `StatusDot`, `SummaryAlert`, `PullRequestIcon`, `StateDot`,
  `Logo`, `AppAvatar`), so a preview looks exactly like what people meet later.
- **Real names where they make it theirs**: the review app's name and logo, the project's team key and slug, the
  Linear app's name, the reader's clock (`clockOf`). Made-up content everywhere else, with small, plausible numbers
  ("Found 1 issue", "2 new commits").
- **One made-up world.** The review previews follow one pull request, an upload worker whose retries never stop when
  the server is down (`src/sync/upload.rs`, fixed in `3f2a1c9`): the Reviews intro, the summary example and the
  GitHub tab's thread. The schedule preview is the first idea. Someone who saw one recognizes the next.
- **Decoration**: `aria-hidden="true"` and `select-none`. The text beside a preview must say everything it shows.
- **Anatomy**: a main card (`rounded-xl`, `border-line`, `bg-surface`, a long soft shadow, 0 18px 50px -24px at 35%
  black) and, 12 px under it, a smaller card for a second fact (the check, the runs, the label).
- **Place**: a 300 to 320 px column beside the text from 768 px; under it, at most 384 px wide, on smaller screens;
  hidden on a phone when what follows says the same and should come sooner.
- **Timing**: a setting's example appears with the setting, when it matters: the summary example once its switch is
  on, the drafts timeline while drafts are off. Both rise in.
- **Lifetime**: an intro and its preview show only while there's nothing else to show, and give way for good once the
  feature has a past (review agents turned off after running keep a status card and their history).

### Commands to copy

- `CodeBox`: a sunken, bordered mono box (12.5 px) with Copy, which turns into "Copied" with a check for 1.6 s; one
  line scrolls sideways, several keep their breaks with the button at the top.
- Complete and specific: the instance's origin, the workspace's slug, the token itself; never "replace YOUR_TOKEN".
- One command per box, in numbered steps titled by what they achieve ("Install fctl on it"), ending with how people
  will know it worked: "It shows up here as online within seconds."
- Other ways under the main path, as the question that leads to them; edge cases in a quieter footnote (Homebrew,
  boot scripts, `loginctl enable-linger`). The CLI equivalent named where people might script it.
- Commands in sentences use the inline code style (`Mono` keeps them on one line, so a hyphen can't break them);
  reasons a host reports keep their backticked commands in code font (`DriverLine`).

### The rest, in short

- **Starting points.** Ideas that are complete examples, suggestions from the project's own activity, quick picks
  ("Tomorrow morning"), placeholders that are good values, a name placeholder that shows the default, a marked
  recommendation ("Recommended", "Quickest"). People edit something good instead of writing from nothing.
- **Guides that follow real state.** Steps tick from facts, never clicks: a runner reporting its token, a sign-in
  job's state, a project existing. Checklists drop steps that can't apply, keep a saved skip only where a step can be
  unnecessary, and disappear once done. Live progress says it's live ("Updates as your runners report").
- **The configuration as a sentence.** The reviews status card, a schedule's facts, the token summaries
  (`aria-live`), the delegation steps that drop what's switched off. The builders mirror the CLI's
  (`describeEnrollment`, `describeCron`, `describeScope`), so app and terminal use the same words.
- **Hints that follow the value.** Drafts on and off, the exploration label quoting what was typed, the cron in words,
  the address, the clock sample, a counter that turns into "{n} characters left". A hint never states a rule the value
  contradicts.
- **Saying who can act.** A sentence naming who can, and how to reach them, replaces what someone can't do; no
  control is disabled without its reason beside it; a precondition is said as one ("Make someone an admin first
  (People): the role goes to an admin.").
- **Warnings before risk.** Where the risk arises, not in a dialog after the click: what could happen, concretely; the
  check that manages it; the safer way. Amber for caution, blue for asking something of the person, red only for
  errors and destruction.
- **Consequences in confirmations.** Titles are questions naming the thing ("Take mini out of Acme?"); descriptions
  say what stops, what stays and how to undo it; a gentler action is the other button ("Drain instead"); reversible
  actions confirm with a primary button, not a red one ("Turn off").
- **Coming back from another site.** The outcome in the address becomes a banner whose tone follows blame, not
  failure ("Nothing there to connect yet isn't anyone's mistake": info, not an error); the form comes back as it was;
  a choice that waits says how long ("What GitHub showed you waits 10 minutes for you to choose from, and that ran
  out.").
- **What the instance lacks.** What's missing, what that means and who fixes it, naming the setting: "This instance
  takes no Linear webhooks yet, so delegating tickets starts nothing. Its admins set LINEAR_WEBHOOK_SECRET."
- **Empty states.** What fills the list and what brings that about ("The first one you delegate shows here."); inside
  a populated page, one quiet line rather than a big empty state.
- **Toasts** are "{what happened}: {what follows}": "Paused: it starts nothing until it's resumed", "Saved: sessions
  take it when they next start or resume", "Revoked Build fleet: it enrolls no more runners".
- **Server sentences are copy too.** The control plane writes problems, queued reasons and errors for people; the app
  shows them as they come and adds the way out when an error names a field (a "Connect Claude" link for `claude`).

## Copy at work

| Copy | Why it works |
|---|---|
| "{workspace}'s sessions wait until one of its runners is online." | Says what happens now, not "add a runner to get started". |
| "It shows up here as online within seconds." | Tells people how they'll know the commands worked, and how long to wait. |
| "Rather not sign in there? Name it above and choose Register for a command with a token." | The other way, as the question that leads to it. |
| "Approve only machines you know: fctl host status on each shows its id." | A rule and the means to follow it, in one sentence. |
| "They run on your Claude subscription. / Another owner can take them over." | The cost and the way out, next to the button. |
| "Its check passes when there's nothing to point out, and stays neutral when there is: acting on it is up to you." | Sets expectations for a behavior people would misread as failure. |
| "Runs don't pile up: one is skipped while the last is still at work…" | Answers the worry before it's asked, with the exact rule. |
| "A public repository's issues are open to anyone: there, what agents are told keeps them away." | Honest about where the guarantee is only an instruction. |
| "Agents can read the token they run on: one talked into handing it over gives away a year of access, not the hours a sign-in's token lasts." | Makes an abstract risk concrete by comparison. |
| "Your sessions in this workspace run on it: a company's seat here, your own plan elsewhere." | Explains a setting by the case it exists for. |
| "You don't need one unless {workspace}'s projects use repositories outside acme." | Says when *not* to act. |
| "That code doesn't match either. Codes depend on the time: check that your phone sets its clock automatically." | The second failure gets the likely cause, not the same message. |
| "Its runners stay with their owners, and its GitHub accounts keep the app." | Says what stays, not only what goes. |
| "Saving runs them on your Claude subscription, instead of {name}'s." | The consequence people miss, before the button. |
| "No label asks for one: every delegated ticket gets the work done." | An empty value's meaning, spelled out. |

The rules behind them: say what happens, not what is possible; use the place's own names (the workspace, the
repositories, the runner, the person to ask); sentence case, no eyebrows, exclamation marks only in made-up dialogue
(and one joking task-box placeholder); join a fact and its consequence with a colon (most strings do; a few use an em
dash, which a colon can replace); counts with their nouns and singulars ("1 runner online", "3 runners wait"); "runner" for the
machine, "host service" or `fctl host` for the software; no "simply", no "powerful", no promise the code doesn't keep.

## Principles at work here
1. **Explain before the switch.** What the feature does, what it leaves alone, what it costs and whose subscription or
   machine pays, right where it's turned on.
2. **Show the result where it will land.** A small, made-up preview drawn with the app's own parts and this place's
   real names, hidden from assistive tech and fully said in the text beside it.
3. **Build sentences from this place's facts.** Leads, statuses and summaries name the real repositories, teams, apps
   and people; a generic paragraph is a missed explanation.
4. **Give a start, not a blank.** Ideas that are good examples, quick picks, placeholders worth keeping, one
   recommended way, one primary button.
5. **Make every command complete, ordered and copyable**, for this instance and workspace, and end with what happens
   next and how people will know it worked.
6. **Say who can act.** Never leave a control disabled without its reason; name the role, and the person, who can.
7. **Warn where the risk arises**: what could happen, the check that manages it, the safer way.
8. **State consequences before confirming**: what stops, what stays, how to undo, with the gentler action as the
   other button. Red only for destruction.
9. **Keep explaining once it's on.** The configuration as a sentence, hints that follow the value, empty lists that
   say what fills them, toasts that say what follows; never flash "none yet" before the data loads.
10. **One plain voice across app, CLI and server.** Plain, specific, calm, sentence case; the same words in the
    terminal and on the page; pin the explanations in tests whose names read like the rule ("says plainly that a new
    workspace isn't connected, and what connecting one leads to").
