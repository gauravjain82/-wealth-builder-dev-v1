# Events — UI

| | |
|---|---|
| **Module** | `events` |
| **Source** | `src/features/events/pages/`, `components/` |
| **Routes** | 14 authenticated, 4 public |
| **Backend module** | `events` |
| **API prefix** | `/api/events/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Routes and entry points

### Authenticated — under `ProtectedRoute`, no capability guard

| Route | Component |
|---|---|
| `/events` | `EventsListPage` |
| `/events/purchases` | `PurchasesPage` |
| `/events/check-in` | `CheckinPage` |
| `/events/recognition` | `RecognitionPage` |
| `/events/permissions` | `PermissionsPage` |
| `/events/:eventId/builder` | `EventBuilderPage` |
| `/events/:eventId/orders` | `EventOrdersPage` |
| `/events/:eventId/my-tickets` | `EventMyTicketsPage` |
| `/events/:eventId/checkin` | `EventCheckinPage` |
| `/events/:eventId/recognition` | `EventRecognitionPage` |
| `/events/:eventId/emails` | `EventEmailsPage` |
| `/events/:eventId/questions` | `EventQuestionsPage` |
| `/events/:eventId/access` | `EventPermissionsPage` |

The five non-`:eventId` routes are cross-event views; the eight `:eventId` ones are per-event.

### Public — outside `ProtectedRoute`

| Route | Component | Protection |
|---|---|---|
| `/event/:shortcut` | `EventLandingPage` | none — anyone with the link |
| `/event/:shortcut/checkout` | `EventCheckoutPage` | Stripe |
| `/event/:shortcut/transfer` | `EventTransferPage` | email + invoice number, rate-limited |
| `/event/ticket/:qrToken` | `EventTicketPage` | the token in the URL |

## 2. Screens

### 2.1 Event builder — `pages/event-builder-page.tsx`

The largest surface: a shell, a tab registry and eleven tabs.

| Tab | Configures |
|---|---|
| Event | name, shortcut, dates |
| Location | venue |
| Design | branding and imagery |
| Pricing | pricing tiers |
| Ticketing | ticket settings |
| Payments | payment config, including `stripe_account_id` |
| Speakers | the speaker list |
| Partners | product partners |
| Add-ons | purchasable extras |
| Promos | promo codes |
| Custom fields | extra checkout questions |
| Policies | terms and policy text |

Two shared pieces keep eleven tabs from being eleven implementations: **`TabForm` + `use-tab-form`** for
form plumbing, and **`ConfigCollectionEditor`** for every list-shaped resource — they all have the same
CRUD shape because each is its own REST collection.

`tab-registry.ts` declares the tabs once, so adding one is a registry entry plus a tab component.

### 2.2 Public landing — `pages/public/event-landing-page.tsx`

Built from `components/public/`: `EventHero`, `EventCountdown`, `PricingTiersSection`,
`SpeakersSection`, `PartnersSection`, `LocationSection`, `QuestionSection`, inside
`PublicEventShell`.

Sales state is a **server answer** with a reason: `OPEN`, `NOT_STARTED`, `ENDED`, `SOLD_OUT`, `NO_TIER`.
The page renders the reason rather than inferring it from dates.

### 2.3 Public checkout — `pages/public/event-checkout-page.tsx`

Five stages, driven by `use-event-checkout`: `form → creating → paying → confirming → done`.

| Element | Note |
|---|---|
| `CheckoutFields` | quantity, holder details, custom fields |
| Promo entry | previewed server-side before it is applied |
| `OrderSummary` | **the server prices the order** — the client does not compute a total |
| `StripePaymentStep` | `CardElement` in a Stripe-hosted iframe; **never sees a card number** |
| Confirming | polls until the webhook issues tickets |

### 2.4 Public ticket management — `event-transfer-page.tsx`, `event-ticket-page.tsx`

Email plus invoice number claims the tickets; `ClaimedTicketRow` then offers assign and transfer.
`TicketQr` renders the QR. The proof is re-sent with every action — there is no session.

### 2.5 Orders — `pages/event-orders-page.tsx`

The order list with filters, `AddPurchaseModal` for a manual order, and `OrderDetailModal` for one
order. Manual orders record a **settled** payment — cash, cheque, credit or comp — whereas Stripe guest
checkout stays on the public page (`components/add-purchase-modal.tsx:49`).

A refund "refunds the payment (Stripe if applicable) and marks every ticket refunded".

### 2.6 Check-in — `pages/event-checkin-page.tsx`

Scan or manual, stats, filters and export (`xlsx` / `pdf`). **A scan can be reversed** — an accidental
scan is a normal operational event at a door, not an error state.

### 2.7 Post-sale screens

| Page | Shows |
|---|---|
| Recognition | award categories and awards |
| Emails | blasts with status `DRAFT`/`SENDING`/`SENT`/`FAILED`, audience `holders`/`purchasers`/`owners`, and a **recipient preview before sending** |
| Questions | attendee questions, `OPEN`/`ANSWERED`/`CLOSED` |
| Access | per-event permission grants, scoped `EVENT`/`PURCHASE`/`CHECKIN`/`QUESTION` |
| Reports panel | the escrow report — Stripe funds held pending SMD payout |

## 3. States

| State | Trigger | What the user sees |
|---|---|---|
| Sales not open | `SalesState` reason | the reason: not started, ended, sold out, or no tier |
| Sold out | `SOLD_OUT` | stated; no checkout |
| Creating order | `creating` | a disabled form with progress |
| Paying | `paying` | the Stripe step |
| **Confirming** | `confirming` | **waiting for the webhook — not yet done** |
| Done | `done` | tickets issued |
| Payment failed | Stripe declined | the Stripe error; the order stays unpaid |
| Claim failed | wrong email or invoice | rejected, rate-limited |
| Unassigned ticket | `UNASSIGNED` | prompts for a holder |
| Transferred | `TRANSFERRED` | the holder is **cleared** |
| Refunded | `lifecycle_status: REFUNDED` | shown independently of assignment |
| Checked in | a check-in record exists | attendance, reversible |
| Blast sending | `SENDING` | in progress; `FAILED` is a distinct state |
| Comp order | `TransactionType: COMP` | no payment |

## 4. Interaction rules

- **Never treat Stripe's success as completion.** Poll until the order is `PAID`.
- **Never price an order in the client.** The server prices it, always.
- **Keep assign and transfer distinct.** Transfer clears the holder; assign sets it.
- **Re-send the claim proof with every public action.** There is no session to rely on.
- **Preview blast recipients before sending.** A blast is not undoable.
- **Let a scan be undone.** A door operator will mis-scan.
- **Soft-delete config.** Removing a tier must not destroy the orders that referenced it.
- **Render the sales reason**, not a date comparison.

## 5. Responsive and print behaviour

Tailwind utilities; no module stylesheet. The public pages are the ones that must work on a phone — a
guest opens the link on whatever they have — and the checkout and ticket pages are built accordingly.
The builder and the order tables are desktop surfaces.

Check-in is used on a phone at a door, so the scan panel and the attendee list are the parts that matter
at narrow widths. Scanning needs **HTTPS**.

No print styles. Check-in exports `xlsx`/`pdf` server-side instead, which is the right answer for a list
somebody wants on paper.

## 6. Accessibility

Shared primitives supply labelled inputs and Radix-backed dialogs. Stripe's `CardElement` brings its
own accessible field handling.

Not audited: 49 components and 17 pages, with no systematic pass. The public checkout is the highest-value
place to start, since it is the one surface used by people who are not staff and cannot ask for help.

## 7. Styling and theming

No module stylesheet — Tailwind plus `shared/components/ui` throughout, including on the public pages.
That means the public event pages inherit the app's theme rather than carrying event-specific branding
in CSS; per-event branding comes from the **Design tab** as data (imagery and colours on the event
record), not from stylesheets.
