# Builder AI — API

| | |
|---|---|
| **Module** | `builder-ai` |
| **Source** | `src/features/builder-ai/services/` |
| **Routes** | 7 + 1 public |
| **Backend module** | `builderai` → `mlm_platform/docs/builderai/API.md` |
| **API prefix** | `/api/builderai/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Endpoints **consumed**, not exposed.

## 1. Conventions

Platform conventions ([platform API §1](../platform/API.md#1-conventions)). Two services, and the
**types live in the dashboard service** (`builder-ai-service.ts:9-140`) rather than a `types/`
directory.

Date ranges travel as `startDate` / `endDate` and are normalised into the query key by `rangeKey`,
which maps an absent range to two empty strings.

## 2. Endpoints consumed

### Dashboards — `builder-ai-service.ts`

| Method | Path | Fetcher | Hook |
|---|---|---|---|
| GET | `/api/builderai/my-access/` | `fetchBuilderMyAccess` | `useBuilderMyAccess` |
| GET | `/api/builderai/home/` | `fetchBuilderHome` | `useBuilderHome` |
| GET | `/api/builderai/company/` | `fetchBuilderCompany` | `useBuilderCompany` |
| GET | `/api/builderai/baseshop/` | `fetchBuilderBaseshop` | `useBuilderBaseshop` |
| GET | `/api/builderai/roster/` | `fetchBuilderRoster` | `useBuilderRoster` |
| GET | `/api/builderai/reporting/` | `fetchBuilderReporting` | `useBuilderReporting` |
| GET | `/api/builderai/bulletin/` | `fetchBuilderBulletin` | `useBuilderBulletin` |
| GET | `/api/builderai/config/` | — | program configuration |

### Invitations — `builder-ai-invitations-service.ts`

| Method | Path | Hook |
|---|---|---|
| GET · POST | `/api/builderai/invitations/` | `useBuilderInvitations`, `useSendBuilderInvitation` |
| POST | `/api/builderai/invitations/` accept · decline · cancel | `useAcceptBuilderInvitation`, `useDeclineBuilderInvitation`, `useCancelBuilderInvitation` |
| POST | `/api/builderai/invitations/remove-user/` | `useRemoveBuilderUser` |
| POST | `/api/builderai/self-add-builder/` | `useSelfAddBuilder` |
| GET | `/api/builderai/builder-seats/` | `useBuilderSeats` |

**The roster endpoint defaults to `company`.** That matters because `company` means direct SMD
legs, not the whole builder downline — a caller that omits the segment gets owner rows.

## 3. Payload types

All in `services/builder-ai-service.ts`:

| Type | Line | Note |
|---|---|---|
| `BuilderSegment` | `:9` | `'company' \| 'baseshop'` — the fork everything follows |
| `BuilderMetricKey` | `:10` | `recruits` · `points` · `licenses` · `registrations` |
| `BuilderMetricCard` | `:12` | one card's current, goal and progress |
| `BuilderMemberRow` | `:26` | **a builder row or an owner row — identical shape** |
| `BuilderOwnerIdentity` | `:39` | who an owner row is |
| `BuilderScopePayload` | `:47` | cards plus rows for a scope |
| `BuilderSizeBar` | `:64` | headcount progress |
| `BuilderHomePayload` | `:70` | what Home renders |
| `BuilderMyAccess` | `:81` | `can_view`, `is_owner` |
| `BuilderConfig` | `:88` | the program configuration |
| `BuilderRange` | `:104` | `startDate` / `endDate` |
| `BuilderReportingPayload` | `:121` | the daily series |
| `BuilderBulletinPayload` | `:138` | the ranking |

`BuilderMemberRow` serving both row kinds is deliberate — it is what let the Company redefinition
ship with no frontend change — and it is why the UI cannot tell an owner row from a builder row
without knowing its segment. Owner rows carry `is_built: false` because "built" is a builder-only
concept.

## 4. Query parameters

| Parameter | Values | Used by |
|---|---|---|
| `segment` | `company` \| `baseshop` | home, roster, reporting, bulletin |
| `startDate`, `endDate` | ISO dates | every dashboard |
| `ownerId` | a user id | company drill-down |
| `metric` | a `BuilderMetricKey` | bulletin |
| `search` | free text | bulletin — **in the query key, undebounced** |
| `box`, `segment` | inbox/outbox | invitations |

## 5. Error codes and handling

No typed error class. Failures surface per page from React Query's `error`.

| Situation | Status | Client behaviour |
|---|---|---|
| No `can_view` | 403 | the guard already redirected |
| Non-owner requesting company data | 403 or a scoped payload | the menu hides the route; the URL does not |
| Seat cap reached | 4xx | send is refused. The cap is server-enforced, not client-checked |
| Invitation already actioned | 4xx | surfaced; the list refetches on invalidation |
| Empty scope | 200 | not an error — zero cards and an empty roster |

## 6. Backend ownership

`builderai` owns, and the client must not recompute:

- **Every goal and every current figure.** Cards, rows and the size bar all arrive computed.
- **The two different goal denominators**: whole-company for cards, per-leg for rows.
- **Scope resolution** — `direct_owner_ids` for company, base-shop membership for baseshop.
- **The seat cap** (10 per baseshop) via `BuilderMembership`.
- **Whether a builder is "built"** — `BuilderMonthlyCompletion`.
- **Materialisation.** `BuilderMonthlyAggregate` holds month rows; a date range is a sum of
  months. The Company path aggregates live instead, because SMDs are not builders and have no
  aggregate rows.

It in turn reuses `tracker` for targets (5 / 20,000 / 1 / 3), `builder_results_score` and the
whole-downline metric definition. **Nothing in this module or its backend duplicates that
engine** — decision B1. It does **not** take enrolment from `tracker`: an active
`BuilderMembership` is the sole builder signal (B9), and `builderai` reads
`is_key_player` nowhere.

The client owns segment selection, the date range, and rendering.
