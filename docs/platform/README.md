# Platform — Overview

| | |
|---|---|
| **Module** | `platform` (the application shell) |
| **Source** | `src/router/`, `src/shared/`, `src/infrastructure/`, `src/store/`, `src/core/`, `src/config/`, `src/hooks/` |
| **Routes** | mounts all of them |
| **Backend module** | `accounts`, `authz` → `mlm_platform/docs/accounts/`, `mlm_platform/docs/authz/` |
| **API prefix** | `/api/accounts/` (identity only) |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Purpose

`platform` is not a feature directory. It is the set of things every feature depends on and
none of them owns: the router and its guards, the authenticated session, the layout and
navigation, the React Query client, the shared component library, and the build. It holds
no domain logic. Its job is to make one decision once — how the app authenticates, routes,
caches, themes and builds — so that twenty-eight feature modules do not each make it
differently.

The practical consequence is that this is where cross-cutting behaviour changes. Adding a
route, gating a menu entry on a new backend capability, changing the cache policy, moving
the API base URL: all of it is here, and none of it requires touching a feature module.

It is also where the two most important facts about this codebase live, both of which the
archived root documents got wrong. **Identity is a Django token, not Firebase Auth**, and
**data access is `fetch` against a REST API, not a repository over Firestore.** Read §1 and
§2 of [ARCHITECTURE.md](ARCHITECTURE.md) before writing any data-access code.

## 2. Scope

**In scope**
- Route table, lazy loading, and every route guard.
- The authenticated session: login, token storage, the `useAuth` context.
- Layout, header, sidebar, and role/capability-filtered navigation.
- The React Query client and its global defaults.
- Shared UI components, layouts and the theme.
- Vite configuration, path aliases, chunking, and the Firebase Hosting deploy.

**Explicitly out of scope**
- Any domain model, screen or endpoint. Those belong to a feature module —
  see the [index](../README.md).
- Per-module HTTP clients. Each feature owns its own service layer; there is no shared
  client, and §2 of [ARCHITECTURE.md](ARCHITECTURE.md) explains the consequence.

## 3. At a glance

| | |
|---|---|
| Route entries | 98 (`src/router/index.tsx`) |
| Route guards | 12 (`src/router/`) |
| Feature modules mounted | 28 |
| Shared UI components | 19 groups (`src/shared/components/ui/`) |
| Zustand slices | 2 (`ui`, `toast`) |
| Menu definition | 751 lines (`src/config/menu.ts`) |
| Path aliases | 4 (`@`, `@shared`, `@features`, `@core`) |
| Vendor chunks | 4 (`vite.config.ts:26`) |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Plan** | The subscription tier on the user record. Drives most of the menu. `src/core/constants/levels.ts` |
| **Role / account type** | The user's position (Associate, MD, SMD, admin…). `src/core/constants/roles.ts` |
| **Capability** | A per-user grant the backend reports through a `my-access` endpoint, independent of plan or role — `homev2:read`, `gms:author`, `products:read`, `wbreporting:manage`. This is how the 2026 rollouts are gated. |
| **Guard** | A route wrapper that decides whether to render. It is never the authorization; the backend enforces the same gate on every request. |
| **Surface** | One reader-facing view of a module. A module may have several (an embedded card, a full page). |

## 5. Dependencies

**Upstream** — none. This is the bottom layer.

**Downstream** — all 28 feature modules.

**Backend**
- `accounts` — login, password reset, the user profile behind `useAuth`.
- `authz` — the capability grants every `my-access` endpoint reads.

**External**
- Firebase Hosting (deploy target) and Firestore (residual reads only — see
  [ARCHITECTURE.md §7](ARCHITECTURE.md#7-integration-points)).
- Stripe, via `@stripe/react-stripe-js`, used by `events` and `settings`.

## 6. Document map

| Document | Read it when |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Before writing any data access, guard or hook. Holds the layering rule and the auth flow. |
| [UI.md](UI.md) | Adding a route, a menu entry, or a shared component. |
| [API.md](API.md) | Wiring a new endpoint — the conventions every module's service copies. |
| [OPERATIONS.md](OPERATIONS.md) | Running, building, or deploying. Holds the env contract. |
| [PHASES.md](PHASES.md) | Before "fixing" the Firebase remnants or the duplicated HTTP helpers. |

## 7. Where to start reading

1. `src/router/index.tsx` — the whole application in one file: every route, its guard and
   its lazy component.
2. `src/features/auth/repositories/auth-repository.ts` — what a session actually is.
3. `src/features/leaderboards/services/leaderboards-service.ts` — the service pattern every
   module follows, and the one documented end to end in [leaderboards](../leaderboards/).
4. `src/hooks/use-role-based-menu.ts` — how plan, role and backend capability combine into
   navigation.
