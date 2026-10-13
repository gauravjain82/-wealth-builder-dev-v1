# Training Schedule — Architecture

| | |
|---|---|
| **Module** | `training-schedule` |
| **Source** | `src/features/training-schedule/` |
| **Routes** | `/training-schedule`, `/training-schedule/attend/:token` |
| **Backend module** | `training_schedule` → `mlm_platform/docs/training_schedule/` |
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
hooks/            use-training-schedule.ts
services/         training-schedule-service.ts
types/ · utils/   wire types · Intl time helpers
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
| `SettingsModal` | The administrator's rules. |

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

Every `queryFn` forwards `signal`. Every write invalidates `['training-schedule']`; a delete does so
`onSettled`, because a 409 also means the cache is out of date. Saving settings additionally invalidates
access, since the hosting level may have moved.

## 5. Local and URL state

The week, the admin's "All trainings" toggle and which dialog is open are component state on the page.
Nothing is in the URL except the attendance token. Open dialogs hold an occurrence **id** and read the
row back from the query, so a dialog follows a refetch.

The old `localStorage` key `wb_training_schedule_events` is no longer read or written. It is not deleted.

## 6. Permissions and gating

There is no route guard beyond `ProtectedRoute` and no capability gate: every signed-in user has a
schedule. `my-access` decides which **controls** render — `can_host` shows *New training* and *Inherit a
training*; `can_manage_all` shows *All trainings* and *Settings*. Per-date controls follow the row's own
`can_manage`, `can_view_attendance` and `my_inheritance`.

All of that is presentation. The backend re-derives hosting from the member's level and administration
from `training_schedule:manage` on every request.

## 7. Integration points

- **Associate tracker** — attending makes the backend set `is_training` and `training_date`; the tracker
  page picks them up on its next fetch. This module does not invalidate the tracker's queries.
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
