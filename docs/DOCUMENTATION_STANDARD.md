# Documentation Standard — Frontend

Every module in this repository is documented the same way, in the same place, with the
same six files and the same headings. This file defines that contract. It is normative:
if a module doc disagrees with this standard, the module doc is wrong.

This is the frontend half of a two-repo standard. The backend
(`mlm_platform/docs/DOCUMENTATION_STANDARD.md`) uses the same front matter, the same
numbered-heading discipline and the same decision-ID rules. Five of the six filenames are
identical in both repos. Learn the shape once, read either repo.

---

## 1. Where documentation lives

```
docs/
├── README.md                     # index of every module, with its doc tier
├── DOCUMENTATION_STANDARD.md     # this file
├── _standard/                    # blank templates — copy these to start a module
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── UI.md
│   ├── API.md
│   ├── OPERATIONS.md
│   └── PHASES.md
├── _archive/                     # superseded docs, kept for history, never cited
├── platform/                     # the shell: router, auth wiring, layout, build
└── <module>/                     # one directory per src/features/<module>/
    ├── README.md
    ├── ARCHITECTURE.md
    ├── UI.md
    ├── API.md
    ├── OPERATIONS.md
    └── PHASES.md
```

**The directory name is the feature directory name, character for character.**
`src/features/calendar-sync/` is documented in `docs/calendar-sync/`. Not `calendarsync`,
not `calendar_sync`. This is the rule that lets a reader — or an agent — construct the doc
path from a source path without searching, and it is worth more than any amount of
cross-referencing.

## 2. The six files, and what belongs in each

| File | Answers | Never contains |
|---|---|---|
| `README.md` | What is this module for? What is in and out of scope? Where do I start? | Endpoint tables, prop lists |
| `ARCHITECTURE.md` | How is it built? What calls what? What are the invariants? | Screen descriptions, env vars |
| `UI.md` | What does the user see, in which states, at which route? | Request shapes, cache policy |
| `API.md` | Which backend endpoints does it consume, and what comes back? | Component internals |
| `OPERATIONS.md` | How do I run, flag, test, build and debug it? | Domain explanation |
| `PHASES.md` | What was built when, what was decided, and what is deliberately absent? | Current-state reference material |

The split matters because the audiences differ. A new engineer reads `README.md` then
`ARCHITECTURE.md`. Someone wiring a new call reads `API.md`. Someone reproducing a bug
reads `UI.md`. Whoever is about to change a behaviour reads `PHASES.md` **first**, to find
out whether the thing they are about to "fix" was a decision.

Two deliberate differences from the backend standard:

- **`UI.md` replaces `DATA_MODEL.md`.** A frontend module owns no tables and no
  migrations. Its equivalent reference surface — the thing you look up rather than reason
  about — is routes, screens and states.
- **`API.md` documents the endpoints a module *consumes*, not ones it exposes.** The
  backend's `API.md` for the same endpoints is the authority on their behaviour; the
  frontend's records which ones this module depends on, what it sends, what it reads from
  the response, and which error codes it handles. Link, do not restate.

## 3. Mandatory front matter

Every one of the six files opens with the same block, so staleness is visible without
reading the body:

```markdown
# <Module> — <File purpose>

| | |
|---|---|
| **Module** | `<feature-dir>` |
| **Source** | `src/features/<feature-dir>/` |
| **Routes** | `/path`, `/path/:id` or `—` |
| **Backend module** | `<app_label>` → `mlm_platform/docs/<app_label>/` or `—` |
| **API prefix** | `/api/<prefix>/` or `—` |
| **Status** | Production · Gated · Merged-not-deployed · Stub · Deprecated |
| **Doc version** | 1.0 |
| **Verified against** | commit `<sha>` — <YYYY-MM-DD> |
```

**Verified against** is a claim that someone read the code at that commit. Do not carry it
forward on an edit you did not verify; lower it back to the commit you actually checked.
It is also the staleness check anyone can run:

```bash
git log -1 --format=%h -- src/features/<module>   # newer than the doc's sha? doc is suspect
```

**Backend module** is the cross-repo link. A frontend module that talks to `/api/wbreporting/`
names `wbreporting` here, and the backend's own six-file set answers what the endpoint
does. Without this row, every question about server behaviour becomes a search.

### Status vocabulary

