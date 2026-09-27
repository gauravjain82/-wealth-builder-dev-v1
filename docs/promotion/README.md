# Promotion — Overview

| | |
|---|---|
| **Module** | `promotion` |
| **Source** | `src/features/promotion/` |
| **Routes** | `/promotion/dashboard`, `/promotion/team` |
| **Backend module** | `promotion` → `mlm_platform/docs/promotion/` |
| **API prefix** | `/api/promotion/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Purpose

Promotion answers "what do I have to do to reach the next rank, and how close am I?" — and, for a leader,
"where is everybody on my team?"

Progress has two independent halves, and understanding that split is understanding the module:

- **Skills** — training modules to watch, some with a quiz. Learning.
- **Routes** — alternative sets of requirements, only one of which a person pursues. Doing.

A route is a *choice*: several paths lead to the same rank, and selecting one commits to it. Skills are
cumulative regardless.

It is a small module — 1,226 lines — and one of the few outside the platform's largest features that uses
React Query properly, including optimistic updates.

## 2. Scope

**In scope**
- The personal dashboard: rank, days in rank, overall percentage, promotion status.
- Skills, their modules, watch tracking and quizzes.
- Routes, route selection, and per-item progress (check or numeric).
- The team view: everyone's progress, with stats, search, rank filter and sort.

**Explicitly out of scope**
- **Rank changes themselves.** The backend promotes; this module reports readiness.
- **The training catalogue.** [training-center](../README.md#lite) is separate.
- **Production numbers.** Route items may read from a data source, but [team](../team/) owns production.

## 3. At a glance

| | |
|---|---|
| Routes | 2 |
| Pages | 2 |
| Components | 5 |
| Hooks | 1 |
| Services | 1 — 65 lines, one object literal |
| Endpoints consumed | 8 |
| LOC (ts/tsx) | 1,226 |
| Uses React Query | **yes**, with optimistic updates |
| Doc tier | Full |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Track** | The promotion path for a rank, with its level code and name. |
| **Rank code** | `TA`, `A`, `MD`, or another string. Mapped to a display name locally. |
| **Promotion status** | `ready`, `close`, or `not_ready`. |
| **Skill** | A group of training modules, tagged `skill` or `action`. |
| **Module** | One trainable unit: `pending` → `watch` → `quiz` → `done`. |
| **Route** | One of several alternative requirement sets. **Only one is selected.** |
| **Route item** | A requirement: `check` (done or not) or `numeric` (a value against a target). |
| **Leg group** | How route items are grouped. |
| **Manually checked** | A skill a leader ticked rather than one completed by watching. |

## 5. Dependencies

**Upstream** — `@tanstack/react-query`, and `src/shared/components/ui/`.

**Downstream** — `src/router/index.tsx` (two routes), and `use-role-based-menu.ts`, which gates the
Promotion group on the cached `wb.hasPromotionAccess` flag from [auth](../auth/).

**Backend** — `promotion`, 8 endpoints. The backend also has
`promotion/promotion-frontend-api.md` (30 KB), the fullest description of this API.

## 6. Document map

| Document | Read it when |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Before changing progress. Holds the optimistic-update logic and the skills/routes split. |
| [UI.md](UI.md) | Changing a card or the quiz. |
| [API.md](API.md) | The 8 endpoints — **and the quiz-answer problem**. |
| [OPERATIONS.md](OPERATIONS.md) | Access, or progress that will not stick. |
| [PHASES.md](PHASES.md) | Before changing route selection or the quiz. |

## 7. Where to start reading

1. `types.ts` — 99 lines and the whole domain. `PromotionDashboard` at `:51` is the payload everything
   hangs off.
2. `services/promotion-service.ts` — 8 endpoints in one object, and the response normalisation at `:33`.
3. `hooks/use-promotion-dashboard.ts:11` — `updateNumericItem`, which recomputes a route's progress
   optimistically. The most intricate logic in the module.
4. `promotion-ranks.ts` — eleven lines, and a local rank-name map worth knowing about.
