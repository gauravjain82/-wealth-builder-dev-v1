# Matchup — Overview

| | |
|---|---|
| **Module** | `matchup` |
| **Source** | `src/features/matchup/` |
| **Routes** | `/matchup`, `/calendar` |
| **Backend module** | `matchup` → `mlm_platform/docs/matchup/` |
| **API prefix** | `/api/matchup/`, `/api/notifications/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Purpose

Matchup is appointment scheduling, and specifically the **matching** part: an agent needs a trainer for
a one-on-one, and somebody has to assign one. It owns two kinds of appointment that share a table and
diverge in lifecycle:

- **`REQUEST_TRAINER`** — the agent asks; an assigner names a trainer; the trainer accepts; it happens;
  it gets completed with an outcome.
- **`PERSONAL`** — the agent's own appointment, on their own calendar, with no matching step.

The distinction is the module's organising idea, and it is why an eight-value status enum exists. A
personal appointment skips most of it; a trainer request walks the whole thing.

The module also owns `/calendar` — the personal month calendar — which is where [calendar-sync](../calendar-sync/)'s
**imported** external Google events surface alongside real appointments.

## 2. Scope

**In scope**
- Appointment CRUD, for both kinds, with types, location, contact and trainee.
- The matching workflow: request → assign → accept → done, plus decline and not-interested.
- **Reschedule as a first-class operation** — moving an appointment in place, with an audit record.
- Completion, with an outcome and an optional follow-up appointment.
- The action-required panel: what *this* user must assign, accept or complete.
- Trainer search, company-wide, with segment filtering.
- The month calendar, including imported Google events.
- Metrics cards and export.
- In-app notifications (unread count, mark read).

**Explicitly out of scope**
- **The Google connection itself.** [calendar-sync](../calendar-sync/) owns connecting, per-source
  toggles and sync. This module reads `/google/status/` to report it and links away to manage it.
- **Calendar writes to Google.** The backend does that on appointment changes.
- **BPM guests.** `bpm` hands a guest across by creating an appointment here.
- **Prospects.** `team` owns them.

## 3. At a glance

| | |
|---|---|
| Routes | 2 |
| Pages | 2 |
| Components | 12 |
| Hooks | 1 |
| Services | 2 |
| Endpoints consumed | 14 (11 `matchup`, 3 `notifications`) |
| LOC (ts/tsx) | 4,563 |
| CSS | 2,178 lines — **the largest module stylesheet in the app** |
| Doc tier | Full |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Kind** | `REQUEST_TRAINER` or `PERSONAL`. Determines the whole lifecycle. |
| **Status** | One of eight: `REQUESTED`, `ASSIGNED`, `ACCEPTED`, `DONE`, `RESCHEDULED`, `NOT_INTERESTED`, `CANCELLED`, `DECLINED`. |
| **Contact** | The person the appointment is with. |
| **Trainee** | On a trainer request, who is being trained. Required for `REQUEST_TRAINER`. |
| **Trainer** | Who was assigned to run it. |
| **Assigner** | Whoever may assign a trainer to a request. |
| **Action required** | The three queues for the current user: assign, accept, complete. |
| **Appointment type** | A catalogued tag (`AppointmentType`) — several may apply to one appointment. |
| **Result** | The recorded outcome on completion. |
| **Reschedule** | Moving an appointment **in place**, with an `AppointmentReschedule` audit row. Not cancel-and-recreate. |
| **Imported event** | An external Google event from `calendar-sync`, shown on the calendar with a **negative id**. |
| **Terminal status** | `DONE`, `CANCELLED`, `DECLINED`, `NOT_INTERESTED` — cannot be rescheduled. |

## 5. Dependencies

**Upstream**
- `src/shared/components/ui/` — `Button`, `Input`, `Modal`, `Select`, `Textarea`.
- **`src/features/calendar-sync/`** — `calendarSyncService` and `ImportedEvent`, imported directly.
- `lucide-react` — icons.

**Downstream**
- `src/features/bpm/` — reads `/google/status/` and reschedules a guest into an appointment.
- `src/features/calendar-sync/` — uses this module's `/google/oauth/start/` alias.

**Backend** — `matchup` (11 endpoints) and `notifications` (3).

## 6. Document map

| Document | Read it when |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Before changing the workflow. Holds the kind/status model and the imported-event trick. |
| [UI.md](UI.md) | Changing the dashboard, the calendar or a modal. |
| [API.md](API.md) | The 14 endpoints and the payload shapes. |
| [OPERATIONS.md](OPERATIONS.md) | Google status, a stuck appointment, or export. |
| [PHASES.md](PHASES.md) | **Before touching reschedule or the kind dropdown.** Both were silently broken and deliberately fixed; the reasoning is what stops a regression. |

## 7. Where to start reading

1. `types.ts` — 297 lines. `AppointmentKind` and `AppointmentStatus` at the top are the whole domain.
2. `components/reschedule-appointment-modal.tsx:8` — the allowed transitions, named against the
   backend's own table, and `canReschedule` as the single predicate every entry point shares.
3. `hooks/use-matchup-dashboard.ts:16` — how an imported Google event is mapped onto a calendar item,
   and why its id is negative.
4. `components/appointment-form-modal.tsx:417` — the kind-change warning, and what it prevents.
5. `pages/matchup-page.tsx` — the dashboard, at 894 lines the largest surface.
