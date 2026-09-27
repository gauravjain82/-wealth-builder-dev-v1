# Platform — API

| | |
|---|---|
| **Module** | `platform` |
| **Source** | `src/features/auth/repositories/auth-repository.ts`, `src/shared/services/content-page-service.ts` |
| **Routes** | — |
| **Backend module** | `accounts`, `authz` → `mlm_platform/docs/accounts/API.md` |
| **API prefix** | `/api/accounts/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Endpoints **consumed**, not exposed. This file holds the conventions every module's
> service follows, plus the identity endpoints the shell itself calls.

## 1. Conventions

Copy these when adding a service. They are consistent across all 21 API prefixes.

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  return { Authorization: `Token ${token}`, 'Content-Type': 'application/json' };
}
```

| Convention | Value | Why |
|---|---|---|
| Base URL | `VITE_API_BASE_URL`, defaulting to `http://localhost:8000` | one env var, no per-module config |
| Auth | `Authorization: Token <token>` — DRF token auth | not a bearer JWT; there is no refresh |
| Trailing slash | **required** — `/api/wbreporting/leaderboards/` | Django `APPEND_SLASH` will otherwise redirect and drop the method on a POST |
| Cancellation | forward React Query's `signal` into `fetch` | a superseded request is cancelled, not merely ignored |
| Errors | non-2xx → a typed error class carrying the backend's `code` | lets a component branch on a stable code instead of a message |

Note the duplication: these helpers are re-declared per module rather than imported.
`src/shared/services/content-page-service.ts` exports both and `home` uses them, but the
shared version was never adopted broadly. Follow the local convention in the module you are
editing; see [ARCHITECTURE.md §8](ARCHITECTURE.md#8-invariants-and-failure-modes).

## 2. Endpoints consumed

The shell itself calls only identity endpoints.

| Method | Path | Service function | Hook | Purpose |
|---|---|---|---|---|
| POST | `/api/accounts/login/` | `authRepository.signIn` | `useAuth().signIn` | exchange credentials for a token |
| GET | `/api/accounts/users/<id>/` | `fetchUserProfile` | — | profile after login |
| GET | `/api/accounts/users/me/` | `authRepository.refreshPhotoURL` | — | refresh the avatar |
| POST | `/api/accounts/password-reset-request/` | `authRepository.requestPasswordReset` | — | start a reset |
| POST | `/api/accounts/password-reset/` | called directly by `ResetPasswordPage` | — | set a new password with a token |

The last one is called from the component rather than through the service or repository — the
one place in the app where a component calls `fetch`. See
[auth API §2](../auth/API.md#2-endpoints-consumed).

`signUp` and `signInWithGoogle` exist on the repository but are not wired to an endpoint —
see [PHASES.md §4](PHASES.md#4-deliberately-not-built) and
[auth PHASES §4](../auth/PHASES.md#4-deliberately-not-built).

### The prefixes in use

21 `/api/<app>/` prefixes, by call-site count. Each maps to a Django app whose own
`API.md` in `mlm_platform/docs/` is the authority.

| Prefix | Calls | Consumed by |
|---|---|---|
| `tracker` | 85 | `team`, `home`, `admin` |
| `bpm` | 73 | `bpm` |
| `accounts` | 57 | `auth`, `admin`, `settings`, `licensing`, `terminated-users`, `team` |
| `matchup` | 28 | `matchup`, `bpm`, `calendar-sync` |
| `builderai` | 18 | `builder-ai` |
| `events` | 16 | `events` |
| `content` | 13 | `home`, `file-vault`, `training-center`, `admin` |
| `calendarsync` | 13 | `calendar-sync` |
| `authz` | 13 | `admin`, `settings` |
| `payments` | 9 | `settings` |
| `helpdesk` | 7 | `helpdesk` |
| `misalignments` | 6 | `admin` |
| `wbreporting` | 5 | `leaderboards`, `contests`, `admin/wb-pipeline` |
| `notifications` | 4 | `matchup` |
| `gms` | 4 | `gms` |
| `telegram` | 3 | `settings` |
| `audit` | 3 | `admin` |
| `ai` | 2 | `ai` |
| `promotion` | 1 | `promotion` |
| `network` | 1 | `team` |

## 3. Payload types

Each module declares its own wire types in `features/<m>/types/` or `features/<m>/types.ts`.
There are no shared response envelopes: this backend returns resource shapes directly, not a
`{ok, data, meta}` wrapper, and a 4xx body is `{code, detail}`.

The shell's own session types are in `src/features/auth/types/`.

## 4. Query parameters

No shell-level convention beyond `URLSearchParams`. Two patterns worth copying:

- Build params in a named exported function so the page, the hook and the prefetch cannot
  disagree — `selectionParams` in `leaderboards-service.ts:84`.
- Let explicit values win over a named preset, and only send the preset when the explicit
  values are absent (`leaderboards-service.ts:86`).

## 5. Error codes and handling

| Status | Body | Client behaviour |
|---|---|---|
| 400 | `{code, detail}` | branch on `code`; show `detail` |
| 401 | — | **not handled centrally.** Whichever module's request hits it surfaces its own error. There is no interceptor and no forced logout. |
| 403 | `{code, detail}` | a capability the guard thought was held; guards redirect, services throw |
| 404 | `{code, detail}` | module-specific |
| 503 | `{code, detail}` | a source or pipeline is unavailable; treat as retryable |

The absence of central 401 handling is deliberate only in the sense that nobody built it. A
revoked token leaves the user on a working shell with failing panels rather than at
`/login`. Recorded in [PHASES.md §5](PHASES.md#5-outstanding).

## 6. Backend ownership

The server decides, and the client must not recompute:

- **Validation** — date ranges, allow-listed metrics and scopes, payload shapes.
- **Authorization** — every capability, on every request, independent of any guard.
- **Masking and visibility** — a field the viewer may not see is **absent from the
  response**, not nulled and not hidden by the client.
- **Ranking, aggregation and ratios** — computed server-side so two surfaces cannot disagree.
- **Hierarchy membership** — who is in whose base shop.

The client owns presentation, transient UI state, focus, responsive layout and request
cancellation. When in doubt, the rule is: if two clients could compute it differently, the
server owns it.
