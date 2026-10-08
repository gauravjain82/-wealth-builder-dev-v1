# Matchup — API

| | |
|---|---|
| **Module** | `matchup` |
| **Source** | `src/features/matchup/services/` |
| **Routes** | `/matchup`, `/calendar` |
| **Backend module** | `matchup` → `mlm_platform/docs/matchup/API.md`; `notifications` |
| **API prefix** | `/api/matchup/`, `/api/notifications/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Endpoints **consumed**, not exposed.

## 1. Conventions

Platform conventions ([platform API §1](../platform/API.md#1-conventions)). `authHeaders(isJson = true)`
**throws** `No authentication token found` when the token is missing rather than sending an anonymous
request — the same posture as `events`' authenticated services.

`matchup-service.ts` also exports the time helpers every modal shares — `monthRange`,
`browserTimezone`, `formatAppointmentTime`, `localDateTimeValue` — so there is one timezone convention
across the module rather than one per modal.

## 2. Endpoints consumed

### `matchup` — 13

| Method | Path | Purpose |
|---|---|---|
| GET · POST | `/api/matchup/appointments/` | list and create |
| GET · PATCH · DELETE | `/api/matchup/appointments/{id}/` | detail, edit, remove |
| POST | `/api/matchup/appointments/{id}/reschedule/` | **move in place**, with an audit record |
| POST | `/api/matchup/appointments/{id}/complete/` | file the follow-up result; sets `DONE` |
| PATCH | `/api/matchup/appointments/{id}/result/` | **correct a filed result** (M18) — same payload as `complete/`, status unchanged, `400` if no result yet, sets `last_edited_by` |
| GET | `/api/matchup/appointments/action-required/` | the three queues plus `can_view` / `can_take_action` |
| GET | `/api/matchup/appointments/calendar/` | a month of calendar items |
| GET | `/api/matchup/appointments/day/` | one day, grouped |
| GET | `/api/matchup/appointments/metrics/` | the metrics cards |
| GET | `/api/matchup/appointments/statuses/` | **status metadata: value, label, colour**, and the list's filter `presets` (sent back as `?preset=`) |
| GET | `/api/matchup/appointment-types/` | the type catalogue |
| GET | `/api/matchup/trainer-search/` | company-wide, with segment filtering |
| GET | `/api/matchup/appointments/export/` | server-side export |
| GET | `/api/matchup/google/status/` | connection state, read-only here |
| POST | `/api/matchup/google/oauth/start/` | **the OAuth alias `calendar-sync` also uses** |

Statuses and types being **served rather than hard-coded** is what lets the backend add a status or
recolour one with no frontend release.

### Metrics endpoints — `metrics/services/metrics-service.ts`

Read-only, for `/matchup/metrics`. Every request forwards React Query's `signal`. Query: `start`, `end`
(YYYY-MM-DD, both inclusive), `mode` (`prospects` | `appointments`), optional `segment`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/matchup/metrics/my-access/` | `can_view`, `org_wide`, `segments` — the route guard |
| GET | `/api/matchup/metrics/organisation/` | report: per-section `summary` + SMD `rows` |
| GET | `/api/matchup/metrics/smd/{id\|none}/` | report for one SMD (`none` = agents with no SMD) + agent rows |
| GET | `/api/matchup/metrics/agent/{id}/` | report for one agent + prospect rows |
| GET | `/api/matchup/metrics/prospect/{id}/` | one prospect's appointment journey |
| GET | `/api/matchup/metrics/trend/organisation/` | weekly trend, SMD rows |
| GET | `/api/matchup/metrics/trend/smd/{id\|none}/` | weekly trend, agent rows |
| GET | `/api/matchup/metrics/trend/agent/{id}/` | weekly trend, no rows (`[]`) |

**Trend** (`MetricsTrend` in `metrics/types.ts`): query `end`, `weeks` (4–26; the page sends 12), `mode`,
`segment`; **`start` is not sent** — the backend ignores it. The last week returned is the ISO week
(Monday–Sunday, UTC) containing `end`. `weeks[]` is oldest first with a `partial` flag on the week in
progress; every array under `sections.<SECTION>.summary` (`total`, `showed`, `upcoming`,
`result_pending`, `fna`, `ama`, `sale`) and `rows[]` (`total`, `showed`, `ama`) is aligned with it, and an
empty week is `0`. Rows join to the report's rows on `kind` + `id`. Each week's numbers equal the report
endpoint's for that week; rates are derived client-side (show = showed / total, AMA = ama / total).
**A 404 resolves to `null`** rather than throwing, so the trend endpoint and this page can deploy in either
order — until it exists the page draws no sparklines (PHASES M14). Other errors throw, and the page ignores
them the same way.

