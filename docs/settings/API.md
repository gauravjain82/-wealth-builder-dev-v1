# Settings — API

| | |
|---|---|
| **Module** | `settings` |
| **Source** | `src/features/settings/services/settings-billing-service.ts` |
| **Routes** | `/settings` |
| **Backend module** | `accounts`, `authz`, `payments`, `telegram` |
| **API prefix** | four |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Endpoints **consumed**, not exposed. This module touches **four backend apps** — more than any other
> except [admin](../admin/).

## 1. Conventions

Platform conventions ([platform API §1](../platform/API.md#1-conventions)), with one improvement worth
copying: **`getApiBaseUrl()` strips a trailing slash** (`:194`), so a `VITE_API_BASE_URL` ending in `/`
does not produce `//api/...`. Only this module and [auth](../auth/API.md#1-conventions) do that.

Photo upload sends `FormData` with no `Content-Type`.

## 2. Endpoints consumed

### `payments` — the substance

| Method | Path | Service function |
|---|---|---|
| GET | `/api/payments/products/?active=true` | `fetchPaymentProducts` |
| GET | `/api/payments/history/` | `fetchMyPaymentHistory` |
| POST | `/api/payments/setup-intents/` | `createSetupIntent` |
| POST | `/api/payments/billing-portal-sessions/` | `createBillingPortalSession` |
| GET · POST | `/api/payments/subscription-requests/` | `fetchMySubscriptionApprovalRequests`, `createSubscriptionApprovalRequest` |
| GET | `/api/payments/subscription-requests/?assigned_to_me=true` | `fetchMyApprovalRequests` |
| POST | `/api/payments/subscription-requests/{id}/approve/` | `approveRequest` |
| POST | `/api/payments/subscription-requests/{id}/reject/` | `rejectRequest` |

### `accounts`

| Method | Path | Service function |
|---|---|---|
| GET · PATCH | `/api/accounts/users/me/` | `fetchCurrentUserDetails`, `updateCurrentUserDetails` |
| POST | `/api/accounts/users/{id}/upload-photo/` | `uploadCurrentUserPhoto` |

### `authz`

| Method | Path | Service function |
|---|---|---|
| GET | `/api/authz/roles/` | `fetchRoles` |

### `telegram`

| Method | Path |
|---|---|
| GET | `/api/telegram/link-token/` |

The same list query serves two purposes: `?old_id=` finds an existing request for a given target, and
`?assigned_to_me=true` finds requests awaiting this user's decision. One endpoint, two readings.

## 3. Payload types

Declared **inline in the service**, not in a `types/` directory:

| Type | Note |
|---|---|
| `CurrentUserDetails` | the profile |
| `PaymentProduct` | a purchasable plan |
| `SetupIntentResponse` | the client secret for saving a card |
| `PaymentHistoryResponse` | past payments |
| `SubscriptionApprovalRequestResponse` | a request and its state |
| `RoleOption` | a level, from `authz` |

There is no shared error type; each function throws on a non-2xx with the response text.

## 4. Query parameters

| Parameter | Endpoint | Purpose |
|---|---|---|
| `active=true` | products | only purchasable plans |
| `old_id=` | subscription requests | find the existing request for a target |
| `assigned_to_me=true` | subscription requests | the approval queue |

## 5. Error codes and handling

No typed error class and no stable codes. Each service function throws; the page surfaces the message.

| Situation | Client behaviour |
|---|---|
| Duplicate upgrade request | the `old_id` lookup should prevent it; the server is the gate |
| Card declined while saving | Stripe's message; nothing is stored |
| Portal session creation fails | surfaced; nothing to retry client-side |
| Not authorised to approve | 403 — the section appears based on *having* requests, not on a capability |
| Photo too large or wrong type | surfaced on the form |
| Trailing-slash base URL | handled by `getApiBaseUrl()` |

## 6. Backend ownership

- **`payments` owns the money**: Stripe customers, subscriptions, the Portal session, the SetupIntent, and
  the approval workflow's state machine.
- **Who may approve a request** — the client only renders what `assigned_to_me` returns.
- **Level changes.** An approved request is what changes a level; this page never writes one.
- **Product availability.**
- **`authz` owns roles**, which this page displays.
- **Stripe holds card data.** Neither this app nor its backend sees a card number.

The client owns the forms, the section layout, and the fragment ids other modules link to.
