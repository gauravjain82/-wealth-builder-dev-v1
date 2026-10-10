# Events — API

| | |
|---|---|
| **Module** | `events` |
| **Source** | `src/features/events/services/` (6) |
| **Routes** | 14 authenticated, 4 public |
| **Backend module** | `events` → `mlm_platform/docs/events/API.md` |
| **API prefix** | `/api/events/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Endpoints **consumed**, not exposed.

## 1. Conventions

**Read this before writing a URL in this module.**

> **The events router is mounted at `/api/events/`, so authenticated event URLs carry a doubled
> segment:** `/api/events/events/{id}/...`. Public URLs do not: `/api/events/public/...`. It looks like
> a typo in every service file and it is correct (`services/public-event-service.ts:8`).

Two auth postures, in two service families:

| | Authenticated services | `public-event-service` |
|---|---|---|
| Files | `event`, `config`, `order`, `post-sale`, `checkin` | one |
| Token | `Authorization: Token …`, and **throws if absent** | **never sent** |
| Prefix | `/api/events/events/…`, `/api/events/orders/…`, `/api/events/tickets/…` | `/api/events/public/…` |

`event-service.ts` throws `No authentication token found` rather than sending an anonymous request,
because on an authenticated events page a missing token is a bug, not a state. On the public pages it is
the normal condition — hence the separate service.

Uploads (event imagery) send `FormData`, so `authHeaders(false)` omits `Content-Type`.

## 2. Endpoints consumed

By family rather than exhaustively — the service method is the searchable name.

### Events and configuration — `event-service.ts`, `config-service.ts`

| Family | Path shape |
|---|---|
| Events | `/api/events/events/` and `/api/events/events/{id}/` — also lists and retrieves events delegated to the user |
| Access | `/api/events/events/my-access/` — which screens open, and for which events (`types/access.ts`) |
| Pricing tiers | `/api/events/events/{id}/tiers/…` |
| Speakers | `/api/events/events/{id}/speakers/…` |
| Product partners | `/api/events/events/{id}/partners/…` |
| Add-ons | `/api/events/events/{id}/addons/…` |
| Promo codes | `/api/events/events/{id}/promos/…` |
| Tracked sellers | `/api/events/events/{id}/sellers/…` |
| Custom fields | `/api/events/events/{id}/custom-fields/…` |

**Each nested config resource is its own REST collection, not a nested writable serializer.** That is
what lets one `ConfigCollectionEditor` serve all seven list-shaped resources, and it is a deliberate
choice recorded in [PHASES.md §3](PHASES.md#3-decision-log).

List endpoints filter `is_active=True` by default — config is **soft-deleted**.

### Orders and tickets — `order-service.ts`

| Family | Path shape |
|---|---|
| Orders | `/api/events/orders/` and `/api/events/orders/{id}/` |
| Refund | an action on an order |
| Tickets | `/api/events/tickets/` and `/api/events/tickets/{id}/` |
| Assign holder | a ticket action — `assign/`. A manager may send `to_user_id` (a picked person) and `update_contact`; a new prospect joins the chosen SMD's team (backend E23) |
| Transfer | a ticket action — `transfer/` (WB tickets, moves ownership) or `hand-over/` (BSCPro, names the new attendee) |
| Person search | `/api/events/events/{id}/people/search/?q=` — agents and prospects for the managers' transfer picker; `searchPeople`, called only through `hooks/use-people-search.ts` (key `['events', eventId, 'people-search', q]`, forwards `signal`) |
| History | per ticket |

### Check-in — `checkin-service.ts`

Attendee list with filters, scan, **undo scan** (`:96`), manual check-in, stats, and export
(`xlsx` / `pdf`). `listPurchases` returns `CheckinPurchasePage` — the page plus `can_assign`, which
gates the door's Assign. The door's Assign itself goes through `orderService.assignTicket`, called
from `useCheckIn().assign`, which re-fetches the list and counters.

### Post-sale — `post-sale-service.ts`

One service for five surfaces: recognition categories and awards, email blasts plus a **recipient
preview**, attendee questions, `EventPermission` grants, and the escrow report.

### Public — `public-event-service.ts`

| Purpose | Note |
|---|---|
| Fetch the public event by shortcut | `PublicEvent`, with `SalesState` |
| Promo preview | priced server-side before it is applied |
| Checkout | returns the order **and a PaymentIntent client secret** |
| Poll order status | until the webhook flips it to `PAID` |
| Claim tickets | email + invoice number |
| Assign / transfer | both re-send the proof and **return the refreshed claim payload** |
| Ticket by QR token | `/event/ticket/:qrToken` |

## 3. Payload types

Eight type modules, one per concern. The ones carrying real design:

| Type | Module | Note |
|---|---|---|
| `BigEvent`, `BigEventListItem`, `BigEventPayload` | `event.ts` | `stripe_account_id` lives here |
| `PricingTier`, `EventSpeaker`, `EventAddOn`, `EventPromoCode`, `EventTrackedSeller`, `EventCustomField`, `EventProductPartner` | `config.ts` | the seven soft-deleted collections |
| **`OrderStatus`** | `order.ts` | `PENDING \| PAID \| REFUNDED \| CANCELLED \| COMP` |
| **`TransactionType`** | `order.ts` | `STRIPE \| CASH \| CHECK \| CREDIT \| COMP` |
| `OrderSource` | `order.ts` | `PUBLIC \| ADMIN` — a manual order is distinguishable from a guest one |
| **assignment + lifecycle status** | `ticket.ts` | **two independent fields** — see below |
| `SalesState`, `SalesReason` | `public.ts` | `OPEN \| NOT_STARTED \| ENDED \| SOLD_OUT \| NO_TIER` |
| `PublicEvent.tickets_sold` | `public.ts` | **optional**: present only when an enabled `stats` section has a `tickets_sold` item ([E16](PHASES.md#3-decision-log)) |
| `PublicSeller.team_name` | `public.ts` | **optional**: the external team's name, `""` for our own leaders; absent from a backend that predates it, and then read as `""` ([E23](PHASES.md#3-decision-log)) |
| `EventSpeaker.group` | `config.ts` | `keynote \| speaker`; the public list returns keynotes first |
| `SectionType`, `*Content` | `landing.ts` | adds `tagline`, `stats`, `marquee` (content) and `checkout` (model-backed, at most one); `pricing` takes optional `PricingContent` and `checkout` optional `CheckoutContent` (`anchor_price` ≤24, `show_qr`, `own_team_label` ≤60; a backend that predates it drops both on save and returns `{}`); `cta_band` gains `size`/`body`/`highlight`/`signoff`. Limits are enforced by `events/services/landing_sections.py` |
| `EventThemeKey` | `themes/registry.ts` | must match backend `EventTheme`; `champion` is the model default |
| `CheckoutPayload`, `CheckoutResult` | `public.ts` | **"the server prices the order and always creates a Stripe payment"** (`:125`) |
| `PublicOrderStatus` | `public.ts` | what step 3 polls (`:170`) |
| `ClaimProof`, `ClaimResult` | `public.ts` | email + invoice number |
| `BlastStatus`, `BlastAudience`, `BlastRecipientFilter` | `post-sale.ts` | `holders \| purchasers \| owners` |
| `QuestionStatus` | `post-sale.ts` | `OPEN \| ANSWERED \| CLOSED` |
| `PermissionScope` | `post-sale.ts` | `EVENT \| PURCHASE \| CHECKIN \| QUESTION` |
| `EscrowReport` | `reports.ts` | funds held pending payout |
| `PersonSearchHit` | `ticket.ts` | `kind: agent \| prospect`; a prospect's `email`/`phone` arrive in full, an agent's masked; `upline_seller` is the SMD their recruiting line credits ([E20](PHASES.md#3-decision-log)) |
| `HandOverPayload`, `TransferPayload` | `ticket.ts` | managers add `to_user_id`, `create_prospect`, `update_contact`; built from a `RecipientDraft` by `utils/recipient-draft.ts` |

**The two-status model is the contract detail most likely to be "simplified" by mistake.** A ticket
carries `assignment_status` (`UNASSIGNED`/`ASSIGNED`/`TRANSFERRED`) and `lifecycle_status`
(`ACTIVE`/`CANCELLED`/`REFUNDED`) **independently**, and attendance is neither — it is a separate
check-in record. A single `status` enum cannot express "assigned and refunded", which is a real state.

## 4. Query parameters

| Group | Used by |
|---|---|
| `EventFilters` | the event list; `surface` narrows it to the events one screen opens for (`builder`, `purchases`, `checkin`, `recognition`, `emails`, `questions`, `permissions`; anything else is a 400) |
| `OrderFilters` | orders — status, source, tier, seller |
| `CheckinFilters` | the attendee list |
| `BlastRecipientFilter` | the recipient preview |
| `shortcut` (path) | every public event route |
| `qrToken` (path) | the public ticket page |

Pagination uses `PaginatedResponse<T>` from `types/event.ts`, shared across the authenticated lists.

## 5. Error codes and handling

No typed error class and no stable code vocabulary — failures surface per page from each hook's own
error state.

| Situation | Client behaviour |
|---|---|
| No token on an authenticated service | **throws immediately** — a bug, not a state |
| Sales closed | not an error: `SalesState` carries a reason |
| Stripe card declined | Stripe's own message; the order stays unpaid and is retryable |
| **Webhook slow** | `confirming` **keeps polling** — the common case, not a failure |
| Webhook never runs | the poll does not resolve. See [OPERATIONS.md](OPERATIONS.md#6-troubleshooting) |
| Bad claim proof | rejected; rate-limited |
| Promo invalid | previewed server-side, so it is rejected before checkout |
| Refund failure | surfaced on the order |
| Missing per-event permission | 403 from the API; there is no client guard |
| Transfer recipient refused | `hand-over/` and `transfer/` return `{detail, code}` — `smd_required`, `not_prospect`, `email_taken`, `email_required`, `same_person` — shown as the toast message |

The one to understand is the difference between **slow** and **broken** in step 3 of checkout. A poll
still running is the expected path; only a poll that never resolves is a problem, and the cause is
server-side.

## 6. Backend ownership

`events` owns, and the client must not recompute:

- **Pricing.** The server prices every order, including promo application. `types/public.ts:125` states
  it: *"the server prices the order and always creates a Stripe payment."*
- **Sales state**, with its reason.
- **Ticket issuance**, on the `payment_intent.succeeded` webhook — never on a client signal.
- **Invoice numbers**, generated atomically as `{shortcut}-{padded counter}`.
- **Assign and transfer semantics**, including clearing the holder on transfer and writing the log rows.
- **Authorization**, via `authz` plus per-event `EventPermission` delegation.
- **Claim verification and its rate limiting.**
- **Escrow accounting.**
- **Prospect creation on assign**, through a lazy import so the events app stays decoupled from `bpm`.

The client owns the builder's forms, the checkout state machine, holding the claim proof in memory, and
polling.

**Stripe's split of responsibility.** The client confirms the card — it holds the publishable key and a
client secret, and `CardElement` keeps the card number out of this application entirely. Everything after
confirmation is the backend's: the webhook is what makes an order `PAID` and issues tickets.
