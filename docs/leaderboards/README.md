# Leaderboards — Overview

| | |
|---|---|
| **Module** | `leaderboards` |
| **Source** | `src/features/leaderboards/` |
| **Routes** | `/leaderboards` — plus an embedded card mounted by `/home-v2` |
| **Backend module** | `wbreporting` → `mlm_platform/docs/wbreporting/` |
| **API prefix** | `/api/wbreporting/` |
| **Status** | Merged-not-deployed |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> **Not live.** The code is on `main`, but two `wbreporting` migrations are unapplied and
> nobody has been granted `homev2:read`. The frontend and backend branches
> (`feature/wb-leaderboards` in both repos) must merge and deploy together. See
> [OPERATIONS.md §5](OPERATIONS.md#5-deployment).

## 1. Purpose

Leaderboards answers two questions about a period of production, and keeps them separate
because they have different readers. The **leaderboard** answers "who is ahead right now" —
the top five SMDs and MDs by a chosen metric over a chosen date range and hierarchy scope,
with the viewer's own totals beside them. The **Full Report** answers "how is this period
going against goal" — four fixed columns (Recruits, Points, Licenses, Convention), each with
a gauge against a company-wide target and the rankings underneath.

Behind both sits the part that makes them trustworthy: any number a reader doubts opens a
**proof dialog** showing the rows it was computed from, the formula, and what the metric
means. A leaderboard that cannot show its work gets argued with instead of used, so the
proof surface is not a nicety — it is why the module exists in the form it does.

If this module were removed, the production data would still exist in `wbreporting` and the
team trackers would still show individual numbers. What would be lost is the comparative,
period-scoped, goal-relative reading of it — and the audit trail that makes people accept
that reading.

## 2. Scope

**In scope**
- The compact card for the home page, the expanded leaderboard, the Full Report, the proof
  dialog, and the manager settings form.
- The selection model — metric, scope, date range — shared by every surface.
- The client half of the capability gate on `homev2:read`, and the `wbreporting:manage` gate
  on settings.

**Explicitly out of scope**
- **Ranking, ratios, masking and hierarchy membership.** All server-side, in `wbreporting`.
  The client sends a selection and renders what comes back. See
  [API.md §6](API.md#6-backend-ownership).
- **Contests.** A sibling module — `docs/contests/` — on the same API prefix and the
  same capability grant.
- **The Home v2 page itself.** `src/features/home-v2/` composes this module's card with
  components from `docs/home/`; it is listed as Indexed in the
  [index](../README.md#indexed).
- **The reporting pipeline that produces the numbers.** `admin/wb-pipeline` on the frontend,
  Package 1 on the backend.

## 3. At a glance

| | |
|---|---|
| Routes | 1 (`/leaderboards`) + 1 embedded card |
| Pages | 1 |
| Components | 8 |
| Hooks | 10 (in one file) |
| Services | 1 |
| Endpoints consumed | 8 |
| LOC (ts/tsx) | 2123 |
| CSS | 940 lines, all under `wb-lb-` |
| Doc tier | Full |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Scope** | The hierarchy the numbers are computed over: `personal`, `net_base`, `smd_base`, `super_base`, `super_team`. Not a filter — a different population. |
| **SMD / MD** | Senior Marketing Director / Marketing Director. The two levels the boards rank. |
| **Base shop** | An agent's downline as the reporting tables define it. |
| **General metric** | One of the four additive totals: `recruits`, `points`, `licenses`, `convention`. |
| **Ratio metric** | One of four read-time ratios: `npr`, `ppr`, `ppl`, `lr`. Computed from the additive totals, never stored. |
| **Milestone metric** | One of three first-milestone counts: `rr` (1st Recruit), `rc` (10% Evaluation), `rbe` (Register for Convention). Ranked alongside the general metrics since Phase 8. |
| **Selection** | The triple `{metric, scope, rangeKey}` (plus optional explicit `start`/`end`) that drives every request and every cache key. |
| **Source** | Where a set of totals came from: `daily_current`, `monthly_snapshot`, or `daily_fallback`. `daily_fallback` is a **normal** state, not an error. |
| **Proof rows** | The underlying records behind one number, shown in the detail dialog, already masked server-side. |
| **Masking** | A field this viewer may not see is **absent** from the response, not nulled. An absent key renders as a dash. |
| **Measurement mode** | How milestones are counted: `new_recruit_cohort` or `milestones_completed`. Set in Settings, never per view. |

## 5. Dependencies

**Upstream (this module imports)**
- `src/shared/components/ui/` — `Button`, `Modal`.
- Nothing else. The module is otherwise self-contained.

**Downstream (imports this module)**
- `src/features/home-v2/` — mounts `LeaderboardsCard`.
- `src/router/leaderboards-route.tsx` — the guard imports `useLeaderboardAccess`.
- `src/hooks/use-role-based-menu.ts` — same hook, for the menu entries.
- `src/features/contests/` — shares the `homev2:read` grant, read through its own hook.

**Backend**
- `wbreporting` — all eight endpoints. Its `DailyResult` / `MonthlyResult` tables are
  produced by the reporting pipeline ("Package 1"), not by this module's requests.

**External** — none.

## 6. Document map

| Document | Read it when |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Changing a hook, a cache key or the selection model. Holds the cancellation rule. |
| [UI.md](UI.md) | Changing a screen, a state, the responsive grid or the print output. |
| [API.md](API.md) | Adding or changing a request. Holds the eight endpoints and the error codes. |
| [OPERATIONS.md](OPERATIONS.md) | Deploying, or working out why nothing renders. Holds the coupling. |
| [PHASES.md](PHASES.md) | **Before changing any behaviour.** Decisions L1–L12 record what was chosen over what, and several look like bugs until you read them. |

## 7. Where to start reading

1. `src/features/leaderboards/types/index.ts` — the wire contract. Every other file is
   shaped by it, and its comments explain why protected fields are optional rather than
   nullable.
2. `services/leaderboards-service.ts` — all eight endpoints in 189 lines, and the
   `selectionParams` function that three surfaces share.
3. `hooks/use-leaderboards.ts` — the cache policy, and how a selection change cancels the
   request it supersedes.
4. `components/leaderboard-panel.tsx` — the most complex surface: draft-until-apply dates,
   server-driven scope and metric lists, the two-row tab split.
5. `pages/leaderboards-page.tsx` — how the three views are switched, and how the query
   string deep-links into one.
