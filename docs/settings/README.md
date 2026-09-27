# Settings — Overview

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

## 1. Purpose

Settings is the account page: who you are, what level you are, what you pay, and what you have connected.
It is one route and, in practice, **one 1,783-line component** — the largest single file in the app.

Its substance is billing. Everything else on the page is a form; the subscription half carries a
two-sided approval workflow, a Stripe Billing Portal integration, a card-update flow through a
SetupIntent, and payment history. That is why a page about preferences touches **four backend apps**.

It is also the host for two things other modules own: the **Calendar Sync** section from
[calendar-sync](../calendar-sync/), and the account-level display that reflects `authz` roles.

## 2. Scope

**In scope**
- Profile: name, contact details, birthday, photo upload.
- Account level display.
- Subscription and billing: available products, upgrade requests, the Stripe Billing Portal, card
  updates via SetupIntent, payment history.
- The **approval workflow** — requesting an upgrade, and approving or rejecting requests assigned to you.
- Telegram account linking.
- Hosting `<CalendarSyncSection />`.

**Explicitly out of scope**
- **The Google Calendar connection.** [calendar-sync](../calendar-sync/) owns it; this page only renders
  its section, and the section depends on this page's styles to look right.
- **Event payments.** [events](../events/) has its own Stripe usage; this module's is subscriptions.
- **Granting permissions.** [admin](../admin/)'s access console does that. This page *displays* level.
- **Password change.** [auth](../auth/) owns the reset flow.

## 3. At a glance

| | |
|---|---|
| Routes | 1 |
| Pages | 1 — **1,783 lines** |
| Services | 1 — 524 lines |
| Components | 0 of its own |
| Sections on the page | 6, plus the hosted Calendar Sync section |
| Endpoints consumed | 9 across 4 apps |
| LOC (ts/tsx) | 2,307 |
| Doc tier | Full |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Product** | A purchasable subscription plan, from `payments`. |
| **Subscription request** | An upgrade request that needs somebody's approval. |
| **Assigned to me** | Requests this user must approve or reject. |
| **`old_id`** | The identifier a subscription request is keyed against when checking for an existing one. |
| **Billing Portal session** | A short-lived Stripe-hosted session for self-service billing. |
| **SetupIntent** | Stripe's flow for saving a new card without charging it. |
| **Account level** | The user's level, from `authz` roles. Displayed, never edited here. |

## 5. Dependencies

**Upstream**
- `@stripe/react-stripe-js` — the card-update flow.
- `src/shared/components/` — UI primitives.
- **`src/features/calendar-sync/components/calendar-sync-section`** — rendered at
  `settings-page.tsx:1448`.

**Downstream**
- `src/router/index.tsx` — one route.
- **[calendar-sync](../calendar-sync/) depends on this page's styles**: `.glass-section` and
  `.input-field` are scoped under `.settings-profile-page`, so that section only looks right here.

**Backend** — `accounts` (profile, photo), `authz` (roles), `payments` (the whole billing surface),
`telegram` (linking).

## 6. Document map

| Document | Read it when |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Before editing the page. Holds the billing flows and the size problem. |
| [UI.md](UI.md) | Changing a section, or the styles other modules depend on. |
| [API.md](API.md) | The 9 endpoints across 4 apps. |
| [OPERATIONS.md](OPERATIONS.md) | Stripe keys, a stuck upgrade request, or a card that will not save. |
| [PHASES.md](PHASES.md) | Before changing the approval workflow or the portal integration. |

## 7. Where to start reading

1. `services/settings-billing-service.ts` — 524 lines and the real content of this module. Read it
   before the page.
2. `pages/settings-page.tsx:1450` onward — the four billing sections, in order.
3. `pages/settings-page.tsx:1448` — where [calendar-sync](../calendar-sync/) is mounted.