| Status | Meaning |
|---|---|
| **Production** | Merged, deployed, reachable by its intended audience |
| **Gated** | Merged and deployed, but switched off or behind a named-list permission |
| **Merged-not-deployed** | On `main`, but the backend it needs is not live |
| **Stub** | A placeholder route or shell with no real implementation yet |
| **Deprecated** | Superseded; kept so the reasoning survives |

A module whose backend has unapplied migrations, or whose permission nobody holds, is not
Production. Say so in the front matter of every one of its files, not buried in
`OPERATIONS.md`.

## 4. Required headings

The numbered headings below are fixed. Keep them, keep their order, and keep their numbers
even when a section is empty — write `*Not applicable — <one line why>.*` under an empty
heading rather than deleting it. Sub-headings under a numbered section are free.

Fixed numbers are not bureaucracy: they make `#6-permissions-and-gating` a stable anchor
that survives an edit, so a cross-link written today still resolves after a rewrite.

### `README.md`
```
1. Purpose
2. Scope              (in scope / explicitly out of scope)
3. At a glance        (metrics table)
4. Domain vocabulary
5. Dependencies       (upstream · downstream · backend · external)
6. Document map
7. Where to start reading
```

### `ARCHITECTURE.md`
```
1. Layering
2. Component map
3. Primary flows
4. Server state and caching     (query keys, staleTime, invalidation)
5. Local and URL state
6. Permissions and gating
7. Integration points
8. Invariants and failure modes
```

### `UI.md`
```
1. Routes and entry points
2. Screens
3. States               (loading · empty · partial · error · denied)
4. Interaction rules
5. Responsive and print behaviour
6. Accessibility
7. Styling and theming
```

### `API.md`
```
1. Conventions          (base URL, auth header, error envelope)
2. Endpoints consumed   (table)
3. Payload types
4. Query parameters
5. Error codes and handling
6. Backend ownership
```

### `OPERATIONS.md`
```
1. Environment and configuration
2. Build and run
3. Feature flags and rollout
4. Tests and checks
5. Deployment
6. Troubleshooting
```

### `PHASES.md`
```
1. Timeline
2. Phases               (one sub-section per phase)
3. Decision log
4. Deliberately not built
5. Outstanding
```

## 5. Doc tiers

Twenty-eight feature directories do not all deserve six files. Forcing the full set on an
18-line placeholder produces ceremony that nobody maintains and that teaches an agent
nothing. Three tiers, assigned in [`README.md`](README.md) and reviewed when a module
grows:

| Tier | When | Files |
|---|---|---|
| **Full** | Own service layer and backend contract, or > ~1500 LOC, or a gated rollout | All six |
| **Lite** | Real but small: a page or two over an endpoint already documented elsewhere | `README.md` + the one other file that carries the substance |
| **Indexed** | Stub, placeholder, or pure composition of documented modules | No directory. One row in the index saying what it is and why it has no doc set |

A Lite module states its tier in `README.md` §6 and says which file it omits and why. When
a module is promoted to Full, copy `_standard/` in and fill the gaps — do not rewrite what
is already true.

## 6. Phase conventions

A **phase** is a unit of delivered scope, not a sprint and not a commit. A module's phases
come from, in order of preference:

1. **An explicit phased plan.** Most of the gated 2026 work has one, in the backend repo:
   `WB_LEADERBOARDS_PROGRESS.md`, `WB_CONTESTS_PROGRESS.md`, `WB_GMS_PROGRESS.md`,
   `BPM_V2_PLAN.md`, `CALENDAR_SYNC_PROGRESS.md`, `EVENTS_BUILD_PROGRESS.md`,
   `BUILDERAI_PROGRESS.md`. Where one exists its phase numbering is authoritative and must
   not be renumbered — the same phase number must mean the same thing in both repos.
2. **Reconstruction from history.** For modules that grew without a written plan, phases
   are reconstructed from `git log -- src/features/<module>` and are labelled with a
   leading `~` to mark them retrospective rather than planned.

Every phase row carries a status from this fixed set:

| Status | Meaning |
|---|---|
| **Shipped** | Merged and live |
| **Merged, not deployed** | On `main`; the backend it needs is not live |
| **Gated** | Live but switched off, or behind a named-list permission |
| **Superseded** | Replaced by a later phase; kept in the record for context |
| **Abandoned** | Started and dropped; recorded so nobody rediscovers it |

**A plan file is a record of intent, not of the code.** Verify every phase claim against
the source before copying it. Where the implementation diverged from the plan, the doc
describes the code and notes the divergence — that gap is one of the most useful things a
module doc can carry.

