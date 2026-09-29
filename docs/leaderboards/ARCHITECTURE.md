# Leaderboards — Architecture

| | |
|---|---|
| **Module** | `leaderboards` |
| **Source** | `src/features/leaderboards/` |
| **Routes** | `/leaderboards` + embedded card |
| **Backend module** | `wbreporting` |
| **API prefix** | `/api/wbreporting/` |
| **Status** | Merged-not-deployed |
| **Doc version** | 1.0 |
| **Verified against** | commit `04cbcf3` — 2026-09-29 (§4, §6, §7 re-read for contests parity Phase 12; the rest `7e3b7f1`) |

## 1. Layering

The module follows the platform layering ([platform §1](../platform/ARCHITECTURE.md#1-layering))
exactly, with one file per layer:

| Layer | File | Owns |
|---|---|---|
| Types | `types/index.ts` | the wire contract, 230 lines, no logic |
| Service | `services/leaderboards-service.ts` | URL building, auth headers, `LeaderboardError` |
| Hooks | `hooks/use-leaderboards.ts` | query keys, `staleTime`, invalidation |
| Components | `components/` (8 files) | rendering and transient UI state |
| Page | `pages/leaderboards-page.tsx` | view switching, query-string entry |

No component imports the service. No hook builds a URL. `components/format.ts` is the one
exception to the pattern and is deliberately pure: value, date and scope-label formatting
shared by five components, with no imports of its own.

## 2. Component map

```
/leaderboards ── LeaderboardsRoute (homev2:read)
  └── LeaderboardsPage                    pages/leaderboards-page.tsx
       ├── view=board   → LeaderboardPanel ──┐
       ├── view=report  → FullReport ────────┤
       └── view=settings→ LeaderboardSettings│   (only if can_manage)
                                             │
/home-v2 ──── LeaderboardsCard ──────────────┤
                                             │
                        shared by the surfaces:
                        ├── LeaderList      one ranked panel (Top 5)
                        ├── Speedometer     one gauge (Full Report only)
                        └── DetailDialog    the proof surface
```

| File | Role |
|---|---|
| `leaderboards-card.tsx` | The compact home card. One metric, a short preview, no proof rows. Deliberately small — the warm target is 750 ms. |
| `leaderboard-panel.tsx` | The expanded board: range, scope, metric tabs, both Top-5 panels, viewer summary. The largest component at 287 lines. |
| `full-report.tsx` | Four metric columns, each a gauge plus two panels plus a personal list. |
| `leader-list.tsx` | One ranked panel. Used by the card, the panel and each Full Report column. |
| `speedometer.tsx` | The SVG gauge. Geometry is fixed by contract, not styling — see [UI.md §5](UI.md#5-responsive-and-print-behaviour). |
| `detail-dialog.tsx` | The proof dialog: cards, formula, paginated rows, definition. |
| `leaderboard-settings.tsx` | The manager form: goals, visibility, milestone mode, masking matrix, date ranges. |
| `format.ts` | Pure formatting helpers. |

## 3. Primary flows

### 3.1 Opening the expanded board

1. `LeaderboardsRoute` calls `useLeaderboardAccess`; renders a loader, then redirects to
   `/home` unless `can_view_leaderboards` (`src/router/leaderboards-route.tsx:33`).
2. `LeaderboardsPage` reads `view`, `metric` and `scope` from the query string
   (`pages/leaderboards-page.tsx:33-43`). An unrecognised metric falls back to `points`;
   the default scope is `smd_base`.
3. `LeaderboardPanel` holds `metric`, `scope`, `rangeKey` and the applied dates in local
   state, and composes them into a `LeaderboardSelection` (`leaderboard-panel.tsx:70`).
4. `useLeaderboard(selection)` puts that selection in the query key and calls
   `fetchLeaderboard`, forwarding the `AbortSignal`.
5. The response supplies not just rows but the **available controls** — `visible_scopes`,
   `visible_ranges`, `general_metrics`, `ratio_metrics`. The panel renders the controls the
   server offers, not a hard-coded list (`leaderboard-panel.tsx:103`, `:204`).

### 3.2 Changing the date range

1. Typing in the start or end field updates `draftStart` / `draftEnd` only
   (`leaderboard-panel.tsx:62`).
2. Nothing refetches. `Apply` is disabled until both are set (`:179`).
3. `Apply` commits them to `applied`, which changes the selection, which changes the query
   key, which fires one request (`:82`).
4. `selectionParams` sends explicit `start`/`end` when both are present and the named
   `range` otherwise (`services/leaderboards-service.ts:86`).

A half-typed date would otherwise fire a request for a year that does not exist. This is
the rule most likely to be broken by a well-meaning "make it live-update" change.

### 3.3 Opening the proof dialog

1. A result button passes `{agentId, agentName, detailMetric, metricLabel}` up as a
   `DetailRequest`.
2. `DetailDialog` renders **immediately** with a loading state; the query starts only once
   a request object exists (`hooks/use-leaderboards.ts:100`).
3. A new subject or metric clears the accumulated rows rather than appending
   (`detail-dialog.tsx:54`).
4. `Load more` sets a cursor; the effect appends when a cursor is present and replaces when
   it is not (`detail-dialog.tsx:63`).
5. A row key that is absent renders as `—`, because absent means "not permitted"
   (`detail-dialog.tsx:41`).

### 3.4 Saving a setting

1. A section of `LeaderboardSettings` calls its mutation hook.
2. On success the hook invalidates **the whole `['leaderboards']` key**, not just its own
   (`hooks/use-leaderboards.ts:126`).
3. Every mounted surface refetches.

Broad invalidation is deliberate: a goal changes the Full Report's gauges, and switching
Net Base on changes which scopes the board may offer. A narrow invalidation would leave the
board showing an answer the settings no longer permit.

## 4. Server state and caching

All keys are `['leaderboards', <surface>, …]`. `selectionKey` normalises the selection into
a stable, order-independent object (`hooks/use-leaderboards.ts:31`).

| Hook | Query key | staleTime | Notes |
|---|---|---|---|
| `useLeaderboardAccess` | `['wbreporting', 'my-access']` (shared) | 5 min, `retry: false` | A `select` over `useWbReportingAccess` ([platform §4](../platform/ARCHITECTURE.md#4-server-state-and-caching)); same name and return shape as before. Long, because the route guard blocks rendering on it and a grant does not change mid-session |
| `useLeaderboardCard` | `[…, 'card', selection]` | 60 s | |
| `useLeaderboard` | `[…, 'board', selection]` | 60 s | `enabled` so a hidden view does not fetch |
| `useFullReport` | `[…, 'full', month, scope]` | 60 s | Month, not selection — the report has its own period model |
| `useLeaderboardDetail` | `[…, 'detail', agentId, metric, selection, cursor]` | 30 s | `enabled: Boolean(input)` is what lets the dialog open before the request starts |
| `useLeaderboardGoals` | `[…, 'goals']` | default (5 min) | |
| `useDisplaySettings` | `[…, 'display-settings']` | default | |
| `useDateRanges` | `[…, 'date-ranges']` | default | |

All three mutations (`useSaveLeaderboardGoals`, `useSaveDisplaySettings`,
`useSaveDateRange`) invalidate `['leaderboards']` wholesale. Access is outside that prefix
since the shared key, so a settings save no longer refetches it — correctly, since a save
does not change a grant.

**Cancellation.** Two mechanisms, and both are needed. The selection lives *in the key*, so
a superseded response is irrelevant rather than merely stale — React Query will not write it
into the new key. And every `queryFn` forwards `signal` into `fetch`, so the superseded
request is actually aborted instead of running to completion. Dropping either one
reintroduces the bug where a slow response for an old filter lands after a fast one for the
new filter.

## 5. Local and URL state

| State | Owner | Lives in |
|---|---|---|
| `view` (`board` / `report` / `settings`) | `LeaderboardsPage` | `useState`, seeded from `?view=` |
| Initial `metric`, `scope` | URL | `?metric=`, `?scope=` — read once, then local |
| `metric`, `scope`, `rangeKey` | `LeaderboardPanel` | `useState` |
| `draftStart`, `draftEnd` | `LeaderboardPanel` | `useState` — never sent |
| `applied` (`{start, end}`) | `LeaderboardPanel` | `useState` — sent |
| `cursor`, `accumulated` rows | `DetailDialog` | `useState`, reset on subject change |
| Selected month | `FullReport` | `useState` |

The query string is an **entry point, not a binding**. It seeds the initial state so
expanding the home card lands on the tab the reader was already looking at; subsequent
changes do not write back to the URL. A board state is therefore not shareable by link —
see [PHASES.md §5](PHASES.md#5-outstanding).

## 6. Permissions and gating

| Capability | Read via | Gates |
|---|---|---|
| `can_view_leaderboards` (`homev2:read`) | `useLeaderboardAccess`, a selector over the shared access query | the `/leaderboards` and `/home-v2` routes, and their menu entries |
| `can_manage` (`wbreporting:manage`) | same payload | whether the Settings tab is offered (`pages/leaderboards-page.tsx:62`) |

`homev2:read` is granted per user in the backend access console. **No plan and no role grants
it** — that is the point: this is a named rollout list, and a list is not a role (decision
L7, L10).

**Every endpoint enforces the same gate independently**, and every `PATCH` re-checks
`wbreporting:manage`. Hiding the Settings tab decides what is *offered*, never what is
*permitted* (`services/leaderboards-service.ts:4`). Masking works the same way: the client
does no masking at all, because a second implementation of a visibility rule is a second
thing to get wrong (decision L6).

## 7. Integration points

- **`wbreporting`** — eight endpoints, all in [API.md](API.md).
- **`home-v2`** — imports `LeaderboardsCard` from this module's `index.ts`. Its `onExpand`
  navigates to `/leaderboards?metric=…`, which is why the page reads the query string.
- **`contests`** — independent module, same API prefix, same grant, its own hook. The one
  cache entry they share is the `wbreporting` access payload (`@shared/wbreporting-access`),
  which the shell menu and the pipeline screen read too.
- **The reporting pipeline** — produces the tables these endpoints read. Its schedule being
  off is why every current answer has `source: daily_fallback` (decision L8).
- **`index.ts`** exports exactly five components, one hook and three types. That narrow
  surface is what lets the internals change without touching `home-v2` or the router.

## 8. Invariants and failure modes

| Invariant | Enforced by | Breaks as |
|---|---|---|
| A draft date never reaches the API | `applied` is separate state; `Apply` is the only writer (`leaderboard-panel.tsx:82`) | a request per keystroke, and errors for half-typed dates |
| The available controls come from the response | `visible_scopes`, `visible_ranges`, `general_metrics` are rendered, not hard-coded (`:103`, `:204`) | a scope the deployment has switched off appearing as a dead tab |
| A superseded request is cancelled | selection in the key **and** `signal` forwarded | an old answer overwriting a newer one |
| An absent field renders as `—`, never `0` | `renderCell` checks `undefined` before formatting (`detail-dialog.tsx:41`) | "no permission" read as "no clients" |
| `available: false` renders as "no data", never zero | the `MilestoneSummary.available` flag | a period with no stamped data reported as genuinely zero completions |
| The dialog opens before its data | `enabled: Boolean(input)` on the detail query | a blank screen at exactly the moment a reader doubts a number |
| No client-side masking | none is written | two visibility implementations drifting apart |
| Styles cannot leak | every selector under `wb-lb-` in one stylesheet | printing a leaderboard restyling another page |

**Known latent failure.** Inside the Full Report, the gauges and the personal list read the
resolved `source`, but the SMD/MD panels aggregate daily rows regardless of it. No month
currently resolves to `monthly_snapshot`, because the pipeline's monthly schedule is off
(L8) — so today the two agree. Once that schedule is enabled, a closed month's gauge will
read the snapshot while its two panels read daily rows, and they will disagree. This is a
backend fix (threading the source through `leader_rows`), recorded here because the symptom
will be reported as a frontend bug.

**Known, deliberate discrepancy.** A member whose month is net negative (chargebacks exceed
advances) is dropped from the personal list but still counted in the gauge above it. The
visible rows can therefore sum to *less* than the number above them. That is what "positive
Personal list" asks for; the list must not be presented as a reconciliation of the gauge
(decision L14).
