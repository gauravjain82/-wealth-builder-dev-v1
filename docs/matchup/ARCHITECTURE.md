# Matchup — Architecture

| | |
|---|---|
| **Module** | `matchup` |
| **Source** | `src/features/matchup/` |
| **Routes** | `/matchup`, `/calendar` |
| **Backend module** | `matchup`, `notifications` |
| **API prefix** | `/api/matchup/`, `/api/notifications/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Layering

Standard, flat — no sub-areas.

| Layer | File | Owns |
|---|---|---|
| Types | `types.ts` (297) | the kind/status model and every payload |
| Services | `services/matchup-service.ts` (250), `inapp-notification-service.ts` (47) | 11 + 3 endpoints |
| Hook | `hooks/use-matchup-dashboard.ts` (175) | the dashboard's whole data layer |
| Components | `components/` (12) | the modals and the calendar |
| Pages | `pages/matchup-page.tsx` (894), `calendar-page.tsx` (303) | dashboard and calendar |
| Styles | `pages/matchup-page.css` (2,178) | **the largest module stylesheet in the app** |

`matchup-service.ts` also exports helpers the components share: `monthRange`, `browserTimezone`,
`formatAppointmentTime`, `localDateTimeValue`. Time formatting living in the service rather than a
`utils/` file keeps one timezone convention across every modal.

## 2. Component map

```
/matchup ── MatchupPage (894)
  ├── MetricsCards
  ├── ActionRequiredPanel      assign · accept · complete — three queues for *this* user
  ├── AppointmentList          filters, sort, view mode
  │    └── row actions ── canReschedule(status) gate
  └── modals
       ├── AppointmentFormModal (648)     create + edit; owns the kind-change warning
       ├── AppointmentDetailsModal        detail + reschedule history
       ├── AssignTrainerModal             company-wide search, segment filter
       ├── CompleteAppointmentModal (330) outcome + optional follow-up
       ├── RescheduleAppointmentModal     the dedicated in-place move
       └── DayAppointmentsModal (408)     one day, grouped

/calendar ── CalendarPage (303)
  ├── MonthCalendar
  │    └── appointments  +  IMPORTED Google events (negative ids)
  ├── DayAppointmentsModal
  └── ImportedEventModal       convert or dismiss an external event

shared predicate: canReschedule() exported from reschedule-appointment-modal.tsx
```

`canReschedule` being exported from the modal that implements rescheduling is deliberate: the list, the
details modal, the day modal and the follow-up flow all gate on **one** predicate, so no entry point can
offer an action the backend will refuse.

## 3. Primary flows

### 3.1 The trainer-request lifecycle

```
REQUESTED ──assign──> ASSIGNED ──accept──> ACCEPTED ──complete──> DONE
    │                     │                    │
    └──── DECLINED ───────┘                    └── RESCHEDULED ──> (back into the flow)
                    NOT_INTERESTED / CANCELLED  (terminal)
