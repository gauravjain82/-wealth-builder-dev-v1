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

Two things sit on top of that. A host can **inherit** another host's training, for the whole series or
single dates, which publishes it to their own BaseShop without copying it. A host takes **attendance** by
posting one link in the meeting chat: whoever opens it while signed in is recorded, and the host watches
the list fill in live.

On top of attendance sits **tracking**: an *Attendance* tab that sorts every member of the host's
BaseShop into Stopped, Never attended, Slipping, On track or New, lists the ones who need attention
with the reason in words, and opens charts — a date's no-shows, a member's whole history — on demand.
Missing is counted in trainings, not days, so one rule fits a weekly and a fortnightly training.

Attendance does **not** write to the associate tracker yet. Whether `Training` and `Training date`
should follow training attendance, BPM check-in or both is open
([PHASES.md §5](PHASES.md#5-outstanding)).

Before this rebuild the page stored events in the browser's `localStorage`: nothing was shared, and a
"schedule" existed only on the device that typed it.

## 2. Scope

**In scope** — the week calendar; creating, editing and deleting trainings; inheriting; the attendance
link, its landing page and the live attendance list; the attendance metrics tab; the administrator's
settings.

**Out of scope**
- The associate tracker's `Training` and `Training date` columns — [team](../team/). This module does
  not write them (TS6 is deferred).
- BPM meetings and their check-in — [bpm](../bpm/). BPM maintains the tracker's `training_date`.
- Training content and XP — [training-center](../training-center/).
- Google Calendar sync — [calendar-sync](../calendar-sync/). Trainings are not a sync source.

## 3. At a glance

| | |
|---|---|
| Routes | 2 |
| Pages | 2 |
| Components | 15 (+ `fields.tsx`), 8 of them under `components/metrics/` |
| Hooks | 16 in one file |
| Services | 1 |
| Endpoints consumed | 16 |
| LOC (ts/tsx) | 3605 |

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
| **Expected date** | A date on a member's schedule that counts toward attendance, has ended, and fell after they joined. Every metric is counted against these. |
| **Status** | `stopped`, `never`, `slipping`, `on_track` or `new` — decided by the backend from the member's last *window* expected dates. |
| **Counts toward attendance** | Per-training flag. Off for optional sessions, which then never count as missed. |

## 5. Dependencies

**Upstream** — `@/shared/components` (`Button`, `Modal`, `ConfirmationDialog`, `TimezoneSelect`), the
toast store, React Query, `lucide-react`. No date library: zone maths is `Intl` only (`utils/time.ts`).

**Downstream** — `src/router/index.tsx` (two routes) and `src/config/menu.ts` (one entry, every plan).

**Backend** — the `training_schedule` app. It reads `authz` for BaseShop membership.

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
5. `components/metrics/attendance-dashboard.tsx` — the Attendance tab.
