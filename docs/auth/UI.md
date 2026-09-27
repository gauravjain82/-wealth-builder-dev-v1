# Auth — UI

| | |
|---|---|
| **Module** | `auth` |
| **Source** | `src/features/auth/components/` |
| **Routes** | `/login`, `/signup`, `/reset-password` |
| **Backend module** | `accounts` |
| **API prefix** | `/api/accounts/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Routes and entry points

| Route | Guard | Component | Query params |
|---|---|---|---|
| `/login` | **none** — redirects itself | `LoginPage` | — (reads `location.state.from`) |
| `/signup` | `PublicRoute` | `SignupPage` | — |
| `/reset-password` | **none** — email link target | `ResetPasswordPage` | `token` (required) |

Three things about this table are easy to get wrong:

- **`/login` has no `PublicRoute` wrapper** (`src/router/index.tsx:151`). It redirects an
  already-signed-in visitor itself, from an effect on `isAuthenticated`. Wrapping it would
  duplicate that and fight over the redirect target.
- **`/reset-password` is deliberately unguarded.** It is the target of an emailed link, and
  the recipient is by definition not signed in — and may be a brand-new user who has never
  had a password. Guarding it would break account setup.
- **`PublicRoute`'s default redirect is `/home`** (`src/router/public-route.tsx:14`), not
  `/dashboard`. `/dashboard` is a `<Navigate to="/home" replace />` stub with no page behind
  it (`src/router/index.tsx:335`).

### Where a signed-in user lands

One target, three places that must agree on it:

| Path in | Goes to | Source |
|---|---|---|
| `/` while signed in | `/home` | `src/router/root-redirect.tsx:23` |
| `/login` or `/signup` while signed in | `/home` | `src/router/public-route.tsx:14` |
| After a successful login | `location.state.from ?? '/home'` | `components/login-page.tsx:25` |
| After a capability denial | `/home` | each capability guard |

## 2. Screens

### 2.1 Login — `components/login-page.tsx`

Split-screen: an animated GIF panel beside the form.

| Element | Behaviour |
|---|---|
| Email, password | controlled inputs |
| Password visibility toggle | `Eye` / `EyeOff` from `lucide-react` |
| Submit | calls `signIn`; navigation happens in the effect, not the handler |
| "Forgot password?" | posts the **email currently in the form** to the reset-request endpoint |
| Error | the backend's message, or a generic fallback |
| Reset confirmation | the backend's message, shown inline on success |

The reset control reuses the email field rather than opening its own form. With the field
empty it shows "Enter the email address you want to reset first."
(`login-page.tsx:64`) instead of calling the API.

### 2.2 Signup — `components/signup-page.tsx`

**A dead end, and knowingly so.** The form renders, and submitting throws
`Sign up is not available in this app. Please contact an administrator.` from
`auth-repository.ts:237`. A Google sign-in button is present and throws similarly
(`:241`).

Accounts come from the backend's invite flow. Keeping the screen means the route and its link
resolve rather than 404, and the error tells the user what to do — but nothing here can
create an account. See [PHASES.md §4](PHASES.md#4-deliberately-not-built).

### 2.3 Reset password / first-password setup — `components/reset-password-page.tsx`

One screen serving two jobs: a forgotten password, and a new user's first password. Which one
it is depends only on who was sent the link.

| State | What the user sees |
|---|---|
| No `token` in the URL | "Invalid or missing reset token. Please use the link from your email." plus a button to `/login` (`:129`) |
| Token present | the new-password form (`:144`) |
| Submitting | disabled control with progress text |
| Success | navigates to `/login` with `replace`, so Back does not return to a spent token |
| Failure | the backend's message inline |

## 3. States

| State | Trigger | What the user sees |
|---|---|---|
| Loading (app-wide) | `isLoading` while the session restores | full-screen "Loading..." from the guard, not from this module |
| Idle | no session | the login form |
| Submitting | a call in flight | disabled submit with progress text |
| Error | any rejected call | the backend's message, or a generic fallback |
| Reset sent | reset-request resolved | the backend's message inline, form still usable |
| Already signed in | `isAuthenticated` on `/login` | immediate redirect, no flash of the form |
| Unavailable | signup or Google submitted | the "contact an administrator" error |
| Bad link | `/reset-password` with no token | the invalid-link message |

The session restore is synchronous, so in practice the app-wide loading state lasts one tick
on a page load with a stored session — not a visible spinner. It becomes visible only where a
capability guard runs afterwards.

## 4. Interaction rules

- **Navigate from an effect, not from the submit handler.** `LoginPage` watches
  `isAuthenticated` (`:36`). This is what makes the page self-redirecting for an
  already-signed-in visitor, and why it needs no `PublicRoute`.
- **Preserve where the user was going.** `ProtectedRoute` sets
  `state: { from: location }`; `LoginPage` reads it and falls back to `/home`. Breaking
  either half silently sends everyone to `/home`.
- **`replace` on every auth navigation.** Login, reset-success and each guard use it, so the
  history does not fill with redirects and Back does not re-enter a resolved state.
- **Reset success leaves the page.** The token is single-use; staying would offer a form that
  can only fail.
- **Never render a protected screen while `isLoading`.** The guards own this, but it is the
  rule this module's synchronous restore exists to make cheap.

## 5. Responsive and print behaviour

The three screens use Tailwind utilities and the shared `AuthLayout`
(`src/shared/layouts/auth-layout.tsx`) — no sidebar, no header, no chat. The login
split-screen collapses to a single column on narrow widths; the GIF panel is decorative and
drops out first.

No print styles. *Not applicable — nobody prints a login form.*

## 6. Accessibility

- Shared `Input` and `Label` primitives, so every field is labelled.
- The password toggle is a real `<button>` with an accessible name, not an icon on a `<div>`.
- Errors render as text next to the form, in the flow.

Not covered: errors are **not** announced — none of the three screens uses `role="alert"`, so
a screen-reader user who submits a wrong password gets no announcement. The rest of the app
does use `role="alert"` for this (see
[leaderboards UI §6](../leaderboards/UI.md#6-accessibility)), so this is an inconsistency
rather than a house style. Recorded in [PHASES.md §5](PHASES.md#5-outstanding).

## 7. Styling and theming

Tailwind utilities inline, plus the shared UI primitives. There is no `auth.css` and no class
prefix, because the screens are simple enough not to need one.

One exception worth knowing: the login submit button carries a hard-coded gold gradient as
inline Tailwind arbitrary values (`login-page.tsx:185`) rather than a `Button` variant. It
will not follow a theme change. If the brand gold moves, this is a place it will be missed.
