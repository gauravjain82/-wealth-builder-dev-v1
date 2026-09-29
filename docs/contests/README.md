# Contests — Overview

| | |
|---|---|
| **Module** | `contests` |
| **Source** | `src/features/contests/` |
| **Routes** | `/contests`, `/admin/contest-settings` — plus an embedded card on `/home-v2` |
| **Backend module** | `wbreporting` → `mlm_platform/docs/wbreporting/` |
| **API prefix** | `/api/wbreporting/` |
| **Status** | Gated |
| **Doc version** | 1.0 |
| **Verified against** | commit `PHASE18` — 2026-09-29 (§2, §3 and §5 re-read for parity phase 18; §4 vocabulary `08eea2c`; the rest `7e3b7f1`, 2026-09-27) |

> **Deployed but not open.** Migrations `wbreporting/0001`–`0003` are applied and the code shipped
> 2026-09-26. Nobody has been granted `homev2:read` for contests, so no reader can reach it yet.
> See [OPERATIONS.md §3](OPERATIONS.md#3-feature-flags-and-rollout).

## 1. Purpose

A **contest** is a promise about a prize: meet these thresholds over this period and you earn this
reward. This module shows who is meeting them, and lets a manager define them.

It has two halves with different readers. The **standings card** answers "where do I stand, and who
is ahead" — a grid of agents against tiers, each cell a percentage toward that tier's requirements,
with any number openable to the rows behind it. The **settings screen** answers "what exactly are we
promising" — tiers, thresholds, eligibility levels, periods, rewards and a flyer.

Because a contest is a promise, two properties matter more here than in a normal reporting surface:

- **A number must be provable.** Any cell opens a proof dialog showing the source rows, the formula
  and the period. A standings figure nobody can check gets argued with instead of used.
- **A threshold must mean what the manager thinks it means.** Three of the eleven metrics —
  `BR`, `BP`, `LIC` — count one hop of Leader with no base-shop boundary, so they read materially
  lower than the Production Tracker for the same agent. That is labelled on both the reading and the
  editing surface, because getting it wrong produces a wrong prize decision.

## 2. Scope

**In scope**
- The embedded standings card on `/home-v2`, and a standalone `/contests` page laid out as dtez's
  (title and status line, contests as buttons, an always-visible filter bar) over the same state.
- Draft filters (person, view, Net, Leaders, Agents; on the page also Upline and Leader) with
  explicit Apply.
- Tier overview cards doubling as tier toggles, with a three-state gesture.
- Standings in two renderings — wide table and narrow per-agent cards — chosen by container width.
- Four dialogs: proof, agent profile, flyer, Help.
- The manager's settings screen: contests, tiers, thresholds, eligibility, periods, flyer
  upload/publish, hide, soft delete — all under optimistic concurrency.

**Explicitly out of scope**
- **Aggregation, eligibility, ranking and pagination.** All server-side. The client receives
  *evaluations*, never result rows. See [API.md §6](API.md#6-backend-ownership).
- **Any client-side period arithmetic.** The proof endpoint is sent no dates at all; the server
  resolves the period from the tier.
- **Leaderboards.** [leaderboards](../leaderboards/) is a sibling on the same API prefix and the
  same grant. They share no cache.
- **The reporting pipeline** that produces the underlying numbers — `admin/wb-pipeline`.
- **Contest CRUD via Package 1's `contests/` endpoints.** Deliberately not used: that serializer
  carries no `revision`, so a save built from it could not satisfy the concurrency check.

## 3. At a glance

| | |
|---|---|
| Routes | 2 + 1 embedded card |
| Pages | 2 (both thin wrappers) |
| Components | 12 |
| Hooks | 9 queries + 7 mutations in one bundle, plus the board-state hook |
| Services | 1 |
| Endpoints consumed | 13 (`wbreporting`) + the `accounts/users/` person search |
| LOC (ts/tsx) | 3,542 |
| CSS | 1,018 lines, all under `wb-ct-` |
| Doc tier | Full |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Contest** | A named competition with a period and a set of tiers. |
| **Tier** | One prize level within a contest: its own requirements, period override, reward and eligibility rules. |
| **Threshold** | A required value for one metric in one tier. Eleven metrics are configurable. |
| **Evaluation** | The server's verdict for one agent against one tier: eligible, progress, qualified, near. |
| **Progress** | Percentage toward a tier, a whole number (C20). **`null` means there is no number** — never render it as `0`. |
| **Best %** | An agent's highest score over the tiers open to them, never below 0; the default order (C16). |
| **In running** | Everyone listed for the contest — the same number on every tier card (C18). |
| **No source** | A requirement this host cannot measure (`BE`, `C`). Counts as 0, so the tier cannot be qualified (C15). |
| **Eligible** | Whether this tier applies to this agent at all — dtez's rule (C19): Non-License first, then the level lists by code or name. People with no level pass any restriction. An ineligible cell renders **blank**. |
| **Non-License tier** | A tier for unlicensed agents. It blanks every licensed person by design. |
| **Near** | Within `near_percent` of qualifying. |
| **Single-hop team measure** | `BR`, `BP`, `LIC` — one hop of Leader, no base-shop boundary. Reads lower than the Production Tracker. |
| **Net** | A filter keeping the selected person plus their direct reports. **Not** Net Base — a different rule. |
| **Status** | Three reader-facing values (`considered`, `active`, `ended`) derived from five stored ones. |
| **Revision** | The integer optimistic-concurrency token on a contest and on each tier. |
| **Flyer** | An uploaded image or PDF, served by a short-lived signed URL when published. |

## 5. Dependencies

**Upstream**
- `src/shared/components/ui/modal` — all four dialogs portal through it.
- `src/shared/components/user-autocomplete-dropdown` — the card modal's person picker.
- `/api/accounts/users/` — the standalone page's person search.

**Downstream**
- `src/features/home-v2/` — mounts `ContestsCard`, replacing a `CanvaVideoCard` placeholder.
- `src/router/contests-route.tsx`, `contest-settings-route.tsx` — two guards, two different gates.
- `src/hooks/use-role-based-menu.ts` — the menu entry, beside Home v2 and Leaderboards.

**Backend** — `wbreporting`, 13 endpoints.

**External** — none. The flyer URL is signed by the backend.

## 6. Document map

| Document | Read it when |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Before any change. Holds the concurrency model and the containment contract. |
| [UI.md](UI.md) | Changing a surface. The blank cell and the three-state tier gesture are here. |
| [API.md](API.md) | The 13 endpoints, the 19 error codes, and what the server owns. |
| [OPERATIONS.md](OPERATIONS.md) | Rollout, or a contest that will not save. |
| [PHASES.md](PHASES.md) | **Before changing thresholds, blanks or saves.** Decisions C1–C13, including one taken against the recommendation. |

## 7. Where to start reading

1. `src/features/contests/types/index.ts` — 322 lines, and its header states the two rules that
   matter: `progress: null` is not zero, and nothing here describes a result row.
2. `services/contests-service.ts` — 13 endpoints, and the clearest statement of the concurrency
   model.
3. `contests.css:1-29` — **the containment contract.** Read it before touching any layout; three
   rules keep the card scrolling internally and removing any one fails silently.
4. `components/contest-cell.tsx` — why an ineligible cell is blank rather than labelled.
5. `components/contest-settings.tsx` — the manager surface, and how a 409 is handled.
