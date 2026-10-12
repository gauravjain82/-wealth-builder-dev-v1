# Home — Overview

| | |
|---|---|
| **Module** | `home` |
| **Source** | `src/features/home/` |
| **Routes** | `/home` (`/home-v2` redirects here) |
| **Backend module** | `content`, `tracker`; `wbreporting` and Code of Honor through the embedded sections |
| **API prefix** | `/api/content/`, `/api/tracker/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Doc tier** | **Lite** — `README.md` + [UI.md](UI.md) |
| **Verified against** | commit `2fc8882` plus the L16 change — 2026-10-12 |

## 1. Purpose

`/home` is the landing page every signed-in user sees: a video hero, two admin-managed media
cards, and — for paid users — the leaderboard panel, the featured-contest showcase, the Code of
Honor wall and a personal performance table. New agents get learning and onboarding cards in
place of the paid sections.

This is the layout built as `/home-v2`. It replaced the original page on 2026-10-12
([leaderboards](../leaderboards/PHASES.md#3-decision-log) decision L16, superseding L7); the
original page and its `tracker` leaderboard card are gone.

## 2. Scope

**In scope** — the `/home` page and three reusable components: `VideoHero`, `CanvaVideoCard`
(with `CarouselCard`), `PerformanceTable`.

**Out of scope** — the content itself (managed in [admin](../admin/)'s home-content screen), and
the sections the page only mounts: `LeaderboardPanel` ([leaderboards](../leaderboards/)),
`ContestShowcase` ([contests](../contests/)), `CodeOfHonorCard` (`src/features/code-of-honor/`)
and `WelcomeVideosHomeCard` ([welcome-videos](../welcome-videos/)).

## 3. At a glance

| | |
|---|---|
| Routes | 1 |
| Components | 3 |
| Hooks | 1 |
| Services | 2 |
| Endpoints consumed | 2 of its own |
| LOC (ts/tsx) | 809 |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Carousel** | An admin-managed image strip — contest or recognition. |
| **Paid sections** | Leaderboard, contests, Code of Honor and the performance table — not mounted for a new agent. |
| **Performance table** | The signed-in user's own tracker figures. |

## 5. Dependencies

**Upstream** — `src/shared/services/content-page-service` (this is the module that actually *uses* the
app's shared HTTP helpers), and `src/hooks/use-carousel-images.ts`, one of only two Firestore readers left.

**Embedded** — `LeaderboardPanel`, `ContestShowcase`, `CodeOfHonorCard` and
`WelcomeVideosHomeCard`, each imported from its module's `index.ts` and each fetching for itself.

**Backend** — `content` (`/api/content/home-page/`) and `tracker`
(`/api/tracker/trackers/associate/`). The embedded sections read `wbreporting` endpoints gated
on `homev2:read`.

## 6. Document map

Lite tier: this file plus [UI.md](UI.md), which carries the substance. There is no separate
`ARCHITECTURE`, `API`, `OPERATIONS` or `PHASES` — the module is three components over two endpoints,
and its decisions are recorded in [leaderboards/PHASES.md](../leaderboards/PHASES.md#3-decision-log)
as L7 (build v2 beside `/home`) and L16 (replace `/home` with it).

## 7. Where to start reading

1. `pages/home-page.tsx` — the composition, and the `isPaid` split.
2. `services/home-leaderboard-service.ts` — despite the name, only the performance-table fetch now.
3. `hooks/use-home-content.ts` — the content fetch.
