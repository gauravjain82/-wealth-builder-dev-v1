# Team — Architecture

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

## 1. Layering

Nine sub-areas, each a small feature. The layering is per sub-area, not per module:

| Sub-area | Shape |
|---|---|
| `prospect` | pages, components ×6, service, columns, utils, types |
| `production-tracker` | pages, components ×6, service, columns, constants, csv |
| `associate-tracker` | pages, components, service, columns |
| `licensing-tracker` | pages, components, service, columns |
| `mission-tracker` | pages, components, service, columns |
| `org-chart` | pages, components, service |
| `builders` | pages, components, service |
| `onboarding-game` | pages, service |
| `components/` + `services/` | **the shared furniture** — no pages |

**A recurring file that is not in the standard shape: `*-columns.tsx`.** Each tracker declares its
`TrackerTableColumn<T>[]` in a dedicated file rather than in the page. That is what keeps a
3,900-line tracker readable: the page owns state and the columns file owns presentation.

**No React Query.** Like `bpm`, this module loads with `useEffect` + `useState` per page. The one
exception is `services/team-segment-service.ts`, which imports `queryClient` from
`@/infrastructure/query` directly to cache the segment summary — a single React Query cache entry
reached from outside a hook.

## 2. Component map

```
/team ── redirect ──> /team/prospect-tracker

/team/prospect-tracker   ProspectTrackerPage    ─┐
/team/associate-tracker  AssociateTrackerPage    │  each: page + *-columns.tsx
/team/licensing-tracker  LicensingTrackerPage    │        + service + modals
/team/production-tracker ProductionTrackerPage   ├── all render through
/team/mission-tracker    MissionTrackerPage      │    shared/components/tracker-table
/team/builders           BuildersPage            │
/team/org-chart          OrgChartPage           ─┘    (except org-chart: @xyflow/react)

/onboarding-game                 OnboardingGamePage
/team/builders/daily-six/:code   public, no session

        shared furniture — team/components/ + team/services/
        ├── tracker-user-profile-modal    the person, across three trackers
        ├── tracker-notes-cell / -modal   notes, per tracker
        ├── tracker-team-scope-filter     which slice of the downline
        ├── tracker-user-cell             the person cell
        ├── tracker-progress-modal        progress detail
        ├── associate-hot-recruits-modal
        ├── user-details-link
        ├── tracker-notes-service
        ├── tracker-user-profile-service
        └── team-segment-service
```

### What is shared, and what is not

Shared: the table (`shared/components/tracker-table`), the date filter, notes, the profile modal,
the scope filter, the user cell.

