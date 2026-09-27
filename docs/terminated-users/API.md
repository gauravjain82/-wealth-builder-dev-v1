# Terminated Users — API

| | |
|---|---|
| **Module** | `terminated-users` |
| **Source** | `src/features/terminated-users/services/terminated-users-service.ts` |
| **Routes** | `/terminated-users` |
| **Backend module** | `accounts` → `mlm_platform/docs/accounts/API.md` |
| **API prefix** | `/api/accounts/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Endpoints **consumed**, not exposed.

## 1. Conventions

Platform conventions ([platform API §1](../platform/API.md#1-conventions)) — its own `API_BASE_URL` and
auth headers, like most modules.

## 2. Endpoints consumed

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/accounts/users/terminated/` | the terminated list |
| GET | `/api/accounts/users/` | user detail |

**Read-only.** There is no endpoint here to terminate or reinstate anybody — this module reports a state it
cannot change.

## 3. Payload types

Declared in the service: the terminated-user record and the list response.

## 4. Query parameters

Search and filtering over the list.

## 5. Error codes and handling

No typed errors; the service throws with the response message. A missing token throws before the request.

## 6. Backend ownership

`accounts` owns termination itself, the retained record, and **who may see this list** — there is no client
guard on the route, so the API is the boundary.

**Where termination happens:** [team](../team/)'s `TrackerUserProfileModal`. That modal is editable and can
terminate a user, which is exactly why BPM uses the read-only `ProspectDetailsModal` for guest lists instead
(see [team](../team/PHASES.md#3-decision-log) decision T7). This module is the read side of that action.
