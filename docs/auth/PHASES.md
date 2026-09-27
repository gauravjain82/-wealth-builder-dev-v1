# Auth — Phase History

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

> Phases marked `~` are reconstructed from `git log -- src/features/auth` rather than taken
> from a written plan. See [the standard](../DOCUMENTATION_STANDARD.md#6-phase-conventions).
> There was never a plan for this module; the `A` decision prefix is assigned by this
> document.

## 1. Timeline

12 commits touching `src/features/auth`, 2026-03-24 to 2026-09-04.

| Phase | Date | Status | Shipped |
|---|---|---|---|
| ~0 | 2026-03-24 | Superseded | Firebase Auth, with a swappable repository behind it |
| ~1 | 2026-04-15 → 2026-05 | Shipped | DRF token login against `accounts`; the seven `localStorage` keys |
| ~2 | 2026-06-01 | Shipped | Password reset request, and `/reset-password` as the setup-link target |
| ~3 | 2026-06-12 → 06-26 | Shipped | Super-admin role; `isAdmin` and promotion flags persisted on the session |
| ~4 | 2026-09-04 | Shipped | Privacy-policy and terms links on the login screen |

## 2. Phases

### ~0 — Firebase Auth (2026-03-24)

**Goal.** Sign-in for the new app.

**What shipped.** Firebase Auth behind `AuthRepository`, so the provider could be swapped.
The `onAuthStateChange` subscription, `signInWithGoogle` and self-service `signUp` all come
from this phase and all made sense in it.

**Decisions.** A1.

**Divergence from plan.** Abandoned within weeks. Its shapes survive as the vestiges in §4:
the repository layer no other module has, and two methods that now throw.

### ~1 — DRF token login (2026-04-15 → 2026-05)

**Goal.** Authenticate against the real backend.

**What shipped.** `POST /api/accounts/login/` returning a token and user id; the follow-up
profile fetch; `persistSession` writing the seven `localStorage` keys; `useAuth` publishing
the result.

**Decisions.** A2, A3, A4.

**Divergence from plan.** The repository abstraction was kept but never used for a second
implementation, and `onAuthStateChange` was reduced to a synchronous read with a no-op
unsubscribe (`auth-repository.ts:255`) instead of being replaced with something honest. Every
consequence in [ARCHITECTURE.md §3.1](ARCHITECTURE.md#31-session-restore-every-page-load)
follows from that one shortcut.

### ~2 — Password reset and first-password setup (2026-06-01)

**Goal.** Let a user recover a password — and let an invited user set their first one.

**What shipped.** "Forgot password?" on the login screen, reusing the email field;
`/reset-password` as the emailed link's target, reading the token from the query string and
posting it with the new password.

**Decisions.** A5.

**Divergence from plan.** The final call is made from the component
(`reset-password-page.tsx:78`), not through the service or repository — the only network call
in this module that skips both layers.

### ~3 — Role and access flags on the session (2026-06-12 → 2026-06-26)

**Goal.** Support a super-admin role and gate the promotion area.

**What shipped.** `wb.roles`, `isAdmin` and `wb.hasPromotionAccess` persisted at login and
read by `AdminRoute` and the menu.

**Decisions.** A6.

**Why it matters later.** This is the approach the 2026 rollouts rejected. Session flags are
cached at login, so a grant does not take effect until the user signs out and back in, and
the value sits in `localStorage` where the client can change it. Capabilities fetched at
runtime fixed both — see [platform](../platform/PHASES.md#3-decision-log) decision P6.

### ~4 — Legal links (2026-09-04)

**Goal.** Satisfy Google's OAuth branding review.

**What shipped.** Privacy-policy and terms links on the login screen, and the matching public
routes rendering without a session (`src/router/index.tsx:165`, `:170`).

## 3. Decision log

| ID | Decision | Rationale | Source |
|---|---|---|---|
| A1 | Put a repository layer behind auth so the provider could be swapped | Firebase was expected to be temporary, and it was — but the seam was never used for the swap it was built for | `docs/_archive/ARCHITECTURE.md`, `repositories/auth-repository.ts` |
| A2 | DRF token in `localStorage`, not a cookie or in-memory | Simplest thing that worked with the backend's existing auth, and it survives a reload with no refresh endpoint. Costs: XSS-readable, no expiry, no cross-tab coordination | `auth-repository.ts:307` |
| A3 | A failed profile fetch does not fail the login | A user with a valid token should get in even if a profile field is broken. Costs: a session can carry a thin profile, so display fields need fallbacks | `auth-repository.ts:157` |
| A4 | Redirect to `/home`, never `/dashboard` | `/dashboard` was the Firebase-era landing page. It is now a `<Navigate>` stub kept so old links and bookmarks resolve | `router/root-redirect.tsx:23`, `router/index.tsx:335` |
| A5 | One screen for password reset **and** first-password setup | Both are "you have a token, set a password". Two screens would differ only in wording, and the client cannot tell which case it is anyway | `components/reset-password-page.tsx` |
| A6 | Coarse access flags cached on the session | Adequate for role-shaped access, and free — the profile was already being fetched. Superseded for named rollouts by P6, not withdrawn for roles | `auth-repository.ts:317-322` |
| A7 | `signOut` makes no backend call | There is no logout endpoint, and a DRF token is not a session to end. Consequence: the token stays valid after sign-out, so clearing the client is not revocation | `auth-repository.ts:245` |

## 4. Deliberately not built

- **Self-service signup.** `signUp` throws (`auth-repository.ts:237`). Users are provisioned
  by the backend's invite flow, which assigns a plan, a role and an agency code that a
  self-service form could not supply. The screen stays so the route resolves and the error
  tells the user what to do.
- **Google sign-in.** `signInWithGoogle` throws (`:241`). The Google OAuth in this app is for
  *calendar access* ([calendar-sync](../calendar-sync/)), not identity — a distinction the
  button's presence obscures.
- **Token refresh.** DRF tokens do not expire. There is nothing to refresh.
- **Server-side sign-out.** Decision A7.
- **A real auth subscription.** `onAuthStateChange` keeps Firebase's shape over a synchronous
  `localStorage` read. Nothing listens to the `storage` event, so there is no cross-tab sync —
  see [ARCHITECTURE.md §3.1](ARCHITECTURE.md#31-session-restore-every-page-load).
- **Session validation on load.** The stored token is trusted until a request fails.
- **Typed error codes.** `parseError` returns a string, so the UI cannot distinguish "wrong
  password" from "account disabled".

## 5. Outstanding

Ordered cheapest first. Items 1 and 2 are the ones users feel.

1. **Handle 401 centrally.** The single highest-value fix in this module and the one most
   often mistaken for a backend outage: a revoked token leaves a signed-in-looking app with
   every panel failing, recoverable only by clearing `localStorage` by hand. One interceptor
   that clears the session and redirects to `/login` fixes it everywhere. Shared with
   [platform §5](../platform/PHASES.md#5-outstanding) because the fix belongs in whatever
   HTTP client the app settles on.
2. **Announce errors.** None of the three screens uses `role="alert"`, so a failed login is
   silent to a screen reader. The rest of the app does this correctly, so it is an
   inconsistency, not a house style.
3. **Cross-tab sign-out.** A `storage` event listener in `AuthProvider` would make sign-out
   propagate. Small, and closes a genuine surprise.
4. **Move the reset call behind the repository.** `reset-password-page.tsx:78` is the only
   component in the module that calls `fetch`. Trivial, and it makes the layering claim in
   [ARCHITECTURE.md §1](ARCHITECTURE.md#1-layering) true without qualification.
5. **Collapse `AuthService` into `AuthRepository`.** The service forwards seven methods and
   adds nothing. Removing it would leave `auth` looking like every other module.
6. **Decide what to do with the signup screen.** It renders a form that cannot work. Either
   replace it with an explanation and a contact route, or remove the route and the link. The
   current state is the worst of both.
7. **Type the errors.** An `AuthError` with a `code`, matching `LeaderboardError`, would let
   the login screen distinguish a wrong password from a disabled account.
