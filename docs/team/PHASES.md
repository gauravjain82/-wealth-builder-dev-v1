# Team — Phase History

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

> Phases marked `~` are reconstructed from `git log -- src/features/team`. **There was no plan for
> this module.** It is the oldest and largest in the app, present from the first commit and
> extended continuously for six months. The `T` decision prefix is assigned by this document.
>
> Unlike the 2026 packages, nothing here was designed as a phase. These are the boundaries visible
> in 96 commits.

## 1. Timeline

96 commits, 2026-03-24 to 2026-09-24 — more than a third of the repository's history.

| Phase | Date | Status | Shipped |
|---|---|---|---|
| ~0 | 2026-03-24 | Shipped | Initial structure |
| ~1 | 2026-04-02 → 04-28 | Shipped | Prospect integration, trackers API, org chart, onboarding game |
| ~2 | 2026-05 → 06 | Shipped | Production tracker, notes, feedback rounds, light-theme fixes |
| ~3 | 2026-07-03 → 07-24 | Shipped | Builders page, Daily Six submission, key-player handling, licensing filters |
| ~4 | 2026-08-18 → 08-29 | Shipped | Segment filtering; Production filters and query parameters reworked |
| ~5 | 2026-09-02 → 09-18 | Shipped | Mission ring: proof, eligibility (×3), ring sizes. Production: projected scope, gross/net, date ranges |
| ~6 | 2026-09-22 | Shipped | Agency-code handling and validation |

## 2. Phases

### ~1 — the trackers arrive (2026-04)

**What shipped.** Prospect integration, the trackers API integration, the org chart and the
onboarding game — all within five weeks of the first commit.

**Decisions.** T1, T2.

**What set the pattern.** The shared `TrackerTable` and the per-tracker `*-columns.tsx` split date
from here. It is the reason seven trackers totalling 22,818 lines are navigable.

### ~2 — production and notes (2026-05 → 2026-06)

**What shipped.** The production tracker; tracker notes as a shared concern; agent filters; the
ability to add production from the Mission Tracker.

**Decisions.** T3.

### ~3 — builders (2026-07)

**What shipped.** The Builders page over three commits on 2026-07-03, a Daily Six submission page,
key-player handling, and licensing-tracker filters. Appointments began to be attached to the
prospect page.

**Note.** This is the origin of the `is_key_player` flag. [builder-ai](../builder-ai/) later adopted
it as its sole enrolment mechanism and then **decoupled from it** (its decision B9), so the flag
ended up back where it started: a tracker / org-chart marker.

### ~4 — segments and Production's filters (2026-08)

**What shipped.** Segment filtering across trackers and appointment services; a rework of
Production's filters and query parameters; the recruiter field auto-populating in
`AddProspectModal`.

**Decisions.** T4.

### ~5 — mission ring and Production's numbers (2026-09)

The busiest month, and the one that produced this module's two soft spots.

**Mission ring**, four commits: proof attachment management with an eligibility check (09-02), ring
size fields on the profile form (09-04), then eligibility logic revised on **09-15** and again on
**09-18**.

**Production**, four commits: projected-scope handling (09-15), date-range filtering (09-15),
gross and net separated on the KPI cards (09-16), then a data-accuracy fix and a KPI layout fix
(09-18).

**Decisions.** T5, T6.

**What this phase should tell a reader.** Two pieces of arithmetic — ring eligibility and
production totals — were each corrected two or three times within three weeks, with no tests in
this repo. Both are server-computed, which is the only reason the corrections were containable. Any
change to either should be checked against the backend rather than against what the screen
previously showed.

### ~6 — agency codes (2026-09-22)

**What shipped.** Agency-code handling and validation in the modals, following phone-number
validation added on 09-16.

