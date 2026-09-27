# Home — Overview

| | |
|---|---|
| **Module** | `home` |
| **Source** | `src/features/home/` |
| **Routes** | `/home` — and its components are reused by `/home-v2` |
| **Backend module** | `content`, `tracker` |
| **API prefix** | `/api/content/`, `/api/tracker/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Doc tier** | **Lite** — `README.md` + [UI.md](UI.md) |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Purpose

`/home` is the landing page every signed-in user sees: a video hero, admin-managed carousels, a
leaderboard summary and a personal performance table.

Its most important property is **what it does not do**: it has been deliberately left untouched while
`/home-v2` was built beside it. `home-v2` **composes this module's components** rather than forking them,
so the two pages cannot drift — see [leaderboards](../leaderboards/PHASES.md#3-decision-log) decision L7.

## 2. Scope

**In scope** — the `/home` page and four reusable components: `VideoHero`, `CarouselCard`,
`LeaderboardCard`, `PerformanceTable`.

**Out of scope** — the content itself (managed in [admin](../admin/)'s home-content screen), the
`wbreporting` leaderboards ([leaderboards](../leaderboards/) is a different surface), and `/home-v2`
(Indexed in the [index](../README.md#indexed)).

## 3. At a glance

| | |
|---|---|
| Routes | 1 |
| Components | 4 |
| Hooks | 1 |
| Services | 2 |
| Endpoints consumed | 3 |
| LOC (ts/tsx) | 861 |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Carousel** | An admin-managed image strip — contest or recognition. |
| **Home leaderboard** | A summary from `tracker`, by metric and level (`SMD`/`MD`). **Not** the `wbreporting` leaderboards. |
| **Performance table** | The signed-in user's own tracker figures. |

## 5. Dependencies

**Upstream** — `src/shared/services/content-page-service` (this is the module that actually *uses* the
app's shared HTTP helpers), and `src/hooks/use-carousel-images.ts`, one of only two Firestore readers left.

**Downstream** — **`src/features/home-v2/`**, which imports `VideoHero`, both `CanvaVideoCard` slots and
`PerformanceTable` from here.

**Backend** — `content` (`/api/content/home-page/`), `tracker`
(`/api/tracker/policies/top_base_team_leaders/`, `/api/tracker/trackers/associate/`).

## 6. Document map

Lite tier: this file plus [UI.md](UI.md), which carries the substance. There is no separate
`ARCHITECTURE`, `API`, `OPERATIONS` or `PHASES` — the module is four components over three endpoints, and
its one significant decision (do not fork for v2) is recorded in
[leaderboards/PHASES.md](../leaderboards/PHASES.md#3-decision-log) as L7.

## 7. Where to start reading

1. `pages/home-page.tsx` — **and note it is deliberately unmodified.** A `git diff main` on this file is
   part of the leaderboards release check.
2. `services/home-leaderboard-service.ts` — the metric and level types.
3. `hooks/use-home-content.ts` — the content fetch.
