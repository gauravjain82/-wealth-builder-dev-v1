# Platform — Architecture

| | |
|---|---|
| **Module** | `platform` |
| **Source** | `src/router/`, `src/shared/`, `src/infrastructure/`, `src/store/` |
| **Routes** | mounts all of them |
| **Backend module** | `accounts`, `authz` |
| **API prefix** | `/api/accounts/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Layering

Four layers, top to bottom. Each may call the layer below it and not the one above.

| Layer | Lives in | May do | Must not do |
|---|---|---|---|
| **Page / component** | `features/<m>/pages/`, `features/<m>/components/` | Render, hold local UI state, call hooks | Call `fetch`, read `localStorage` for auth, build URLs |
| **Hook** | `features/<m>/hooks/` | Wrap React Query, own query keys and cache policy | Build URLs or parse responses |
| **Service** | `features/<m>/services/` | Build URLs, attach auth, `fetch`, map errors to typed failures | Import React, hold state |
| **Types** | `features/<m>/types/` or `types.ts` | Describe the wire shape | Contain logic |

The rule holds in practice: **no `.tsx` file in `src/features/` imports
`firebase/firestore`, and the components do not call `fetch` directly.** A page reaches the
network only through a hook, and a hook only through a service.

`src/infrastructure/firebase/base-repository.ts` describes a fifth layer — a generic
repository over Firestore — that nothing uses. It is a remnant of the original design and is
**not the pattern to follow**; see [PHASES.md §4](PHASES.md#4-deliberately-not-built).

## 2. Component map

```
main.tsx
 └── QueryProvider                      infrastructure/query/provider.tsx
      └── AuthProvider                  features/auth/hooks/use-auth.tsx
           └── RouterProvider           router/index.tsx
                ├── public routes       PublicRoute · RootRedirect
                └── ProtectedRoute
                     └── MainLayout     shared/layouts/main-layout.tsx
                          ├── Header    shared/layouts/header.tsx
                          ├── Sidebar   shared/layouts/sidebar.tsx
                          │    └── useRoleBasedMenu → config/menu.ts
                          ├── <Outlet>  ← the feature module renders here,
                          │              wrapped in its own capability guard
                          └── ExpandableChat
```

Each feature module below the `Outlet` follows the same internal shape:

```
route → page → components
                   ↓
                 hooks (React Query)
                   ↓
                 service (fetch)
                   ↓
             /api/<app>/ on the Django backend