## 7. Decision conventions

Decisions are the part of a codebase that source cannot tell you: why the obvious thing was
not done. Record them in `PHASES.md` §3 as a table of stable IDs.

```markdown
| ID | Decision | Rationale | Source |
|---|---|---|---|
| L3 | Net Base scope is built but `show_net_base` stays false | Shipping the code without the exposure lets it be switched on without a release; the numbers were not signed off | `WB_LEADERBOARDS_PROGRESS.md` |
```

Rules:

- **IDs are permanent.** Once `L3` is published it always means that decision. Supersede
  with a new ID (`L14 supersedes L3`); never recycle.
- **Prefixes are per module**, and where a source document already used one (`L` for
  leaderboards, `C` for contests, `G` for GMS, `D` for BPM) that prefix is kept so the two
  repos' documents can be read together. A decision the frontend made alone gets the same
  prefix and the next free number.
- **Cite the source.** A decision with no source is a guess. Point at the plan file, the
  commit, or the code comment that settles it.
- **Record the losing option.** "We chose X" is half a decision; "we chose X over Y because
  Y broke Z" is the whole one.

## 8. Rules for writing

- **Ground every claim in code.** Reference files as `src/features/x/y.tsx:123`. Where a
  number appears (a `staleTime`, a breakpoint, a page size), point at the line that sets it.
- **Describe what exists, not what is planned.** Intentions belong in `PHASES.md` §5.
- **Mark what is not live.** Code on `main` is not a shipped feature. If the module is
  gated or waiting on a backend deploy, that belongs in the front matter of every file.
- **Prefer tables for reference, prose for reasoning.** Endpoint lists, state lists and
  prop lists are tables. Why something works the way it does is prose.
- **No duplication.** One fact, one home, everywhere else a link:
  `see [platform](platform/ARCHITECTURE.md#3-primary-flows)` — from a module doc that is `../platform/…`. Two copies of a fact
  become two different facts, and a reader who finds both has to guess.
- **Do not restate the backend.** Server behaviour is documented in the backend repo. Say
  what this module sends and reads, link the rest.
- **Write for someone who has not read the code.** Expand the domain term the first time
  it appears in each file.

## 9. Writing for agents as well as people

An agent reads these docs under the same constraints as a new engineer, with two extra
weaknesses: it cannot tell a stale doc from a current one, and a reference it cannot
resolve costs it a blind search. Everything above is also the answer to both, but
specifically:

- **A derivable path beats an index.** From `src/features/contests/hooks/use-contests.ts`
  an agent can reach `docs/contests/ARCHITECTURE.md` with no lookup. §1 is what makes
  that true; keep it exact.
- **Never cite a document that is not in this repo.** A comment pointing at
  `UI_CONTRACT.md` is a dead end — that file lives in a vendor package in another
  directory tree. Fold the content into `docs/<module>/` and cite the real path.
  Bidirectional is best: the comment names the doc, the doc names the line.
- **One concern per file.** An agent answering "what does this endpoint return" should be
  able to load `API.md` alone. A 1300-line monolith forces it to read everything to learn
  one thing, and it will run out of room before it runs out of file.
- **Front matter is a machine-checkable trust signal.** `Verified against` plus one
  `git log` tells a reader whether to believe the body. Nothing else in a doc does that.
- **`PHASES.md` §3 and §4 are the highest-value sections and the ones no codebase has.**
  Source shows what the code does. Only the decision log says why it does not do the
  obvious thing, and that is exactly what stops a confident agent from "fixing" a
  deliberate choice.
- **Stale is worse than absent.** A doc that describes a Firebase repository layer over a
  codebase that calls a REST API does not merely fail to help; it produces wrong code with
  full confidence. When a doc goes wrong, archive it or fix it — never leave it.

## 10. Keeping documentation true

- A change to a route, an endpoint, a screen state, a query key, a permission gate or an
  env var updates the module doc in the same commit. The doc is part of the change, not
  follow-up work.
- Bump **Doc version** on a structural rewrite; update **Verified against** on any edit
  where you re-read the code.
- New module → copy `docs/_standard/` into `docs/<module>/` and fill it in before the
  module's first feature commit lands. Add its row to [`README.md`](README.md).
- Retiring a module → set **Status** to `Deprecated`, record the removal in `PHASES.md`,
  and keep the directory.
- A doc that turns out to be wrong moves to `docs/_archive/` with a banner naming its
  replacement. Do not delete it and do not leave it in place.
