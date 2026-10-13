# Training Schedule — Overview

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

> **Not live.** This is the backend-backed rebuild on `feature/training-schedule`, which has a
> counterpart branch of the same name in `mlm_platform`. They must merge and deploy together, and
> `migrate training_schedule` must run first — see [OPERATIONS.md §5](OPERATIONS.md#5-deployment).
> What is in production today is the previous, browser-only page ([PHASES.md §2](PHASES.md#2-phases)).

## 1. Purpose

The training schedule is where a BaseShop finds its trainings. A **host** — an SMD or above — creates a
training, usually a recurring one, and everyone in that host's BaseShop sees it on a week calendar in
their own time zone, with the meeting link.

Three things sit on top of that. A host can **inherit** another host's training, for the whole series or
single dates, which publishes it to their own BaseShop without copying it. A host takes **attendance** by
posting one link in the meeting chat: whoever opens it while signed in is recorded, and the host watches
the list fill in live. And attending writes to the **associate tracker** — it ticks `Training` and moves
`Training date` forward — so the tracker no longer depends on someone ticking boxes after the call.

Before this rebuild the page stored events in the browser's `localStorage`: nothing was shared, and a
"schedule" existed only on the device that typed it.

## 2. Scope

**In scope** — the week calendar; creating, editing and deleting trainings; inheriting; the attendance
link, its landing page and the live attendance list; the administrator's settings.

**Out of scope**
- The tracker columns themselves — [team](../team/) (`/team/associate-tracker`) shows `Training` and
  `Training date`; this module only causes the backend to write them.
- BPM meetings and their check-in — [bpm](../bpm/). BPM writes the same `training_date` column.
- Training content and XP — [training-center](../training-center/).
- Google Calendar sync — [calendar-sync](../calendar-sync/). Trainings are not a sync source.

## 3. At a glance

| | |
|---|---|
| Routes | 2 |
| Pages | 2 |
| Components | 7 (+ `fields.tsx`) |
| Hooks | 13 in one file |
| Services | 1 |
| Endpoints consumed | 13 |
| LOC (ts/tsx) | 2239 |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Host** | A member at or above the hosting level (SMD unless an administrator changes it). Hosts create and inherit. |
| **Training** | A series: title, time, zone, link, recurrence. Owned by one host. |
| **Occurrence** / **date** | One date of a training. The calendar, deletion, inheritance and attendance all work per date. |
| **BaseShop** | A host's downline up to, and not including, the next SMD. The backend's single definition is used. |
| **Inherit** | Publish another host's training (or one date) to your own BaseShop. A reference, never a copy. |
| **Attendance link** | `/training-schedule/attend/<token>` — one per training, valid for every date of it. |
| **Relation** | How a date reached the viewer: `own`, `inherited`, `baseshop` or `admin`. |

## 5. Dependencies

**Upstream** — `@/shared/components` (`Button`, `Modal`, `ConfirmationDialog`, `TimezoneSelect`), the
toast store, React Query, `lucide-react`. No date library: zone maths is `Intl` only (`utils/time.ts`).

**Downstream** — `src/router/index.tsx` (two routes) and `src/config/menu.ts` (one entry, every plan).

**Backend** — the `training_schedule` app. It reads `authz` for BaseShop membership and writes
`tracker.AssociateTracker`.

## 6. Document map

| File | Answers |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Layering, flows, query keys, the invariants |
| [UI.md](UI.md) | Routes, screens, states, time-zone display rules |
| [API.md](API.md) | The 13 endpoints and their error codes |
| [OPERATIONS.md](OPERATIONS.md) | Deploy order, the admin grant, troubleshooting |
| [PHASES.md](PHASES.md) | History and the decision log — read before changing a behaviour |

## 7. Where to start reading

1. `types/index.ts` — the wire contract, especially `ScheduleOccurrence`.
2. `pages/training-schedule-page.tsx` — the page and which dialog opens when.
3. `hooks/use-training-schedule.ts` — every query key and what each write invalidates.
4. `pages/training-attendance-page.tsx` — the attendance link's landing page.