**Not shared: the services.** Eleven services, one per sub-area plus three shared ones, each
re-declaring `API_BASE_URL` and its auth headers. Seven trackers hitting the same `tracker` app
through seven clients is the app-wide duplication described in
[platform §8](../platform/ARCHITECTURE.md#8-invariants-and-failure-modes), at its most
concentrated.

## 3. Primary flows

### 3.1 Opening a tracker

1. The page loads its records with `useEffect`, passing the current team scope and date range.
2. It builds columns from its `*-columns.tsx`, handing in action callbacks.
3. `TrackerTable` renders rows; `tracker-user-cell` renders the person.
4. A click on the person opens the shared profile modal.

### 3.2 The shared user-profile modal

`services/tracker-user-profile-service.ts:219` fetches **three trackers at once** for one user:

```
Promise.all([
  /api/tracker/trackers/4X4/<id>/        mission
  /api/tracker/trackers/associate/<id>/  associate
  /api/tracker/trackers/licensing/<id>/  licensing
])
```

Each is fetched "optionally" — a missing record is not an error, because a person legitimately has
no licensing row before they start licensing. This is why one modal can show a whole person from any
tracker.

**Saving sends only what changed.** `buildUpdatePayload()` diffs the form against the form as
last loaded (`loadedForm`) and PATCHes only the edited fields; `profile` is sent whole when any of
its fields changed, because the backend writes it as one record. Sending every field used to
re-assert values nobody touched: a modal left open while someone else changed the recruiter, or
while the backend recalculated the leader, wrote the old values back. After the save the modal shows
the server's recruiter and leader, not the form's — a recruiter change can make the backend clear or
move the leader, and the form's value hid that.

**Change history.** `components/user-change-history.tsx` sits under the Tracker Summary and reads
`hooks/use-user-history.ts` (React Query, key `['team', 'user-history', userId]`, `signal`
forwarded). It lists who changed the person's fields and roles, including the system's own changes
and their reason. The backend gates it on `audit_log:read`; the panel renders nothing on a 403. A
save invalidates the key.

**A quirk worth naming.** The mission tracker's API key is the literal string `4X4`, and this file
assembles it as `['4', 'X4'].join('')` (`:6`) while `mission-tracker-service.ts` writes `4X4`
inline (`:85`). There is no functional difference; the two spellings mean a search for `4X4` misses
one of the two call sites.

### 3.3 Team scope and segments

1. `tracker-team-scope-filter` chooses which slice of the downline to show.
2. `team-segment-service.ts` fetches `/api/accounts/users/segments/`, which reports
   `accessible_segments` and per-segment visibility.
3. It caches that in the React Query client directly, rather than through a hook, so every
   tracker sees one answer without a provider.

### 3.4 The Builder / Key Player checkbox

The Associate Tracker's **Builder** checkbox sets `AssociateTracker.is_key_player`. It **used to
be** [builder-ai](../builder-ai/)'s enrolment signal and is not any more: that module's decision B9
made an active `BuilderMembership` the sole definition of a builder, and `builderai` reads
`is_key_player` nowhere.

What the flag means now is **this module's own definition of a builder** — the Team → Builders
roster (`builders-page.tsx`, `is_key_player: 'true'`) and, since 2026-09-30, the results leaderboard
both rank it (T9). It is not [builder-ai](../builder-ai/) membership: treat any new code that
reads it as `BuilderMembership`, or that makes one set the other, as a bug. The two products are
separate.

### 3.5 Production import

`production-import-modal` accepts a CSV, parsed by `production-csv.ts`, and posts to the
production endpoints. Export uses the same module in reverse.

## 4. Server state and caching

| State | Mechanism |
|---|---|
| Every tracker's records | `useEffect` + `useState`, per page |
| Notes | per-tracker service call on open |
| Profile snapshots | three parallel fetches on modal open |
| Profile change history | **React Query**, `['team', 'user-history', userId]`, invalidated by the modal's save |
| Segment summary | **React Query**, via `queryClient` reached directly from a service |
| Levels, brokers, org-chart root | per-service fetches |

The consequences: no cache between trackers, so moving from Associate to Licensing refetches; no
request cancellation; and a mutation refreshes only what its own page reloads. Same trade-off as
`bpm`, and recorded in [PHASES.md §5](PHASES.md#5-outstanding) rather than presented as a pattern.

## 5. Local and URL state

| State | Owner | Lives in |
|---|---|---|
| Tracker | the URL | the route |
| `agencyCode` | the URL | the public Daily Six route |
| Team scope, date range, filters, sort, pagination | each page | `useState` |
| Modal open + target | each page | `useState` |
| CSV staging | `production-import-modal` | `useState` |

No tracker syncs its filters to the query string, so a filtered view cannot be shared by link.

## 6. Permissions and gating

**None of the seven trackers has a route guard.** All sit under `ProtectedRoute` only, so any
authenticated user reaches them, and what they see is decided server-side by team scope and
segment visibility.

| Mechanism | Effect |
|---|---|
| Team scope | which slice of the downline the request returns |
| Segment visibility | `accessible_segments` limits which segments a user may select |
| Backend row filtering | a leader sees their own downline and no one else's |

This is a different model from the capability gating elsewhere in the app
([platform §6](../platform/ARCHITECTURE.md#6-permissions-and-scoping)): there is no
`team:read` permission, because everyone has a team. Visibility is **data scope**, not feature
access. The Daily Six page is public by design so a code can be shared.

## 7. Integration points

- **`tracker`** — the main backend app. Most of the app's 85 `tracker` call sites are here.
- **`accounts`** — levels, brokers, segments, invitations, the org-chart root.
- **`network`** — `/api/network/hierarchy/my_links/` for the hierarchy.
- **[builder-ai](../builder-ai/)** — shares `tracker`'s builder engine, but **not** this module's
  `is_key_player` flag (its B9).
- **`matchup`** — appointments are linked from the prospect tracker.
- **`bpm`** — searches prospects owned here.
- **`admin`** — imports `fetchLevels` from `prospect/services/prospect-service`, reaching into
  this module's internals. See §8.
- **`@xyflow/react` + `dagre`** — the org chart is the only graph UI in the app.

## 8. Invariants and failure modes

| Invariant | Enforced by | Breaks as |
|---|---|---|
| A tracker shows only the viewer's scope | backend row filtering | a leader seeing another organisation's people |
| A missing tracker record is not an error | `fetchOptionalTrackerJson` | a profile modal that fails for anyone not yet licensing |
| Columns live outside the page | `*-columns.tsx` per tracker | a 4,000-line page file |
| Every tracker renders through one table | `shared/components/tracker-table` | seven tables that behave differently |
| `is_key_player` is this module's builder, not BuilderAI enrolment | `builderai` reads it nowhere (its B9); the tracker results leaderboard reads it and not `BuilderMembership` (T9) | one checkbox here silently changing another module's dashboards, or a BuilderAI invite changing this module's leaderboard |
| An agency code is required to appear in reporting | backend | someone who works and shows nothing |

**The cross-feature import, from the other side.** `admin/access-control/pages/level-permissions-page`
imports `fetchLevels` from `team/prospect/services/prospect-service`. `team` has no `index.ts` and
no public surface, so that import reaches straight into a sub-area's service. Renaming or moving
`fetchLevels` breaks an access-control screen with no signal. Levels are reference data and belong
in a shared service.

**Eligibility and KPI arithmetic is the module's soft spot.** Mission-ring eligibility was revised
three times (2026-09-02, 09-15, 09-18) and Production's KPI cards twice in the same period, once
specifically to separate gross from net. Neither has tests here. If you change either, the number
on screen is the only feedback you get — check it against the backend rather than against the
previous render.

**No guard means no obvious signal when scope is wrong.** Because visibility is data scope rather
than a gate, a scope bug does not produce an error; it produces a table with the wrong rows in it.
That is harder to notice than a 403.
