# Builder AI — UI

| | |
|---|---|
| **Module** | `builder-ai` |
| **Source** | `src/features/builder-ai/pages/`, `components/` |
| **Routes** | 7 + 1 public |
| **Backend module** | `builderai` |
| **API prefix** | `/api/builderai/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Routes and entry points

| Route | Guard | Component |
|---|---|---|
| `/builder-ai/home` | `BuilderAiRoute` | `HomePage` |
| `/builder-ai/company` | `BuilderAiRoute` | `CompanyPage` |
| `/builder-ai/company/:ownerId` | `BuilderAiRoute` | `CompanyPage`, drilled into one owner |
| `/builder-ai/baseshop` | `BuilderAiRoute` | `BaseshopPage` |
| `/builder-ai/reporting` | `BuilderAiRoute` | `ReportingPage` |
| `/builder-ai/bulletin` | `BuilderAiRoute` | `BulletinPage` |
| `/builder-ai/invitations` | `BuilderAiRoute` | `InvitationsPage` |
| `/team/builders/daily-six/:agencyCode` | **none — public** | the Daily Six view |

The menu group is nested as the last child of **My Team**
([platform decision P8](../platform/PHASES.md#3-decision-log)). It shows all six entries to an owner and only Baseshop plus Invitations to a non-owner builder
(`use-role-based-menu.ts:22`). The **guard does not enforce that split** — a non-owner who types
`/builder-ai/company` reaches the page, and the backend decides what it returns.

## 2. Screens

### 2.1 Home — `pages/home-page.tsx`

`SegmentToggle` at the top, then four `MetricGoalCard`s (recruits, points, licenses,
registrations) and a size bar for scope headcount.

### 2.2 Company — `pages/company-page.tsx`

`SegmentDashboard` over `RosterList`. **Each row is a directly-sponsored company owner**, SMD or
above, rolled up over that owner's whole downline — not a builder.

Two things on this screen say "builder" and mean something else, both known and both unfixed:

- The subtitle reads **"N builders in scope"**, where N is the count of owner legs.
- Each row renders a **Built** badge, a builder-only concept. Owner rows always carry
  `is_built: false`.

`/builder-ai/company/:ownerId` drills into one owner.

### 2.3 Baseshop — `pages/baseshop-page.tsx`

The same components over the viewer's own base-shop builders. Here a row *is* a builder, and both
labels read correctly.

### 2.4 Reporting — `pages/reporting-page.tsx`

A daily line chart per metric, via `recharts`, with tooltips. Segment-aware, and deliberately
still on the **whole-downline** definition of company — it did not follow the Company page's
redefinition.

### 2.5 Bulletin — `pages/bulletin-page.tsx`

A ranking by a chosen metric with a search box. Both the metric and the search term are in the
query key, so a search is a fetch per term — there is no debounce.

### 2.6 Invitations — `pages/invitations-page.tsx`

Seats used against the cap, an inbox and an outbox, and six actions: send, accept, decline,
cancel, self-add, remove.

### 2.7 Daily Six — public

A per-agency-code activity view reachable without a session, so it can be shared.

## 3. States

| State | Trigger | What the user sees |
|---|---|---|
| Resolving access | `useBuilderMyAccess` in flight | the guard's loader; nothing renders |
| Denied | `can_view` false | redirect to `/home`, silently |
| Loading | a dashboard query in flight | per-page loading |
| Empty scope | no builders in the segment | zero cards and an empty roster — a real state for a new leader |
| Goal of zero | a leg with no builders | falls back to one plan server-side, so no division by zero |
| Owner row | Company segment | a row with `is_built: false` and a *Built* badge that cannot apply |
| Seats full | 10 per baseshop used | sending is refused; the cap is server-enforced |
| Mutation pending | an invitation action | disabled control |

## 4. Interaction rules

- **Never compute a goal or a progress figure in the client.** Both arrive in the payload. The
  two goal bugs this module has had were arithmetic errors, and the fix in both cases was on the
  server.
- **A Company row is an owner; a Baseshop row is a builder.** The payload shape is identical, so
  nothing but the route tells you which you are looking at.
- **Segment lives in page state, not the URL** — except the owner drill-down, which is a route.
- **Six invitation mutations all invalidate the whole invitation tree.** Any of them can change
  both a list and the seat count.
- **Enrolment is not here.** There is no control anywhere in this module that makes someone a
  builder; that is the Associate Tracker's toggle.

## 5. Responsive and print behaviour

Tailwind utilities; no module stylesheet. The metric cards reflow, and the roster is a list rather
than a wide table, so the screens hold up on a phone better than the admin surfaces do. The
`recharts` chart on Reporting is the weakest point at narrow widths.

No print styles. *Not applicable.*

## 6. Accessibility

Shared primitives for controls. Two gaps worth naming:

- **The chart has no text equivalent.** Reporting's only representation of the data is the
  `recharts` line chart, so it is unreadable to a screen reader.
- **The *Built* badge is misleading on Company rows** for everyone, and a screen-reader user has
  no extra context to discount it.

## 7. Styling and theming

No stylesheet. Tailwind plus `shared/components/ui`, with `recharts` default theming on the one
chart. Member photos in `RosterList` were added 2026-09-09 and are decorative — the row is
identified by name.
