# Starting a new product with agents

Agents building a product from nothing settle every question nobody
answered with a sensible default, and the defaults add up: a product that
works, but not the one you meant, on a stack you wouldn't have picked, with
a look nobody chose. The questions below are the ones to answer before the
first session starts. They hold for any greenfield build, whoever plans it
and whatever it's built with; the last two parts turn the answers into a
plan and hand it to agents, [with an autopilot](#with-an-autopilot) in
fctl's case.

Answer each in a few sentences. Rough is fine, and the reasons count for
more than the details: they're what lets an agent decide what you didn't
say. "Not decided yet" is an answer too: say what it depends on, and that
agents should ask before they choose.

## The product

- **What is it called?** Decide on a name before the first commit. It goes
  into repositories, packages, domains, the interface's copy and the docs,
  and a rename later touches all of them. A working name is fine, said to
  be one.
- **Which features will it need, and how should each work?** List the
  features you expect and, for each, how it works from the user's side:
  what someone does, what they see, what happens next. Say which come first,
  which can wait, and what it must never do. A feature named without how it
  behaves comes back as the most generic version of itself.
- **Who uses it, and how?** Name the roles (a customer, a team's admin,
  support staff, another system calling its API) and what each comes to
  do. Say where they work differently: what each sees and may change, how
  often they come, on which devices. Roles shape the data model and the
  permissions, among the hardest things to change later.
- **Who is it for, and who ships it?** An internal product, a service
  strangers sign up for and use, and an open source project each set a
  different bar for onboarding, abuse, privacy, documentation and support.
  Say which, and whether agents deploy on their own or people release it,
  for example by running a release workflow by hand.
- **How do people sign in?** It follows from who uses it: single sign-on
  with the company's identity provider (Google, for example) for an
  internal product; magic links by email, passwords or passkeys, or several
  of them, for a public one; and two-factor authentication (TOTP) on top
  where security matters most. Accounts, sessions and roles all hang off
  this choice.
- **Does it need landing pages?** Say whether there are marketing pages
  and how far they go, from a single page to a site with features, pricing
  and docs, and whether agents should spend time on search (SEO), share
  images (Open Graph), titles and descriptions, and marketing copy, or leave
  them for later.
- **What else do you know?** Everything else collected along the way:
  products you like and why, ones to avoid, sketches, what users have
  said, budgets and deadlines, ideas for later. What agents don't need yet
  still shapes the foundation they lay.

## How it's built

- **What runs it, and how do agents run it locally?** Say what the service
  runs on: a cloud provider and which of its services, your own servers,
  people's machines. Then make sure agents can simulate those environments
  on their own, quickly and without credentials: workerd or Miniflare for
  Cloudflare, MiniStack for AWS. Agents that can run the whole system
  locally check their own work; agents that can't, guess.
- **One repository or several?** One keeps a change to the API, its client
  and the interface in one pull request, where an agent sees all of it.
  Several fit parts that ship on their own schedule or to other people,
  such as a design system shared by several products, or a public SDK. Say
  which, and what goes where.
- **Which languages, and what must it handle?** Name the programming
  languages and main frameworks, or what to weigh in choosing them, with
  the requirements that rule options in or out: performance (latency,
  throughput), how much use to expect (people, requests, data), where it
  must be hosted, cost.

## How agents work on it

- **How much verification do you want?** Linters and type checks are a
  given. Decide how much CI there is, how much effort goes into keeping it
  fast (agents wait for it on every change), and which other checks keep
  agents honest: end to end tests, screenshots, reviews by another agent.
  Seeding the local environment with realistic people and data is usually
  worth it: agents can then try a whole feature as someone would use it, and
  show each change in realistic screenshots, before and after.
- **What matters most?** Weigh UI (how it looks) against UX (how it works
  for people), accessibility, features, performance, robustness and
  security, for this product. Agents spend their effort where the brief
  points, and need to know which wins when two pull against each other.
- **What should it look like?** Give the design language a start: colors,
  type, density, the tone of the copy, products whose look you like. Have
  agents build a style guide early (the tokens, the components, when to use
  each) and look at it until you're reasonably happy with it: every screen
  after it inherits it.
- **Who will build it from here?** If agents will do most of the building,
  make that a requirement in its own right: "Everything needs to be built
  to make it easy for agents to keep iterating on the code, the design and
  the product: agent skills, scripts and tooling that make coding agents
  efficient. Mostly agents will build this product." Agents then invest in
  what makes the next agent fast: one command that runs everything, quick
  checks, docs written for whoever comes next.

## From answers to a foundation

1. **Ask for a plan.** Give all the answers to the most capable model you
   can use, and ask it for a plan another agent can build from. Ask for the
   design you want in so many words, for example: "Make a plan that I can
   give another agent to build from. Stress how much it matters that the
   product is really well designed, with great UI components and UX, so
   that it's a bliss to use."
2. **Correct it.** Read the plan before anything is built: a wrong choice
   costs a sentence to fix now and a rewrite later.
3. **Build the foundation first.** Hand the plan to agents to build the
   foundation (the stack running locally, CI, the style guide, sign-in, the
   seed data) before the features, and steer them where they drift.

## With an autopilot

An fctl autopilot can take the plan from there: it breaks the work into
sessions, starts them, and asks you what only a person can decide
([Autopilots](web-app/autopilot.md)).

- Commit the answers and the plan to the project's repository (as
  `docs/brief.md` and `docs/plan.md`, say, linked from its `AGENTS.md`), so
  that every session reads them, not only the autopilot's own.
- Keep the direction short: what to build and for whom, the foundation
  first, and where the brief and the plan are. A direction holds 8,000
  characters at most, so it points to the plan rather than holding it. The
  intro's *Build a product from a brief* is a start.
- Put it on with that direction, then steer it with notes and answer what
  it asks:

  ```sh
  fctl autopilot on -p <project> --direction-file direction.md
  fctl autopilot steer -p <project> "Finish the style guide before the next feature."
  ```
