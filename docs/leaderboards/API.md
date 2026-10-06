# Leaderboards — API

| | |
|---|---|
| **Module** | `leaderboards` |
| **Source** | `src/features/leaderboards/services/leaderboards-service.ts` |
| **Routes** | `/leaderboards` + embedded card |
| **Backend module** | `wbreporting` → `mlm_platform/docs/wbreporting/API.md` |
| **API prefix** | `/api/wbreporting/` |
| **Status** | Merged-not-deployed |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Endpoints **consumed**, not exposed. `mlm_platform/docs/wbreporting/API.md` is the
> authority on what each one does; this file records what the client sends and reads.

## 1. Conventions

Follows the platform conventions ([platform API §1](../platform/API.md#1-conventions)) with
no deviation:

| | |
|---|---|
| Base | `${VITE_API_BASE_URL}/api/wbreporting` (`leaderboards-service.ts:24`) |
| Auth | `Authorization: Token <localStorage['wb.authToken']>` (`:40`) |
| Trailing slash | required on every path |
| Cancellation | every read takes an `AbortSignal`, forwarded from React Query |
| Errors | non-2xx → `LeaderboardError` carrying `status` and the backend's `code` (`:28`) |

The error parse is guarded rather than assumed (`:54`): the backend answers 4xx with
`{code, detail}`, but a gateway or proxy can still return HTML, and a JSON parse failure
must not mask the status code.

## 2. Endpoints consumed

Eight endpoints. Reads are `GET`, writes are `PATCH`; the module issues no `POST` or
`DELETE`.

| Method | Path | Service function | Hook | Purpose |
|---|---|---|---|---|
| GET | `/my-access/` | `fetchLeaderboardAccess` | `useLeaderboardAccess` | capability flags for the guard and the menu |
| GET | `/leaderboards/card/` | `fetchLeaderboardCard` | `useLeaderboardCard` | compact home-card payload |
| GET | `/leaderboards/` | `fetchLeaderboard` | `useLeaderboard` | expanded board: both panels + viewer summary |
| GET | `/leaderboards/full/` | `fetchFullReport` | `useFullReport` | Full Report for a month or current MTD |
| GET | `/leaderboards/detail/` | `fetchLeaderboardDetail` | `useLeaderboardDetail` | one page of proof rows |
| GET · PATCH | `/leaderboard-settings/` | `fetchLeaderboardGoals` · `saveLeaderboardGoals` | `useLeaderboardGoals` · `useSaveLeaderboardGoals` | the four gauge goals |
| GET · PATCH | `/leaderboard-display-settings/` | `fetchDisplaySettings` · `saveDisplaySettings` | `useDisplaySettings` · `useSaveDisplaySettings` | visibility, milestone mode, masking matrix |
| GET · PATCH | `/date-ranges/` · `/date-ranges/<key>/` | `fetchDateRanges` · `saveDateRange` | `useDateRanges` · `useSaveDateRange` | the named range choices |

The three `PATCH` paths require `wbreporting:manage`; the five reads require `homev2:read`.

`fetchDateRanges` tolerates both a bare array and a DRF-paginated `{results: […]}` envelope
(`leaderboards-service.ts:181`), because the endpoint's pagination setting is a backend
decision this module should not break on.

## 3. Payload types

All wire types are in `src/features/leaderboards/types/index.ts` (230 lines). Read it rather
than a restatement here. The shapes that matter:

| Type | Used by |
|---|---|
| `LeaderRow` | every ranked panel, in all four surfaces |
| `LeaderboardCardResponse` | the card — no proof rows, by design |
| `LeaderboardResponse` | the board, including the control lists |
| `FullReportResponse` / `FullReportMetric` / `MilestoneSummary` | the report |
| `DetailResponse` / `DetailRow` | the proof dialog |
| `LeaderboardAccess` | the guard and the menu |
| `LeaderboardSelection` | not a wire type — the client-side selection |

Three properties of the contract the client depends on:

1. **The response carries its own controls.** `visible_scopes`, `visible_ranges`,
   `general_metrics` and `ratio_metrics` are part of `LeaderboardResponse`. The UI renders
   what it is given, so switching a scope off server-side removes the control with no
   release.
2. **`DetailRow` is `Record<string, …>`, and an absent key is meaningful.** Protected fields
   are typed optional rather than nullable precisely because "not permitted" arrives as an
   absent key, not a `null`. An absent key renders `—`.
3. **`LeaderRow.photo_url` is optional and nullable.** Null means the leader has no
   photo; the key is absent from a backend older than `feature/wb-contest-showcase`.
   Either way the avatar shows initials, and an image that fails to load (an expired
   signed URL) falls back to them too.
4. **`percent` is nullable.** A goal of zero has no percentage; the gauge must handle `null`
   rather than dividing.

## 4. Query parameters

Built by `selectionParams` (`leaderboards-service.ts:84`), shared by the card, the board and
the detail endpoint so the three cannot disagree.

| Parameter | Values | Built by |
|---|---|---|
| `metric` | one of the 11 metric keys | always sent |
| `scope` | `personal`, `net_base`, `smd_base`, `super_base`, `super_team` | always sent |
| `range` | a `range_key` from `/date-ranges/` | sent **only** when `start`/`end` are absent |
| `start`, `end` | ISO dates, inclusive, end ≥ start, ≤ 367 days | sent when both are present |
| `month` | `YYYY-MM` | Full Report only; omit for current MTD |
| `agent_id` | an agency code | detail only |
| `cursor` | opaque, from `next_cursor` | detail only, when paging |

**Explicit dates win over the named range** (`:86`). That mirrors the backend and reflects the
UI rule: a custom range is only applied once the user presses Apply, at which point both
dates are set. Sending both `range` and `start`/`end` would leave the server to guess.

`agent_id` in a personal row is already the agency code the detail endpoint takes, so a row
opens its own proof view with no extra lookup.

## 5. Error codes and handling

The backend's stable codes, typed as `LeaderboardErrorCode` (`types/index.ts:32`):

| Code | Status | Client behaviour |
|---|---|---|
| `invalid_date_range` | 400 | Should be unreachable — Apply requires both dates. If seen, the draft/applied split has been broken |
| `metric_not_supported` | 400 | A metric the server will not rank. Was routine before Phase 8 made milestones rankable |
| `scope_not_supported` | 400 | A scope not in `visible_scopes`. Unreachable while controls are server-driven |
| `agent_not_found` | 404 | Detail for an agent id the reporting tables do not have |
| `detail_forbidden` | 403 | The viewer may not see this agent's proof rows at all |
| `source_unavailable` | 503 | A pipeline table is missing. Retryable |
| `detail_timeout` | 503 | Documented in the source contract; not in the client's union — a timeout surfaces as a generic 503 |

Three of these should be unreachable in normal operation, and that is the point: if
`invalid_date_range` or `scope_not_supported` appears, the bug is that the client stopped
following the server's control lists, not that the server is wrong.

Rendering: `LeaderboardError.message` is the backend's `detail`, shown in a `role="alert"`
with a generic fallback. There is no central 401 handler — see
[platform API §5](../platform/API.md#5-error-codes-and-handling).

## 6. Backend ownership

`wbreporting` owns, and the client must not recompute:

- **Date validation** — inclusive bounds, the 367-day maximum, the January 2026 floor.
- **Hierarchy membership** — who is in whose base shop, per scope. Five scopes, one traversal,
  server-side (decision L1).
- **Ranking and ratios** — dense ranking, tie handling, the four read-time ratios.
- **Masking** — the 7×3 relationship matrix. `hidden` fields are **omitted from the
  response**. There is deliberately no client-side masking, because a second implementation
  of a visibility rule is a second thing to get wrong (decision L6).
- **Which controls exist** — `visible_scopes`, `visible_ranges`, `general_metrics`.
- **Source selection** — `daily_current` for current MTD, `monthly_snapshot` for a closed
  month, `daily_fallback` otherwise (decision L8).
- **Milestone availability** — whether a period has stamping coverage at all. The client
  renders `available: false` as "no data" and never as zero (decision L5).

The client owns presentation, the draft/applied split, focus, the responsive grid, print, and
request cancellation.

**Performance targets** from the source contract, for reference when changing a payload: the
card under 750 ms warm; board and report summaries under 1 s warm, under 3 s cold. Proof rows
load separately and paginate. This is why the card has its own smaller endpoint rather than
reusing the board's.
