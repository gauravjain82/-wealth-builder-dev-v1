# Auth — API

| | |
|---|---|
| **Module** | `auth` |
| **Source** | `src/features/auth/repositories/auth-repository.ts` |
| **Routes** | `/login`, `/signup`, `/reset-password` |
| **Backend module** | `accounts` → `mlm_platform/docs/accounts/API.md` |
| **API prefix** | `/api/accounts/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Endpoints **consumed**, not exposed. `mlm_platform/docs/accounts/API.md` is the authority
> on what each one does; this file records what the client sends and reads.

## 1. Conventions

`auth` is the one module whose primary call is **unauthenticated** — login has no token to
send. Everything else follows the platform conventions
([platform API §1](../platform/API.md#1-conventions)).

| | |
|---|---|
| Base | `buildApiUrl()` — `VITE_API_BASE_URL` with any trailing slash stripped (`auth-repository.ts:46`) |
| Auth | none on login and reset; `Authorization: Token <token>` on the profile reads |
| Trailing slash | required |
| Cancellation | **none.** No `AbortSignal` is threaded anywhere in this module |
| Errors | `parseError(response)` returns a **string**, not a typed error (`:148`) |

Two deviations from the rest of the app, both deliberate and both with costs:

- **`buildApiUrl` normalises the base URL**, stripping a trailing slash. Other modules
  concatenate raw. A `VITE_API_BASE_URL` ending in `/` therefore works here and produces
  `//api/...` elsewhere.
- **Errors are strings.** There is no `AuthError` class carrying a `code`, so the UI can only
  display the backend's message — it cannot branch on *why* a login failed. Compare
  `LeaderboardError` ([leaderboards API §5](../leaderboards/API.md#5-error-codes-and-handling)).

## 2. Endpoints consumed

| Method | Path | Called from | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/accounts/login/` | `authRepository.signIn` (`:178`) | none | exchange credentials for a token and user id |
| GET | `/api/accounts/users/<id>/` | `fetchUserProfile` (`:159`) | token | the profile, immediately after login |
| GET | `/api/accounts/users/me/` | `authRepository.refreshPhotoURL` (`:267`) | token | re-read the avatar on session restore |
| POST | `/api/accounts/password-reset-request/` | `authRepository.requestPasswordReset` (`:211`) | none | email a setup link |
| POST | `/api/accounts/password-reset/` | **`ResetPasswordPage` directly** (`components/reset-password-page.tsx:78`) | none | set a new password with a token |

The fifth is called from the component, bypassing both the service and the repository — the
only network call in this module that does. See
[ARCHITECTURE.md §3.3](ARCHITECTURE.md#33-password-reset-and-first-password-setup).

### Not wired to any endpoint

| Method | State |
|---|---|
| `signUp` | throws `Sign up is not available in this app. Please contact an administrator.` (`:237`) |
| `signInWithGoogle` | throws `Google sign in is not available for mlm_platform authentication.` (`:241`) |
| `signOut` | **local only.** Clears state and `localStorage`; makes no request, so the token stays valid server-side (`:245`) |

## 3. Payload types

In `src/features/auth/types/`:

| Type | Role |
|---|---|
| `LoginCredentials` | `{email, password}` |
| `SignupCredentials` | present for the unwired `signUp` |
| `AuthUser` | the identity fields the app relies on |
| `UserWithProfile` | `AuthUser` plus the `accounts` profile — what `useAuth().user` is |
| `BackendUserProfile` | the raw profile shape, mapped into `UserWithProfile` |

The profile fetch is **best-effort**: `fetchUserProfile` returns
`Partial<BackendUserProfile> | null` and a failure does not fail the login
(`auth-repository.ts:157`). A session can therefore exist with a thin profile, and the UI
must tolerate missing display fields — the header falls back through
`name → displayName → email`.

## 4. Query parameters

*Not applicable — no endpoint in this module takes a query parameter.* The reset token
travels in the **request body**, not the query string; it reaches the client as `?token=` on
`/reset-password` and is moved into the body on submit.

## 5. Error codes and handling

There are no stable error codes here. `parseError` (`:148`) extracts a human-readable string
from the response and the UI shows it.

| Situation | Status | Client behaviour |
|---|---|---|
| Wrong credentials | 400 / 401 | the backend's message under the form. Indistinguishable from any other 400 |
| Profile fetch fails after a good login | any | **swallowed.** Session still created, profile thin |
| Reset request for an unknown email | 200 or 400 | whatever the backend says, shown inline |
| Spent or invalid reset token | 400 | the backend's message; the form stays on screen |
| **Revoked token on a later request** | 401 | **nothing happens here.** No interceptor, no forced sign-out — the app stays signed-in-looking while every panel fails |

The last row is the module's most significant gap and is described in full in
[ARCHITECTURE.md §8](ARCHITECTURE.md#8-invariants-and-failure-modes).

## 6. Backend ownership

`accounts` owns:

- **Credential verification** and token issuance.
- **Token lifetime.** DRF tokens do not expire; only the backend can revoke one. There is
  nothing for the client to refresh.
- **The reset-link lifecycle** — generating, emailing, expiring and single-use enforcement of
  the token.
- **Account creation, roles and plan.** Users are provisioned by the invite flow; nothing in
  this module can create or elevate an account.
- **The profile**, including `is_admin` and promotion access.

The client owns the three screens, the redirect-after-login target, and the `localStorage`
session cache.

**The flags are cached, not authoritative.** `isAdmin` and `wb.hasPromotionAccess` sit in
`localStorage` and gate menu entries, so a modified value changes what the UI offers and
nothing else — every endpoint re-checks permission independently. Treating either as
authorization would be a mistake; see
[ARCHITECTURE.md §6](ARCHITECTURE.md#6-permissions-and-gating).
