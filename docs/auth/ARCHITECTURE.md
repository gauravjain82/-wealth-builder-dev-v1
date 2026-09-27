# Auth — Architecture

| | |
|---|---|
| **Module** | `auth` |
| **Source** | `src/features/auth/` |
| **Routes** | `/login`, `/signup`, `/reset-password` |
| **Backend module** | `accounts` |
| **API prefix** | `/api/accounts/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Layering

`auth` is **the only module with a `repositories/` directory**, and the extra layer is a
remnant rather than a pattern:

| Layer | File | Owns |
|---|---|---|
| Components | `components/` (3 files) | the three screens |
| Context | `hooks/use-auth.tsx` | React state, the provider, error capture |
| Service | `services/auth-service.ts` | a thin pass-through to the repository |
| Repository | `repositories/auth-repository.ts` | `fetch`, URL building, `localStorage`, the session shape |
| Types | `types/index.ts` | `AuthUser`, `UserWithProfile`, credentials |

`AuthService` adds no behaviour over `AuthRepository` — it forwards each of the seven methods.
The split is left over from the original Firebase design, where the repository was meant to be
swappable ([platform PHASES ~0](../platform/PHASES.md#2-phases)). Every other module in the
app collapses these two into one `services/` file, and that is the current convention. **Do
not copy this shape into a new module**, and do not treat `AuthRepository` as an interface
anything else implements.

## 2. Component map

```
main.tsx
 └── QueryProvider
      └── AuthProvider                      hooks/use-auth.tsx
           ├── publishes { user, isLoading, isAuthenticated, signIn,
           │               signOut, requestPasswordReset, error }
           │
           └── RouterProvider
                ├── /login          LoginPage          (no wrapper — self-redirecting)
                ├── /signup         PublicRoute → SignupPage
                ├── /reset-password ResetPasswordPage  (no wrapper — email link target)
                └── ProtectedRoute ─ reads useAuth().isAuthenticated
                     └── everything else

