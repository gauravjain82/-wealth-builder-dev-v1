# Training Schedule — Architecture

| | |
|---|---|
| **Module** | `training-schedule` |
| **Source** | `src/features/training-schedule/` |
| **Routes** | `/training-schedule`, `/training-schedule/attend/:token` |
| **Backend module** | `training_schedule` → `wealth-builder-dev-v1-backend/docs/training_schedule/` |
| **API prefix** | `/api/training-schedule/` |
| **Status** | Merged-not-deployed |
| **Doc version** | 2.0 |
| **Verified against** | commit `7b487dc` plus the uncommitted rebuild on `feature/training-schedule` — 2026-10-14 |

## 1. Layering

Page/component → hook → service → API, with no exceptions. Components never call `fetch`; hooks never
build a URL. The attendance landing page records attendance through `useAttend`, not by calling the
service — unlike the older `events` self-check-in page it is modelled on.

```
pages/            training-schedule-page · training-attendance-page
components/       week-grid · occurrence-modal · training-form-modal · delete-training-dialog
                  attendance-modal · inherit-modal · settings-modal · fields
components/metrics/  attendance-dashboard · member-table · member-detail-modal
                  occurrence-detail-modal · training-trend-chart · member-rate-chart
                  status (chips, dots) · chart-tooltip
hooks/            use-training-schedule.ts
services/         training-schedule-service.ts
types/ · utils/   wire types · Intl time helpers · status labels and reason sentences
training-schedule.css   chart colour tokens only, scoped to `.wb-ts-viz`
```

## 2. Component map

| Component | Role |
|---|---|
| `WeekGrid` | Seven day columns in the viewer's zone; one card per date; flags other-zone trainings. |
| `OccurrenceModal` | Details of one date and every action on it, chosen by `can_manage` / `my_inheritance`. |
| `TrainingFormModal` | Create, or edit the fields an edit may change. |
| `DeleteTrainingDialog` | Fetches the delete preview and confirms against it. |
| `AttendanceModal` / `AttendanceLink` | The live list and the copyable link. |
| `InheritModal` | Host picker (upline, or search) → that host's trainings → whole series or single dates. |
| `SettingsModal` | The administrator's rules, including the attendance thresholds. |
| `AttendanceDashboard` | The Attendance tab: period, tiles, needs-attention list, chart, table; an admin's SMD picker. |
| `MemberTable` | Everyone, filterable by status, sortable, searchable; cards below `md`. |
| `TrainingTrendChart` | Attendance rate per training date (one series); click a bar for that date. Has a table view. |
| `MemberDetailModal` / `MemberRateChart` | One member: numbers, every expected date, rolling rate against the BaseShop's. |
| `OccurrenceDetailModal` | One date: who was expected and missed, and who came. |

## 3. Primary flows

**Viewing.** The page asks for `[weekStart, weekStart + 7 days)` as UTC instants computed from the
viewer's local midnight. The backend decides visibility; the page draws what it is given.

**Taking attendance.** The host copies the link from `OccurrenceModal` or `AttendanceModal` and posts it
in the meeting. A member who opens it hits `/training-schedule/attend/:token`, which is inside
`ProtectedRoute`: signed out, they are sent to `/login` with the location in router state and returned
afterwards (`src/router/protected-route.tsx:21`, `src/features/auth/components/login-page.tsx:25`). The
page then POSTs once and shows the result. The host's `AttendanceModal` polls every 5 s.

**Deleting.** `OccurrenceModal` hands a `TrainingTarget` (series, or one date) to
`DeleteTrainingDialog`. The dialog loads the preview, shows what would go, and sends the delete with the
`occurrence_count` the host saw. If the schedule changed in between, the backend answers 409 and the
dialog reloads the preview instead of deleting something the host did not confirm.

**Inheriting.** `InheritModal` toggles are single POSTs; each invalidates the module, so the calendar
behind the modal and the checkbox state both come back from the server.