### `notifications` — 3, via `inapp-notification-service.ts`

| Method | Path |
|---|---|
| GET | `/api/notifications/inapp/` |
| GET | `/api/notifications/inapp/unread-count/` |
| POST | `/api/notifications/inapp/mark-read/` |

### Consumed from another module

`calendarSyncService.imported(...)`, `dismissImported(...)` — imported Google events, fetched **here**
rather than in [calendar-sync](../calendar-sync/API.md#2-endpoints-consumed) (its decision CS6).

## 3. Payload types

`types.ts` (297 lines). The two at the top define the domain:

```ts
type AppointmentKind = 'REQUEST_TRAINER' | 'PERSONAL';
type AppointmentStatus = 'REQUESTED' | 'ASSIGNED' | 'ACCEPTED' | 'DONE'
                       | 'RESCHEDULED' | 'NOT_INTERESTED' | 'CANCELLED' | 'DECLINED';
```

| Type | Note |
|---|---|
| `MatchupStatusMeta` | value + label + **colour**, from the server |
| `MatchupActionRequiredResponse` | `assign?` / `accept?` / `complete?` arrays, plus `can_view`, `can_take_action` — **all optional**, so absence is not emptiness |
| `AppointmentType` | catalogued, with `sort_order` and `is_active` |
| `PersonCard` | contact identity, including spouse fields |
| `AppointmentResult` | the recorded outcome |
| `AppointmentAssignment` | who assigned whom, and when |
| **`AppointmentReschedule`** | **the audit record the dedicated endpoint writes** |
| `AppointmentLastNote` | the most recent note |
| `AppointmentListItem` → `DayAppointmentItem` → `AppointmentDetail` | three shapes, progressively richer |
| `CalendarAppointment` | what the month grid renders — **also carries imported events** |
| `CreateAppointmentPayload` / `UpdateAppointmentPayload` | the latter is `Partial<>` of the former |
| `CompleteAppointmentPayload` | outcome plus optional follow-up |
| `TrainerCandidate` | a search hit |
| `GoogleStatus` | read-only here |

**`MatchupActionRequiredResponse`'s fields are optional**, which matters: a missing `assign` key is not
the same as an empty queue, and the panel must not render "nothing to assign" when the server simply did
not include it.

`CalendarAppointment` doing double duty for appointments and imported events is what the negative-id
trick buys — see [ARCHITECTURE.md §3.4](ARCHITECTURE.md#34-imported-google-events-on-the-calendar).

## 4. Query parameters

| Group | Used by |
|---|---|
| `AppointmentFilters` | the list — status, kind, type, date range, trainer |
| month range | the calendar, built by `monthRange()` |
| day | the day endpoint |
| `q` + segment | trainer search |
| `start` / `end` | imported events, via `calendarSyncService` |

Export takes the same filters as the list, so what you export is what you were looking at.

## 5. Error codes and handling

No typed error class and no stable code vocabulary. Failures surface through the page's own state.

| Situation | Client behaviour |
|---|---|
| No token | **throws** — a bug signal, not a state |
| Reschedule of a terminal status | prevented by `canReschedule`; the server would also refuse |
| Missing trainee on a trainer request | blocked in the form, and server-side |
| No permission to act | `can_take_action` false — the actions are not offered |
| Google not connected | not an error: `GoogleStatus` reports it |
| Imported event acted on as an appointment | prevented by branching on `source` |
| Notification fetch fails | degrades quietly; the count is an aid, not a function |

## 6. Backend ownership

`matchup` owns, and the client must not recompute:

- **The status machine**, including which transitions a reschedule permits. `canReschedule` mirrors that
  table; it does not define it.
- **The action-required queues**, and whether this user may act at all.
- **Assignment**, notification and the audit rows (`AppointmentAssignment`, `AppointmentReschedule`).
- **Google Calendar writes** — including sending an **update** on reschedule rather than a
  delete-and-recreate.
- **The consequences of a kind change** — clearing an assignment, notifying a withdrawn trainer, moving
  the event off a calendar. The client only *warns*; the server acts.
- **Status metadata and the type catalogue.**
- **Scoping** — which appointments and which trainers a user may see.
- **Export** generation.

The client owns the forms, the warning before a kind change, the single reschedule predicate, the
calendar's presentation, and mapping imported events onto a renderable shape.
