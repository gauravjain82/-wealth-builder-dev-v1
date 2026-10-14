# Training Schedule — API

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

## 1. Conventions

Base `${VITE_API_BASE_URL}/api/training-schedule/`, `Authorization: Token <wb.authToken>`, trailing
slashes required, snake_case JSON. Instants are UTC ISO strings.

Failures use one envelope, parsed into `TrainingScheduleError { status, code, detail }`
(`services/training-schedule-service.ts`):

```json
{"error": {"code": "attendance_not_open", "message": "…", "detail": {}}}
```

## 2. Endpoints consumed

| Method | Path | Service function | Who |
|---|---|---|---|
| GET | `my-access/` | `fetchMyAccess` | anyone signed in |
| GET | `occurrences/?start=&end=[&scope=all]` | `fetchOccurrences` | anyone; `scope=all` honoured for admins only |
| POST | `trainings/` | `createTraining` | hosts |
| PATCH | `trainings/<id>/` | `updateTraining` | owner, admin |
| GET | `trainings/<id>/delete-preview/[?occurrence_id=]` | `fetchDeletePreview` | owner, admin |
| POST | `trainings/<id>/delete/` | `deleteTraining` | owner, admin |
| POST | `trainings/<id>/inherit/` | `inheritTraining` | hosts, not the owner |
| POST | `trainings/<id>/uninherit/` | `uninheritTraining` | the inheritor |
| GET | `hosts/[?q=]` | `fetchHosts` | hosts; admins (to pick an SMD) |
| GET | `hosts/<id>/trainings/` | `fetchHostTrainings` | hosts |
| GET | `occurrences/<id>/attendance/` | `fetchAttendance` | owner, admin, inheritor of that date |
| POST | `attend/<token>/` | `attend` | anyone signed in |
| GET | `metrics/?weeks=4\|8\|12[&host=]` | `fetchMetrics` | hosts (own BaseShop); admins (any, `host` required) |
| GET | `metrics/members/<id>/[?host=]` | `fetchMemberMetrics` | same |
| GET | `metrics/occurrences/<id>/[?host=]` | `fetchOccurrenceMetrics` | same |
| GET, PATCH | `admin/settings/` | `fetchSettings`, `saveSettings` | admin |

## 3. Payload types

All in `types/index.ts`. The ones worth knowing:

- **`ScheduleOccurrence`** — one date as the viewer sees it. `relation`, `via` and `my_inheritance` say
  how it reached them. `attendance_count`, `attendance_token` and `inheritors` are **absent** unless the
  viewer may see them.
- **`TrainingTarget`** — `{trainingId, occurrenceId?}`. Absent `occurrenceId` means the series. Sent as
  `{scope: "series"}` or `{scope: "occurrence", occurrence_id}`.
- **`DeletePreview`** — `occurrence_count` must be echoed back as `expected_occurrence_count`.
- **`HostTraining`** — deliberately has no `meeting_url`.
- **`AttendanceMetrics`** — `rules` (the thresholds in force), `summary` (tiles, `status_counts`,
  `series` per date) and `members`, already sorted most urgent first.
- **`MemberMetrics.recent`** — the last `rules.window` expected dates, oldest first; the dots.
- **`MemberDetail.timeline`** — every expected date in the last year with `rolling_rate` and
  `baseshop_rate`; the chart.
- **`counts_toward_attendance`** — on `ScheduleOccurrence`, `TrainingInput` and `TrainingPatch`.

## 4. Query parameters

| Endpoint | Parameter | Notes |
|---|---|---|
| `occurrences/` | `start`, `end` | ISO instants; the span may not exceed 62 days |
| `occurrences/` | `scope=all` | Every training. Silently ignored for a non-admin |
| `hosts/` | `q` | Under two characters lists the upline; otherwise searches every host by name, username or agency code |
| `delete-preview/` | `occurrence_id` | One date instead of the series |
| `metrics/` | `weeks` | 4, 8 or 12; anything else is `invalid_period` |
| `metrics/*` | `host` | Whose BaseShop. Omit for your own; an admin who is not a host must send it |

## 5. Error codes and handling

| Code | Status | Where it surfaces |
|---|---|---|
| `not_authenticated` | 401 | Not handled specially — see [ARCHITECTURE §8](ARCHITECTURE.md#8-invariants-and-failure-modes) |
| `not_a_host` | 403 | Toast or form notice. Should not occur: the controls are hidden |
| `not_your_training` | 403 | Toast |
| `forbidden` | 403 | Attendance list notice |
| `invalid_training` | 400 | Form notice; `detail.field` names the field |
| `invalid_range`, `invalid_settings` | 400 | Notice / toast |
| `own_training` | 400 | Toast |
| `training_not_found`, `occurrence_not_found`, `host_not_found` | 404 | Toast / notice |
| `attendance_link_not_found` | 404 | Landing page: *This link isn't valid* |
| `attendance_not_open` | 409 | Landing page: next date from `detail` |
| `delete_blocked_inherited`, `delete_blocked_completed` | 409 | Normally seen first as `blocked_reason` in the preview |
| `delete_preview_stale` | 409 | Toast; the dialog reloads the preview |
| `host_required` | 400 | Admin on the Attendance tab before picking an SMD — the UI does not send the request then |
| `invalid_period` | 400 | Not reachable from the UI |
| `member_not_found` | 404 | Member detail notice |
| `network` | 0 | Synthesised by the service when `fetch` rejects |

## 6. Backend ownership

Everything here is served by the `training_schedule` app in `mlm_platform`; its rules — who is in a
BaseShop, when attendance is open, what a delete reaches — are documented in
`mlm_platform/docs/training_schedule/` and tested in `training_schedule/tests/`.
