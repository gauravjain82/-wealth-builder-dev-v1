# Matchup — Operations

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

## 1. Environment and configuration

No module-specific `VITE_` variables. Configuration is backend state, and most of it is **served to the
client** rather than compiled in:

| Configured | Where | Effect |
|---|---|---|
| Appointment types | `matchup` reference data | the type picker (one per appointment) |
| Status labels and colours | `/appointments/statuses/` | `StatusBadge`. **A recolour needs no release** |
| Allowed transitions | `matchup/services/workflow.py` | what `canReschedule` mirrors |
| Google OAuth client, `FRONTEND_URL` | backend | the connection flow this module links to |
| Segments | `accounts` | trainer-search filtering |

## 2. Build and run

Standard ([platform OPERATIONS §2](../platform/OPERATIONS.md#2-build-and-run)). Two lazy chunks.

`matchup-page.css` is 2,178 lines and is imported by the page, so it loads with the route rather than
globally.

Locally you need appointments and at least two users to exercise the matching workflow — a requester and a
trainer. A single account can create `PERSONAL` appointments but cannot walk the assign/accept path.

## 3. Feature flags and rollout

**No flags and no capability guards.** Both routes sit under `ProtectedRoute` only.

Two server-side signals shape what a user can do:

| Signal | Effect |
|---|---|
| `can_view` | whether the action-required panel renders |
| `can_take_action` | whether its actions are offered |

Both arrive on the action-required payload, so the panel adapts without a separate permission call.

Trainer search is **company-wide by design** — an assigner may need somebody outside their own downline —
with segment filtering to narrow it.

## 4. Tests and checks

No frontend tests ([platform OPERATIONS §4](../platform/OPERATIONS.md#4-tests-and-checks)).
`npm run lint` reports nothing in this module. The backend suite covers the workflow and the Google
integration, including `matchup/tests/test_google_sync.py`.

Manual checks — the first two guard behaviours that were once broken:

1. **Reschedule writes history.** Reschedule an appointment, then open its details modal and confirm the
   entry appears. If the history is empty, the generic edit form was used instead of the dedicated
   endpoint — the exact regression decision M2 fixed.
2. **Reschedule is offered only where allowed.** Confirm the action is absent on `DONE`, `CANCELLED`,
   `DECLINED` and `NOT_INTERESTED`, in **all four** entry points: list row, details modal, day modal and
   the follow-up flow.
3. **Kind change warns first.** Flip `PERSONAL` → `REQUEST_TRAINER` and back, and confirm the note
   appears each time and describes the right consequence.
4. **Kind change actually reassigns.** After flipping to `PERSONAL`, confirm the previously assigned
   trainer is unassigned and notified.
5. **Full matching walk** with two accounts: request → assign → accept → complete, then check each
   appears in the right queue for the right person.
6. **Decline** puts the request back where an assigner can see it.
7. **Imported events** appear on the calendar, are tagged, and can be converted or dismissed — and
   **cannot** be edited as appointments.
8. **Trainer search** returns people outside your base shop, and the segment filter narrows it.
9. **Export** reflects the filters currently applied to the list.
10. **Status colours** match the backend's — change one server-side and confirm the badge follows with no
    deploy.

## 5. Deployment

Ships with any frontend deploy; `matchup` and `notifications` are in production and there is no coupled
branch.

Two cross-module notes:

- **This module owns the `/google/oauth/start/` alias** that [calendar-sync](../calendar-sync/) uses.
  Changing it breaks that module's connect flow, which has no other path in.
- **Imported events are fetched here** but owned by `calendar-sync`. A change to that contract lands in
  this module's hook.

## 6. Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| Rescheduling loses the history | the generic edit form was used | the reschedule modal must call the dedicated endpoint. **This is a known past regression** |
| A Google event was deleted and recreated on reschedule | same cause | the backend sends an *update* when the reschedule endpoint is used |
| Reschedule offered on a completed appointment | `canReschedule` bypassed | all four entry points must gate on it |
| A "Request Trainer" appointment never reaches the queue | its kind was flipped without the server acting | decision M3 — the form warns; confirm the backend applied the change |
| A "personal" appointment is on a trainer's calendar | the reverse flip left `assigned_to` stale | as above |
| The action panel is empty | nothing to do, **or** a key was absent from the response | the payload — the arrays are optional, so absent ≠ empty |
| No actions in the panel | `can_take_action` false | the same payload |
| An imported event behaves like an appointment | a consumer did not branch on `source` | `source: 'IMPORTED'` |
| An imported event overwrote an appointment in a list | id collision | ids are `-block_id`; a positive id means the mapping was bypassed |
| Imported events stale after changing settings | they are cached **here**, not in `calendar-sync` | reload via this hook; `calendarSyncKeys.root` will not do it |
| Status badge colour looks wrong | colours come from the server | `/appointments/statuses/` |
| A trainer cannot be found | search is company-wide but segment-filtered | clear the segment filter |
| Times are an hour out | timezone handling is centralised | `browserTimezone` / `formatAppointmentTime` in the service — do not reimplement locally |
| Google shows disconnected | managed in `calendar-sync` | `/settings#settings-calendar-sync`; this module only reports |
| Export missing rows | it uses the list's filters | narrow or clear the filters |
