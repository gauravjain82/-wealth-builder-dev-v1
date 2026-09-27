# Auth — Overview

| | |
|---|---|
| **Module** | `auth` |
| **Source** | `src/features/auth/` |
| **Routes** | `/login`, `/signup`, `/reset-password` |
| **Backend module** | `accounts` → `mlm_platform/docs/accounts/` |
| **API prefix** | `/api/accounts/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Purpose

`auth` owns one thing: turning an email and password into a session the rest of the app can
assume. It calls `/api/accounts/login/`, receives a DRF token, fetches the user's profile,
writes both to `localStorage`, and publishes the result through a React context that every
other module reads via `useAuth`.

It is deliberately small, because the session it produces is deliberately simple: a DRF
token that does not expire, plus a cached profile. There is no refresh cycle, no silent
renewal, and no cross-tab coordination. That simplicity is the module's main design property
and also the source of every limitation in §2 — see
[PHASES.md §3](PHASES.md#3-decision-log) decision A2.

Accounts are **not created here.** Signup and Google sign-in exist as UI and as methods that
throw; users are provisioned by the backend's invite flow and receive a password-setup link.
If this module were removed, nothing else in the app could establish a session — but nothing
would lose the ability to create users, because it never had it.

## 2. Scope

**In scope**
- The login screen and the login call.
- Password-reset request, and the password-setup screen the email link targets.
- Session persistence in `localStorage`, and clearing it on sign-out.
- The `AuthProvider` context and the `useAuth` hook: `user`, `isLoading`,
  `isAuthenticated`, `signIn`, `signOut`, `requestPasswordReset`, `error`.
- Hydrating the avatar from `/api/accounts/users/me/` after a session is restored.

**Explicitly out of scope**
- **Route protection.** `ProtectedRoute`, `PublicRoute` and `RootRedirect` live in
  `src/router/` and are documented in
  [platform](../platform/ARCHITECTURE.md#2-component-map). They *consume* `useAuth`.
- **Capability checks.** Per-user grants (`homev2:read`, `gms:author`, …) come from each
  module's own `my-access` endpoint, not from the session. See
  [platform §6](../platform/ARCHITECTURE.md#6-permissions-and-scoping).
- **Account creation and role assignment.** Backend, via the invite flow. `admin` has the
  invite-agents screen.
- **Authorization of anything.** A session says who you are. Every endpoint decides for
  itself what you may do.

## 3. At a glance

| | |
|---|---|
| Routes | 3 |
| Pages / components | 3 (login, signup, reset-password) |
| Hooks | 1 (`useAuth`) |
| Services | 1, delegating to 1 repository |
| Endpoints consumed | 5 |
| LOC (ts/tsx) | 1272 |
| Doc tier | Full |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Session** | A DRF token plus a cached user profile, held in `localStorage`. Not a cookie, not a JWT. |
| **Token** | `localStorage['wb.authToken']`. Sent as `Authorization: Token <token>`. Does not expire. |
| **Profile** | The `accounts` user record: name, email, roles, plan, avatar, agency code. |
| **Plan** | The subscription tier on the profile. Drives most of the menu. |
| **Role / account type** | The user's position (Associate, MD, SMD, admin…). |
| **Setup link** | The emailed `/reset-password?token=…` URL. Used both for a forgotten password and for a new user's first password. |

## 5. Dependencies

**Upstream (this module imports)**
- `src/shared/components/ui/` — `Button`, `Input`, `Label`, `Heading`, `Text`, `Badge`.

**Downstream (imports this module)**
- `src/router/` — `ProtectedRoute`, `PublicRoute`, `RootRedirect`, `AdminRoute`.
- `src/hooks/use-role-based-menu.ts` — plan and roles for menu filtering.
- `src/shared/layouts/header.tsx` — the signed-in user's name and avatar.
- Every module's service, indirectly: they read `wb.authToken` from `localStorage` rather
  than from this module's API. See [ARCHITECTURE.md §8](ARCHITECTURE.md#8-invariants-and-failure-modes).

**Backend**
- `accounts` — all five endpoints.

**External** — none. Google sign-in is not wired up.

## 6. Document map

| Document | Read it when |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Changing the session model, or working out why auth state is not reactive. |
| [UI.md](UI.md) | Changing a screen or a redirect target. |
| [API.md](API.md) | The five `accounts` endpoints and what the client does with each. |
| [OPERATIONS.md](OPERATIONS.md) | Debugging a login, or clearing a bad session. |
| [PHASES.md](PHASES.md) | **Before adding signup, token refresh or a 401 handler.** Each is absent for a reason, and one of them is a reason you may disagree with. |

## 7. Where to start reading

1. `src/features/auth/repositories/auth-repository.ts` — what a session *is*. The seven
   `localStorage` keys are written at `:307-322`.
2. `src/features/auth/hooks/use-auth.tsx` — how it reaches the rest of the app, and why
   `onAuthStateChange` is not really a subscription.
3. `src/features/auth/components/login-page.tsx` — the redirect-after-login behaviour.
4. `src/router/protected-route.tsx` — the consumer that matters most.