**Why it matters.** An agency code is what ties a person into every reporting table. Someone
without one works and shows nothing — they are counted only as `uncoded_member_count` in
[leaderboards](../leaderboards/README.md#4-domain-vocabulary).

## 3. Decision log

| ID | Decision | Rationale | Source |
|---|---|---|---|
| T1 | One shared `TrackerTable`, with per-tracker column files | Seven tables that behaved differently would be seven things to fix. Putting columns in `*-columns.tsx` keeps a 3,900-line tracker's page readable | `shared/components/tracker-table`; every `*-columns.tsx` |
| T2 | No capability gate on any tracker; access is **data scope** | Everyone has a team, so a `team:read` permission would be granted to everyone and mean nothing. The backend returns the viewer's downline. Cost: a scope bug shows as wrong rows rather than a 403 | `router/index.tsx` — no guard on any `/team/*` route |
| T3 | Notes are a shared cross-tracker concern | The same person is annotated from several trackers, and the note belongs to the person, not the table | `services/tracker-notes-service.ts`; `components/tracker-notes-*` |
| T4 | Segment visibility comes from the server, cached once | `accessible_segments` decides what may be selected, so the selector cannot offer something the API will refuse. Cached in the React Query client directly so every tracker agrees without a provider | `services/team-segment-service.ts` |
| T5 | Mission-ring eligibility is computed server-side, and displayed with its reason | It was revised three times in sixteen days. A client re-derivation would have been a second thing to correct each time, and the two would have disagreed in between | commits 2026-09-02, 09-15, 09-18 |
| T6 | Gross and net are separate figures on Production | They were conflated, and a single "production" number is ambiguous once chargebacks exist. Separating them makes the KPI cards answerable | commit 2026-09-16 "Enhance Production KPI Card and Tracker with Gross/Net Values" |
| T7 | The read-only prospect modal is the one other modules get | `tracker-user-profile-modal` is editable and can terminate a user — not something to hand a BPM greeter. `prospect-details-modal` was promoted to shared instead | `prospect/components/prospect-details-modal.tsx`; `BPM_V2_PLAN.md` D4 |
| T8 | The Daily Six page is public | A builder's daily activity is shared by agency code, so it must render without a session | `router/index.tsx:214` |
| **T9** | **Team → Builders and [builder-ai](../builder-ai/) are separate products.** Here a builder is `AssociateTracker.is_key_player`; the results leaderboard (`/api/tracker/builders/leaderboard/results/`) ranks key players, not active `BuilderMembership` rows (2026-09-30) | The page already listed its roster by `is_key_player` (`builders-page.tsx:22`), but since backend `b269a89` its results leaderboard read BuilderAI enrolment — so key players never invited into BuilderAI (a 100-score and an 89-score builder in Sept 2026) were missing from it. Chosen over enrolling them in BuilderAI and over ranking the union. BuilderAI's Bulletin is unchanged. Cost: BuilderAI members who are not key players are no longer on this board, and the same person can now be on one product's lists and not the other's | User decision, 2026-09-30; backend `mlm_platform` tracker T20 / builderai B13 |

## 4. Deliberately not built

- **A capability gate on the trackers.** T2.
- **A client-side eligibility or KPI calculation.** T5, T6.
- **Row colouring.** The engine is shared (`shared/components/row-colors`) and no tracker emits
  condition keys. Adopting it is listed as outstanding in
  [bpm PHASES §4](../bpm/PHASES.md#4-deliberately-not-built).
- **A shared team type module or public `index.ts`.** Types live per sub-area, which is why `admin`
  imports straight into `prospect/services/`.
- **Filters in the URL.** No tracker syncs its filter state, so a filtered view cannot be shared.
- **A textual org chart.** The hierarchy exists only as a graph.
- **Print styles for Production.** CSV export is the answer for a table that wide.

## 5. Outstanding

Ordered by value. The first three are the ones that would most reduce risk in the app's largest
module.

1. **Fix the five lint errors here.** Three `no-unsafe-finally` (associate, licensing and
   production tracker pages) and two `no-constant-condition` (`mission-tracker-columns.tsx`, the
   production page). They are 5 of the repo's 7 errors, so fixing them takes the whole repository
   from 7 to 2 — and `no-unsafe-finally` is not cosmetic: a `return` inside `finally` discards a
   thrown error, so in a tracker it can turn a failed save into a silent success. Exact lines in
   [OPERATIONS.md §4](OPERATIONS.md#4-tests-and-checks).
2. **Fix the Associate Tracker's date range.** It does not thread into the filters object the way
   the other trackers do. `bpm` fixed the identical bug in its Associate Invites and this one was
   knowingly left.
3. **Give `team` a public surface.** There is no `index.ts`, so `admin` imports `fetchLevels`
   directly from `prospect/services/prospect-service`. Levels are reference data and belong in a
   shared service or `core/`; until then, a refactor here silently breaks an access-control screen.
4. **Unify the eleven services.** This module is where the app's missing HTTP client costs the
   most — seven trackers, one backend app, seven clients. The natural first step is one
   `tracker-client` shared by the seven tracker services.
5. **Normalise the `4X4` key.** One file assembles it as `['4','X4'].join('')` and another writes
   it inline, so a search for the mission tracker's key finds only one of them.
6. **Confirm `/api/trackers/videos/`.** The plural path appears alongside
   `/api/tracker/trackers/videos/` and is the only `/api/trackers/` in the app.
7. **Consider React Query.** Same trade-off as [bpm](../bpm/PHASES.md#5-outstanding), and the same
   caution: nine pages is not a single migration.
8. **A textual org chart view.** The hierarchy is the one thing here with an obvious accessible
   form.
