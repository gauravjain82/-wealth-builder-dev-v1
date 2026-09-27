# Team — API

| | |
|---|---|
| **Module** | `team` |
| **Source** | `src/features/team/*/services/`, `src/features/team/services/` |
| **Routes** | 7 trackers, `/onboarding-game`, 1 public |
| **Backend module** | `tracker`, `accounts`, `network` |
| **API prefix** | `/api/tracker/`, `/api/accounts/`, `/api/network/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Endpoints **consumed**, not exposed.

## 1. Conventions

Platform conventions ([platform API §1](../platform/API.md#1-conventions)), with the app's heaviest
duplication: **eleven services**, each re-declaring `API_BASE_URL` and its auth headers. Seven
trackers reach the same `tracker` app through seven clients.

One exception: `services/team-segment-service.ts` imports `queryClient` from
`@/infrastructure/query` and writes the segment summary into the React Query cache directly, from
outside any hook. It is the only place in the app that does this.

Tracker detail endpoints are fetched **optionally** —
`fetchOptionalTrackerJson` treats a missing record as `null` rather than an error, because a person
legitimately has no licensing row before they start licensing.

## 2. Endpoints consumed

27 endpoints across three apps.

### `tracker` — the trackers themselves

| Method | Path | Sub-area |
|---|---|---|
| GET | `/api/tracker/trackers/` | tracker listing |
| GET | `/api/tracker/trackers/associate/` and `/associate/<id>/` | associate |
| POST | `/api/tracker/trackers/associate/reset-training/` | associate |
| POST | `/api/tracker/trackers/associate/reset-big-event/` | associate |
| GET | `/api/tracker/trackers/licensing/` and `/licensing/<id>/` | licensing |
| GET | `/api/tracker/trackers/4X4/<id>/` | **mission** — the key is the literal `4X4` |
| GET · POST | `/api/tracker/trackers/4X4/<id>/mission-ring-proof/` | mission proof |
| GET | `/api/tracker/trackers/videos/` | tracker videos |

### `tracker` — production

| Method | Path |
|---|---|
| GET · POST | `/api/tracker/production/` |
| GET · POST | `/api/tracker/policies/` |
| GET | `/api/tracker/policies/points_summary/` |
| GET | `/api/tracker/policies/production_summary/` |
| GET | `/api/tracker/policies/top_performers/` |
| GET | `/api/tracker/policies/split_presets/` |
| GET | `/api/tracker/company-products/` |
| GET · POST | `/api/tracker/notes/` |

### `tracker` — builders

| Method | Path |
|---|---|
| GET | `/api/tracker/builders/daily-six/` |
| GET | `/api/tracker/builders/enrollment/` |
| GET | `/api/tracker/builders/paces/` |
| GET | `/api/tracker/builders/leaderboard/activity/` |
| GET | `/api/tracker/builders/leaderboard/results/` |

### `accounts`

| Method | Path | Used for |
|---|---|---|
| GET | `/api/accounts/users/` | people |
| GET | `/api/accounts/users/brokers/` | broker list |
| GET | `/api/accounts/users/segments/` | **segment visibility** — `accessible_segments` |
| GET | `/api/accounts/users/org-chart/root/` | the chart's root |
| GET | `/api/accounts/levels/` | levels. **Also imported by `admin`** |
| GET · POST | `/api/accounts/invitations/` | invitations |

### `network`

| Method | Path | Used for |
|---|---|---|
| GET | `/api/network/hierarchy/my_links/` | the hierarchy edges for the org chart |

Note `/api/trackers/videos/` also appears in the source alongside
`/api/tracker/trackers/videos/` — the app's only **`/api/trackers/`** (plural) path, and worth
confirming against the backend before relying on it.

## 3. Payload types

Declared per sub-area — there is no shared team type module. The record types are the ones other
files import:

| Type | Where |
|---|---|
| `AssociateTrackerRecord` | `associate-tracker/services/associate-tracker-service.ts` |
| `LicensingTrackerRecord` | `licensing-tracker/services/licensing-tracker-service.ts` |
| `MissionTrackerRecord` | `mission-tracker/services/mission-tracker-service.ts` |
| `ProductionTrackerRecord` | `production-tracker/services/production-tracker-service.ts` |
| `TrackerNote` | `services/tracker-notes-service.ts` |
| `TrackerUserProfile`, `TrackerProfileSnapshots` | `services/tracker-user-profile-service.ts` |
| `TeamSegmentSummaryResponse` | `services/team-segment-service.ts` |
| `Level` | `prospect/services/prospect-service.ts` — **imported by `admin`** |
| prospect types | `prospect/types.ts` |

`tracker-user-profile-service.ts` imports three record types from three sibling sub-areas to build
`TrackerProfileSnapshots`, which is what lets one modal show a whole person.

## 4. Query parameters

No shared convention; each tracker sends what its toolbar offers.

| Parameter group | Notes |
|---|---|
| Team scope | which slice of the downline |
| Segment | constrained by `accessible_segments` |
| Date range | `from_date` / `to_date`, via `TrackerDateRangeFilter` |
| Projected scope | Production only — a different view, not a filter |
| Sort, page, page_size | per tracker |
| `blob_name` | mission-ring proof, URI-encoded |

**The Associate Tracker has a known date-range bug**: the range is not threaded into its filters
object the way the other trackers do it. The same issue was fixed in `bpm`'s Associate Invites and
deliberately **left standing here** — see [bpm API §4](../bpm/API.md#4-query-parameters).

## 5. Error codes and handling

No typed error classes. Failures surface through each page's `ErrorState`.

| Situation | Status | Client behaviour |
|---|---|---|
| Out of scope | 200 with fewer rows, or 403 | usually just fewer rows — **silent** |
| No tracker record for a person | 404 | treated as `null`, not an error |
| Segment not accessible | 403 | the selector should not have offered it |
| CSV import rejected | 4xx | surfaced in the import modal |
| Mission proof upload rejected | 4xx | surfaced on the modal |
| Ineligible for the ring | 200 | a verdict with a reason, not an error |

The first row is the characteristic one: scope problems present as **wrong data**, not as failures.

## 6. Backend ownership

`tracker`, `accounts` and `network` own, and the client must not recompute:

- **Row scope.** Which people a viewer may see, per tracker. This is the security boundary — there
  is no client guard.
- **Segment visibility.** `accessible_segments` decides what may be selected.
- **Mission-ring eligibility**, including its reason. Revised three times; always a server answer.
- **Production arithmetic** — points, gross, net, projected scope, split presets. Gross and net are
  separate figures and the server distinguishes them.
- **Builder targets, paces and results** — `tracker/services/builder_results.py`, shared with
  [builder-ai](../builder-ai/).
- **The hierarchy.** `network` owns the edges; the client only lays them out.
- **Agency-code validity** and its reporting consequences.

The client owns the seven column sets, the toolbars, CSV parsing, and the org chart's layout.
