# Auth — Operations

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

## 1. Environment and configuration

| Variable | Default | Effect |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | the `accounts` backend. Normalised by `buildApiUrl` (`auth-repository.ts:46`), which strips a trailing slash |

No other configuration. There is no client-side session timeout, no token lifetime and no
configurable redirect target — `/home` is hard-coded in three places
([UI.md §1](UI.md#1-routes-and-entry-points)).

## 2. Build and run

Standard ([platform OPERATIONS §2](../platform/OPERATIONS.md#2-build-and-run)). `auth` is
**not** lazy-loaded: `LoginPage` and the provider are in the main bundle, because the app
cannot render its first screen without them.

To work on the login screen you need a backend that answers
`POST /api/accounts/login/` and a real user — there are no fixtures, no mock mode and no
dev bypass.

## 3. Feature flags and rollout

*Not applicable — `auth` is not gated and cannot be.* It is the gate.

Two coarse flags it **persists** act as gates elsewhere, and both are client-cached rather
than authoritative:

| Flag | Source | Gates |
|---|---|---|
| `isAdmin` | the profile | `AdminRoute` — six `/admin/*` screens |
| `wb.hasPromotionAccess` | the profile | the Promotion menu group |

The 2026 rollouts deliberately do **not** use session flags; they fetch a per-user capability
at runtime. See [platform §6](../platform/ARCHITECTURE.md#6-permissions-and-scoping).

## 4. Tests and checks

No automated tests ([platform OPERATIONS §4](../platform/OPERATIONS.md#4-tests-and-checks)).
`npm run lint` reports nothing in this module; the repo's 7 errors are elsewhere.

Because this module has no test coverage and every other module depends on it, the manual
list matters more here than anywhere else. After any change to the session model, walk all
seven:

1. **Cold login** — sign in from `/login`, land on `/home`.
2. **Deep-link login** — visit `/leaderboards` signed out, sign in, land on `/leaderboards`
   and not `/home`. This is `location.state.from`, and it is the easiest thing to break.
3. **Reload** — refresh a protected page; no flash of `/login`, no spinner.
4. **Sign out** — every key gone from `localStorage`; `/home` now redirects to `/login`.
5. **Already signed in** — visit `/login` directly; immediate redirect, no flash of the form.
6. **Reset request** — "Forgot password?" with an email in the field, then with it empty
   (expect the inline "enter the email" message, and no request).
7. **Setup link** — open `/reset-password` with no token (expect the invalid-link screen),
   then with a real token; on success you land on `/login` and Back does not return to the
   form.

Check `localStorage` directly in step 4. A partial clear is the failure this module has the
least protection against.

## 5. Deployment

Ships with any frontend deploy; no coupled backend branch. `accounts` has been in production
since the first release.

**One-way door.** Changing the token storage key, or moving the token out of `localStorage`,
invalidates every signed-in session at once and touches 53 call sites in other modules
([ARCHITECTURE.md §8](ARCHITECTURE.md#8-invariants-and-failure-modes)). Treat it as a
migration with a forced-sign-out, not as a refactor.

## 6. Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| Everything 401s but the app looks signed in | revoked or stale token; nothing detects it | `localStorage.getItem('wb.authToken')`. **The fix is to clear `localStorage` by hand** — there is no central 401 handler to sign you out |
| Redirect loop between `/` and `/login` | a guard deciding before `isLoading` resolved | that the guard checks `isLoading` first (`src/router/protected-route.tsx:13`) |
| Login succeeds, then lands on `/home` instead of the deep link | `location.state.from` lost | `ProtectedRoute` sets it and `LoginPage` reads it (`login-page.tsx:25`) |
| Signed out in one tab, still signed in in another | no cross-tab sync — nothing listens to the `storage` event | expected. See [ARCHITECTURE.md §3.1](ARCHITECTURE.md#31-session-restore-every-page-load) |
| Header shows an email instead of a name | the profile fetch failed after login and was swallowed | the `/api/accounts/users/<id>/` response. The session is valid; the profile is thin |
| Avatar stale until reload | only `refreshPhotoURL` updates it, on mount | expected — `auth` holds no React Query cache to invalidate |
| Signup "does nothing" | it throws by design | expected. Accounts come from the invite flow ([PHASES.md §4](PHASES.md#4-deliberately-not-built)) |
| Reset link says "invalid token" | spent, expired, or the link was truncated in the email | the `token` query param is present and whole |
| A user's menu lacks an admin entry they should have | `isAdmin` cached from before the grant | sign out and back in — the flag is only read at login |
| `//api/accounts/...` in a request from another module | `VITE_API_BASE_URL` has a trailing slash | `auth` normalises it, other modules do not. Remove the slash from the env value |
