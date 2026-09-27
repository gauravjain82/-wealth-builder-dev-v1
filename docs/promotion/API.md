# Promotion — API

| | |
|---|---|
| **Module** | `promotion` |
| **Source** | `src/features/promotion/services/promotion-service.ts` |
| **Routes** | `/promotion/dashboard`, `/promotion/team` |
| **Backend module** | `promotion` → `mlm_platform/docs/promotion/API.md` |
| **API prefix** | `/api/promotion/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Endpoints **consumed**, not exposed. The backend also carries
> `promotion/promotion-frontend-api.md` (30 KB), the fullest description of this API.

## 1. Conventions

Platform conventions ([platform API §1](../platform/API.md#1-conventions)), in the app's tidiest service:
one `request<T>` helper, 65 lines total.

| | |
|---|---|
| Base | `${VITE_API_BASE_URL}/api/promotion/` |
| Auth | `Authorization: Token`, **throws** when absent |
| Errors | unwraps `{detail}`, falling back to `Request failed (status)` |
| Shape | one object literal, eight methods |
| Cancellation | none — no `AbortSignal` is threaded |

## 2. Endpoints consumed

| Method | Path | Service method |
|---|---|---|
| GET | `my-dashboard/` | `dashboard()` |
| GET | `team/?rank=&search=&sort=` | `team(rank, search, sort)` |
| POST | `skills/{id}/toggle/` | `toggleSkill` |
| POST | `routes/{id}/select/` | `selectRoute` |
| POST | `route-items/{id}/progress/` | `updateRouteItem(id, value?)` |
| GET | `modules/{id}/questions/` | `questions` |
| POST | `modules/{id}/watch/` | `watch` |
| POST | `modules/{id}/quiz/` | `submitQuiz(id, answers)` |

`updateRouteItem` sends **no body at all** for a check item and `{value}` for a numeric one — the absence
of a body is the signal that it is a toggle.

## 3. Payload types

`types.ts`, 99 lines.

| Type | Note |
|---|---|
| `ModuleStatus` | `pending \| watch \| quiz \| done` |
| `PromotionStatus` | `ready \| close \| not_ready` |
| `RankCode` | `'TA' \| 'A' \| 'MD' \| string` — **deliberately open**, so a new rank does not break the type |
| `PromotionModule` | title, video, duration, status, `quiz_score`/`quiz_total` |
| `PromotionSkill` | `tag: 'skill' \| 'action'`, counts, `is_manually_checked` |
| `RouteItem` | `item_type: 'check' \| 'numeric'`, `target_value`, `unit`, `leg_group`, `data_source` |
| `PromotionRoute` | `is_urgent`, `is_eligible`, `is_selected`, `note`, `route_pct` |
| `PromotionDashboard` | the whole payload: track, days in rank, percentages, skills, routes |
| **`PromotionDashboardResponse`** | **`PromotionDashboard \| PromotionDashboard[]`** — normalised in the service |
| **`QuizQuestion`** | **includes `correct_index`** — see below |
| `TeamMember` | per-person progress; its `routes` are `Omit<PromotionRoute, 'id' \| 'is_selected'>` |
| `TeamResponse` | `stats` plus `members` |
| `TeamSort` | `progress_asc \| progress_desc \| name \| rank` |

Three of these encode a decision:

1. **`RankCode` is an open union.** `'TA' | 'A' | 'MD' | string` accepts an unknown rank rather than
   failing to compile — at the cost of no exhaustiveness checking.
2. **`PromotionDashboardResponse` is a union**, normalised with `Array.isArray` in the service, so the
   client survives the backend returning one track or many.
3. **`TeamMember.routes` omits `is_selected`.** A leader sees progress, not which path somebody privately
   chose.

**And one to be aware of: `QuizQuestion.correct_index` means every correct answer is sent to the browser
that renders the quiz.** The quiz can be passed from the network tab. Whether that is acceptable depends on
what the score is used for — see [PHASES.md §5](PHASES.md#5-outstanding).

## 4. Query parameters

| Parameter | Endpoint | Note |
|---|---|---|
| `sort` | `team/` | always sent |
| `rank` | `team/` | omitted when empty |
| `search` | `team/` | omitted when empty |

All three are in the team query's cache key, so a search fires a request per term — there is no debounce.

## 5. Error codes and handling

No typed error class. `request<T>` throws an `Error` carrying the backend's `detail`.

| Situation | Client behaviour |
|---|---|
| No token | throws immediately |
| Selecting a second route | the backend replaces the selection; `selected_route_id` is authoritative |
| Numeric value below target | not an error — `is_done` is simply false |
| Quiz failed | a score, not an error |
| Not authorised for the team view | 403; the routes have no client guard |
| Dashboard returns one object instead of a list | **handled** by the normalisation |

## 6. Backend ownership

`promotion` owns, and the client must not recompute:

- **Promotion status** — `ready`/`close`/`not_ready`.
- **Overall and per-route percentages**, on read. The client recomputes a route's percentage
  *optimistically* after an edit, which is why that arithmetic must match.
- **Route eligibility and urgency.**
- **Which route is selected**, and that only one is.
- **Quiz scoring**, even though the answers are also sent.
- **Route item data sources** — items with a `data_source` are populated from elsewhere, not self-reported.
- **Team scope** — which people a leader sees.
- **`level_name`** on the track, which the client currently re-derives locally.

The client owns the forms, the optimistic patch, and the team view's filters.
