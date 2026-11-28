# Pages that explain and invite

How fctl's web app introduces a feature before anyone turns it on, walks people through setting it up, and keeps
explaining itself once it runs: a workspace's Runners tab and settings, a project's Reviews and Schedules tabs and
its tickets, webhooks, service accounts and the people they ask, connecting Claude, GitHub and Linear, two-factor
sign-in, the domains that sign in with a provider, memory and retrospectives, and the hints, warnings and empty states
around them.

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

(routes/workspace.tsx `Runners`, `AddRunner`; components/workspace/runners.tsx, with `PoolCard`;
components/runner-driver.tsx; components/runner-snapshots.tsx; components/workspace/snapshots.tsx; lib/enrollment.ts;
lib/install.ts; lib/pools.ts; lib/pool-setup.ts; lib/snapshots.ts)

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
4. **The runners** that are in no pool you see, then **how to bring a machine online** (straight under the form
   while there's none), then **pools** (`#enrollment-tokens`, its heading `#pools`): each an enrollment token, for
   machines nobody signs in on, with the runners it enrolled under it, then **where sessions' snapshots go**
   (`#snapshots`).

**A runner's row.** An 8 px dot; the name and a state word (12 px `ink-4`: "online", "offline", "draining", "driver
not ready", "disabled"); pills only where they matter: "Only your sessions" or "Only {name}'s sessions", "Keeps your
Claude token" (accent-soft, with a shield). Facts: "{workspace}'s docker runner · 1/4 sessions · seen 5 minutes ago"
("never connected" for one that never was). Lines that show only when true: the driver problem in amber, the bucket its host keeps sessions' snapshots in
("Keeps sessions' snapshots in `s3://acme-fctl/sessions`", 11.5 px `ink-4`, the URL in the code font), "Enrolled
with “Build fleet”", "Removed once offline for 5 minutes", "Also runs" with the other workspaces' avatars. While
that bucket fails, its line turns amber and says what the error means for people, not for machines: "Keeps
sessions' snapshots in `s3://acme-fctl/sessions`, but the last one failed 3 minutes ago: putting it in the bucket
failed: AccessDenied. Until the bucket works again, sessions may resume without their latest conversation and
work." The host's error is any of saving, restoring or getting credentials, so the line says "failed", not
"refused"; `fctl runners` says the same. At the end,
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

**Pools.** A pool is an enrollment token and the runners it enrolled, which carry its labels and follow its
placement. The paragraph says what they're for before what they are: "For machines that autoscaling creates, or that
you set up without signing in on them: each enrolls itself with its pool's enrollment token, and gets a token of its
own. A pool's labels say which projects' sessions its runners take, and how many it needs now tells whatever scales
it.", then whose the runners will be, and "How enrollment works ↗" (fctl.sh's guide). The button is "New pool".

Each pool is a card (`PoolCard`, a configured thing whose state people check: `rounded-xl`, `bg-surface/40`), in
one stacked column, never a grid:

- Its name with state pills ("Full" in amber, "Revoked", "Expired") and whose ("Only your sessions"), then its labels
  as chips in the code font (`aria-label="Labels"`), and, while its token works, a ⋯ menu: Edit…, Revoke…. A
  revoked or expired pool's card has none: there is nothing left to change.
- **What it is doing, as a sentence** (`poolState`, lib/pools.ts), from what it needs now (`GET …/runners/demand`,
  read again every 15 seconds): "Growing: 1 runner is starting for 3 sessions that wait." in `ink-2`; "3 sessions
  wait, the longest for 2m: it wants 3 runners, and has 2 online." and "At its limit of 20 runners: 3 sessions wait
  for room." in amber, where someone should look; quiet otherwise: "Busy: 4 of 4 runners run sessions.", "Could
  shrink: it wants 1 runner of its 4.", "Idle: its 2 runners run nothing.", "No runner online, and no session waits
  for it.", "No runners yet: machines that enroll with its token show here." for an open pool, and "Its token enrolls
  no more runners." for a revoked or expired one with none left, which folds behind "Show 2 revoked or expired". It
  says what the numbers show, not what something will do: fctl doesn't know whether anything scales the pool.
- **The facts**, from the same numbers: "6 of 8 runners busy · 1 starting · 1 waiting for approval (amber) · 11 of 32
  sessions · 3 sessions waiting · longest 2m", left out for an empty pool that nothing waits for, whose sentence says
  it already. Times as the CLI says them (`2m`, `1h 5m`).
- Its placement and what the token does, quiet: "Packed: fills one runner before the next, so that idle ones can go.
  Enrolls up to 20 runners at a time, which run everyone's sessions at once and are removed once they have been
  offline for 5 minutes.", then the token's facts ("last enrolled one 2 hours ago · expires Feb 22 · made by you"; the
  runner count only where the demand line doesn't give it).
- **Its runners**, under a hairline at the card's foot, as the list draws them, without "Enrolled with…" and "Removed
  once offline…", which the card says. They leave the list above, so each runner shows once. A revoked or expired
  token's pool stays among the others while it has runners; the rest fold behind "Show 2 revoked or expired".

**Making a pool** (New pool) follows the setup steps' look (`Step`, components/claude/guide.tsx), in the wide
dialog, and explains each choice inside its options rather than above them:

1. **Name it**, ticked once it has one: Name ("What it's for, which the runners it enrolls show.", "AWS large" as
   the placeholder); Runs, for admins ("Everyone's sessions": "The workspace's runners, which its admins manage";
   "Only my sessions": "Your runners, for Only on my runners and a Claude token kept on them").
2. **Choose its labels and machines**: Labels, in the code font ("Projects that ask for them run on its runners.
   Commas or spaces between them.", checked as the server checks them, the error under the field), and Placement:
   "Spread" ("Each session goes to the least busy runner: for machines that stay on.") or "Packed" ("Fills one
   runner before the next, so that idle ones can go: for a pool that grows and shrinks."), which follows When they go
   offline until someone chooses, as the server's default does. Sessions each machine runs ("What the commands below
   give each host.": a host's setting, not the token's, so it shapes only what the next step gives to copy) and
   Runners at once (empty for no limit, "Removed and rejected ones free their place."). When they go offline, each
   option saying when to pick it: "Keep them" ("They stay until someone removes them."), "Remove after a minute"
   ("For machines that never come back: one that loses its network for longer is gone for good."), after 5 minutes
   ("For machines autoscaling destroys without uninstalling."), after 15 minutes ("The same, through a short network
   outage."), after an hour ("Through a longer one."), after a day ("For machines that are off overnight."), after a
   week ("Through a weekend."). Approve each
   runner ("Runners it enrolls wait on this tab, with where they enrolled from, until an admin approves them; until
   then they run nothing. {workspace}'s admins get a notification."). Its token expires.
3. **Choose where it runs**: Its machines, a Select of Your own machines ("Macs or Linux machines you set up: a boot
   script or a shell enrolls each."), AWS ("An Auto Scaling group from fctl's Terraform module, which sizes it from
   what the pool needs."), Google Cloud, Azure ("…from fctl's example, which its machines size.") and Kubernetes ("A
   Deployment of hosts that KEDA scales from what the pool needs."). A cloud destroys machines without uninstalling
   them, so choosing one turns Keep them into Remove after 5 minutes, while Keep them is the choice: another removal
   someone chose stays. The placement follows it to packed while nobody has chosen one; a chosen Spread stays.

Under the steps, **a live summary** in a sunken box (`aria-live="polite"`), rewritten as the form changes, in the
CLI's words (`describeEnrollment` mirrors `fctl_domain::enrollment::describe`, `poolLine` the pool line of `fctl
runners enrollment-tokens`): "Enrolls up to 20 runners at a time, which run everyone's sessions at once and are
removed once they have been offline for 5 minutes. Its runners carry the labels aws and large. Packed: fills one
runner before the next, so that idle ones can go. It expires on February 22, 2027." Then **a preview**, "Once its
first runner is online:": the pool's own card, drawn from the form (its name, labels and placement, "Idle: its runner
runs nothing.", "0 of 1 runner busy · 0 of 4 sessions") with one runner under it, `aria-hidden`, not a control.

**Once it is made**, the dialog goes back to its top, where the token is: the amber "Copy it now: it is shown once.
Whoever has it enrolls machines in {workspace}…" over it, then "Bring it online on AWS" (or "Bring a machine
online") and that place's steps (lib/pool-setup.ts), each with what to copy, every value of this instance and this
pool filled in, and a link to the guide where it leaves something to it:

- Your own machines: install fctl, then enroll it and start its host service, one variable a line, with the
  machine's capacity always, since hyperstructure/fctl#648: `fctl host install` would make it 4, where the form,
  like the cloud modules, starts at 3.
- AWS: keep the token in a file Terraform reads, add fctl's module (its name from the pool's, `fctl-aws-large`; the
  instance as `fctl_server`, its version, the capacity, a `max_size` a few below the pool's limit; the VPC and its
  subnets left to fill in), then apply it, which takes about 25 minutes the first time.
- Google Cloud: build the image with Packer, fill in the example's `terraform.tfvars` (the token stays out of it),
  then apply it with the token in `TF_VAR_enrollment_token`.
- Azure: make the image's resource group, gallery and image definition, named after the pool, and build the image
  into that gallery with Packer; then fill in `terraform.tfvars` from the same shell (the subscription, the
  location, the image's ID, and a resource group of the scale set's own) and apply it the same way.
- Kubernetes: keep the token in a secret; run the host as a Deployment, a step in words with nothing to copy (each
  pod with `FCTL_SERVER` and `FCTL_ENROLL_TOKEN` from the secret, and, since hyperstructure/fctl#648, `fctl host
  install --no-service --capacity 3`, then `fctl host run`), linking to the role and the preStop hook; then apply a
  TriggerAuthentication and a ScaledObject whose metrics-api trigger reads the pool's demand with the token,
  `valueLocation: wanted`.

A footnote says what follows: "Its runners show under it on this tab as they enroll." and when a runner goes.

**Editing a pool** (Edit…) changes it as it runs: its name, labels, placement and runners at once, whose hint says
what a lower limit does ("Fewer than it has removes none: it enrolls no more until some go."). The dialog's sentence
says what follows: "Its runners carry the new labels and follow the new placement at once; the sessions they run
carry on." The toast says the result: "AWS large's runners carry the labels aws and large, and pack sessions".

**Where sessions' snapshots go** (`SnapshotsSection`, `#snapshots`): the tab's last section, for everyone, because
the choice it explains is made on the runners themselves (`[snapshots] url` in host.toml), not by a switch. A 20 px
display heading that names the outcome, "Sessions that resume anywhere"; a lead that says what a snapshot holds and
that nobody reads it without the session's key ("As a session's sandbox stops, its agent saves a snapshot of its
conversation and the work it hadn't pushed, so that the session resumes on any of {workspace}'s runners as it was.
It encrypts the snapshot in the sandbox with a key of the session's own, which fctl keeps encrypted: wherever the
snapshot is kept, nobody reads it without that key."); then the configuration as a sentence, with what it holds now
and where (`usageWords`): "On, each kept 30 days after it was saved: 14 snapshots with fctl (210 MB) and 3 in
s3://acme-fctl (1.2 GB). Change in Settings" (members read who chooses: "Its admins choose this in its settings
(Ada is its primary admin)."). Off says what follows ("Off: a session that resumes on another runner starts from
its task and branch."); an instance that keeps none says so in amber, whatever the workspace chose.

Beside it from 768 px (under it on a phone), a drawing of the choice, `aria-hidden`: the sandbox's card with chips
for what a snapshot holds and "sealed with the session's own key", an arrow, then each place it goes on a line of
its own, with how many it holds and their size: "fctl 14 · 210 MB", "s3://acme-fctl 3 · 1.2 GB" (in the code font,
whole: lines, not two columns, so that a bucket's name doesn't truncate), and a dashed "your bucket — set on
runners" while none has one. The whole drawing dims while snapshots are off.

Under both, at the column's full width so that the command fits: "To keep them in your own cloud", what changes
("fctl keeps only where each is, its size and its checksum. A session then resumes with its snapshot on runners with
the same bucket."), one CodeBox (`fctl host install --snapshot-bucket s3://your-bucket/fctl`), and a quiet footnote
for what bites: an installed runner takes `[snapshots] url` and `fctl host restart`, the bucket needs a policy and a
lifecycle rule as many days long, because fctl forgets a snapshot but can't delete it from someone else's bucket;
then "Setting up the bucket ↗".

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
- **Session snapshots** (`SnapshotSettings`, `#snapshots`). "Save sessions' snapshots" with what it does and what
  goes without it ("Without them, a session that moves to another runner starts again from its task and branch."),
  then, only while on, "Keep each one" (1 day to 365, "30 days" marked the default; "Fewer days delete the older ones
  within the hour.") and what they take now, with "Where they go" (the Runners tab's section). Turning them off asks,
  because it deletes: "The 14 snapshots fctl keeps for {workspace}'s sessions are deleted within the hour, and a
  session that resumes on another runner starts from its task and branch. Snapshots in your runners' own buckets go
  by those buckets' rules." [Keep them] [Turn them off] in red. Turning them on doesn't ask. An instance that keeps
  none says so in amber above the switch, which stays usable: it is the workspace's own choice. Admin → Settings has
  the instance's: "Sessions save snapshots" (off asks the same, for every workspace) and "Each one at most" (50 MiB
  to 2 GiB, 200 MiB the default), whose hint says what goes first past it.
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

## Claude on the People tab

(components/workspace/claude-people.tsx, lib/claude-oversight.ts; routes/workspace.tsx `People`,
`ClaudeOversightSection`, `You`; routes/admin.tsx)

**Purpose.** A workspace's admins see at a glance whether everyone in it can run sessions this week and next, and
know exactly what to do about each person who can't, without ever seeing anyone's token, while each person knows
what their admins see (fctl#627). Sessions run on each person's own Claude subscription, often a seat their
organization gave them, so the facts live with the people, not on a tab of their own: admins see nine tabs already.

- **Above the list, for admins**, 32 px under the invite form: the summary as one sentence of counts, "5 of 7 people
  have Claude connected for Acme · 1 token runs out within a month · 1 stopped working · 1 waits for a usage limit
  to reset" (`aria-live`), then segment pills that narrow the list, each with its count in `ink-4` (Everyone, No
  Claude, Runs out soon, Stopped working, Pausing on limits). Pills at zero are left out unless chosen, so that a
  healthy workspace shows Everyone alone; choosing one hides the invitations, which have no Claude. A quiet line
  says where seats are given: "Claude Team and Enterprise seats are given in Claude's organization settings (how
  ↗); each person connects theirs in Settings → Claude, or an admin token sets it for them." The link goes to
  Claude's own guide; no console URL is guessed.
- **Under each person's address, a facts line**, 12 px in `ink-3` (a shade above the address's `ink-4`: it is the
  row's news), in the words of `fctl workspaces members --claude` made into a line (the CLI's table cells are
  shorter: "token, set by admin token", "~Dec 14 (21d)", "2h ago"):
  "Long-lived token, set by an admin token · plan unknown · Claude answered 2 hours ago · runs out around Dec 14";
  "Claude login · Max · Claude answered 5 minutes ago"; "Token on their runners · plan unknown · Claude answered
  yesterday". Problems take the whole line and name the place: "No Claude connection for Acme: their sessions here
  can't start" in amber; "Claude refused their token on Nov 20: their sessions here can't run" in red (danger: it
  is a failure). Only the date turns amber within 30 days, not the line. A long-lived token never says its plan, so
  it reads "plan unknown" rather than a guess; a login says its own, and Ultra shows from the limits sessions
  report.
- **Opening it.** The facts line is a button (`aria-expanded`, a chevron) that opens, in place under the row (42 px
  in, past the avatar), or in a `Sheet` on a phone, the whole of it in sentences: "Grace Hopper's sessions in Acme
  run on a long-lived token an admin token set on Dec 14, 2025. Claude last answered it 2 hours ago. It runs out
  around Dec 14, 2026, a year after it was set: fctl can't read the date from the token. Their sessions paused on
  usage limits 6 times this week and 7 times in 30 days, the last on the weekly limit." Then the way out, where
  there is something to do: where the instance takes admin tokens, "Set them a new one with an admin token, from a
  token claude setup-token printed:" and a `CodeBox` with the complete command
  (`fctl admin users set grace@acme.dev --claude-token - --claude-label "Acme seat"`); elsewhere "Grace Hopper
  connects a new token in Settings → Claude: fctl has told them too." with a button that copies the link to their
  Settings → Claude. Five limit pauses in a week add "Their plan's limits are short for this work: a Max or Ultra
  seat has more."
- **First visit**, while nobody but you has a working connection: "Claude for everyone in Globex", the lead built
  from this workspace's counts ("Globex's sessions run on each person's own Claude subscription: 1 of its 3 people
  has connected one. You see whether their sessions can run and when their tokens run out, never the tokens."),
  three points (where people connect, what the line under each says, who hears before a token runs out), one
  action (copy the link to Settings → Claude, "Send it to them: it opens where they connect Claude."), and at the
  side a preview of two made-up rows drawn with the real facts line and this workspace's name, `aria-hidden`.
- **States.** Loading: skeletons for the summary, the pills and each facts line, never "No Claude connection"
  first, which would alarm before the data says so. Failed: "Claude connections didn't load: … Try again" in a
  banner, with the people still listed. An empty pill: one line in the list's place ("Nobody's token runs out
  within a month.") with Show everyone. Admins who see nothing: one quiet line saying so and where it's set (the
  workspace's settings, or Admin → Settings when the instance decided). Members see none of it, and their page
  makes no request for it.
- **Who sees how much.** A Claude section in the workspace's Settings, for admins: "Admins see" (Details, Whether
  sessions can run, Nothing), where levels above what the instance lets them see stay in the list, disabled, with
  "More than this instance lets admins see" as their description and a sentence under the field naming Admin →
  Settings; "Limit pauses", a switch whose hint says what it shows and that whose sessions wait for a limit now
  shows either way; and "Email admins" (Once a week, Each time, Not by email), whose hint says plainly when the
  instance sends no email. Each member reads the level in **You**, under their Claude connection: "Acme's admins
  see what kind of Claude connection your sessions here run on, its plan, when Claude last answered it and when it
  runs out, and how often your sessions paused on usage limits: never the token or the account." Admin → Settings
  holds the instance's side (the most workspaces' admins may see, limit pauses, Admin → People showing everyone's,
  and in how many sessions Claude must refuse a token before fctl marks it ended); with the last on, Admin → People
  shows the same summary and facts line under each account.

**Why it's built so.** Facts, never secrets: the control plane sends no token, account or label, so the page
can't leak one. The level is said to the people it's about, in their own settings, so oversight is never silent.
Pronouns are never guessed: copy uses the person's name or "their". The detail is sentences rather than a table
of fields because each fact needs its reason beside it ("around", "a year after it was set: fctl can't read the
date from the token").

**Traps found building it.** The `Sheet` pads only its header: its body needs its own `px-5`, or the sentences
run to the screen's edges on a phone. A reset that isn't today reads "on Nov 25", not "at Nov 25". The first
visit's preview first said "for Acme" in every workspace and gave a long-lived token a Team plan, which no token
can show: previews take the place's name, and only facts fctl can know.

**Building one like it.** Put oversight where the people are listed; one facts line each, saying what the CLI says;
problems as the line itself, named with the place; a way out that is complete and copyable, or the link to send;
say the level to those it's about.

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
settings, under Tickets; people link their Linear account once, in Settings; in Linear they assign or mention fctl)
beside the delegated-ticket preview ([A project's tickets](#a-projects-tickets)). Connected, each Linear workspace lists
the projects that take its tickets, and until one does, points at those that could, as dashed chips: "No project takes
its tickets yet: choose Linear in a project's settings, under Tickets."

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
request up at the end of its description. Their findings reach the agent that opened the pull request for up to 3
review rounds before fctl pauses for a person." and who waits. Like drafts, the rounds are said only when they differ
from the default (five). Buttons: [Review a pull request] for people who start
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
- Review rounds before a pause, a small select on the right ("1 round" to "10 rounds", "5 rounds" described as
  "fctl's default"), whose sentence follows the choice: "When one of fctl's agents opened the pull request, it gets
  the findings of 5 reviews in a row while nobody writes to it. Then fctl holds the next findings back until someone
  messages the agent or passes them on from its session." ("…the findings of one review…" at one.) It bounds the back
  and forth between the two agents, on both subscriptions.
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

**Purpose.** Tasks that start sessions on their own (once, again and again, each time something happens on GitHub,
or when another tool asks) on the Claude subscription of the person each runs for.

**The intro**, whenever there are none and no task was handed over:

- "Sessions that start on their own": "Give an agent a task, and a time or something to wait for: once, again and
  again, or each time it happens. Each run is a session of its own, on your Claude subscription, that you follow like
  any other."
- Points: when it can run ("Every hour, day, weekday, week or month in your time zone, once at a set time, on any cron
  schedule, or only when asked."), what it can wait for ("Each time something happens on GitHub: an issue is opened or
  labeled, a pull request opens or merges, a release is published, checks fail on main."), "Runs don't pile up: one is
  skipped while the last is still at the same work, or while the plan it runs on is at its limit.", and "Run one when
  you choose, here or with fctl schedules run…".
- The preview (300 px): two schedule cards, one of each way to run. "Update dependencies", "Every Monday at 9:00 AM"
  in the reader's own clock, a week strip with Monday lit in the highlight color with a play mark, the cron `0 9 * * 1`
  in mono; then "Triage new issues", "When an issue is opened", with the issues that started its sessions, each an open
  issue's circle, its number and title, an arrow, and the session it started with its status dot ("#58 Export fails on
  Safari → #212"). Hidden on phones: "On a phone the ideas below say it, and come sooner."
- **Start from an idea**: ready tasks as row-wide buttons, each an icon tile, a name, a one-line result and when it
  runs in words, in two groups under a quiet `ink-4` line each, those that wait for something first, since a timetable
  can't do them. "When something happens on GitHub" (only where the project's agents work on GitHub): "Triage new
  issues" ("Labels, questions and links for each issue as it's opened.", marked "Triage only", its sessions kept off
  session lists) and "Work on labeled issues" ("Label an issue fctl to hand it to an agent, which opens a pull
  request."), both only where the project's tracker is GitHub's issues; "Learn from merged pull requests" ("What people
  said in the review of each agent's pull request, kept in AGENTS.md or a skill.", from those fctl's agents opened),
  "Fix failing checks on main" and "Try each release". "At set times": "Update dependencies" ("A pull request with the
  week's patch and minor releases, tested."), "Tidy the project's memory" ("Duplicate and outdated notes marked,
  overlapping ones merged."), "Learn from the week's reviews" ("What agents keep tripping over, added to AGENTS.md or
  filed as issues."), and, where the tracker is Linear's, whose issues start no event, a daily "Triage new issues".
  Each idea's task is a careful prompt ("…Leave major versions out: list them in the pull request's description, with
  what upgrading would take."; "When people said nothing worth keeping, change nothing and say so in a sentence."), so
  starting from one also teaches how to write a task. [Start from scratch] sits by the heading; people who can't read
  "People who start sessions in this project set up schedules."

**The form** opens inline in the tab, raised, scrolled into view, its task focused:

- "Start from" chips of the same ideas along the top, so they stay reachable after the intro has gone.
- The name: a borderless 20 px display field whose placeholder is the name the task would give it, else "Name it".
- The task box ("What should an agent do each time?") with the model, effort and GitHub access pickers.
- **When**, a segmented control: Repeats, Once, Cron, On an event, When asked, each titled with what it means. Five
  don't fit a phone's row, so there it is a list, each choice with a quieter line ("Each time something happens on
  GitHub"). Repeats reads as a sentence of fields: "Every [week] on [Mon][Tue]… at [09:00]", "Every [month] on [the
  31st]" (described "Months without it are skipped"); "each word stays with its field where the sentence wraps". Once
  offers quick picks: "In an hour", "This evening" (before 17:30), "Tomorrow morning", "Monday morning". Cron says
  what it read as you type ("Runs every weekday at 09:00."), or the grammar when it can't: "The minute, the hour, the
  day of the month, the month and the day of the week, like 0 9 * * 1-5 for weekdays at 09:00." When asked explains
  itself: "It has no time of its own: it runs when someone runs it, here or with fctl schedules run, or when another
  tool does with an access token, such as an issue tracker sending what it knows of the case." **On an event** shows
  the six kinds as a two-column grid of pressable tiles (one column on a phone), each with GitHub's symbol for it in a
  28 px tile, which the highlight fills on the chosen one, its name ("A pull request merges") and what it's for
  ("Learn from each merge and its review"); a kind fctl wouldn't hear of here carries a small amber warning beside its
  name. Under the grid, only the fields the chosen kind has, as labeled Fields two by two: "In" (the project's
  repositories, "Its repositories" first, described as those its agents write to, with their names; a read-only one
  "Read only: its agents can't write to it"; shown only when there are several), "Label" ("The label that starts a
  run. Several, comma-separated: any of them.") or "With the label" ("Empty: any…"), "Into the branch" or "On the
  branch" (mono, with the default branch as the placeholder for failing checks), and "Opened by" (Anyone, "People
  outside the project and apps too"; People who can write to it; fctl's agents). Choosing anyone for pull requests
  opened says the risk under the field: "An outsider's pull request starts a run too: write the task so that its agent
  doesn't run their code." Then how many sessions its events start, as a sentence of fields: "At most [3] sessions an
  hour and [10] a day" (3 and 10 unless changed; 72 px number fields, each word staying with its field where the
  sentence wraps), with "Each is a session on your Claude plan. Past either, events start none until there's room
  again, and its runs say why." under it, or in red what won't do, as the control plane says it ("Let it start at
  least 1 session an hour: pause it to start none", "It starts at most 1,000 sessions a day"), which keeps the form
  from saving. Then a sunken box, "Each time", says in a sentence what starts a run and what its agent gets ("A pull
  request that merges in acme/storefront or acme/docs starts a session of its own, whose agent gets its title, text
  and who merged it after the task, and reads its review on GitHub. Only those fctl's agents opened."), why that comes
  as information ("Whoever opens an issue or a pull request may be someone who can't instruct your agents…"), and, in
  amber with a warning icon, why fctl wouldn't hear of the chosen kind here, as the control plane says it ("fctl's
  GitHub App isn't subscribed to Issues events, so GitHub doesn't tell fctl when an issue is opened or labeled. An
  admin of this instance subscribes it on GitHub, under the app's Permissions & events."): people learn it before
  saving, not from runs that never come. An issue's label that names none keeps the form from saving, said under the
  Label field. The time zone row goes, as its times are only in its runs' notes.
- The time zone as a sentence with a Change link ("In your time zone, {city} ({offset})"), and **its next runs**,
  recomputed as you choose, in a sunken box, each also in your own time when the zone isn't yours. A problem takes
  their place in red ("That time has passed: choose one ahead").
- "Keep its sessions off session lists", whose sentence says what each position does and when to use it: "Its
  sessions show in session lists like any other. Turn it on for a schedule that runs often, such as an hourly
  triage or one for each new issue." Ideas that run often turn it on as they fill the form.
- The footer says whose subscription, before the button: "Its runs start on your Claude subscription." ("Each run
  starts on the Claude subscription of whoever runs it." for When asked). [Set up schedule]; the toast: "Set up: it
  runs in 25 min". A task box elsewhere hands its task here with Schedule beside Start (with files attached, disabled
  and titled "Schedules take no files: start it now, or remove them to schedule it").

**Once there are some.** "3 schedules · Update dependencies runs next, in 25 min" and [New schedule]. Each row: an
icon tile in its state's tone (a green dot while active, amber when fctl paused it), the name, facts ("Every weekday
at 08:00 · Triage only · Tokyo · Next in 3 hours · Last run 2 days ago") and a problem in amber ("fctl paused it.
{reason}", or for one whose events started as many sessions as it allows, "It started 10 sessions on events in the
last 24 hours, the most it starts in a day, so events until {time} start none."). [Run now] is titled "Run now, on
your Claude subscription"; a paused one shows [Resume] instead ("Paused, it starts nothing: what it needs is to be
resumed."). Opened: the task, its facts (for one that waits for events, "At most: 3 sessions an hour and 10 a day"),
and its runs, each the session it started or why none, and who started it ("On time", "A tool, with {name}'s token"),
or for a run an event started, what happened, a link to it on GitHub; with none yet, "None yet. The first starts in 25
min." ("…starts when an issue is opened." for one that waits). On one that waits for events, it reads [Run now…], as
it asks first what to run it on, in a dialog: "On the issue" ("#41, or its link"), "On the pull request", "On the
release", or "On the branch" for failing checks, "Empty: the task alone, on nothing in particular."; its agent gets
what was named as the person's own words, with where to read it ("Run it on issue acme/web#41 (…), as if it had just
been opened: `gh issue view 41 -R acme/web` shows it."), since running the task of a schedule that waits for an issue
on no issue would leave its agent guessing. "Run it from another tool" unfolds a ready curl request with Copy and its
rule: "its agent takes what context says as information, not instructions." It starts open for When asked schedules,
"which is what it's for". Taking one over asks: "It ran on {name}'s Claude subscription. From now on its runs start on
yours, and it's yours to change." Deleting says what stays: "The sessions it started stay, with their transcripts."

**Building one like it.** Offer complete, good ideas, filtered to what the project can use; turn settings into a
sentence of fields; show the computed result (the next runs, or what starts a run and what its agent gets) live; say
whose subscription every run uses; say before saving why it wouldn't run here, rather than leave people waiting for
runs that never come.

## A project's tickets

(components/project/tickets.tsx; lib/tickets.ts)

**Purpose.** Choose where the project's agents read and write tickets (none, GitHub Issues or Linear); for Linear,
which teams delegate work to fctl and how tickets move.

**Where it is.** A page of the project's Settings (`?tab=tickets`, where Linear's sign-ins come back to), since it is
a choice its maintainers make once; everyone in the project reads it, and links their Linear account from it. It lays
out by its column's width (a container), which it shares with the list of Settings' pages.

**The choice.** The page's title, "Tickets", over a lead that names the outcome and states the boundary: "Where agents
track their work: they read what a ticket asks, file what they find and answer the people there. Agents reach this
tracker alone: fctl holds its credentials, and their GitHub tokens reach issues only where it says." Three radio cards (arrow
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

**Delegating a ticket**, a part of the page once Linear is saved: four steps whose words follow the settings. "In Linear, assign one of
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

## Webhooks

(components/webhooks/panel.tsx, form.tsx, page.tsx, secret.tsx, parts.tsx; lib/webhooks.ts)

**Purpose.** Tell other tools what agents do, as it happens: addresses that fctl posts events to, signed, which a
workspace's admins add for all its projects (or some), and a project's owners and maintainers for its own; and,
once they run, what went out to each and how the receiver answered, to read, test and resend.

**Where it is.** A workspace's **Webhooks** tab, for its admins only (it holds every webhook of the workspace, its
projects' too), and a page of a project's Settings (`?tab=webhooks`), for its owners and maintainers. A webhook
opens in place (`&webhook=whk_…`), with "‹ Webhooks" back: there's too much per webhook (its health, its log, its
secret) to unfold in a row. The project's page lists its own, then, under "Acme's, which send Web's events too",
the workspace's that reach it: rows that open only for the workspace's admins ("The workspace's admins manage them."
otherwise), since they change them there too.

**The intro**, while there are none: the shape the other intros share.

- Headline "What agents do, posted to your tools". Lead from the place: "When a session in Acme starts, finishes a
  turn, asks something or has its pull requests ready for review, fctl posts it to an address of yours as it
  happens, so that Slack, a deploy script or a service of your own acts on it." On a project's Settings the page's
  own title, "Webhooks", and this lead stand in for both, and the intro keeps the rest.
- Points, each an answer to a worry: what it hears of ("You choose what it hears of…"), trust ("Each request is
  signed with a secret only you and fctl know, as Standard Webhooks sign them, and names the workspace and project
  it comes from: check both before acting on it."), failure ("A request that fails goes again 7 times over about 21
  hours, and its log keeps what went out, the newest 1,000 of the last 30 days, to read and resend.") and cost to everyone else ("It never holds
  a session up: fctl posts from a queue of its own, at most 120 requests a minute to each address.").
- [Add a webhook] (primary, large) beside who adds what: "Acme's admins add webhooks for all its projects, or some;
  each project's owners and maintainers add its own."
- **The preview**: the request as it goes out, the way a developer would read it: `POST hooks.example.com/fctl` with
  a green 200, two of its headers (`fctl-event: session.ready_for_review`, the signature cut short), and the start
  of its JSON with keys in blue and the number in pink, carrying the workspace's real slug; under it, the log it
  lands in: three lines, the last "503 → 200" in amber, a delivery that failed and went again. It's the upload
  worker's pull request again (`web#12`, `#45`, "Retry failed uploads…"). On a phone it follows the text.

**The form**, raised and inline, as the schedules' is:

- The name, a borderless display field whose placeholder is the address's host as it's typed ("Name it" before).
- **Address**, mono, with the rule in its hint: "fctl posts each event there as JSON, signed with its secret: an
  https:// address on the public internet." A self-hosted instance that lets webhooks reach its own network or
  post over http:// says so there, naming what its settings list, four at most ("an https:// or http:// address
  on the public internet, or on this instance's network (10.20.0.0/16, *.corp.internal)", "… and 2 more"); as an
  http:// address is typed there, the hint warns instead: "Over http://, anyone on the way can read and change
  what fctl posts: keep it to your own network." A development instance says it takes http:// and local
  addresses. What's wrong shows once the address has a scheme or the field was left: "Use https://: fctl posts
  only over HTTPS, so that nobody on the way reads or changes what it sends."; the server says why it refuses a
  private or local host, naming what the instance takes.
- **Events**: a pill, "Choose events" or "Every event" (every event says what that means: "All 19 events, and
  those a later version of fctl adds… A session's status changes often, so expect many requests."). Choosing starts
  from "When agents need people" (ready for review, a question, a failure), the commonest reason to add one; "Start
  from" chips swap in other sets ("Sessions as they go", "Agents' pull requests", "Reviews"). Below, the four groups
  flow into two columns (`columns-2`, each group whole), Sessions beside the three smaller ones, each with a
  tick that ticks or clears it all ("3 of 9"). Each event is its label, its type in mono on the same line (what a
  receiver switches on), and a sentence of when it comes; the busiest says so ("The busiest event.").
- **Projects**, a workspace's webhook only (also when its admins change it from a project's page): "Every project"
  ("Every project's events in Acme, those made later too.") or a checklist of them with their icons.
- **Sessions started by**, only while a chosen event is about sessions: chips (People and tools, Schedules,
  Autopilot, Tickets), none chosen meaning any; the hint follows the value ("…of these sessions alone. Reviews' and
  schedules' events come whoever started them.").
- **The sentence**, in a sunken box (`aria-live`), what the CLI says too (`describeWebhook` mirrors
  `fctl_domain::hooks::describe` word for word, with tests in both): "Posts to hooks.slack.com when pull requests
  are ready for review, an agent asks something or a session fails, in Web, for sessions started by people." More
  than three events count instead ("Posts 7 kinds of events…").
- The footer says what saving does next: "fctl first posts the address a challenge, which your receiver answers
  with it; then its signing secret shows, once." / "fctl first posts the new address a challenge, which your
  receiver answers with it." / "Changes reach new events within half a minute."; while fctl waits for the answer,
  "Checking the address: fctl posted it a challenge, which it answers with the challenge…" beside the button's
  spinner; what's missing replaces it once the person tried ("Choose an event, or every event."). An address that
  doesn't give the challenge back keeps the form as it was, with why under the address ("This address answered
  fctl's challenge with HTTP 401. It answers fctl's url_verification request with the challenge, before it checks
  the signature…"): fctl checks an address as Slack checks an app's, so that events go only where a receiver
  takes them.

**Added**: a card over the list, a key in an accent circle, "Added Deploy bot", "Its first events go to
deploy.example.com within half a minute.", a warn banner ("Copy its signing secret now: it shows once here, and later
only to those who manage the webhook, on its page. Whoever has it can sign requests as fctl, to your receiver."), the
secret in a CodeBox, and how a receiver checks it (below). [Done] [Send it a test], which opens the webhook's page on
its test.

**The list**: "2 webhooks · 1 failing · 1 off" and [Add a webhook] (disabled at the workspace's 20, saying so). A
row is a glyph in its state's tone (the webhook mark with GitHub's green dot while it delivers; amber with a
warning while it fails or once fctl turned it off; grey while off), the name and a pill only when it isn't plainly
on ("Failing", "Off"), the sentence, facts ("Web's · 27 delivered, 4 failed in the last day · 3 waiting · last 2m
ago", "nothing sent yet" for a new one) and the problem in amber: "fctl's attempts have all failed since 9m ago
(HTTP 503): it tries each again over about 21 hours." or "fctl turned it off. Every delivery failed for 3 days, the
last with HTTP 502. Turn it on again once its address answers."

**A webhook's page**:

- Its header: the glyph, the name, its pill, the address in mono, the sentence, and "The workspace's · added by
  [avatar] Ada · 3d ago"; [Send a test] and a ⋯ menu (Edit, Turn off/on, Delete…). Edit swaps the header for the
  form. On a phone the buttons go under the name rather than squeeze it into a column.
- **What's wrong, with the way out beside it**: fctl turned it off (amber, its reason, [Turn it on]); failing
  ("fctl's attempts have all failed since 12:25, the last with 503 Service Unavailable in 5 ms. It tries each
  delivery again 7 times over about 21 hours, and turns the webhook off when one fails for good after 3 days of
  failures."
  [Resend the ones that failed] "Once your receiver works again."); events dropped for a full queue.
- **Deliveries**: "27 delivered, 4 failed in the last day. Its newest 1,000 of the last 30 days are kept." (a day
  without failures says "27 delivered in the last day"; a busy webhook's thousand cover less than 30 days), a pill
  (All, Failed, Waiting, Delivered) and an event Select. The summary's second sentence starts a line of its own,
  and the summary narrows beside the pill and Select, which move below it once the row has no room for both (on a
  phone, or in a narrow window). A row is a mark (a green check, a red cross, an amber clock while it waits for a
  retry, a dashed circle before its first attempt, each with its words for screen readers), the delivery's gist
  ("web#12 finished a turn: Retry failed uploads", "Review of acme/web#45 at 3f2a1c9 found 1 new issue, 1 still
  open", a "test" pill), its type and facts in mono ("session.finished · 3 attempts · goes again in 4m"), the
  status in its tone (green 2xx, red the rest, `---` when no answer came) and when. It unfolds in place: the
  attempts, newest first, each a dot, its time and its words ("503 Service Unavailable in 5 ms", "No answer within
  10 seconds: answer first, then do the slow work.", "· resent by Ada", or for a test "· sent by Ada"), "fctl tries
  it again in 4m." in amber while it waits; then Request or Answer: the address, every header as posted (the signatures too, two during a
  rotation's day), the payload laid out and highlighted (Shiki, in both themes), or the answer's status, headers and
  body ("Its first 4 KB."). [Resend] beside them, disabled with its reason for a test ("A test isn't resent: send
  another one.") or after five. Twenty at a time, then [Show older]. Empty: "Nothing went out to it yet", "The next
  event it wants shows here as fctl posts it, with the answer it got. Send a test to see one now." [Send a test].
- **Send a test** is a dialog: what it does ("fctl posts a made-up event of the kind you choose to {address}, now,
  marked as a test…"), a Select of every event (those it doesn't get say so), [Send], and the result in place:
  "Delivered: 200 OK in 6 ms." or "Failed: …" in red, the answer's body, "It's in the log below, with the request as
  fctl posted it."
- **Signing secret**: hidden (`whsec_••••`) until [Show], which takes confirming it's you where the instance asks;
  [Rotate secret…] ("For when it may have got out, or as a habit."), whose dialog says the overlap before the
  click: "A new secret signs its requests from now on. The current one signs them too for a day, so that your
  receiver switches without missing one…", after which an info banner says until when. Then **Check that a
  request is fctl's**: a pill of Node.js, Python and Any language over the check, with this webhook's workspace (and
  project) ids in it, so that it checks where a request says it comes from too.
- The danger zone: "fctl posts nothing more to it, and forgets what went out to it and its secret. The sessions,
  reviews and schedules it heard of stay as they are." The dialog offers the gentler way in words: "Turning it off
  instead keeps all of it."

**States.**

| State | What people see |
|---|---|
| Loading | Skeletons; never "no webhooks" before the list has loaded. |
| None, a workspace | The intro. |
| None of its own, a project, the workspace's reaching it | "Web has no webhooks of its own yet." beside [Add a webhook], then the workspace's. |
| New | A green-less glyph and "nothing sent yet" until its first attempt. |
| Delivering | GitHub's green dot on its glyph; no pill. |
| Failing | Amber glyph and pill, the row's amber line, the page's banner with Resend the ones that failed. |
| Turned off by fctl | Amber glyph, "Off", why in amber, Turn it on. |
| Off | Grey glyph, "Off", "It's off: it gets nothing, and what happens meanwhile doesn't wait for it." |
| Full queue | "{n} events were dropped since it last took one: 1,000 deliveries waited for it already, so they won't be sent." (fctl keeps nothing of them) |

**Edge cases.** Failing goes by fctl's own attempts: a person's test or resend that fails doesn't make a webhook
Failing (its delivery shows the failure), one that goes through ends it, and a webhook turned on again or pointed
elsewhere fails afresh, so that its next failure doesn't turn it off at once. On a project's page, the workspace's
webhooks show their addresses shortened to scheme and host (`https://hooks.slack.com/…`) to those who don't manage
them: a path can hold a credential. A
workspace's webhook opened from a project's page keeps its projects when saved (a test pins it). Tests aren't in
the day's counts. Resending one that waits takes none of fctl's retries: its "fctl tries it again in 4m" stays. Long addresses and headers wrap anywhere (`[overflow-wrap:anywhere]`); a payload scrolls
sideways on a phone. What fctl's own log calls a failure keeps its words beside the status ("302 Found in 12 ms: a
redirect, which fctl doesn't follow. Give the address it redirects to.").

**Building one like it.** Lead with where the result lands and what it carries, drawn as a developer reads it; make
the set people most likely want the starting point; say the configuration in the CLI's sentence as it's chosen;
show a secret once with what its holder can do, then behind a confirmation; for anything that runs unattended, keep
what it did, the request and the answer, a click away, with the way to try again beside what failed.

## Service accounts

(components/service-accounts/panel.tsx, page.tsx, ask.tsx, parts.tsx, usage.tsx; lib/service-accounts.ts)

**Purpose.** Let a program of a workspace's own (a portal where its people start agents, a chat bot, a script) start
sessions for its people through fctl's API, while each person decides whether it may start them for them: a
session it starts is theirs, on their Claude subscription. It is the one feature here that acts as someone else,
so every page around it says whose sessions, on whose subscription, and who chose.

**Where it is.** A workspace's **Service accounts** tab: its admins see it always, its members once it has a
service account, which they answer there. One opens in place (`&serviceAccount=sva_…`) with "‹ Service accounts"
back, for its admins. What people answer also shows where they are anyway: a card on the Agent Floor, a line in
Needs you, the workspace's Settings → You, and an invitation to the workspace.

**The intro**, for admins while there are none, in the shape the other intros share:

- Headline "Agents started from your own tools". Lead from the place: "A service account lets a program of
  Acme's, such as a portal where your people start agents, a chat bot or a script, start sessions for them
  through fctl's API and CLI, and follow what their agents do."
- Points, each an answer to a worry: whose session ("It acts for one person at a time, named in each request: the
  session it starts is theirs, on their Claude subscription, within what they may do in the project."); consent
  ("People choose: it starts sessions only for those who allowed it. fctl asks each of Acme's people, and each
  one who joins later, and they change their answer whenever they like.", or, where the instance doesn't ask,
  "This instance doesn't ask people: it starts sessions for anyone in Acme…"); what it can't do ("…It changes
  nothing else: no settings, people, secrets or tokens."); and the keeper ("Its secret works while the admin who
  made it is an admin here. If they leave, it stops until another admin makes it a new one.").
- [Make a service account] (primary, large) beside "Acme's admins make them. Every session one starts says so,
  in the app, the audit log and webhooks."
- **The preview**: a program's request as it goes out (`POST /projects/web/sessions`, a green 201, the
  `authorization` header cut short, `fctl-on-behalf-of: ada@acme.dev` in blue, the prompt), the session it
  started under it ("web#12 Fix the login redirect", "Ada Lovelace, through Acme portal" after the service
  account's mark), and a card of whom it acts for: Ada "Allowed it" (green dot), Grace "Asked" (blue), Linus
  "Didn't allow it" (grey); where the instance doesn't ask, each says "It acts for them".

**The form**, raised and inline, as the webhooks' is: the name as a borderless display field ("Name it: what uses
it"), then **What it is**, two lines, whose hint says who reads it ("Acme's people read it as fctl asks them to let
it start sessions for them: say what it is and where they use it."). The footer says what making it does next:
"Its secret shows once, as it's made. Then fctl asks Acme's people to let it start sessions for them."

**Made**: a card over the list, a key in an accent circle, "Made Acme portal", "fctl asks Acme's 12 people to let
it start sessions for them. It starts none for anyone until they do.", a warn banner ("Copy its secret now: it
shows once, here. Whoever has it starts sessions for the people who allowed it, so keep it where your program
reads it, and nowhere else."), the secret in a CodeBox, and **Start a session for someone**: a pill of fctl, curl
and Node.js over the request, with this instance, one of the workspace's projects and the admin's own address in
it. The fctl and curl ones carry the new secret, to try at once; the Node.js one reads it from `FCTL_TOKEN`, as a
program's code should, and shows how it tells "they haven't allowed it yet" from other refusals
(`body.field === "on_behalf_of"`), since that is what a portal shows its user. [Done] [See who it acts
for]. A new secret (below) shows the same card, "Acme portal's new secret", without the second button.

**The list**: "2 service accounts · 1 stopped" and [Make a service account] (disabled at the workspace's 10, saying
so). A row is its glyph (an account with a cog, lucide's `UserRoundCog`, with GitHub's green dot once it has been
used; amber with a warning once it stopped), the name and a pill when it isn't plainly at work ("Stopped", "Not
used yet"), what it says it is on one line, the facts ("4 of 12 allowed it · 1 didn't · 7 haven't answered · 23
sessions started · used 5m ago") and, once it stopped, why in amber: "Stopped: Grace Hopper, who made its secret,
is no longer an admin of Acme. An admin makes it a new secret to start it again." Each row holds the admin's own
answer too, as members' rows do, since the tab's badge, Needs you and Settings → You lead them to this list: [Don't
allow] [Allow] while it asks them, with "Asks to start agents for you" in blue before the facts, then a switch. Its
name is the row's cover link (`ROW_COVER`), so the page opens from anywhere on the row, and the answer lies over it
(`ROW_ABOVE`); on a phone the answer goes under the words, and the arrow goes.

**A service account's page**:

- Its header: the glyph, the name, its pill, what it says it is (or, without it, "It says nothing of what it is.
  Say what it is, for the people it asks."), and "Acme's · made by [avatar] Ada · 3d ago · used 5m ago"; [Edit]
  and a ⋯ menu (Make a new secret…, Delete…). Edit swaps the header for the form.
- **Stopped**: an amber banner with why and [Make a new secret] beside it ("…Until then, your program's requests
  are refused, and it starts no sessions.").
- **Who it acts for**: the tally, then everyone in the workspace by name, with the address they're a member as
  and their role: "Allowed it 2d ago" with a green dot, "Asked: hasn't answered yet" in blue, "Didn't allow it" in
  grey, or why it can't act for them whatever they answer in amber ("Cy's account is disabled", "…has to set up
  two-factor sign-in first, which Acme requires"). Your own row holds your answer, which you change there; nobody
  answers for anyone else, which the section's lead says. Over six people, a pill narrows the list (Everyone, It
  acts for, Asked, Didn't allow it, Can't now), each with its count, the empty ones left out.
- **Sessions it started**: the newest eight as the app's session rows ("23 in all, the newest first. Each is its
  person's, who follows it."); "None yet. The sessions it starts show here as it starts them."
- **Secret**: its end (`fctl_svc_••••…x8Kq`) with [New secret…] beside it, "Made by [avatar] Ada · 3d ago · it
  works while Ada is an admin of Acme.", then how a program uses it, as on Made, without the secret. The dialog
  says what happens before the click: "Its current secret stops working at once: your program's requests are
  refused until it has the new one. You keep the new one from now on. People's answers stay as they are." (for one
  that stopped: "It works again with the new one…").
- The danger zone: "Its secret works no more, and people's answers to it go. The sessions it started stay their
  people's." The dialog adds that one made again asks people again.

**What members see**: the tab's lead says what a service account is and what allowing one means ("…It messages,
interrupts and stops their agents for you, and nothing else. Change your answer whenever you like."), then each
service account as a row: its glyph, name, what it says it is, and a `Meta` line ("Asks to start agents for you"
in blue until they answer, "Starts agents for you", "You didn't allow it"; who made it; when they answered), the
same words the Agent Floor and Needs you use, so that one ask reads the same wherever it shows.
Unanswered, a row ends in [Don't allow] [Allow]; answered, in a switch labelled "Allowed" or "Not allowed", so that
the first answer is a deliberate choice and a change is quick. On a phone the answer goes under the words.

**What fctl asks people.** On the Agent Floor, a blue-tinted card (blue is "your move") after invitations, until
they answer: "Acme portal asks to start agents for you in Acme", what it says it is in quotes, three lines of what
allowing it means (it starts sessions for you in Acme's projects you work in: they're yours, on your Claude
subscription, and you follow them; it messages, interrupts and stops their agents for you, and reads what they do;
nothing else, and you take it back whenever you like), "A service account of Acme's · made by Ada · 2 days ago",
and [Don't allow] [Allow]. Several share one card, which says what allowing means once ("2 service accounts ask
to start agents for you in Acme", "Each starts…") and lists each with its own answers: the same lines in every
card read as boilerplate, and get skipped. Needs you lists each ("Acme portal", "Asks to start agents for you" in
blue, the workspace's avatar with the service account's mark), counted in its pill, the tab's title and the app's
badge; the workspace's tab carries a blue count; Settings → You says which act for you ("Acme portal starts
sessions for you, on your Claude subscription. One asks you." [Choose]). An invitation says it before they join:
"Acme has a service account, Acme portal: a program of its own that starts agents for its people, on their Claude
subscription. It starts them for you only if you allow it: fctl asks you once you join."; joining says where to
answer.

**Where the instance doesn't ask** (Admin → Settings → Service accounts, "People allow them first"): turning it off
asks first, in a dialog that says who it affects, those who said no included, and that answers count again once
it's on, with a warning of what holding a secret then means. Then nothing asks, and each place says so in its own
words: the members' tab's lead and the admins' list ("This instance's admins chose that people don't choose…"),
the intro and Settings → You ("This instance doesn't ask people…"), Made ("It starts sessions for anyone in Acme
from now on."), and the members' rows ("Starts agents for anyone here").

**Elsewhere.** A session it started says so: its cover "Started by Ada Lovelace, through [mark] Acme portal", its
details' "Through" row, its row's mark beside the schedule's and the ticket's ("Started through Acme portal"), and
the audit log (" through the service account Acme portal"). A schedule's run keeps the schedule's mark: whoever
ran it, it's the schedule's. Webhooks' "Sessions started by" offers Service accounts.

**States.**

| State | What people see |
|---|---|
| Loading | Skeletons; never the intro before the list has loaded. |
| None, an admin | The intro. |
| None, a member | No tab, no card. |
| New | "Not used yet" pill, no green dot. |
| Used | GitHub's green dot on its glyph; no pill. |
| Stopped (its keeper left) | Amber glyph and pill, the row's amber line, the page's banner with Make a new secret. |
| Asks you | The Agent Floor's card ("Acme portal asks to start agents for you in Acme"), Needs you's line and the members' tab row ("Asks to start agents for you", in blue), the tab's blue count. |
| Instance doesn't ask | No card, no count; "Starts agents for anyone here" and why. |

**Edge cases.** An answer is the person's own: the only controls are their own row on its page and, for its admins,
the list's rows, which hold their own answer. A workspace
closed to someone (its two-factor requirement) asks them nothing until it opens. A service account deleted since
leaves its sessions saying "through a service account deleted since". Leaving a workspace forgets the answers
given there, so joining again asks again. A secret shows once; the page shows only its end, so people tell two
apart without it. With it, the workspace's admins see nine tabs where the instance has a Linear app (eight
elsewhere), which their strip spaces closer so that they fit a computer's column
([Page tabs](lists-and-pages.md#narrowing-ordering-and-counting)).

**Building one like it.** When a feature acts as someone, ask that person, where they already look, with what it
will do in their name and what it won't, and make the first answer two buttons and later ones a switch; show its
admins every person's answer, never a way to give it for them; and say on everything it made that it made it.

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
- **A token Claude refused** (in as many sessions as the instance says) gets the same red banner: "Claude refused
  this token on Nov 20, so sessions can't run on it: it was revoked, or its year ran out. Make a new one with claude
  setup-token and connect it here." [Connect a new token]; one an admin token set sends its person to their admins
  first.
- **When a token runs out.** Each long-lived token's line says when ("runs out around Nov 23, 2027", "around" while
  nobody said when it was made) and "Claude answered 2 minutes ago". Within 30 days the date leaves the line for an
  amber block under it that says why it's "around" and what to do before then: "Runs out around Nov 29. That's a
  year after you connected it: fctl can't read the date from the token, so it may be sooner. Make a new one with
  claude setup-token and paste it here before then, or your sessions stop." [Connect a new token], which opens the
  paste steps. In its last week the list of pages marks Claude ("Runs out in 5 days").
- **When was it made.** The paste steps ask "When did claude setup-token make it?" with three answers, the common
  one first: Just now (the date is exact), Earlier (a date picker), I don't know ("fctl counts a year from today and
  says around"), and say the result: "It runs out on Nov 23, 2027, a year on. fctl tells you a month and a week
  before."

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

## Domains that sign in with a provider

(components/sign-in/admin.tsx `SignInAdmin`; routes/admin.tsx `SignInTab`; components/sign-in/provider.tsx;
components/sign-in/sessions.tsx `SessionPolicies`; components/sign-in/networks.tsx `Networks`;
components/workspace/sign-in.tsx `WorkspaceSignIn`, `SignInBlocked`; routes/auth.tsx `LoginPage`, `DomainRules`;
routes/settings.tsx `SignIn`, `Devices`; components/tokens.tsx; lib/sign-in.ts; lib/session-policy.ts; fctl's ADRs
0099, 0102 and 0103)

**Purpose.** Let an instance's admins move their organization's people onto its identity provider (Google today, so
that the tab reads "acme.com and acme.dev sign in with Google only.") without a nervous afternoon: no way to lock
themselves out, and a clear picture of whom it concerns before anything changes. Then explain it, wherever someone
meets it.

**Admin → Sign-in reads like the instance's front door**, top to bottom:

1. **How people sign in**: a lead built from the instance's own counts ("52 people have an account: 38 with a
   password, 12 with Google and 9 with a passkey. 3 people haven't signed in yet." then "acme.com and acme.dev sign in
   with Google only."), and four small counts in sunken tiles, an icon each: a password's, the provider's mark, a
   fingerprint, a person with a plus for those not signed in yet.
2. **Providers**: a card each, the provider's own mark in a tile that lights once it's set up, a "Set up" or "Not set
   up" pill, and who uses it ("12 people sign in with it"). Set up, it shows the redirect URI in a `CodeBox` ("Its OAuth
   client lists this as an authorized redirect URI.") and what the admin's own sign-in says of it: "You signed in with
   Google as an address at acme.com: it works for you." or, with a link that signs in and comes back, "You signed in
   with a password. Sign in with Google to check that it works for you before you require it." Not set up, it names
   what sets it up (`GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET`) and links fctl.sh's guide.
3. **Domains that sign in with a provider**: a row per rule, a building in a lit tile, the domains in words, a pill
   with the provider's mark ("Google only"), and whom it covers ("40 people · 12 with Google · 26 still have a
   password, which goes at their next sign-in · passkeys don't sign them in alone"); Edit and Stop requiring. Under
   them, with a crown, who keeps a way in: "Ada, the primary instance owner, keeps their password and passkeys
   whatever these say: the instance's way in while a provider is down." Empty, one sentence says what requiring does
   with the reader's likeliest case ("Requiring Google at acme.com, say, moves everyone with an acme.com address off
   passwords…"), and the button is primary; with rules, secondary. With no provider set up, the button is disabled
   with its reason beside it.
4. **Accounts**: the self sign-up switch, its hint following the value.
5. **Two-factor sign-in**, which moved here from Admin → Settings; the workspace setting's link to it follows.
6. **Staying signed in**: how long a browser and a CLI stay signed in, the longest an access token lasts, and whether
   members make them (below).
7. **Networks**: the IP ranges people sign in and send requests from (below).

**Requiring one is a dialog that shows its consequences as you type** (`RuleDialog`). Domains in one field
(commas, spaces or lines; `*@` and case don't matter), its placeholder the admin's own domain with "Use acme.com,
your own domain" under it while it's empty; a Select of providers only when there are several; the passkeys switch,
whose hint says the cost of each answer ("Quick, but past Google's checks: a passkey still signs in someone whose
account Google closed…"). Once what's typed settles (250 ms) and reads as domains, the preview
(`POST /api/v1/admin/sign-in/preview`) fills a sunken box (`aria-live`): the avatars of those it concerns, then the
CLI's sentences (`consequences` mirrors `fctl admin sign-in require`): "38 people sign in with a password today: their
next sign-in goes through Google, and their passwords stop working.", the tokens saving deletes ("Their 5 access tokens
and CLI sign-ins made with another way in go: they make new ones after signing in with Google.", and an admin token's,
which a directory sync may depend on), "4 people at other domains sign in as before.", "Ada, the primary instance
owner, keeps their password and passkeys: the way in if Google is down.", and "fctl emails each of them what
changes." where the instance sends email. A change that takes nobody's way in leads with "Nobody's way in changes."
A word that isn't a domain is the field's error, and asks the server nothing.

**No way to lock yourself out.** When the change would sign out the admin who saves it (their own address is covered,
and they signed in another way), an amber banner says so with the way out as a link, and the primary button stays
disabled: "This would sign you out: you signed in another way. Sign in with Google as your acme.com address first,
which shows that it works, then require it." The server refuses the same save (409), so a stale tab can't either.

**Stopping** asks first, with what happens and what doesn't come back: "Their people sign in as they like again:
those who still have a password, with it. Passwords that went at their first sign-in with Google don't come back…"
and how many it releases. Reversible, so its button is primary, not red; the server asks the admin to confirm it's
them, where the instance asks for that.

**Staying signed in is a draft until it's saved** (`SessionPolicies`). A row per limit, its label and a hint that says
what the limit costs on the left, a small Select on the right (under it on a phone, but the switch, which stays
beside its label): "Browsers sign in again after" (While it's used, the default, last; 8 hours … 30 days), "Browsers
sign out unused for" (15 minutes … 30 days, whose hint says "A tab left open on a page that updates itself counts as
use."), "CLIs sign in again after", "Access tokens last at most" ("As its maker chooses"), and the "Members make
access tokens" switch, whose hint follows its value. Each Select offers the saved value too where the CLI set one the
list doesn't have ("36 hours"). Changing one saves nothing: the preview (`POST /api/v1/admin/sign-in/sessions/preview`)
fills a sunken box with the CLI's sentences (`fctl admin sign-in policies`): "Saving signs out 14 browsers and 1 CLI at
once, yours among them: their people sign in again." and "It ends 5 access tokens, 3 of them members': scripts and CI
that use them need new ones.", or "Nobody is signed out now: sign-ins end as it says from here on." Save waits for the
preview of the draft as it is (the box fades while an earlier draft's counts show), and Cancel puts the saved policy
back. Unchanged, one quiet line says what it doesn't hold: "Admin tokens and service accounts' secrets last as long as
their makers chose: they're for machines, such as the directory sync that closes people's accounts." The section's
lead says why it matters with a provider: signing in again goes through Google, which checks they still may.

**Networks show the admin's own address beside them** (`Networks`). A lead says where people sign in from now
("People sign in and send requests from anywhere." or "…only from 203.0.113.0/24 and 2001:db8::/32. The primary
instance owner signs in from anywhere, in a browser or the CLI."), then a monospace textarea, "Ranges", one a line,
and under it "Your address: 198.51.100.7" with "Add it" while it isn't typed. Save and Cancel show only once it
changes. Ranges that would shut the admin out are the server's to refuse (409, "Your own address, …, isn't in these
networks: saving them would shut you out."), shown in a banner; a range that isn't one is the field's error.

**People meet the limits where they apply.** Settings → Devices adds a sentence where the instance limits sign-ins
("This instance signs browsers out 12 hours after they sign in, or after an hour unused, and CLIs 30 days after they
sign in."). The new access token dialog offers no expiry past the longest ("90 days", the longest itself where the
list lacks it, and no "Never"), with "This instance lets a token last 90 days at most." under it. A member where only
admins make tokens finds no New button, and the section says who does and what to use instead ("…use the CLI, signed
in as you with fctl login, or ask an admin."). From outside the networks, the sign-in page leads with an amber banner:
"Acme factory takes sign-ins only from its organization's networks, and this browser is outside them. Connect to one
(your VPN, say), then sign in."

**A workspace's own requirement lives in its Settings → Access** (`WorkspaceSignIn`, fctl#659), under two-factor
sign-in: "Members at your domains sign in with Google", its hint saying who it covers (members in it as an address at
those domains) and who it doesn't (contractors in it as other addresses), and that closing someone's Google account
stops their next sign-in, not the ones they have. "Require Google" opens a bordered form: the domains, the admin's own first;
the passkeys switch; and, once they read as domains, a sunken box from the workspace's own members: "2 people are in
Acme as an address at acme.com: it opens to them only once they've signed in with Google as that address. Their other
workspaces don't change." and "1 person in it as other addresses signs in as before." Saving one that would close it
to the admin is refused (409) with the way out as a link: "Sign in with Google as ada@acme.com". Required, the row
shows a pill with Google's mark and the domains, and "Change domains" and "Stop requiring it"; where the instance no
longer signs people in with Google, it says nobody it covers can open the workspace, and Stop stays. The workspace's
header names it ("Google at acme.com and acme.dev"). A covered member signed in another way finds the workspace page
replaced by an amber banner (`SignInBlocked`): "Acme requires its members at acme.com to sign in with Google as that
address, and you signed in another way. Until you do, its projects and sessions are closed to you; your other
workspaces aren't. Sign in with Google as bob@acme.com", and, for its primary admin, "Stop requiring Google", for when
nobody can. The sidebar's lock reads "Closed until you sign in with Google" with "Sign in with Google to open it" under
the workspace, and the home page's notice says the same with "Open it".

**The sign-in page leads with the provider.** Its buttons keep the provider's own mark and neutral colors (never the
app's yellow, which would clash with them), and under them, a quiet line per rule: "acme.com and acme.dev sign in with
Google." Typing an address at such a domain turns the form into that provider's button, two lines with the address
under the label (`ProviderSubmit`, the invitation's look), and the password field goes; a line says why ("…its own
sign-in, with its checks, signs you in here"), and a quiet question offers the instance's way in while the provider
is down: "Primary instance owner? Sign in with your password", which turns back with "Continue with Google instead".
Enter goes on to the provider with the address as its `login_hint`. Coming back refused, the page says which account
to choose: "Your account signs in with Google as your acme.com address. Choose that Google account when Google asks:
the one you chose isn't one." Where signing in makes no accounts, the footer says where they come from: "Need an
account? Your organization makes them here: ask an admin of this instance." An invitation to a covered address shows
the provider's button alone, and says it takes the invitation.

**Settings explains it where it applies.** Sign-in methods leads with a blue banner ("acme.com signs in with Google,
as Acme factory's admins require: Google's own sign-in, with its checks, signs you in here."); the password row says
"None: passwords don't sign in at acme.com" and offers nothing; the Google account at the domain reads "Your way in,
as ada@acme.com" and can't be unlinked, while a personal one can. Passkeys say what they still do ("Confirm it's you…
after you sign in with Google and before sensitive actions. They don't sign you in alone…"). An address at the domain
loses its Disconnect button, and a note under the list says why and who removes it. The primary instance owner reads
instead that they keep their password and passkeys, the way in if the provider is down. Devices say how each signed
in ("Browser · signed in with Google · active 2 minutes ago").

**Building one like it.** Show who is affected before the button, with the real numbers and names, in the same
sentences the CLI prints; where a change is several controls, keep it a draft with its preview and one Save. Make the dangerous outcome impossible rather than warned about: the admin proves the
provider works for them by signing in with it. Keep a named way in when the outside service is down, and say whose it
is on every page that takes the others away.

## Memory and retrospectives

(components/project/memory.tsx, retrospectives.tsx; routes/project.tsx `Settings`)

- The switches in a project's settings describe the loop and what off means: "Each session's agent starts with the
  notes earlier agents and people left, adds what a future agent should know, and marks notes that turned out wrong
  stale. People read and change them under Memory. Off, agents neither read nor add notes, and the ones there stay."
- Both are parts of the project's Memory tab. Each opens with what it holds ("Notes this project's agents keep for the
  agents after them: what they learned that the repository doesn't say."); off, a banner says so and who turns it on,
  and for those who can, turns it on from there: "This project's agents keep no memory: they don't start with these
  notes or add any. Turn it on"
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
- **Access tokens.** A live summary like a new pool's: "Runs sessions in Web; their agents review and comment on
  GitHub, and push nothing. It never reaches your account, your workspaces' people and settings, or your other
  tokens." Created: "Copy it now: it is shown once." and an example of using it.
- **A project's settings** (pages of its Settings tab). Switch rows whose sentence is the whole contract: "When a check of the pull request's
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
  GitHub tab's thread. The schedule preview shows one idea of each way to run, each the first of its group: Triage new
  issues on an event, Update dependencies at set times. Someone who saw one recognizes the next.
- **Decoration**: `aria-hidden="true"` and `select-none`. The text beside a preview must say everything it shows.
- **Anatomy**: a main card (`rounded-xl`, `border-line`, `bg-surface`, a long soft shadow, 0 18px 50px -24px at 35%
  black) and, 12 px under it, a smaller card for a second fact (the check, the runs, the label), or for schedules a
  second card of the same size, for the other way to run.
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
| "38 people sign in with a password today: their next sign-in goes through Google, and their passwords stop working." | Whom a change concerns, counted, before the button, in the CLI's words too. |
| "This would sign you out: you signed in another way. Sign in with Google as your acme.com address first, which shows that it works, then require it." | Refuses the one change that would lock its maker out, with the way through as a link. |
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
