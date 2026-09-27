# Promotion — Phase History

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

> Phases marked `~` are reconstructed from the commit history. There was no plan file for this module; the
> backend's `promotion/promotion-frontend-api.md` (30 KB) is the fullest record of its contract. The `PR`
> prefix is assigned by this document.

## 1. Timeline

| Phase | Date | Status | Shipped |
|---|---|---|---|
| ~1 | ≤ 2026-06 | Shipped | The dashboard: skills, routes, quizzes |
| ~2 | 2026-06-26 | Shipped | Menu gating on `wb.hasPromotionAccess` |
| ~3 | — | Shipped | The team view |

## 2. Phases

### ~1 — the dashboard

**What shipped.** `types.ts`, the service, the React Query hook with optimistic updates, and four
components: skills, quiz, route and stats.

**Decisions.** PR1, PR2, PR3, PR4.

**What distinguishes it from its neighbours.** This module adopted React Query while `bpm`, `team`,
`events` and `matchup` did not. At 1,226 lines it was cheap to do properly, and the optimistic update in
`updateNumericItem` is the payoff — progress moves the instant a value is entered.

### ~2 — menu gating (2026-06-26)

**What shipped.** "Fixing promotions menu" — the Promotion group gated on `wb.hasPromotionAccess`.

**Decisions.** PR5. This is the pattern the 2026 rollouts later replaced with runtime capabilities.

### ~3 — the team view

**What shipped.** `TeamPromotionPage`, `TeamStats`, `TeamMemberCard`, with search, rank filter and four
sorts.

**Decisions.** PR6.

## 3. Decision log

| ID | Decision | Rationale | Source |
|---|---|---|---|
| **PR1** | **Skills and routes are independent halves, with separate percentages** | They answer different questions — what someone has learned, and what they have done. A single combined number would let one hide the other, and routes are a *choice* while skills are cumulative | `types.ts:51`; `pages/promotion-dashboard-page.tsx` |
| **PR2** | **Routes are alternatives; exactly one is selected** | Several paths reach the same rank, so a checklist would be wrong. Selection is a commitment, and `selected_route_id` is the single source of truth | `services/promotion-service.ts` `selectRoute`; `PromotionRoute.is_selected` |
| **PR3** | **Numeric progress updates optimistically, recomputing the route in the cache** | The alternative is a visible round trip on every keystroke of a number. Cost: `is_done` is computed client-side as well as server-side, so the two must agree — which is why it is computed in exactly one function | `hooks/use-promotion-dashboard.ts:11` |
| **PR4** | **The dashboard response is normalised from `T \| T[]`** | The endpoint may return one track or several. Coercing with `Array.isArray` in the service means no page has to care, and a backend change in either direction cannot break the client | `services/promotion-service.ts:33` |
| PR5 | The menu is gated on a **session-cached** `wb.hasPromotionAccess` flag | Adequate and free at the time — the profile was already being fetched. Costs: the grant is stale until the next sign-in, and the value is client-modifiable. Superseded for *new* rollouts by runtime capabilities (platform P6), not withdrawn here | `hooks/use-role-based-menu.ts`; `auth-repository.ts:321` |
| **PR6** | **A team member's routes omit `is_selected`** | A leader needs to see progress, not which path somebody privately chose. Expressed in the type as `Omit<PromotionRoute, 'id' \| 'is_selected'>`, so the omission is structural rather than a rendering decision | `types.ts` `TeamMember` |
| PR7 | `RankCode` is an **open** union — `'TA' \| 'A' \| 'MD' \| string` | A new rank should not fail to compile. Cost: no exhaustiveness checking, and an unmapped code falls through to "Next Level" | `types.ts:3`; `promotion-ranks.ts` |
| PR8 | `updateRouteItem` sends **no body** for a check item | The absence of a value is the signal that it is a toggle rather than a measurement — one endpoint for both item types | `services/promotion-service.ts` |

## 4. Deliberately not built

- **A single combined progress number.** PR1.
- **Routes as a checklist.** PR2 — they are alternatives.
- **A separate endpoint for check versus numeric items.** PR8.
- **Exhaustive rank typing.** PR7.
- **Showing a leader which route a member chose.** PR6.
- **Client-side promotion eligibility.** The backend decides `ready`/`close`/`not_ready`.
- **Request cancellation.** No `AbortSignal` is threaded, unlike `leaderboards` and `contests`.
- **A debounce on team search.** Every term is a cache key and a request.

## 5. Outstanding

1. **Decide what a quiz score is for, then secure it if it matters.** `QuizQuestion.correct_index` sends
   every correct answer to the browser rendering the quiz, so it can be passed from the network tab. If a
   score only reflects self-directed learning, this is a reasonable simplification and should be *written
   down* as one. If it gates a promotion, the answers must stop being sent and scoring must move fully
   server-side. It is first because the ambiguity is the problem — nobody can currently tell which it is.
2. **Keep the optimistic `is_done` rule in step with the backend.** It is duplicated by design (PR3), and
   a backend change to the completion rule silently produces a UI that corrects itself on reload.
3. **Use the backend's `level_name` instead of `promotion-ranks.ts`.** The track already carries the name,
   so the local map is a second source for the same fact and the reason a new rank reads "Next Level".
4. **Debounce the team search.**
5. **Thread an `AbortSignal`.** A filter change should cancel the request it supersedes, as it does in
   `leaderboards` and `contests`.
6. **Move the menu gate to a runtime capability.** PR5's cached flag means a grant needs a sign-out;
   `promotion:read` through a `my-access` endpoint would match the rest of the app.
