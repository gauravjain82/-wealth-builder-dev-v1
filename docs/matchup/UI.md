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
| `/matchup/metrics` | `router/matchup-metrics-route.tsx` (`my-access` → `can_view`) | `MatchupMetricsPage` |

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

### 2.9 Appointment metrics — `metrics/pages/matchup-metrics-page.tsx`

Organisation → SMD → agent → prospect drill-down. Filters, section and drill position live in the URL.
This section covers the screen as of the phase 1–3 visual redesign and the weekly trend (2026-10-08,
PHASES M10–M14); the endpoints are in [API.md](API.md#metrics-endpoints--metricsservicesmetrics-servicets).

Above the prospect level, top to bottom:

| Block | Component | Shows |
|---|---|---|
| Hero band | `components/outcome-hero.tsx` | Show-rate half-ring gauge (the one hero figure); Booked → Showed up; FNA / AMA / Sales each as a share **of those who showed up**; one 100% bar of `summary.overall` with legend; referrals and new-recruit bookings |
| Needs attention | `components/attention-strip.tsx` | Form pending (`overall.result_pending`), no trainer / not accepted (trainer requests only), unlinked appointments. "See who" sorts the rows table by that column and scrolls to it. "All clear" when nothing is pending |
| Funnel | `components/funnel-strip.tsx` | The backend's leadership funnel, % of the first stage |
| By step | `components/step-bars.tsx` / `step-table.tsx` | Chart/Table toggle. Chart: one stacked bar per step, booked, show rate over past bookings; "Biggest leak" callout for the lowest show rate among steps with ≥ 5 past bookings (needs ≥ 2 such steps) |
| Rows | `components/rows-table.tsx` | Next level down; sort is owned by the page (`RowSort`) so the attention strip can set it; the sorted column is highlighted. Summary/Detailed toggle (Detailed adds the per-step counts, muted). SMD/agent rows: Booked with an inline data bar, a five-bar "shape" (booked → showed → FNA → AMA → sale as a share of booked), Show/FNA/AMA % with gold heat shading, Sales, problem counts with a coloured dot. Gold/silver/bronze rank on the top 3 AMA rates when there are more than 3 rows. Prospect rows: one dot per step coloured by its best outcome, the furthest step, and ticks for showed/FNA/AMA/sale |

**Previous-period comparison** (filter row: Compare = Previous period | Off; `?compare=off` in the URL). A
second report for the same level and filters over the equal-length window ending the day before `start`
(`previousWindow` in `hooks/use-matchup-metrics.ts`) drives `components/delta.tsx` badges in the hero:
show rate and the FNA / AMA / Sales shares in percentage points, Booked and Showed up as percent change.
The hero's meta line names the compared window, says "Loading comparison…" or "Too little data…" (baseline
under 5 booked), and adds a caveat when this window is ≥ 5 pts more upcoming / form-pending than the
baseline. Deltas are hidden while the main report shows placeholder data (M13).

**Weekly trend** (`components/sparkline.tsx`, series built in `components/trend-series.ts`). A third request,
`useMetricsTrend` (query key `['matchup-metrics', 'trend', smd, agent, {end, mode, segment, weeks}]`, no
`start`, no placeholder data, no retry), returns the last 12 ISO weeks ending with the week containing
`end`. Not requested at the prospect level. It draws:

- in the hero, a weekly **show rate** line under the gauge, a weekly **booked** count under Booked, and a
  weekly **AMA % of booked** line under the FNA / AMA / Sales branches (labelled as such — the branch
  figures above it are shares of those who showed up, M10), plus one key line in the hero meta;
- in the rows table (SMD and agent rows only), a non-sortable **Trend** column after Shape with each row's
  weekly show rate, joined on `kind` + `id`. A row the trend lacks gets an empty cell.

Encoding: one 2px line, round joins, no axes. The whole line is `--mm-muted`; segments between weeks that
overlap the selected dates are `--mm-bar` (gold). A rate week with nothing booked is a **gap**, never 0 (a
count week of 0 is a real 0). Weeks under `MIN_SAMPLE` booked are hollow points and are left out of the
y-range (a 1-of-3 week would flatten the rest), sitting on the edge if outside it. A segment into an
**unsettled** week — `(upcoming + result_pending) / total ≥ 0.2`, summary series only since rows carry no
such counts — or into the in-progress (`partial`) week is dashed and lighter. The last point is an 8px end
marker with a 2px surface ring, hollow when its week is partial or small. Rates use the data's own range
widened to at least 10 points; counts start at 0. Hover snaps to the nearest week across the full height
(a hairline and a ringed marker) and shows a fixed-position `.mm-tip` with the week dates, the value, the
counts ("48 of 71 showed") and "Week in progress" / "Still settling" / "Too few booked" notes. Each SVG has
`role="img"` and an `aria-label` with first → last value and the high and low weeks. While the trend
loads, or when the main report is showing placeholder data, nothing is drawn; a 404 (`null`) or an error
draws nothing and shows no banner, so the page looks as it did before the trend existed (M14). At phone
width the hero lines fit their column and the table's Trend column scrolls with the table.

Rows with fewer than 5 booked (`MIN_SAMPLE`) get no heat or rank, render their rates muted and italic, and
sort last on any rate column (M12).

At the prospect level, `components/prospect-journey.tsx` shows a summary card (a step track with one node
per step, coloured and iconed by its best outcome across all the prospect's appointments, the attempt
count and a gold connector up to the furthest step; then FNA / AMA / Sale / 2nd appt / BPM chips and
referrals) above a vertical timeline of every appointment. Appointments outside the selected dates are
faded, not hidden. Each timeline card is a button that opens the appointment details modal.

Outcome colours are fixed CSS tokens (`--mm-o-*`), separately stepped for dark mode and validated together
for colour-blind separation. Amber (form pending) is below 3:1 on white, so every bar carries a legend,
a hover tooltip, an `aria-label` with the counts, and a table view. Counters and bar growth animate on
load and are disabled under `prefers-reduced-motion`.

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