```

A `PERSONAL` appointment skips assignment and acceptance entirely — it is created and later completed.

The **action-required** endpoint returns three arrays (`assign`, `accept`, `complete`) plus `can_view`
and `can_take_action`, so the panel shows only what this user can actually do. The queues are a server
answer, not a client filter over the full list.

### 3.2 Reschedule — in place, never cancel-and-recreate

`RescheduleAppointmentModal` calls the dedicated reschedule endpoint. The backend then updates the same
row, writes an `AppointmentReschedule` audit record, sets `RESCHEDULED`, notifies, and sends Google a
calendar **update** rather than a delete-and-recreate.

Four statuses are terminal and cannot be rescheduled — `DONE`, `CANCELLED`, `DECLINED`,
`NOT_INTERESTED` — and `canReschedule` encodes exactly the backend's allowed-transition set
(`components/reschedule-appointment-modal.tsx:8`).

**This was once broken in a way worth remembering.** The reschedule button re-opened the generic edit
form, which saved through a plain `PATCH`; the dedicated endpoint existed and
`matchupService.reschedule()` had zero callers. The visible effect was an appointment that behaved as
though it had been cancelled and recreated — losing the audit trail and churning the Google event. See
[PHASES.md](PHASES.md#3-decision-log) decision M2.

### 3.3 Changing an appointment's kind

Flipping `kind` between `PERSONAL` and `REQUEST_TRAINER` is allowed on edit, and the form **warns what
it will do** (`components/appointment-form-modal.tsx:417`):

- **→ Request Trainer**: removes the event from your calendar and requests a trainer; a trainee must be
  selected; it stays unassigned until a trainer accepts.
- **→ Personal**: becomes a personal appointment on your own calendar, and any assigned trainer is
  unassigned and notified that the request was withdrawn.

The warning exists because `status`, `assigned_to` and `assigned_by` are server-set, so a naive flip
produced inconsistent half-states — a "Request Trainer" appointment that never entered the queue, or a
"personal" appointment living on a trainer's Google calendar. Decision M3.

### 3.4 Imported Google events on the calendar

`importedToCalendarItem` (`hooks/use-matchup-dashboard.ts:16`) maps a `calendar-sync` `ImportedEvent`
onto the calendar-item shape so the month grid can render it beside real appointments:

- **the id is `-block_id`** — negative, so it stays numeric and **cannot collide** with a real
  appointment id;
- `source: 'IMPORTED'` is what every consumer branches on;
- `kind` is set to `PERSONAL` so existing rendering paths work.

The negative id is the load-bearing part: every downstream component already keys and compares on a
numeric id, and this keeps that true without a union type or a discriminated wrapper.

`ImportedEventModal` then offers convert-to-appointment or dismiss.

## 4. Server state and caching

**No React Query.** One hook, `use-matchup-dashboard`, owns the dashboard's whole data layer with
`useState` + `useEffect`: appointments, types, statuses, metrics, Google status, the calendar month, and
the imported events.

| State | Source |
|---|---|
| Appointments + pagination | `matchupService` |
| Appointment types, status metadata | `matchupService` — **served, not hard-coded** |
| Metrics | `matchupService` |
| Google status | `matchupService` (`/google/status/`) |
| Calendar month | `monthRange()` + the calendar endpoint |
| **Imported events** | **`calendarSyncService`, called directly** |

That last row is the cross-module coupling: the imported-events queries live here, in `matchup`, rather
than in `calendar-sync` — see [calendar-sync](../calendar-sync/PHASES.md#3-decision-log) decision CS6.
It means invalidating `calendarSyncKeys.root` does **not** refresh this calendar; this hook reloads it.

Status metadata (`MatchupStatusMeta`: value, label, colour) comes from the server, so adding a status or
recolouring one needs no release.

## 5. Local and URL state

| State | Owner | Lives in |
|---|---|---|
| Filters, sort, view mode | `MatchupPage` | `useState` |
| Selected month | `CalendarPage` | `useState` + `monthRange()` |
| Open modal + target | each page | `useState` |
| Form drafts | each modal | `useState` |
| `kindChanged` | `AppointmentFormModal` | derived, drives the warning |

Nothing is in the query string.

## 6. Permissions and gating

**No route guard.** Both routes sit under `ProtectedRoute` only. Authorization is server-side and
surfaces two ways:

| Signal | Effect |
|---|---|
| `can_view`, `can_take_action` on the action-required payload | whether the panel renders and whether its actions are offered |
| Per-request scoping | which appointments a user sees at all |

Trainer search is **company-wide with segment filtering** — an assigner may need somebody outside their
own base shop, so the search is deliberately broader than the usual downline scope.

## 7. Integration points

- **`matchup` backend** — 11 endpoints; the workflow, transitions and Google writes all live there.
- **`notifications`** — 3 endpoints for the in-app unread count and mark-read.
- **[calendar-sync](../calendar-sync/)** — this module **imports its service directly** for imported
  events, and links to its Settings section to manage the connection. It also owns the
  `/google/oauth/start/` alias that `calendar-sync` uses (decision CS4).
- **`bpm`** — reschedules a guest into an appointment here, and reads `/google/status/`.

## 8. Invariants and failure modes

| Invariant | Enforced by | Breaks as |
|---|---|---|
| **Reschedule moves the row in place** | the dedicated endpoint, not `PATCH` | a lost audit trail and a churned Google event |
| One predicate gates reschedule everywhere | `canReschedule`, exported and shared | an entry point offering an action the backend refuses |
| A terminal status cannot be rescheduled | the four excluded statuses | a "done" appointment reopened |
| **A kind change warns before it acts** | `kindChanged` + the note block | inconsistent half-states — an unqueued request, or a personal event on a trainer's calendar |
| An imported event's id cannot collide | `-block_id` | an external event overwriting a real appointment in a keyed list |
| `source: 'IMPORTED'` is the branch | every consumer checks it | an external event treated as editable |
| Status metadata comes from the server | `MatchupStatusMeta` | labels and colours drifting from the backend's |
| Action-required queues are server-computed | the endpoint returns three arrays | a client filter that disagrees about what needs doing |
| A trainer request needs a trainee | validated in the form **and** server-side | a request nobody can be matched to |

**The cross-module cache gap.** Imported events are fetched here but owned by `calendar-sync`. A change
made through `calendar-sync`'s Settings section does not invalidate this calendar, and vice versa. Both
modules document it; neither fixes it.

**The stylesheet.** 2,178 lines in `matchup-page.css` is the largest module stylesheet in the app — more
than `bpm` (which has none) and three times `contests`. It is not scoped behind a documented contract the
way `wb-ct-` and `wb-gms-` are, and its class names are `matchup-*` by convention only. Recorded in
[PHASES.md §5](PHASES.md#5-outstanding).
