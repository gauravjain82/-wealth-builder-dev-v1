# Matchup — UI

| | |
|---|---|
| **Module** | `matchup` |
| **Source** | `src/features/matchup/pages/`, `components/` |
| **Routes** | `/matchup`, `/calendar` |
| **Backend module** | `matchup`, `notifications` |
| **API prefix** | `/api/matchup/`, `/api/notifications/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Routes and entry points

| Route | Guard | Component |
|---|---|---|
| `/matchup` | `ProtectedRoute` only | `MatchupPage` |
| `/calendar` | `ProtectedRoute` only | `CalendarPage` |

`/calendar` belongs to **this** module, not to [calendar-sync](../calendar-sync/) — which has no route at
all. That is the single most commonly mistaken fact about either module.

Entry points from elsewhere: `bpm` reschedules a guest into an appointment here, and this module's
Match Up page links out to `/settings#settings-calendar-sync` to manage the Google connection.

## 2. Screens

### 2.1 Dashboard — `pages/matchup-page.tsx` (894 lines)

| Element | Shows |
|---|---|
| `MetricsCards` | headline counts |
| `ActionRequiredPanel` | three queues — **assign**, **accept**, **complete** — for this user only |
| `AppointmentList` | the list, with filters, sorting and a view mode |
| Google status | connected or not, as a **link to Settings**, not a control here |

The action-required panel is the point of the page: it answers "what is waiting on me", which is a
different question from "show me all appointments". Its contents are computed server-side.

### 2.2 Calendar — `pages/calendar-page.tsx`

`MonthCalendar` with real appointments **and imported Google events side by side**. Clicking a day opens
`DayAppointmentsModal`; clicking an imported event opens `ImportedEventModal`, which offers convert or
dismiss.

An imported event is visually tagged and is **not editable as an appointment** — consumers branch on
`source: 'IMPORTED'`.

### 2.3 Appointment form — `components/appointment-form-modal.tsx` (648 lines)

Create and edit, for both kinds. The largest component, and the one with the most rules:

| Field | Behaviour |
|---|---|
| **Kind** | editable on edit, and **shows a warning when changed** — see §4 |
| Contact | required for both kinds |
| Trainee | **required for `REQUEST_TRAINER`**, cleared for `PERSONAL` |
| Types | multi-select from the served `AppointmentType` catalogue |
| Location | `VIRTUAL` or `PHYSICAL`; the URL field is **explicitly optional** |
| Start, duration, timezone | defaults to `browserTimezone()` |

### 2.4 Assign trainer — `components/assign-trainer-modal.tsx`

**Company-wide** trainer search with segment filtering. Deliberately broader than the usual downline
scope: an assigner may need a trainer from outside their own base shop.

### 2.5 Complete appointment — `components/complete-appointment-modal.tsx` (330 lines)

Records the outcome, and **offers a follow-up appointment** — including rescheduling this one instead, if
that is what actually happened.

### 2.6 Reschedule — `components/reschedule-appointment-modal.tsx`

A dedicated flow, not the edit form. It only touches time, and it calls the reschedule endpoint, so the
appointment moves **in place** with an audit record.

It exports `canReschedule(status)`, and every entry point — list row, details modal, day modal, follow-up
flow — gates on it. Its `ReschedulableAppointment` type is a `Pick`, so all three appointment shapes
satisfy it and one modal serves them all.

### 2.7 Details — `components/appointment-details-modal.tsx`

The appointment plus its **reschedule history** — or "No reschedule history." Making the history visible
is what the in-place reschedule buys.

### 2.8 Day view — `components/day-appointments-modal.tsx` (408 lines)

One day, grouped, with trainer references and row actions.

## 3. States

| State | Trigger | What the user sees |
|---|---|---|
| `REQUESTED` | a trainer request with no trainer | in the **assign** queue |
| `ASSIGNED` | a trainer named | in that trainer's **accept** queue |
| `ACCEPTED` | the trainer accepted | in the **complete** queue after it happens |
| `DONE` | completed | terminal — reschedule not offered |
| `RESCHEDULED` | moved in place | still active; can be rescheduled again |
| `DECLINED` | the trainer declined | terminal |
| `NOT_INTERESTED` / `CANCELLED` | ended | terminal |
| No permission | `can_take_action` false | the panel renders without actions |
| Imported event | `source: 'IMPORTED'` | tagged; convert or dismiss only |
| Kind changing | `kindChanged` | **a note explaining the consequence, before saving** |
| Google not connected | `/google/status/` | stated, with a link to Settings |
| Empty queue | nothing to do | an empty panel — the good outcome |

Statuses carry their **label and colour from the server** (`MatchupStatusMeta`), so `StatusBadge` renders
what the backend says rather than a client mapping.

## 4. Interaction rules

- **Reschedule through the dedicated flow, never the edit form.** The generic form's `PATCH` does not
  write an audit record and churns the Google event.
- **Gate reschedule on `canReschedule`.** One predicate, four terminal statuses excluded.
- **Warn before a kind change takes effect.** The two warnings state exactly what happens: removal from
  your calendar and a trainer request, or unassignment of a trainer who is then notified.
- **Require a trainee for a trainer request.** Enforced in the form and server-side.
- **Never treat an imported event as an appointment.** Branch on `source`.
- **Offer a follow-up on completion** — including rescheduling this one instead.
- **Link to Settings for the Google connection**; do not put connect/disconnect here. The orphaned
  `GoogleSyncCard` was deleted for this reason.

## 5. Responsive and print behaviour

`matchup-page.css` is 2,178 lines and carries the responsive work, including the month grid and the day
modal. Recent commits specifically reworked `MonthCalendar` for a day modal and better narrow-width
layout.

No print styles. Export is server-side instead, via `/appointments/export/`.

## 6. Accessibility

- The kind-change note uses `role="note"`, so it is announced rather than being a purely visual aside.
- Modals come from the shared `Modal`, so focus handling is inherited.
- Icons are `aria-hidden` beside real text.
- Status colour comes with a label, so colour is never the only signal.

Not covered: the month calendar is a grid built for a pointer, with no documented keyboard navigation
between days.

## 7. Styling and theming

**One stylesheet, `pages/matchup-page.css`, 2,178 lines — the largest in the app.** Classes are
`matchup-*` by convention.

Two things to know before editing it: it is **not** governed by a documented containment contract the way
`contests.css` and `gms.css` are, and it is imported by the page rather than being globally scoped, so its
reach in practice is wide but undeclared. Shrinking or documenting it is in
[PHASES.md §5](PHASES.md#5-outstanding).
