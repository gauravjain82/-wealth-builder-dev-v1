# Team — Operations

| | |
|---|---|
| **Module** | `team` |
| **Source** | `src/features/team/` |
| **Routes** | 7 trackers, `/onboarding-game`, 1 public |
| **Backend module** | `tracker`, `accounts`, `network` |
| **API prefix** | three |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Environment and configuration

No module-specific `VITE_` variables. Everything that shapes these screens is backend state:

| Configured | Where | Effect |
|---|---|---|
| Team scope and segment visibility | `accounts` | which rows a viewer sees |
| Builder targets (5 / 20,000 / 1 / 3) | `tracker/services/builder_results.py` | the Builders tracker and [builder-ai](../builder-ai/) |
| Mission-ring eligibility rules | `tracker` | the Mission Tracker's verdict |
| Split presets | `tracker` | Production's credit splits |
| Company products | `tracker` | Production's product picker |
| Levels | `accounts` | the Associate Tracker, and `admin`'s level permissions |

## 2. Build and run

Standard ([platform OPERATIONS §2](../platform/OPERATIONS.md#2-build-and-run)). Nine lazy chunks.

Two heavy dependencies land in this module's chunks: `@xyflow/react` + `dagre` for the org chart,
and the CSV handling for Production. The org chart chunk is the largest in the module — check it
stays in its own chunk and does not get pulled into a shared vendor bundle.

**You need a populated downline to see anything.** There are no fixtures. A fresh account renders
seven empty tables, which is correct behaviour and unhelpful for development.

## 3. Feature flags and rollout

**No flags and no capability gates.** All seven trackers sit under `ProtectedRoute` only.

This is deliberate and different from the rest of the app: there is no `team:read` permission
because everyone has a team. Access is **data scope**, not feature access — the backend returns the
viewer's downline and nothing else. See
[ARCHITECTURE.md §6](ARCHITECTURE.md#6-permissions-and-gating).

The Daily Six page is intentionally public so an agency code can be shared.

## 4. Tests and checks

No frontend tests ([platform OPERATIONS §4](../platform/OPERATIONS.md#4-tests-and-checks)).

`npm run lint` reports **5 of the repo's 7 errors in this module**, all pre-existing:

| File | Line | Rule |
|---|---|---|
| `associate-tracker/pages/associate-tracker-page.tsx` | 590 | `no-unsafe-finally` |
| `licensing-tracker/pages/licensing-tracker-page.tsx` | 386 | `no-unsafe-finally` |
| `production-tracker/pages/production-tracker-page.tsx` | 881 | `no-unsafe-finally` |
| `production-tracker/pages/production-tracker-page.tsx` | 948 | `no-constant-condition` |
| `mission-tracker/mission-tracker-columns.tsx` | 130 | `no-constant-condition` |

Fixing them takes the whole repository from 7 errors to 2.

This is the largest module with the least verification, so the manual list matters:

1. **Scope** — as a leader, confirm the table holds your downline and nobody else's. A scope bug
   shows as *wrong rows*, not an error.
2. **Segment** — select each accessible segment; confirm an inaccessible one is not offered.
3. **Profile modal for a partial person** — open someone with no licensing record. The modal should
   render the other two trackers, not fail.
4. **Gross vs net** on Production's KPI cards. They are separate figures and were once conflated.
5. **Projected scope** — confirm it changes the numbers, and that it reads as a different view
   rather than a filter.
6. **Mission-ring eligibility** — check the verdict and its reason against the backend, not against
   the previous render. This logic was revised three times.
7. **CSV round trip** — export, then re-import the same file.
8. **Builder checkbox** — set `is_key_player` and confirm the associate does **not** become a
   builder in [builder-ai](../builder-ai/). The two were decoupled (B9), and this check is what
   catches a regression that re-welds them.
9. **Org chart** — pan, zoom, and confirm the layout resolves for a deep downline.
10. **Date range on the Associate Tracker** — known not to thread through its filters the way the
    others do.

## 5. Deployment

Ships with any frontend deploy; all three backend apps are in production. No coupled branch.

One cross-module note: this module writes `is_key_player`, which **used to be**
[builder-ai](../builder-ai/)'s enrolment signal and is not any more (its decision B9). The flag is
now a tracker / org-chart concept only, and `builderai` reads it nowhere. Do not reintroduce a
dependency on it.

## 6. Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| A tracker shows the wrong people | team scope or segment | the request's scope parameters. **Scope problems look like data problems, not errors** |
| Fewer rows than expected, no message | scope limiting is silent | expected. There is no "partial view" notice |
| A segment is missing from the selector | not in `accessible_segments` | `/api/accounts/users/segments/` |
| The profile modal fails for one person | a tracker record is missing and was not fetched optionally | `fetchOptionalTrackerJson` — a missing record must be `null`, not an error |
| Searching `4X4` misses a call site | one file assembles the key as `['4','X4'].join('')` | `services/tracker-user-profile-service.ts:6` vs `mission-tracker-service.ts:85` |
| Gross and net look identical | they were once conflated on the KPI cards | they are separate server figures |
| Production totals differ from expectation | projected scope may be on | the toolbar's projected switch |
| Mission ring says ineligible | server-side rules, revised three times | the verdict's reason; do not re-derive in the client |
| A builder does not appear in Builder AI | `is_key_player` not set, or no agency code | the Associate Tracker toggle, then the code |
| Someone produces but shows nothing in reporting | no agency code | assign it — `admin`'s invite-agents or the prospect modal |
| Org chart blank or unlaid-out | `dagre` layout failed, or the root did not resolve | `/api/accounts/users/org-chart/root/` and `/api/network/hierarchy/my_links/` |
| Date range ignored on Associate Tracker | it is not threaded into the filters object | known, and deliberately left standing — `bpm` fixed the same bug in its Associate Invites |
| CSV import rejects everything | delimiter or column mismatch | `production-csv.ts`; export a file first and compare |
| `admin`'s Level Permissions is empty | it imports `fetchLevels` from this module's prospect service | a refactor here breaks that screen silently |
| Moving between trackers refetches everything | there is no shared cache | expected — this module does not use React Query |
