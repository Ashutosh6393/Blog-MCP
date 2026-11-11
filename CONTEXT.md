# CONTEXT.md — blog-mcp

What we're building and why. Read this first in any session.

This file answers *what problem exists and for whom*. It does not describe folder
structure, file names, or APIs — those live in the code and go stale here.

---

## In one sentence

A remote MCP server that lets one person read, draft, and publish content on
`ashutoshverma.dev` from Claude Code, Claude Desktop, claude.ai, or a phone.

## The problem

Publishing means opening the laptop, finding the repo, copying a template, getting the
`export const metadata` block exactly right, committing, pushing, waiting for Vercel.
Drafting from a phone is not possible at all.

So the posts that get written are the ones that survive that friction. The idea you had
on a train does not survive it.

## Who uses it

| User | What they're trying to do | What they care about |
|---|---|---|
| Ashutosh — the only human user | Draft on a phone, publish from anywhere, keep the site as the single source of truth | Never shipping a half-finished post; the merge button stays his |
| The model — any Claude client | Call the tools: read content, load a skill, save a draft, open a PR | Errors it can act on in the same turn, not "tool failed" |

The model is the actual caller. Tool descriptions and error strings are its only
interface, which makes their wording part of the product, not polish.

## What success looks like

- A post goes from idea to a Vercel preview URL without a laptop.
- Every publish arrives as a PR that gets merged by hand.
- A confused tool call can never overwrite a published post or flatten a good draft.
- Saying "publish it" twice leaves exactly one PR.

---

## Domain language

Use these exact terms in code, tests, commits, and conversation. If you find yourself
inventing a synonym, use the term here instead — or propose adding one.

| Term | Means | Does **not** mean |
|---|---|---|
| **writing** | A blog entry on the site. Lives at `/writing/{slug}` | "post" — that's social |
| **project** | A portfolio project page. Has stack and status, no date | A repo |
| **post** | A social post (LinkedIn, X). Never rendered by the site | A writing |
| **kind** | One of `project`, `writing`, `post` | A file type |
| **draft** | An unpublished file in `workshop`. Private | A PR that isn't merged |
| **published** | Merged into `portfolio` and live on the site | Committed to a branch |
| **publish** | Open a PR on `portfolio`. The tool never merges | Deploy |
| **publish gate** | The merge button. Deliberately unreachable by the model | A confirmation prompt |
| **revise** | The explicit flag needed to touch an already-published slug | An edit to a draft |
| **slug** | The kebab-case URL segment. Immutable once published | A title |
| **skill** | Rules for drafting one kind of content. A file in `workshop/skills/` | An MCP prompt, or a template |
| **template** | The structure one kind of content goes into. A file in `workshop/templates/` | A skill — it carries no rules |
| **voice** | `be-human` — the author's tone and style. Served with every skill and template | One skill among several |
| **lazy reconciliation** | Checking on read whether a draft's PR merged, then archiving it | A webhook or cron |
| **portfolio** | The public site repo. The server opens PRs, never commits to main | This repo |
| **workshop** | The private repo holding drafts, skills, templates, post archive | This repo |

Ambiguous domain terms are the most common cause of an agent building the wrong thing
correctly. Add to this table whenever a misunderstanding surfaces.

---

## Boundaries

### We are building

- The MCP server, and only that. **This repo is the server.**
- Six tools: `list_content`, `get_content`, `get_skill`, `save_draft`, `publish`,
  `discard_draft`.
- Secret-path auth, and a `/health` route that really checks its dependencies — one
  check per external system, each arriving with the slice that needs it.
- The `publish` path: schema validation, branch, PR, idempotency. **No MDX parse** —
  ADR-005 decision 2 dropped it; the Vercel preview build on the PR is the check.

### We are explicitly not building

- **The site.** `portfolio` is a separate repo and its part is **done** — all five JSON
  routes and OG images ship. See [`docs/portfolio-implementations.md`](docs/portfolio-implementations.md).
- **Skills, templates, drafts.** Content. They live in `workshop`.
- **Anything that merges a PR.** That is the entire safety model.
- A database, search, auth beyond the secret path, auto-posting to LinkedIn or X, image
  uploads, per-platform draft tools, a merge webhook, or tracing. Each was argued and
  rejected — the reasons are in [`docs/adr/mcp-design.md`](docs/adr/mcp-design.md).

The second list matters more than the first. It is what stops scope creep from looking
like initiative.

---

## Constraints

| Constraint | Detail |
|---|---|
| Users / scale | One human. ~15 tool calls a week. Scale is not a design input |
| Reachability | Connectors are called from Anthropic's cloud, not the device. No localhost, no tunnels |
| Deployment | Fly.io, one small machine, auto-stop when idle. Near-free is the ceiling, not free |
| Secrets | The GitHub token and the path secret are env vars. Never in git |
| Team | One person, who is also the reviewer |

The phone is the dangerous client: no diff to read, and a distracted user. Every refusal
in the design exists for that case.

---

## External systems

Things we depend on that we do not control.

| System | Used for | If it goes down |
|---|---|---|
| GitHub API | Every read and write. No repo is ever cloned | Tools return an error string; nothing is queued |
| `ashutoshverma.dev` JSON routes | Published content and `api/schema.json` | `publish` must refuse — it cannot validate without the schema |
| Vercel preview builds | The second validation layer: broken imports, missing components | Merge blind, or don't merge |
| Fly.io | Running the process | The connector is simply down. `/{secret}/health` says which layer |

---

## Current state

- **Stage:** one tool live, five to go
- **Live:** yes — `mcp.ashutoshverma.dev`, on Fly
- **Users:** one, as designed
- **Done:** Slice 0, the site prep, in the `portfolio` repo. Slice 1, the server skeleton
  — secret path, both `/health` routes, and `list_content` reading the site's live JSON.
  **A custom connector works in the Claude mobile app**, verified on all three clients.
  That was the riskiest unknown in the whole plan and it is answered
- **Next:** GitHub arrives — a fine-grained token, the private `workshop` repo, and
  `get_skill`. See [ADR-002](docs/adr/002-github-access-and-workshop.md) and
  [ADR-003](docs/adr/003-skills-and-templates-are-separate.md), which replaced the
  `workshop` layout once the real content existed

---

## Decisions

Architectural decisions are **not** recorded here. They live in [`docs/adr/`](docs/adr/).
This file describes the problem; ADRs record what we chose to do about it.
