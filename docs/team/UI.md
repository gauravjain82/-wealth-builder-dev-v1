# Team — UI

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

## 1. Routes and entry points

| Route | Guard | Component |
|---|---|---|
| `/team` | `ProtectedRoute` | `<Navigate to="/team/prospect-tracker">` |
| `/team/prospect-tracker` | `ProtectedRoute` | `ProspectTrackerPage` |
| `/team/associate-tracker` | `ProtectedRoute` | `AssociateTrackerPage` |
| `/team/licensing-tracker` | `ProtectedRoute` | `LicensingTrackerPage` |
| `/team/production-tracker` | `ProtectedRoute` | `ProductionTrackerPage` |
| `/team/mission-tracker` | `ProtectedRoute` | `MissionTrackerPage` |
| `/team/builders` | `ProtectedRoute` | `BuildersPage` |
| `/team/org-chart` | `ProtectedRoute` | `OrgChartPage` |
| `/onboarding-game` | `ProtectedRoute` | `OnboardingGamePage` |
| `/team/builders/daily-six/:agencyCode` | **none — public** | the Daily Six page |

**No tracker has a capability guard.** Every authenticated user reaches all seven; what they see is
decided by team scope and segment visibility server-side. `/onboarding-game` lives in this
directory but is routed at the top level.

## 2. Screens

All seven trackers share the same anatomy: a toolbar (team scope + date range + filters), a
`TrackerTable`, a notes cell, and a person cell that opens the shared profile modal. What differs
is the columns.

### 2.1 Prospect tracker — `prospect/` (5,703 LOC)

The largest sub-area, because a prospect has the most done *to* them before they exist as an agent.

| Modal | Purpose |
|---|---|
| `add-prospect-modal` | create a prospect. The recruiter field auto-populates from the current user |
| `call-log-modal` | record contact attempts |
| `add-agency-code-modal` | assign the agency code — with phone-number validation |
| `add-production-modal` | enter production against them |
| `prospect-details-modal` | **read-only** person view. Promoted to a shared component and reused by `bpm` |
| `prospect-tracker-list-modal` | list drill-down |

`prospect-details-modal` being read-only is deliberate: `tracker-user-profile-modal` is editable and
can terminate a user, which is the wrong tool to hand a BPM greeter (BPM decision D4).

### 2.2 Production tracker — `production-tracker/` (3,913 LOC)

The most complex table in the app: `production-columns.tsx` is over 546 lines of column
definitions.

| Element | Note |
|---|---|
| `production-kpi-card` | summary cards, showing **gross and net separately** |
| `production-tracker-toolbar` | filters, date range, projected-scope switch |
| `production-import-modal` | CSV import, parsed by `production-csv.ts` |
| `top-producers-modal` | ranking |
| `policy-notes-cell`, `policy-attachments-action` | per-policy notes and files |
| Split presets | saved policy-credit split configurations |

**Projected scope** is a distinct view counting expected rather than settled production. It is a
different question from the default, not a filter on it.

### 2.3 Associate tracker — `associate-tracker/` (2,359 LOC)

New agents through onboarding, with reset actions for training and the big event. Carries the
**Builder / Key Player checkbox** (`is_key_player`), which is a **tracker / org-chart flag and no
longer builder enrolment** — see [builder-ai](../builder-ai/PHASES.md#3-decision-log) decision B9.
Also `associate-hot-recruits-modal`.

### 2.4 Org chart — `org-chart/` (2,300 LOC)

The only graph UI in the app: `@xyflow/react` with `dagre` for layout, over
`/api/accounts/users/org-chart/root/` and `/api/network/hierarchy/my_links/`. It does not use
`TrackerTable` — it is not a table.

### 2.5 Mission tracker — `mission-tracker/` (2,131 LOC)

The 4x4 mission, its ring eligibility, and proof attachments. Ring size fields live on the profile
form. Eligibility is computed server-side and has been revised three times; the screen displays the
verdict rather than deriving it.

### 2.6 Builders — `builders/` (1,891 LOC)

Builder activity, results and paces, with a Daily Six submission page. The public
`/team/builders/daily-six/:agencyCode` view shares this area.

### 2.7 Licensing tracker — `licensing-tracker/` (1,473 LOC)

The smallest complete tracker, and therefore **the one to read first**: a page, a columns file, a
service, a modal, and nothing else.

### 2.8 Onboarding game — `onboarding-game/` (858 LOC)

A gamified onboarding path. Routed at `/onboarding-game`.

## 3. States

| State | Trigger | What the user sees |
|---|---|---|
| Loading | a tracker fetching | `LoadingState` from shared components |
| Error | a failed fetch | `ErrorState` |
| Empty | no rows in scope | an empty table. Normal for a new leader |
| No record | a person with no row in one tracker | the profile modal renders the others; not an error |
| Scope-limited | a restricted segment | fewer rows, **with no message** — see §4 |
| Saving | a mutation | disabled controls |
| Eligible / not eligible | mission ring | the server's verdict, with its reason |
| Projected | Production's projected scope | different numbers from the default view |
| Import preview | CSV chosen | parsed rows before commit |

## 4. Interaction rules

- **Columns are declared outside the page.** A new column goes in `*-columns.tsx`, not in JSX.
- **Never derive eligibility or a KPI in the client.** Mission-ring eligibility and Production's
  gross/net are server answers. Both have been corrected repeatedly, and a client re-derivation
  would be a second thing to correct.
- **The read-only prospect modal is for other modules; the editable profile modal is for this
  one.** The editable one can terminate a user.
- **Gross and net are separate numbers.** They were once conflated on the KPI cards; do not
  re-merge them.
- **A missing tracker record is a normal state**, not an error to surface.
- **Scope changes are silent.** A restricted view simply has fewer rows. There is no "you are
  seeing a subset" notice, which means a scope bug looks like a data problem.

## 5. Responsive and print behaviour

Tailwind utilities; the trackers rely on `TrackerTable`'s own responsive behaviour. These are wide
tables meant for a desktop — Production with its 546 lines of columns is unusable on a phone, and
the org chart needs a pointer to pan and zoom (`react-zoom-pan-pinch` supports touch, but the graph
is dense).

No print styles. Production exports CSV instead, which is the right answer for a table this wide.

## 6. Accessibility

Shared primitives and `TrackerTable` supply the baseline. Three real gaps in the largest module in
the app:

- **The org chart has no non-visual equivalent.** A hierarchy rendered only as a graph is
  unavailable to a screen reader, and the hierarchy is the one piece of information here with an
  obvious textual form — a nested list.
- **Silent scope limiting** gives no announcement that a view is partial.
- **No systematic audit** has been made across 64 files.

## 7. Styling and theming

No module stylesheet; Tailwind plus shared components throughout. Row colouring is available via
`shared/components/row-colors` but **no tracker emits condition keys yet** — the engine is shared
and BPM is currently its only consumer. Adopting it here is one of the outstanding items in
[bpm PHASES §4](../bpm/PHASES.md#4-deliberately-not-built).
