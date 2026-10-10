# Events — Architecture

| | |
|---|---|
| **Module** | `events` |
| **Source** | `src/features/events/` |
| **Routes** | 14 authenticated, 4 public |
| **Backend module** | `events` |
| **API prefix** | `/api/events/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27; guest checkout confirmation against `fix/event-payment-confirmation` — 2026-10-10 |

## 1. Layering

Standard layering ([platform §1](../platform/ARCHITECTURE.md#1-layering)), but **split in two by
authentication** — the defining structural fact of this module.

| Layer | Files | Owns |
|---|---|---|
| Types | `types/` (8 modules) | one module per concern: event, config, order, ticket, checkin, public, post-sale, reports |
| Services | `services/` (**6**) | event, config, order, post-sale, checkin — **and `public-event-service` separately** |
| Hooks | `hooks/` (9) | including two state machines: checkout and ticket claim |
| Components | `components/` (49) | plus `components/builder/` and `components/public/` subtrees |
| Pages | `pages/` (13) + `pages/public/` (4) | authenticated and public, kept apart |

**Why the public service is separate** (`services/public-event-service.ts:1`): the authenticated
services **throw** when `wb.authToken` is missing, which is the *normal* state for a guest on
`/event/:shortcut`. `public-event-service` never sends an `Authorization` header at all. Sharing one
client would mean either a service that throws on its happiest path, or a token leaking onto a public
page.

`event-service.ts` makes the throw explicit: `if (!token) throw new Error('No authentication token
found')`.

## 2. Component map

```
AUTHENTICATED                                    PUBLIC (no session)
/events                EventsListPage            /event/:shortcut            EventLandingPage
/events/purchases      PurchasesPage             /event/:shortcut/checkout   EventCheckoutPage
/events/check-in       CheckinPage               /event/:shortcut/transfer   EventTransferPage
/events/recognition    RecognitionPage           /event/ticket/:qrToken      EventTicketPage
/events/permissions    PermissionsPage
/events/:id/builder    EventBuilderPage ──┐
/events/:id/orders     EventOrdersPage    │
/events/:id/my-tickets EventMyTicketsPage │
/events/:id/checkin    EventCheckinPage   │
/events/:id/recognition …                 │
/events/:id/emails     …                  │
/events/:id/questions  …                  │
/events/:id/access     …                  │

EventBuilderPage
 └── EventBuilderShell
      ├── tab-registry.ts          ← the 11 tabs, declared once
      ├── BuilderTabContent
      │    └── one of: event · location · design · pricing · ticketing · payments
      │              · speakers · partners · addons · promos · custom-fields · policies
      ├── TabForm + use-tab-form   ← shared form plumbing
      ├── ConfigCollectionEditor   ← shared CRUD for every list-shaped config
      └── ImageUploadField

services: event · config · order · post-sale · checkin   |   public-event-service
          (throw without a token)                         |   (never sends one)
```

`ConfigCollectionEditor` plus `tab-registry.ts` is why eleven config tabs are not eleven
implementations: each list-shaped resource (speakers, tiers, add-ons, promos, partners, tracked
sellers, custom fields) is its own REST collection with the same CRUD shape, so one editor serves them
all.

## 3. Primary flows

### 3.1 Guest checkout — three server round-trips and one Stripe round-trip

The state machine is `hooks/use-event-checkout.ts`, and its stages are
`form → creating → paying → confirming → done`.

1. **`submit()`** — POST checkout. The **server prices the order** and returns the order plus a
   PaymentIntent client secret.
2. **Stripe** — the caller confirms the card with that secret, via `CardElement` and
   `confirmCardPayment`.
3. **`confirmed()`** — **poll the order** until the server has settled it to `PAID` and issued
   tickets. While it waits the buyer sees "Payment received — issuing your tickets".

**Step 3 is not defensive padding.** Ticket issuance is asynchronous: Stripe returning `succeeded` in
the browser means the charge went through, *not* that the server knows. Treating the Stripe result
as completion would show a success page with no tickets behind it.

**The poll is also what settles the order when the webhook does not** (PHASES E23). The server
settles on `payment_intent.succeeded`, and on every poll of an unpaid order it reads the
PaymentIntent from Stripe itself and settles if Stripe says `succeeded`. The browser's word is still
never trusted — the check is server to Stripe.

**A declined card keeps the buyer on the card step**, with Stripe's message, retrying the same order
and PaymentIntent. Returning to the form would make the next submit a second order.

The client never sees card data — `CardElement` is a Stripe-hosted iframe, so a raw card number never
enters this application.

### 3.2 Managing a ticket with no login

`hooks/use-ticket-claim.ts`. There is **no session**: email plus invoice number is the proof, and it is
**re-sent with every action**, held in hook state after a successful claim.

Assign and transfer both return the refreshed claim payload, which is stored directly — no follow-up
fetch. The flow is stateless server-side and rate-limited.

### 3.3 Assign versus transfer

Two distinct actions, and conflating them is the most likely domain error in this module:

| | Assign | Transfer |
|---|---|---|
| Means | name the attendee | change who controls the ticket |
| Writes | holder fields + an assignment log row | a transfer row + `current_owner_user` |
| Holder | set | **cleared** |
| `assignment_status` | `ASSIGNED` | `TRANSFERRED` |

### 3.4 Check-in

Scan or manual, against the event's attendee list, with stats and an `xlsx`/`pdf` export. A scan can be
reversed — `checkin-service.ts:96` exists specifically to undo an accidental one.

### 3.5 Post-sale

One service (`post-sale-service.ts`) covering five surfaces: recognition awards, email blasts with a
recipient preview, attendee questions, per-event permission grants, and the escrow report. Its header
states the rule the whole module follows: **pages and hooks depend on a service, never on `fetch`
directly.**

## 4. Server state and caching

**No React Query.** Nine hooks own their own state with `useState` + `useEffect`, like `bpm` and
`team`. Two of them are genuine state machines (checkout, claim) where React Query would not have
helped — they model a sequence, not a cache.

| State | Held by |
|---|---|
| Event list, filters, pagination | `events-list-page` |
| Builder drafts, per tab | `use-tab-form` |
| Orders, filters | `use-event-orders` |
| Check-in list and stats | `use-check-in` |
| Checkout stage | `use-event-checkout` |
| Claim proof + payload | `use-ticket-claim` |
| Selected big event | `use-big-event-selection` |

The consequence is the same as in `bpm`: no shared cache between the eighteen routes, no cancellation,
and each page reloading what it chose to. Recorded in [PHASES.md §5](PHASES.md#5-outstanding).

## 5. Local and URL state

| State | Owner | Lives in |
|---|---|---|
| Event id | the URL | `/events/:eventId/*` |
| **Shortcut** | the URL | `/event/:shortcut` — the public identifier |
| **QR token** | the URL | `/event/ticket/:qrToken` |
| Builder tab | the page | `useState`, from `tab-registry` |
| Claim proof | `use-ticket-claim` | `useState` — **not** `localStorage`, deliberately |
| Checkout stage | `use-event-checkout` | `useState` |

Holding the claim proof in memory rather than storage means closing the tab ends the guest's access,
which is the right default for a credential that is only an email and an invoice number.

## 6. Permissions and gating

**No route guard on the authenticated routes** — they sit under `ProtectedRoute` only. Authorization is
server-side, through two mechanisms:

| Mechanism | Scope |
|---|---|
| `authz` resources | the platform's permission system, configured in the access console |
| **`EventPermission`** | **per-event delegation**, scoped `EVENT` / `PURCHASE` / `CHECKIN` / `QUESTION` |

Per-event delegation is the interesting one: an event owner can grant somebody check-in rights for one
event without giving them anything else. `/events/:id/access` is that screen.

**Which screens show is decided by access, from either layer, never by role** (decision
[E13](PHASES.md#3-decision-log)). `GET /api/events/events/my-access/` reports, per screen — builder,
purchases, check-in, recognition, emails, questions, permissions — whether it opens for at least one
event (`surfaces`), for every visible event (`global_surfaces`), and per delegated event
(`delegations`). `hooks/use-events-access.ts` reads it with React Query, and three places use it:

| Consumer | Uses |
|---|---|
| The sidebar's Big Event group (`config/menu.ts`) | `surfaces` — one child per open screen; no group if none |
| The event picker on the cross-event pages (`BigEventSurface`) | sends `?surface=<screen>`, so the backend lists only the events that screen opens for |
| `EventSubnav` | `global_surfaces` plus this event's `delegations` entry; *My tickets* always shows |

A platform-wide grant counts whether it comes from a role, a level or a per-user override in
**Admin → User Permissions**. The screen-to-grant mapping lives once, in the backend's
`events.permissions.SURFACES`; the frontend never reimplements it.

**The four public routes are outside `ProtectedRoute` entirely.** Their protection is: nothing for
browsing, Stripe for payment, and email-plus-invoice-number (rate-limited) for ticket management.

## 7. Integration points

- **`events` backend** — see [API.md](API.md).
- **Stripe** — `CardElement` in the browser, `confirmCardPayment`, then a backend webhook. The client's
  only job after confirmation is to poll.
- **`bpm`, indirectly** — assigning a ticket can create a prospect, via a **lazy import** on the
  backend so the events app stays decoupled. The toggle is logged-in only: the public guest page has no
  team to attach a prospect to.
- **`settings`** — shares the same `@stripe/react-stripe-js` version and integration pattern; this
  module's payment step was written to match it.
- **Escrow** — tracks Stripe funds held pending SMD payout, surfaced in the reports panel.

## 8. Invariants and failure modes

| Invariant | Enforced by | Breaks as |
|---|---|---|
| The public service never sends a token | a separate service with no auth header | a token on a page a stranger can load |
| Authenticated services fail loudly without a token | an explicit `throw` | a silent unauthenticated request |
| **Checkout completes only when the server reports the order `PAID`** | step 3 polls the order; only `PAID`/`COMP` ends it | a success page with no tickets behind it |
| The client never sees card data | Stripe-hosted `CardElement` iframe | PCI scope this app does not want |
| Assignment and lifecycle status are **independent** | two fields | a refunded ticket that cannot also be "assigned", or the reverse |
| Attendance is a record, not a status | a separate check-in row | attendance lost when a status changes |
| Owner and holder may differ | separate fields | a leader unable to buy fifty tickets for fifty people |
| Transfer clears the holder | the transfer action | a ticket whose new owner inherits a stranger's name on the badge |
| The claim proof is re-sent per action | no session | a stateless credential treated as a login |
| Config lists soft-delete | `is_active`, filtered by default | history destroyed by removing a tier |

**The URL gotcha.** The events router is mounted at `/api/events/`, so authenticated event URLs carry a
**doubled segment** — `/api/events/events/{id}/...` — while public ones do not
(`/api/events/public/...`). This looks like a typo in every service file and is not
(`services/public-event-service.ts:8`).

**What makes the two-status model load-bearing.** A single `status` field cannot express "assigned and
refunded", which is a real state: somebody bought a ticket, named an attendee, then got a refund. The
split also keeps attendance out of the enum, so checking somebody in does not overwrite the fact that
the ticket was transferred.