```

### Route guards

| Guard | Decides on | Source |
|---|---|---|
| `ProtectedRoute` | an authenticated session | `router/protected-route.tsx` |
| `PublicRoute` | the inverse — redirects a signed-in user away from `/login` | `router/public-route.tsx` |
| `RootRedirect` | where `/` goes | `router/root-redirect.tsx` |
| `AdminRoute` | the `isAdmin` flag | `router/admin-route.tsx` |
| `LeaderboardsRoute` | `can_view_leaderboards` (`homev2:read`) | `router/leaderboards-route.tsx` |
| `ContestsRoute` | `can_view_contests` (same `homev2:read` grant) | `router/contests-route.tsx` |
| `ContestSettingsRoute` | `wbreporting:manage` | `router/contest-settings-route.tsx` |
| `GuidanceRoute` | `gms:author` | `router/guidance-route.tsx` |
| `WbPipelineRoute` | `wbreporting:read` / `:manage` | `router/wb-pipeline-route.tsx` |
| `ProductsRoute` | `products:read` | `router/products-route.tsx` |
| `MisalignmentsRoute` | a per-user grant | `router/misalignments-route.tsx` |
| `BuilderAiRoute` | `can_view` from `/api/builderai/my-access/` | `router/builder-ai-route.tsx` |

The eight capability guards all follow one shape: call the module's `my-access` hook, show a
loader while it resolves, `<Navigate to="/home" replace />` on error or denial. See
`router/leaderboards-route.tsx:22` for the canonical version.

## 3. Primary flows

### 3.1 Login

1. `LoginPage` submits to `authRepository.signIn(email, password)`.
2. `POST /api/accounts/login/` returns a DRF token and a user id
   (`features/auth/repositories/auth-repository.ts:178`).
3. `GET /api/accounts/users/<id>/` fetches the profile
   (`auth-repository.ts:159`).
4. The session is written to `localStorage` under seven keys
   (`auth-repository.ts:307-322`) — see §5.
5. `useAuth` publishes `isAuthenticated`, and `ProtectedRoute` stops redirecting.

There is **no token refresh and no expiry handling.** A DRF token does not expire, so the
session ends only at logout or when `localStorage` is cleared. A revoked token surfaces as
a 401 from whichever feature request hits it first, handled by that module.

### 3.2 An authenticated request

1. A component calls a hook; the hook calls its module's service.
2. The service reads `localStorage.getItem('wb.authToken')` and sets
   `Authorization: Token <token>`.
3. `fetch` goes to `${VITE_API_BASE_URL}/api/<app>/...`, forwarding React Query's
   `AbortSignal`.
4. Non-2xx becomes a typed error carrying the backend's stable `code`.

The canonical implementation is
`src/features/leaderboards/services/leaderboards-service.ts:40-75`.

### 3.3 Menu construction

`useRoleBasedMenu` (`src/hooks/use-role-based-menu.ts`) takes the plan from `useAuth`,
calls `getMenuForUser` to filter `config/menu.ts` by plan and role, then injects entries for
each capability the backend reports — Builder AI, misalignments, products, the reporting
pipeline, leaderboards, contest settings, guidance. Seven `my-access` queries run on every
authenticated page load; their long `staleTime` is what keeps that cheap.

## 4. Server state and caching

Global defaults, `src/infrastructure/query/provider.tsx:6`:

| Option | Value | Consequence |
|---|---|---|
| `staleTime` | 5 min | A module that needs fresher data must set its own, and most do (60 s is the common override) |
| `gcTime` | 10 min | Cache dropped 10 min after the last observer unmounts |
| `retry` | 1 | One retry, queries and mutations alike |
| `refetchOnWindowFocus` | `false` | Tab focus never refetches — deliberate, given how many `my-access` queries mount at once |

Query-key convention, followed by every module: `[<module>, <surface>, <selection>]`, where
the selection object carries every parameter that changes the answer. Putting the selection
*in the key* is what makes a superseded response irrelevant rather than merely stale;
forwarding React Query's `signal` to `fetch` is what actually cancels it.
`src/features/leaderboards/hooks/use-leaderboards.ts:31` is the reference.

Devtools mount in dev only (`provider.tsx:28`).

## 5. Local and URL state

| State | Owner | Lives in |
|---|---|---|
| Theme (`light`/`dark`/`system`) | Zustand `ui` slice | `src/store/slices/ui-slice.ts`, applied by `src/hooks/use-theme.ts` |
| Toasts | Zustand `toast` slice | `src/store/slices/toast-slice.ts` |
| Session | `localStorage` + `useAuth` context | see below |
| Everything else | `useState` in the page, or the URL | per module |

Zustand holds **only** these two slices. Server state belongs to React Query and view state
to the component; there is no global application store, by design.

### The session keys

Written by `auth-repository.ts:307-322`, read all over the app:

| Key | Holds | Read by |
|---|---|---|
| `wb.authToken` | the DRF token | 53 call sites — every service |
| `wb.userId` | numeric user id | 16 call sites |
| `authUser` | the serialized session | `useAuth` |
| `wb.roles` | role array | menu filtering |
| `wb.userEmail`, `wb.userName`, `wb.name` | display fields | header, forms |
| `wb.hasPromotionAccess`, `isAdmin` | coarse flags | `AdminRoute`, promotion menu |

Reading the token directly in each service is the current convention, not an aspiration —
§8 records the cost.

## 6. Permissions and gating

Three independent mechanisms, and the distinction matters:

| Mechanism | Source | Gates |
|---|---|---|
| **Plan** | the user record | most menu entries |
| **Role / `isAdmin`** | the user record | `AdminRoute`, role-scoped menu groups |
| **Capability** | a backend `my-access` endpoint | the 2026 rollouts: `homev2:read`, `gms:author`, `products:read`, `wbreporting:read`/`:manage` |

Capabilities exist because a named rollout list is not a role and not a plan. Nothing in the
plan table grants `homev2:read`; an operator grants it per user in the access console. That
is why the guards ask the server instead of reading the session.

**A guard is not authorization.** Every gated endpoint enforces its own permission
server-side, independently. Hiding a control prevents confusion, not access — so removing a
guard is a UX regression, never a privilege escalation.

## 7. Integration points

| System | How | Where |
|---|---|---|
| **Django REST API** | `fetch` + `Authorization: Token`, 21 `/api/<app>/` prefixes across 65 files | every module's `services/` |
| **Firebase Firestore** | residual reads only: the home carousel and a video config | `src/hooks/use-carousel-images.ts`, `src/services/video-config.service.ts` |
| **Firebase Hosting** | deploy target | `firebase.json`, `.firebaserc` |
| **Stripe** | `@stripe/react-stripe-js` | `events`, `settings` |
| **GMS manifest** | a build-time Vite plugin emitting a target manifest | `vite-plugin-gms-manifest.ts` |

Firebase is **not** the identity provider and **not** the primary datastore. Five files
still import the SDK; three of those (`infrastructure/firebase/config.ts`,
`converters.ts`, `base-repository.ts`) exist only to support the other two. The
`firebase-vendor` chunk in `vite.config.ts:31` is therefore **412 kB (96 kB gzipped)** —
measured at commit `7e3b7f1` — to serve a carousel and a video URL.

## 8. Invariants and failure modes

| Invariant | Enforced by | Breaks as |
|---|---|---|
| Components never call `fetch` | convention, verified: 0 `.tsx` files in `features/` import `firebase/firestore` and pages call hooks only | a component that cannot be tested or cached, and a request nothing can cancel |
| Every service sends `Authorization: Token` | each service's own `getAuthHeaders` | 401 on one surface while the rest of the app works |
| A selection change cancels the request it supersedes | selection in the query key + `signal` forwarded to `fetch` | an old response overwriting a newer one after a filter change |
| A guard's decision is never the only check | the backend re-checks every request | nothing — this is why it is safe |
| The route table is the single source of truth for what exists | one `router/index.tsx` | a reachable page with no menu entry, or the reverse |

**The known structural weakness.** There is no shared HTTP client. `API_BASE_URL`,
`getAuthHeaders` and the error-parsing helper are re-declared in each module's service —
`leaderboards-service.ts:24`, `matchup-service.ts:19`, `promotion-service.ts:9`,
`home-leaderboard-service.ts:1` and so on. `src/shared/services/content-page-service.ts`
exports both helpers and `home` imports them, so the shared version exists but was never
adopted. The consequences are concrete: a change to the auth scheme is a 65-file edit, and
error handling is inconsistent because each module re-invented it. Recorded as debt in
[PHASES.md §5](PHASES.md#5-outstanding) rather than fixed, because the duplication is
uniform and therefore mechanical to unify later.