authService ──forwards──> authRepository ──fetch──> /api/accounts/*
                                 └──> localStorage (7 keys)
```

`AuthProvider` sits **outside** the router, so the session resolves once for the whole app
rather than per route.

## 3. Primary flows

### 3.1 Session restore (every page load)

1. `AuthProvider` mounts and calls `authService.onAuthStateChange(cb)`
   (`hooks/use-auth.tsx:30`).
2. The repository invokes the callback **synchronously** with
   `getCurrentUser()` — a `localStorage` read — then returns a no-op unsubscribe
   (`repositories/auth-repository.ts:255-260`).
3. `isLoading` flips to false in that same tick. `ProtectedRoute` stops showing its loader.
4. If a user was restored, `refreshPhotoURL()` fetches `/api/accounts/users/me/` in the
   background and updates state only if the avatar changed (`use-auth.tsx:35`).

**This is not a subscription.** The name and shape are Firebase's; the implementation is a
one-shot read with an unsubscribe that does nothing. The consequences are real and are the
first thing to understand about this module:

- **The stored token is never validated on load.** A revoked or malformed token restores a
  session that looks signed-in until the first request fails.
- **No cross-tab sync.** Signing out in one tab leaves every other tab believing it is signed
  in, because nothing listens to the `storage` event.
- **No reactive auth state.** Only `signIn` and `signOut` change it, from inside this module.

### 3.2 Login

1. `LoginPage` submits and calls `signIn({email, password})`.
2. `POST /api/accounts/login/` returns a token and user id
   (`auth-repository.ts:178`).
3. `GET /api/accounts/users/<id>/` fetches the profile (`:159`). A failure here is
   tolerated — the session is still established with what the login response gave.
4. `persistSession` writes the seven keys (`:307-322`).
5. `setUser` flips `isAuthenticated`.
6. `LoginPage`'s effect on `isAuthenticated` navigates to `location.state.from ?? '/home'`
   (`components/login-page.tsx:25`, `:36`).

Navigation happens in an effect, not in the submit handler — which is why the page redirects
an already-signed-in visitor too, without needing a `PublicRoute` wrapper.

### 3.3 Password reset and first-password setup

One flow, two entry points:

1. On `/login`, "Forgot password?" calls
   `POST /api/accounts/password-reset-request/` with the email in the form
   (`auth-repository.ts:211`) and shows the backend's message.
2. The emailed link lands on `/reset-password?token=…`.
3. `ResetPasswordPage` reads the token from the query string; with no token it renders an
   error and offers `/login` (`components/reset-password-page.tsx:59`).
4. Submitting posts the token and new password to `/api/accounts/password-reset/`
   (`:78`) — **called directly from the component**, not through the service or repository.
5. On success it navigates to `/login` with `replace`.

Step 4 is the one place in this module where a component talks to the network itself. It
bypasses the layering in §1 and is recorded in [PHASES.md §5](PHASES.md#5-outstanding).

### 3.4 Sign-out

`signOut` clears the in-memory session and every `localStorage` key
(`auth-repository.ts:245`), then sets `user` to null. It makes **no** backend call, so the
DRF token remains valid server-side until something revokes it.

## 4. Server state and caching

`auth` does not use React Query. The session lives in React state inside `AuthProvider`,
seeded from `localStorage`.

| State | Held in | Refreshed |
|---|---|---|
| `user` | `AuthProvider` `useState` | on `signIn`; avatar only, on mount |
| `isLoading` | `useState` | true until the first synchronous restore resolves |
| `error` | `useState` | set by any failed call, cleared at the start of the next |

There is therefore nothing to invalidate and no cache policy. A profile change made elsewhere
in the app is not reflected until the next full page load — the `settings` module is the
usual source of such a change.

## 5. Local and URL state

| State | Owner | Lives in |
|---|---|---|
| Email, password, visibility toggle | `LoginPage` | `useState` |
| Reset message, reset-in-flight | `LoginPage` | `useState` |
| Redirect target after login | the router | `location.state.from`, falling back to `/home` |
| Reset token | the URL | `?token=` on `/reset-password` |

### The session keys

Written by `persistSession` / `persistLocalStorage` (`auth-repository.ts:307-322`):

| Key | Holds | Read by |
|---|---|---|
| `wb.authToken` | the DRF token | 53 call sites — every module's service |
| `authUser` | the serialized session | this module, on restore |
| `wb.userId` | numeric user id | 16 call sites |
| `wb.roles` | role array | menu filtering |
| `wb.userEmail`, `wb.userName`, `wb.name` | display fields | header, forms |
| `wb.hasPromotionAccess`, `isAdmin` | coarse flags | `AdminRoute`, promotion menu |

`auth` writes them; the rest of the app reads them directly. That is the coupling described in
§8.

## 6. Permissions and gating

`auth` establishes identity and grants nothing. Two coarse flags it persists are used as
gates elsewhere:

| Flag | Gates |
|---|---|
| `isAdmin` | `AdminRoute` — six `/admin/*` screens |
| `wb.hasPromotionAccess` | the Promotion menu group |

Both are **session-derived and therefore client-trusted**: they come from the profile the
client cached, so a modified `localStorage` value changes what the menu offers. That is
acceptable only because the backend re-checks every request independently. It is also why the
2026 rollouts moved to per-user capabilities fetched at runtime rather than flags on the
session — see [platform §6](../platform/ARCHITECTURE.md#6-permissions-and-scoping) and
decision P6.

## 7. Integration points

- **`accounts`** — the five endpoints in [API.md](API.md).
- **`src/router/`** — four guards read `useAuth`. `ProtectedRoute` is the one that matters;
  it renders a loader while `isLoading` and redirects to `/login` with
  `state: { from: location }` otherwise.
- **`use-role-based-menu.ts`** — reads plan and roles off the user.
- **Every other module** — reads `wb.authToken` from `localStorage` directly, never through
  `useAuth`.
- **Nothing consumes `error`** outside the login screen.

## 8. Invariants and failure modes

| Invariant | Enforced by | Breaks as |
|---|---|---|
| A restored session is available before the first render decision | synchronous `getCurrentUser()` in `onAuthStateChange` | a flash of `/login` on every reload |
| `isLoading` is checked before any redirect | each guard | an infinite redirect loop between `/` and `/login` |
| Sign-out clears **every** key | `clearLocalStorage()` | a half-cleared session where `wb.authToken` is gone but `isAdmin` remains |
| The token key name is stable | convention only | 53 call sites break at once |
| `location.state.from` survives the login round trip | `ProtectedRoute` sets it, `LoginPage` reads it | the user lands on `/home` instead of the page they asked for |

**The structural coupling.** The contract between `auth` and the rest of the app is not
`useAuth` — it is *the string `'wb.authToken'`*. Fifty-three service call sites read that key
from `localStorage` themselves. Renaming it, or moving the token to memory or to an
`httpOnly` cookie, is a 53-file change rather than a change here. This is the same
duplication described in
[platform §8](../platform/ARCHITECTURE.md#8-invariants-and-failure-modes), seen from the
other end.

**The failure mode this module cannot handle.** Because the stored token is never validated
and nothing handles a 401 centrally, a revoked token produces a *signed-in-looking* app in
which every panel fails. `auth` does not find out, because nothing tells it. Recovering
means clearing `localStorage` by hand. Recorded in
[PHASES.md §5](PHASES.md#5-outstanding) as the module's most-felt gap.
