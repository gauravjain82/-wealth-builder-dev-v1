# Settings — Architecture

| | |
|---|---|
| **Module** | `settings` |
| **Source** | `src/features/settings/` |
| **Routes** | `/settings` |
| **Backend module** | `accounts`, `authz`, `payments`, `telegram` |
| **API prefix** | four |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Layering

**Two files.** There is no `components/`, no `hooks/` and no `types/` directory.

| Layer | File | Lines |
|---|---|---|
| Page | `pages/settings-page.tsx` | **1,783** |
| Service | `services/settings-billing-service.ts` | 524 |

The service is well organised — ~15 named exported functions, one per operation, with its own
`getApiBaseUrl()` that **normalises a trailing slash** (`:194`), the same defensive step `auth` takes and
most modules do not.

The page is the problem. At 1,783 lines it is the largest single file in the app, holding six sections,
their forms, their state and their billing workflows with no internal decomposition. Recorded in
[PHASES.md §5](PHASES.md#5-outstanding) rather than presented as a pattern.

## 2. Component map

```
/settings ── SettingsPage (1,783 lines, one component)
  ├── §Profile                    👤  name, contact, birthday, photo upload
  ├── §Account Level              ⭐  displayed from authz roles
  ├── §Subscription & Billing     💎  id: settings-billing-upgrade
  ├── §Manage Subscription        🔧  id: settings-manage-subscription  → Stripe Portal
  ├── §My Upgrade Requests        🧾  what I asked for
  ├── §Pending Approval Requests  ✅  what I must approve (conditional)
  └── <CalendarSyncSection />         id: settings-calendar-sync  ← owned by calendar-sync
```

Three of those `id` attributes are **deep-link targets** used from elsewhere: `bpm` and `matchup` link to
`#settings-calendar-sync`, and the billing ids are linked from upgrade prompts.

## 3. Primary flows

### 3.1 Requesting an upgrade

1. `fetchPaymentProducts()` lists active products.
2. `fetchRoles()` (from `authz`) supplies the level options.
3. `createSubscriptionApprovalRequest()` raises a request.
4. `fetchMySubscriptionApprovalRequests(oldId)` shows its state, keyed on `old_id`.

The request is **not** a purchase. It is a request for somebody to approve a level change, which is why
it lives in `payments` alongside the money rather than in `accounts`.

### 3.2 Approving somebody else's request

1. `fetchMyApprovalRequests()` — requests with `assigned_to_me=true`.
2. `approveRequest()` or `rejectRequest()`.

The **Pending Approval Requests** section renders only when the user has any, so most people never see
it. That makes it easy to forget it exists when changing the page.

### 3.3 Updating a card

1. `createSetupIntent(oldId)` returns a client secret.
2. Stripe collects the card — this application never sees the number.
3. The saved card becomes the default for the subscription.

A SetupIntent rather than a payment: the point is to store a card without charging it.

### 3.4 Self-service billing

`createBillingPortalSession()` returns a **short-lived Stripe-hosted** session URL. Everything a customer
might want to do to their own subscription — cancel, change plan, see invoices — happens on Stripe's
page, not ours. That is the whole reason the integration exists: it avoids reimplementing subscription
management.

### 3.5 Profile

`fetchCurrentUserDetails()` / `updateCurrentUserDetails()` against `/api/accounts/users/me/`, plus
`uploadCurrentUserPhoto(userId, photo)` which sends `FormData`.

## 4. Server state and caching

**No React Query.** The page holds everything in `useState`, loaded by `useEffect`.

| State | Source |
|---|---|
| Profile | `accounts` |
| Roles / level | `authz` |
| Products | `payments` |
| My requests, requests assigned to me | `payments` |
| Payment history | `payments` |
| Telegram link token | `telegram` |
| Calendar sync | **`calendar-sync`'s own React Query hooks**, inside its section |

So one route runs two state models side by side: the page's `useState` and, inside the hosted section,
React Query. That works because they share nothing.

A known consequence: the page has a pre-existing `loadData` exhaustive-deps lint warning, which is what a
single large `useEffect` loading seven things produces.

## 5. Local and URL state

| State | Owner | Lives in |
|---|---|---|
| Every form draft | the page | `useState` |
| Which section is expanded | the page | `useState` |
| **Deep-link target** | the URL fragment | `#settings-calendar-sync`, `#settings-billing-upgrade`, `#settings-manage-subscription` |
| `?google_connected=1` | the URL | consumed and stripped by the hosted section |

The fragments are a real API. Other modules navigate to them, so renaming an `id` breaks a link in
another feature with no compile error.

## 6. Permissions and gating

**No route guard** — `/settings` is under `ProtectedRoute` only, because everyone has settings.

Two things are conditional on server data rather than on a permission:

| Conditional | Driven by |
|---|---|
| Pending Approval Requests section | whether any request is `assigned_to_me` |
| Which products can be requested | `payments` returning them as active |

Approving a request is authorised server-side; the section appearing is a consequence of having work, not
a capability check.

## 7. Integration points

- **`payments`** — six of the nine endpoints. The substance of the module.
- **`accounts`** — profile read/write and photo upload.
- **`authz`** — roles, for the level display.
- **`telegram`** — a link token.
- **Stripe** — a Billing Portal session and a SetupIntent. Subscription-side only;
  [events](../events/) has its own, separate usage.
- **[calendar-sync](../calendar-sync/)** — hosted here, and **stylistically dependent** on this page:
  `.glass-section` and `.input-field` are scoped under `.settings-profile-page`.

## 8. Invariants and failure modes

| Invariant | Enforced by | Breaks as |
|---|---|---|
| The client never sees a card number | Stripe collects it | PCI scope this app does not want |
| A Billing Portal session is short-lived | Stripe issues it per click | a stale URL that fails confusingly |
| An upgrade is a **request**, not a purchase | the approval workflow | a level change with nobody accountable |
| `old_id` keys a request lookup | `fetchMySubscriptionApprovalRequests(oldId)` | a duplicate request, or the wrong one shown |
| Photo upload sends `FormData` | no `Content-Type` set | an opaque parser error |
| The base URL is normalised | `getApiBaseUrl()` strips a trailing slash | `//api/...` |
| **The section `id`s are stable** | convention only | a broken deep link from `bpm`, `matchup` or a billing prompt — **with no compile error** |
| The hosted section keeps this page's styles | `.settings-profile-page` scoping | `calendar-sync` rendering unstyled |

**The size problem.** 1,783 lines in one component, with seven sections' state in one place, is the
module's defining weakness. It is why the lint warning exists, why the Pending Approval section is easy to
forget, and why a change to one section carries risk for the others. Splitting it is the first item in
[PHASES.md §5](PHASES.md#5-outstanding).

**The stylistic coupling runs both ways.** `calendar-sync` cannot move out of this page without losing its
styles, and this page cannot rename `.glass-section` or restructure `.settings-profile-page` without
breaking that section. Neither module owns the boundary.
