# Promotion — Architecture

| | |
|---|---|
| **Module** | `promotion` |
| **Source** | `src/features/promotion/` |
| **Routes** | `/promotion/dashboard`, `/promotion/team` |
| **Backend module** | `promotion` |
| **API prefix** | `/api/promotion/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Layering

Clean and complete — the standard shape at small scale.

| Layer | File | Lines |
|---|---|---|
| Types | `types.ts` | 99 |
| Service | `services/promotion-service.ts` | 65 |
| Hook | `hooks/use-promotion-dashboard.ts` | 125 |
| Components | `components/` (5) | 523 |
| Pages | `pages/` (2) | 252 |
| Constants | `promotion-ranks.ts` | 11 |

The service is one object literal with eight methods over a shared `request<T>` helper that throws on a
missing token and unwraps `{detail}` on failure. At 65 lines it is the tidiest service in the app.

**This module uses React Query**, unlike `bpm`, `team`, `events` and `matchup`. At this size it was cheap
to do properly, and the optimistic updates in §3.2 are why it matters.

## 2. Component map

```
/promotion/dashboard ── PromotionDashboardPage
  ├── SkillsCard       ── skills, their modules, watch + quiz
  │    └── QuizPanel   ── questions, answers, score
  └── RouteCard  × n   ── one per route; selection; per-item progress

/promotion/team ─────── TeamPromotionPage
  ├── TeamStats        ── total · ready · in_progress · just_started
  └── TeamMemberCard × n ── per-person progress, skills and routes

hooks/use-promotion-dashboard ── one query, four mutations, optimistic updates
promotion-ranks.ts            ── rank code → next rank name
```

## 3. Primary flows

### 3.1 Reading the dashboard

1. `promotionService.dashboard()` calls `my-dashboard/`.
2. **The response is normalised**: `PromotionDashboardResponse` is
   `PromotionDashboard | PromotionDashboard[]`, and the service coerces it with
   `Array.isArray(data) ? data : [data]` (`services/promotion-service.ts:33`).
3. The page renders skills and routes from one payload.

That normalisation is defensive about a backend that may return one track or several. The client handles
both rather than assuming.

### 3.2 Recording progress — optimistically

`hooks/use-promotion-dashboard.ts` holds four mutations: toggle a skill, select a route, update a route
item, mark a module watched, submit a quiz.

`updateNumericItem` (`:11`) is the interesting one. On a numeric item change it rebuilds the dashboard in
the cache:

- sets the item's `numeric_value`;
- **recomputes `is_done`** as `target_value !== null && value >= target_value`;
- recounts the route's `done_items`;
- and so recomputes the route's percentage.

So the UI reflects the change immediately, without waiting for a round trip. The rule this creates: **the
client's arithmetic must match the backend's**, or an optimistic update will briefly disagree with the
refetch. That is the module's main correctness risk and the reason `is_done` is computed in exactly one
place.

### 3.3 Selecting a route

`selectRoute(id)` returns `{selected, route_id}`. Only one route is selected at a time — the backend
enforces it, and `selected_route_id` on the dashboard is the single source of truth.

Routes are **alternatives**, not a checklist: several paths reach the same rank, and choosing one is a
commitment.

### 3.4 Watching a module and taking its quiz

1. `watch(id)` marks it watched.
2. `questions(id)` fetches the quiz.
3. `submitQuiz(id, answers)` returns `{score, total}`.

A module's status walks `pending → watch → quiz → done`, so a module with a quiz is not done until the
quiz is passed.

## 4. Server state and caching

One query key, `['promotion-dashboard']`, and four mutations that either invalidate it or patch it
optimistically.

| Operation | Strategy |
|---|---|
| Dashboard read | `useQuery` |
| Toggle skill | mutation + invalidate |
| Select route | mutation + invalidate |
| **Update numeric item** | **optimistic cache patch**, then reconcile |
| Watch module | mutation + invalidate |
| Submit quiz | mutation + invalidate |
| Team view | its own query, keyed on rank + search + sort |

The team query being separate means the two pages share nothing, which is correct — they answer different
questions about different people.

## 5. Local and URL state

| State | Owner | Lives in |
|---|---|---|
| Expanded skill / route | the page | `useState` |
| Quiz answers in progress | `QuizPanel` | `useState` |
| Team search, rank filter, sort | `TeamPromotionPage` | `useState`, all in the query key |
| Rank display name | derived | `getNextRankName()` |

Nothing is in the query string, so a filtered team view is not shareable.

## 6. Permissions and gating

**No route guard.** Both routes are under `ProtectedRoute` only.

The menu entry — **Promotions**, a child of the Training Center group — is gated on **`wb.hasPromotionAccess`**, a coarse flag cached in `localStorage` at login by
[auth](../auth/ARCHITECTURE.md#6-permissions-and-gating). So:

- the flag is **stale until the next sign-in**;
- it is client-modifiable, and therefore not a security boundary;
- the routes themselves are reachable regardless, and the API decides.

This is the older gating style the 2026 rollouts moved away from — see
[platform](../platform/PHASES.md#3-decision-log) decision P6.

The **team view** is scoped server-side to the leader's own people.

## 7. Integration points

- **`promotion` backend** — 8 endpoints. `promotion/promotion-frontend-api.md` in the backend repo is the
  fullest description of them.
- **[auth](../auth/)** — supplies `wb.hasPromotionAccess` for the menu.
- **Route item data sources** — `RouteItem.data_source` suggests some items are populated from elsewhere
  (production, recruiting) rather than self-reported. The client renders the value and does not resolve it.

## 8. Invariants and failure modes

| Invariant | Enforced by | Breaks as |
|---|---|---|
| Exactly one route is selected | backend; `selected_route_id` | two "committed" paths, and an ambiguous percentage |
| **`is_done` is computed in one place** | `updateNumericItem` | an optimistic update that disagrees with the refetch |
| The dashboard response is normalised | `Array.isArray` coercion | a crash when the backend returns one track instead of a list |
| A quiz module is not done until passed | `ModuleStatus` walks to `done` | a module counted complete without its quiz |
| Skills and routes are independent | separate fields and percentages | one half's progress masking the other's |
| The team view is server-scoped | backend | a leader seeing another organisation |

**The quiz answers are sent to the client.** `QuizQuestion` includes **`correct_index`**
(`types.ts:63`), so every correct answer is in the payload that renders the quiz. Anyone who opens the
network tab can score full marks. Whether that matters depends on what a quiz score is *for* — if it only
reflects self-directed learning, it is a reasonable simplification; if it gates a promotion, it is not.
Recorded in [PHASES.md §5](PHASES.md#5-outstanding) rather than assumed either way.

**Rank names are mapped locally.** `promotion-ranks.ts` maps `TA → Associate`, `A → Marketing Director`,
`MD → Senior Marketing Director`, with `"Next Level"` as a fallback. A new rank displays as "Next Level"
until that file is edited — even though the backend already sends `level_name` on the track.