**Tracking attendance.** The Attendance tab makes one request, `metrics/`, which returns the tiles,
the chart series and every member row with its status; the backend computes all of it in one pass.
Statuses and thresholds are never computed here — the page only words them (`utils/metrics.ts`).
Clicking a member or a bar fetches that detail separately. A host on the Schedule tab also gets the
4-week `metrics/` call for the banner, which the Attendance tab then reuses from the cache.

## 4. Server state and caching

Keys live in `scheduleKeys` (`hooks/use-training-schedule.ts`).

| Key | Stale time | Notes |
|---|---|---|
| `['training-schedule-access']` | 5 min | Outside the module root: no schedule write changes it. |
| `['training-schedule-access', 'settings']` | default | Admin only; fetched when the modal opens. |
| `['training-schedule', 'occurrences', {start, end, everything}]` | 60 s | The full selection is in the key. |
| `['training-schedule', 'delete-preview', trainingId, occurrenceId]` | 0, `gcTime` 0 | Never reused: the dialog must show the current picture. |
| `['training-schedule', 'hosts', query]` | 30 s | `query` is `''` below two characters. |
| `['training-schedule', 'host-trainings', hostId]` | default | |
| `['training-schedule', 'attendance', occurrenceId]` | 0 | `refetchInterval` 5 s, paused in a background tab. |
| `['training-schedule', 'metrics', hostId, weeks]` | 2 min | `hostId` null is the caller's own BaseShop. |
| `['training-schedule', 'metrics-member', hostId, memberId]` | default | |
| `['training-schedule', 'metrics-occurrence', hostId, occurrenceId]` | default | |

Every `queryFn` forwards `signal`. Every write invalidates `['training-schedule']`; a delete does so
`onSettled`, because a 409 also means the cache is out of date. Saving settings additionally invalidates
access, since the hosting level may have moved.

## 5. Local and URL state

The week, the admin's "All trainings" toggle and which dialog is open are component state on the page.
The tab is in the URL (`?view=attendance`), so the banner and a bookmark can open it; the period, the
status filter and an admin's chosen SMD are component state. Open dialogs hold an occurrence **id** and read the
row back from the query, so a dialog follows a refetch.

The old `localStorage` key `wb_training_schedule_events` is no longer read or written. It is not deleted.

## 6. Permissions and gating

There is no route guard beyond `ProtectedRoute` and no capability gate: every signed-in user has a
schedule. `my-access` decides which **controls** render — `can_host` shows *New training*, *Inherit a
training*, the Attendance tab and the banner; `can_manage_all` shows *All trainings*, *Settings*, and
the Attendance tab with an SMD picker. Per-date controls follow the row's own
`can_manage`, `can_view_attendance` and `my_inheritance`.

All of that is presentation. The backend re-derives hosting from the member's level and administration
from `training_schedule:manage` on every request.

## 7. Integration points

- **Associate tracker** — none for now. Attendance is not written to the tracker (TS6, deferred).
- **Login** — the return to the attendance link relies on router `state.from`. Opening `/login` in a new
  tab loses it ([platform OPERATIONS §6](../platform/OPERATIONS.md)).

## 8. Invariants and failure modes

- **The grid is always in the viewer's zone.** A training's own zone is shown *beside* the converted time
  when the two clocks differ, compared by UTC offset at that instant, not by zone name.
- **A key the viewer may not see is absent.** `attendance_count`, `attendance_token` and `inheritors` are
  missing, not null, for viewers without the right.
- **An inheritor never deletes.** They withdraw their inheritance; the owner's training is untouched.
- **A delete is confirmed against a preview**, and a stale confirmation deletes nothing.
- **The attendance page posts exactly once per mount** (`started` ref) — Strict Mode double-mounts in
  development. A repeat is harmless anyway: the backend answers `already_recorded`.
- **Not handled:** a revoked token on the attendance page shows the generic error panel rather than
  redirecting to login — there is no central 401 handler in this app.
