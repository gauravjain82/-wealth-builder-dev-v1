# Promotion — Operations

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

## 1. Environment and configuration

No module-specific `VITE_` variables. Everything is backend state: tracks, skills, modules, quizzes,
routes, route items and their data sources.

Two client-side constants to know about:

| Constant | Effect |
|---|---|
| `promotion-ranks.ts` | rank code → **next** rank display name. An unmapped code shows "Next Level" |
| `wb.hasPromotionAccess` | the `localStorage` flag gating the menu entry, written at login by [auth](../auth/) |

## 2. Build and run

Standard ([platform OPERATIONS §2](../platform/OPERATIONS.md#2-build-and-run)). Two lazy chunks.

Locally you need a track configured for your rank, and **two accounts** to see anything useful in the team
view.

## 3. Feature flags and rollout

No flags. The menu entry is gated on **`wb.hasPromotionAccess`**, cached at login — so:

- granting it takes effect on the **next sign-in**, not the next page load;
- the routes are reachable by URL regardless;
- the API is the actual boundary.

This is the older gating style; the 2026 rollouts use runtime capabilities instead
([platform](../platform/PHASES.md#3-decision-log) decision P6).

## 4. Tests and checks

No frontend tests ([platform OPERATIONS §4](../platform/OPERATIONS.md#4-tests-and-checks)).
`npm run lint` reports nothing in this module.

Manual checks — the first is the one this module can genuinely get wrong:

1. **Optimistic arithmetic agrees with the server.** Enter a numeric route-item value, watch the progress
   update immediately, then reload and confirm it is **the same**. A discrepancy means the client's
   `is_done` rule has drifted from the backend's.
2. **Numeric boundary** — enter exactly the target and confirm it counts as done (`value >= target`).
3. **Route selection is exclusive** — select a second route and confirm the first is deselected.
4. **A quiz module is not done until passed** — watch it, leave the quiz, confirm it is not `done`.
5. **Manually checked skills** are distinguishable from earned ones.
6. **Team view** — search, rank filter and all four sorts; confirm scope is the leader's own people.
7. **An unmapped rank** shows "Next Level" rather than crashing.
8. **A single-track response** — if the backend returns one object rather than a list, the dashboard still
   renders (the service normalises it).

## 5. Deployment

Ships with any frontend deploy; `promotion` is in production.

**Adding a rank needs a frontend change** — `promotion-ranks.ts` maps codes to next-rank names, so a new
code displays as "Next Level" until that file is edited. The backend already sends `level_name`, so this is
avoidable.

**Changing the backend's `is_done` rule needs a matching frontend change**, because the optimistic update
recomputes it client-side.

## 6. Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| **Progress changes, then changes back on reload** | the optimistic `is_done` rule disagrees with the backend | `updateNumericItem` in `use-promotion-dashboard.ts:11`. **The most likely real bug in this module** |
| A rank shows as "Next Level" | not in `promotion-ranks.ts` | the local map; the backend sends `level_name` |
| No Promotion menu entry | `wb.hasPromotionAccess` is false or stale | sign out and back in — the flag is cached at login |
| A user reaches the pages without the flag | the routes have no guard | expected; the API decides |
| Two routes look selected | should be impossible | `selected_route_id` on the dashboard is authoritative |
| A module stays incomplete after watching | it has a quiz | `ModuleStatus` must reach `done` |
| A numeric item will not complete | `value >= target_value` | the target, and whether `target_value` is null |
| A route item does not respond to editing | it has a `data_source` and is populated elsewhere | the item's `data_source` |
| Team search fires a request per keystroke | `search` is in the query key, undebounced | known |
| A leader sees the wrong people | scope is server-side | the `team/` response |
| **A quiz was passed suspiciously fast** | **the answers are in the payload** | `QuizQuestion.correct_index`. Not a defect to fix client-side — see [PHASES.md §5](PHASES.md#5-outstanding) |
| The dashboard is blank for one user | no track configured for their rank | backend configuration |
