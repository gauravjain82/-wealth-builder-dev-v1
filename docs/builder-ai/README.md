# Builder AI — Overview

| | |
|---|---|
| **Module** | `builder-ai` |
| **Source** | `src/features/builder-ai/` |
| **Routes** | 7 under `/builder-ai/*`, plus `/team/builders/daily-six/:agencyCode` (public) |
| **Backend module** | `builderai` → `mlm_platform/docs/builderai/` |
| **API prefix** | `/api/builderai/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Purpose

Builder AI is a performance dashboard for **builders** — the agents a leader has flagged as
actively building a business. It answers "is my team on plan?" against four metrics with fixed
individual targets: recruits, points, licenses and registrations.

Two scopes, and the difference between them is the single thing most worth understanding here:

- **Baseshop** — the viewer's own base-shop builders. Each row is a builder.
- **Company** — the viewer's **directly-sponsored company owners** (SMD and above), each row
  rolled up over that owner's whole downline. Each row is an owner, not a builder.

The name is aspirational. There is **no AI in this module today** — the "AI advice" phase was
planned and not built. What exists is dashboards, a roster, reporting charts, a bulletin and an
invitation system.

If this module were removed, the underlying data would be untouched: it reads the `tracker`
builder engine rather than owning any calculation. What would be lost is the on-plan/off-plan
reading of it.

## 2. Scope

**In scope**
- The Home dashboard: metric cards and a size bar, per scope.
- Company and Baseshop pages with per-row goals and progress.
- Reporting: a daily line chart per metric.
- Bulletin: a searchable, sortable ranking by metric.
- Builder invitations: send, accept, decline, cancel, self-add, remove — with a seat cap.
- The public Daily Six page for an agency code.

**Explicitly out of scope**
- **The builder calculation itself.** `tracker/services/builder_results.py` owns targets,
  `builder_results_score` and the whole-downline metric definition. This module reuses that
  engine and duplicates none of it.
- **The builder calculation.** See above.

**In scope, and formerly not:** builder **enrolment**. An active `BuilderMembership` — created by
accepting an invitation or self-adding — *is* the definition of a builder. It was once the
Associate Tracker's `is_key_player` flag; the two were decoupled (decision B9 supersedes B2).
- **AI advice.** Planned as Phase 3, not built.

## 3. At a glance

| | |
|---|---|
| Routes | 7 + 1 public |
| Pages | 6 |
| Components | 5 |
| Hooks | 2 files — 7 queries, 6 mutations |
| Services | 2 |
| Endpoints consumed | 12 |
| LOC (ts/tsx) | 1781 |
| Doc tier | Full |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Builder** | A user with an **active `BuilderMembership`**. That membership is the sole definition; `is_key_player` no longer enrols anyone (B9). |
| **Key Player** | `AssociateTracker.is_key_player` — now a **pure tracker / org-chart flag** that does not make anyone a builder. |
| **Segment** | `company` or `baseshop`. Selects which population a screen reads. |
| **Company owner** | A directly-sponsored agent at SMD or above. What a Company **row** represents. |
| **Built** | `BuilderMonthlyCompletion` — a builder met the plan for a month. A builder-only concept; owner rows carry `is_built: false`. |
| **Individual target** | The fixed per-builder plan: 5 recruits, 20,000 points, 1 license, 3 registrations. |
| **Size bar** | The scope's headcount progress indicator on Home. |
| **Seat** | A builder slot. Capped at **10 per baseshop** and tracked by `BuilderMembership`. |
| **Daily Six** | A public per-agency-code activity view, reachable without a session. |

## 5. Dependencies

**Upstream**
- `src/shared/components/ui/` — primitives.
- `recharts` — the reporting line chart.

**Downstream**
- `src/router/builder-ai-route.tsx` — the guard.
- `src/hooks/use-role-based-menu.ts` — reads `can_view` and `is_owner` to build the menu group.

**Backend**
- `builderai` — 12 endpoints. It reads `tracker`'s builder engine and
  `BuilderMonthlyAggregate`.

**External** — none.

## 6. Document map

| Document | Read it when |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Before touching goals or scopes. The Company/Baseshop asymmetry is here. |
| [UI.md](UI.md) | Changing a screen, the segment toggle or the invitation flow. |
| [API.md](API.md) | The 12 endpoints and the access payload. |
| [OPERATIONS.md](OPERATIONS.md) | Access problems, or a dashboard that is slow. |
| [PHASES.md](PHASES.md) | **Before changing any goal arithmetic.** Two goal bugs were found and fixed, and the reasoning is the only thing stopping a third. |

## 7. Where to start reading

1. `services/builder-ai-service.ts:9-140` — the types **and** the service in one file.
   `BuilderSegment` at `:9` is the fork everything follows.
2. `hooks/use-builder-ai.ts` — seven queries, all keyed on segment plus date range.
3. `pages/company-page.tsx` — the scope whose rows mean something different from its cards.
4. `src/router/builder-ai-route.tsx` — the guard, and why `is_owner` matters separately.
