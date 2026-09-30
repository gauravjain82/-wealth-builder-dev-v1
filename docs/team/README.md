# Team — Overview

| | |
|---|---|
| **Module** | `team` |
| **Source** | `src/features/team/` |
| **Routes** | 7 trackers under `/team/*`, `/onboarding-game`, `/team/builders/daily-six/:agencyCode` (public) |
| **Backend module** | `tracker`, `accounts`, `network` |
| **API prefix** | `/api/tracker/`, `/api/accounts/`, `/api/network/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Purpose

`team` is where a leader looks at their people. It is the **largest module in the app** — 22,818
lines, 64 files, nine sub-areas — because "how is my team doing?" is not one question. It is seven
different tables, each tracking a different stage of an agent's life:

| Tracker | Tracks |
|---|---|
| **Prospect** | People not yet recruited: calls, appointments, agency-code assignment |
| **Associate** | New agents through onboarding, including the Builder / Key Player flag |
| **Licensing** | Progress to a licence |
| **Production** | Policies written, points, gross and net |
| **Mission** | The 4x4 mission, its ring eligibility and proof |
| **Builders** | Builder activity and results, with a Daily Six submission |
| **Org chart** | The hierarchy itself, as a graph |

The unifying idea is the **tracker**: a table of people, one row each, with a shared vocabulary
of notes, a user-profile modal, a team-scope filter and a date range. Seven trackers share those
four things and differ in their columns. That sharing is what keeps 22,818 lines navigable, and it
is the first thing to understand before changing any of them.

If this module were removed, the data would remain in `tracker` and the hierarchy in `network`.
What would be lost is every operational view a leader uses daily — this is the module people
actually spend their day in.

## 2. Scope

**In scope**
- The seven trackers above, each with its own columns, filters, modals and service.
- Shared tracker furniture: notes, the user-profile modal, team-scope filter, user cells.
- Prospect management: add, call log, appointment linkage, production entry, agency codes.
- The Onboarding Game (routed at `/onboarding-game`, but living here).
- CSV import and export for production.
- The public Daily Six page for an agency code.

**Explicitly out of scope**
- **The builder engine.** `tracker/services/builder_results.py` owns targets and scoring;
  [builder-ai](../builder-ai/) presents them. This module owns the `is_key_player` flag, which is a
  tracker / org-chart marker and **not** builder enrolment (that module's decision B9).
- **Appointments.** `matchup` owns them; the prospect tracker links to them.
- **BPM guests.** `bpm` owns those; it searches prospects from here.
- **Leaderboards.** [leaderboards](../leaderboards/) is a separate reporting surface over
  `wbreporting`, not over these trackers.
- **Reader-facing production reporting.** `home` shows a performance table.

## 3. At a glance

| | |
|---|---|
| Routes | 8 + 1 public |
| Sub-areas | 9 (7 trackers + shared components + shared services) |
| Services | 11 |
| Endpoints consumed | 27 |
| LOC (ts/tsx) | 22,818 |
| Largest sub-area | `prospect` (5,703) then `production-tracker` (3,913) |
| Doc tier | Full |

### LOC by sub-area

| Sub-area | LOC | Files |
|---|---|---|
| `prospect` | 5,703 | 11 |
| `production-tracker` | 3,913 | 11 |
| `associate-tracker` | 2,359 | 5 |
| `org-chart` | 2,300 | 7 |
| `mission-tracker` | 2,131 | 5 |
| `builders` | 1,891 | 9 |
| `components` (shared) | 1,738 | 8 |
| `licensing-tracker` | 1,473 | 4 |
| `onboarding-game` | 858 | 3 |
| `services` (shared) | 452 | 3 |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Tracker** | A table of people at one stage, with shared notes / profile / scope furniture. |
| **Prospect** | Someone not yet an agent. Owned here. |
| **Associate** | A recruited agent working through onboarding. |
| **Agency code** | The identifier tying a person into every reporting table. Without one they contribute nothing. |
| **Team scope** | The filter selecting which slice of the downline a tracker shows. |
| **Segment** | A named subset of the team, with per-user visibility from `/api/accounts/users/segments/`. |
| **Builder / Key Player** | `AssociateTracker.is_key_player` — this module's builder: the Team → Builders roster and results leaderboard rank it (T9). It does not enrol anyone in [builder-ai](../builder-ai/), a separate product that reads an active `BuilderMembership` instead (its B9). |
| **Daily Six** | Six daily activities a builder submits. Also a public per-agency-code page. |
| **4x4 mission** | The mission tracked by the Mission Tracker. Its API key is literally `4X4`. |
| **Mission ring** | The award for completing the mission. Has eligibility rules and requires proof. |
| **Pace** | A builder's rate against plan. |
| **Split preset** | A saved policy-credit split configuration on Production. |
| **Projected scope** | A Production view counting expected rather than settled production. |

## 5. Dependencies

**Upstream**
- `src/shared/components/` — **`TrackerTable`**, `TrackerDateRangeFilter`, `DatePicker`,
  `Block`, `LoadingState`, `ErrorState`, the row-colour and QR modules.
- `@xyflow/react` + `dagre` — the org chart graph and its layout.
- `src/infrastructure/query` — `team-segment-service.ts` reaches for `queryClient` directly.

**Downstream**
- `src/features/admin/access-control` — imports `fetchLevels` from
  `team/prospect/services/prospect-service`. A cross-feature import into this module's internals.
- `src/features/bpm` — searches prospects.
- `src/features/home` — the performance table reads `tracker`.

**Backend** — `tracker` (85 call sites app-wide, most of them here), `accounts`, `network`.

## 6. Document map

| Document | Read it when |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Before touching any tracker. Explains the shared furniture and what is *not* shared. |
| [UI.md](UI.md) | Changing a tracker's columns, filters or modals. |
| [API.md](API.md) | The 27 endpoints, grouped by tracker. |
| [OPERATIONS.md](OPERATIONS.md) | Debugging scope, eligibility or an import. |
| [PHASES.md](PHASES.md) | Before changing eligibility or KPI arithmetic. Both were revised repeatedly. |

## 7. Where to start reading

1. `src/shared/components/tracker-table` — the table every tracker renders through. Not in this
   module, but the reason the seven are consistent.
2. `licensing-tracker/` — the smallest complete tracker at 1,473 lines. Read it as the pattern:
   a page, a columns file, a service, a modal.
3. `components/tracker-user-profile-modal.tsx` — the shared profile, and the one place three
   trackers' records are fetched together.
4. `prospect/services/prospect-service.ts` — the largest service, and the one other modules
   import from.
5. `production-tracker/production-columns.tsx` — 546+ lines of column definitions; the most
   complex table in the app.
