# Builder AI — Architecture

| | |
|---|---|
| **Module** | `builder-ai` |
| **Source** | `src/features/builder-ai/` |
| **Routes** | 7 under `/builder-ai/*` + 1 public |
| **Backend module** | `builderai` |
| **API prefix** | `/api/builderai/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Layering

Standard ([platform §1](../platform/ARCHITECTURE.md#1-layering)), with one deviation: **there is
no `types/` directory.** The wire types are declared in `services/builder-ai-service.ts`
alongside the fetchers (`:9-140`).

| Layer | File | Owns |
|---|---|---|
| Service + types | `services/builder-ai-service.ts` | 7 fetchers and every dashboard type |
| Service | `services/builder-ai-invitations-service.ts` | the invitation surface |
| Hooks | `hooks/use-builder-ai.ts`, `use-builder-ai-invitations.ts` | 7 queries, 6 mutations |
| Pages | `pages/` (6) | one per route |
| Components | `components/` (5) | header, metric card, roster, dashboard, segment toggle |

The invitation half has its own service, hooks and key factory
(`builderInvitationKeys`) — it is a different domain from the dashboards and shares no cache
with them.

## 2. Component map

```
/builder-ai/* ── BuilderAiRoute (can_view from /my-access/)
  ├── /home         HomePage        SegmentToggle · MetricGoalCard ×4 · size bar
  ├── /company      CompanyPage     SegmentDashboard · RosterList (owner rows)
  ├── /company/:ownerId             one owner drilled into
  ├── /baseshop     BaseshopPage    SegmentDashboard · RosterList (builder rows)
  ├── /reporting    ReportingPage   recharts daily line chart
  ├── /bulletin     BulletinPage    searchable ranking
  └── /invitations  InvitationsPage seats · inbox · outbox

/team/builders/daily-six/:agencyCode ── public, no session
```

| Component | Role |
|---|---|
| `builder-page-header.tsx` | shared header with the date range |
| `segment-toggle.tsx` | `company` ⇄ `baseshop` |
| `metric-goal-card.tsx` | one metric: current, goal, progress |
| `segment-dashboard.tsx` | the card row plus progress visualisation |
| `roster-list.tsx` | the member rows, with photos and per-row progress |

`RosterList` renders both builder rows and owner rows from the same payload shape. That is
deliberate — the backend keeps the shapes identical so the frontend needed no change when the
Company definition was rewritten — and it is also why the page reads "N builders in scope" on a
screen whose rows are owners. See §8.

## 3. Primary flows

### 3.1 Reading a dashboard

1. `BuilderAiRoute` calls `useBuilderMyAccess()`; renders nothing until it resolves.
2. The page picks a segment (`company` or `baseshop`) and an optional date range.
3. The matching hook fetches, keyed on `['builder-ai', <surface>, segment, startDate, endDate]`.
4. The payload carries cards, rows and goals **already computed**. The client renders; it
   calculates no goal and no progress.

### 3.2 The Company scope

Company is not "the whole builder downline" — it was redefined on 2026-09-08 to mean the
viewer's **directly-sponsored company owners** (SMD and above), each row rolled up over that
owner's whole downline.

The consequence that matters, and the reason two bugs were fixed here:

- **Cards measure the whole company**: `goal = (builders in the company) × individual target`,
  scaled by months. `current` is the sum of those builders' materialised aggregates.
- **Rows are the direct SMD legs**, and each row's goal is
  `(builders in that SMD's downline) × individual target`, scaled by months.

Using the owner-leg count for the card goal made the target far too small — 19 SMDs × 5 recruits
= 95, against a company of hundreds of builders. Using it for a row goal had the same shape of
error one level down. A leg with zero builders falls back to one plan, to avoid dividing by zero.

**Reporting and Bulletin were deliberately left on the whole-downline definition.** Only Home's
company card, the Company page and the roster endpoint branch.

### 3.3 Invitations

1. `useBuilderSeats()` reports the cap and what is used.
2. `useBuilderInvitations(box, segment)` lists the inbox or outbox.
3. Send, accept, decline, cancel, self-add and remove are six mutations, **each invalidating
   `builderInvitationKeys.root`** — the whole invitation tree, because any of them can change
   both a list and the seat count.

## 4. Server state and caching

React Query throughout. Keys are `['builder-ai', <surface>, segment, …range]`, where `rangeKey`
normalises an absent range to two empty strings (`hooks/use-builder-ai.ts:19`) so a missing range
and an explicitly empty one share a cache entry.

| Hook | Key | staleTime |
|---|---|---|
| `useBuilderMyAccess` | `[…, 'my-access']` | **5 min** — the guard blocks on it |
| `useBuilderHome` | `[…, 'home', segment, …range]` | default |
| `useBuilderCompany` | `[…, 'company', ownerId, …range]` | default |
| `useBuilderBaseshop` | `[…, 'baseshop', …range]` | default |
| `useBuilderRoster` | `[…, 'roster', segment, …range]` | default |
| `useBuilderReporting` | `[…, 'reporting', segment, …range]` | default |
| `useBuilderBulletin` | `[…, 'bulletin', segment, metric, search, …range]` | default |

Note the bulletin key includes **`search`**, so every keystroke that changes the search term is a
new cache entry and a new request. There is no debounce in the hook.

Invitations use their own `builderInvitationKeys` factory, and all six mutations invalidate its
root rather than a narrower key.

## 5. Local and URL state

| State | Owner | Lives in |
|---|---|---|
| Segment | each page | `useState`, seeded per route |
| Date range | `builder-page-header` / the page | `useState` |
| `ownerId` | the URL | `/builder-ai/company/:ownerId` |
| `agencyCode` | the URL | the public Daily Six route |
| Bulletin metric + search | `BulletinPage` | `useState`, both in the query key |

## 6. Permissions and gating

`GET /api/builderai/my-access/` returns `BuilderMyAccess` (`builder-ai-service.ts:81`), and two
flags drive everything:

| Flag | Means | Effect |
|---|---|---|
| `can_view` | owner, active builder, or pending invitee | `BuilderAiRoute` renders; the menu group appears |
| `is_owner` | a company owner | the **full** menu group; a non-owner Builder gets a trimmed one — Baseshop and Invitations only |

This is a capability gate, **independent of plan and role** — a builder qualifies by being
flagged, not by their tier (`use-role-based-menu.ts:22`). The distinction between the two flags is
made in the menu hook, not in the guard: the guard admits anyone with `can_view`, and the
navigation decides how much to show.

## 7. Integration points

- **`builderai` backend** — 12 endpoints ([API.md](API.md)).
- **`tracker`, indirectly** — the backend reads `builder_month_metrics` from
  `tracker/services/builder_results.py`. `BuilderMonthlyCompletion` and the results leaderboard
  belong to [team](../team/)'s Builders product, which ranks key players (B10). This module duplicates none of that, by decision B1. It does
  **not** read `is_key_player` (B9).
- **`team`** — carries the `is_key_player` flag, which is **no longer** builder enrolment (B9). A
  user becomes a builder here, by accepting an invitation or self-adding. Team → Builders is a
  **separate product** whose roster and results leaderboard use `is_key_player` (B10) — the same
  person can be a builder there and not here.
- **`use-role-based-menu.ts`** — the only consumer of this module's hooks outside it.

## 8. Invariants and failure modes

| Invariant | Enforced by | Breaks as |
|---|---|---|
| The client computes no goal and no progress | payloads carry `current` and `goal` | two screens disagreeing about whether someone is on plan |
| Card goals count the **whole company**; row goals count **that leg** | backend `dashboard` | a goal an order of magnitude too small |
| A leg with zero builders falls back to one plan | backend | a division by zero |
| Owner rows are not "built" | `is_built: false` on owner payloads | a builder-only badge shown against an owner |
| An active `BuilderMembership` is the only definition of a builder | backend `builder_ids_within` filters on it alone | `is_key_player` silently re-enrolling people — the state B9 removed |
| The seat cap is server-enforced | `BuilderMembership` | an eleventh builder in a ten-seat baseshop |
| Company and owner-leg counts are different numbers | two separate fields | the "N in scope" subtitle used as a card denominator |

**The naming hazard.** Owner rows and builder rows share a payload shape, which is what let the
Company redefinition ship with no frontend change — but it also means the Company page still
reads **"N builders in scope"** above rows that are owners, and renders a *Built* badge whose
concept does not apply to them. This was recorded at the time as "cosmetic only if desired" and
was never done. It is the most likely thing in this module to mislead a reader.

**Performance.** The Company path aggregates live rather than reading materialised rows, because
SMDs are not builders and so have no aggregate rows. That is fine at a small direct-SMD count and
is the first thing to look at if a top owner's legs grow. The dashboards exist at all because the
old live path took 8–10 seconds; `BuilderMonthlyAggregate` is what fixed that, and any date range
is a sum of month rows.
