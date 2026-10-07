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

**The sidebar's Big Event group follows access, not role.** Each child — Big Event Builder, Purchases,
Check-in, Permissions, Recognition Orders — shows when `my-access` reports that screen open for at least
one event, through a platform-wide grant or a per-event one. A user delegated `CHECKIN` on one event sees
**Big Event → Check-in** and nothing else, whatever their role. See
[ARCHITECTURE.md §6](ARCHITECTURE.md#6-permissions-and-gating).

The cross-event pages' **event picker lists only the events that page opens for**; with none, it says
"No events here yet. Events you create, or are given access to, appear here." The events list hides
**Add New Event** without `events:create`, and `EventSubnav` shows only the tabs open for that event
(gated tabs stay hidden while access loads, and all show if it fails to load).

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
| Event | name, shortcut, dates, timezone — a dropdown of IANA zones labelled with today's offset (`utils/timezones.ts`); the backend rejects any other value |
| Location | venue |
| Design | branding and imagery. Each image slot uploads, replaces and **removes** on the spot — Remove PATCHes the `*_blob_name` field to `""` (the model column is blank, not null) after a confirm |
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

`EventHero`, then the event's landing sections in the organizer's order (`landing-sections.tsx`
maps each `section_type` to a renderer), inside `PublicEventShell`. The layout comes from the Page tab,
or the theme's default when the page was never customised.

| Section type | Renderer | Notes |
|---|---|---|
| `tagline` | `TaglineSection` (`showcase-sections.tsx`) | hook lines, a word strip whose highlight cycles (static under reduced motion), ticket CTA + up to two links. The CTA reads `content.button_label`; blank → `TicketCta`'s theme default |
| `stats` | `StatsSection` | 1–4 tiles. Live items read `sales_state.tickets_remaining` / `tickets_sold`; **an absent live value hides the tile**, never shows `0`. Sold out shows "Sold out" |
| `marquee` | `MarqueeSection` | scrolling photo strip; a static grid under reduced motion; nothing when empty |
| `checkout` | `InlineCheckoutSection` | the purchase form inline at `#tickets` — see §2.3 |
| `pricing` | `PricingTiersSection` | with value copy in its content: one value card (struck comparison price, inclusions, motto). The price is still `current_tier` from the server. `eyebrow` (blank → "Your ticket") and `button_label` (blank → theme default) relabel the card but **do not by themselves switch to it** — only anchor, inclusions, motto or fine print do |
| `cta_band` | `CtaBandSection` | `size: 'final'` is a full-height closing call; `banner` (and rows saved before sizes) unchanged |
| `speakers` | `SpeakersSection` | when any speaker is `keynote`, a large-card keynote group, then the rest |

**Every ticket CTA goes through `TicketsLink`/`ticketsHref`** (`utils/ticket-links.ts`): when the layout
has an enabled `checkout` section it scrolls to `#tickets`, otherwise it links to the checkout route.
`TicketCta` adds the `sales_state` check, so a closed sale shows its reason instead of a button.

Sales state is a **server answer** with a reason: `OPEN`, `NOT_STARTED`, `ENDED`, `SOLD_OUT`, `NO_TIER`.
The page renders the reason rather than inferring it from dates.

### 2.3 Public checkout — `pages/public/event-checkout-page.tsx`

Five stages, driven by `use-event-checkout`: `form → creating → paying → confirming → done`.

The form is `CheckoutForm` (`components/public/checkout-form.tsx`), **shared with the inline
`checkout` landing section** — one form, two hosts (`layout: 'page' | 'inline'`). The inline host
requests Stripe.js only once the section is within ~800px of the viewport, or on submit
(`utils/stripe-loader.ts`). When the event has a refund policy, both hosts require an "I agree to the
refund policy" checkbox, and the payload carries `refund_policy_accepted: true`. **The server enforces
it** (PHASES E18): a checkout without it gets a 400 field error keyed `refund_policy_accepted`, which
`PublicApiError.fieldErrors` carries through `use-event-checkout` and the form shows under the checkbox
instead of in the banner (the banner keeps it if other fields failed too). Loading and error states
use the theme this tab last saw for the event (sessionStorage), else classic.

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

**Transferring a ticket.** "Transfer" opens `HandOverTicketModal` for a BSCPro ticket and
`TransferTicketModal` for a WB ticket, both in `manager` mode here. Both use
`TicketRecipientPicker` ([E20](PHASES.md#3-decision-log)):

| State | Shows |
|---|---|
| Searching | "Find the person" — name, agency code, email or phone; results say Agent or Prospect and their SMD |
| Agent picked | name, code, masked contact, read-only; an email field only when they have none on file (used for the ticket, not saved) |
| Prospect picked | their name, email and phone, editable; changes are saved to the prospect |
| Nobody picked | "Not in Wealth Builders?" — first name, last name, email (required), phone, and "Add them as a prospect" (on by default) |

Picking a person preselects the SMD their recruiting line credits. Adding a new prospect makes the
SMD required — they join that SMD's team. On My tickets the modals keep their owner/self forms: the
user-directory teammate picker, and typed details for a hand-over.

### 2.6 Check-in — `pages/event-checkin-page.tsx`

Scan or manual, a progress strip, filters and export (`xlsx` / `pdf`). **A scan can be reversed** — an
accidental scan is a normal operational event at a door, not an error state.

Top to bottom: the scan box (`components/checkin-scan-box.tsx`, autofocused — the door's main control),
the progress strip (`components/checkin-progress.tsx`: arrived / expected, a bar, to come · unnamed · via
a session scan), then one toolbar row — **Find attendee** search, *Search in*, the arrival tabs
**All · Not arrived · Arrived** (ticket counts from `checkin/stats/`), and the **Door | Detailed** switch.

The list (`components/checkin-purchase-list.tsx`) is **one table with one header**, each purchase a group
of rows led by the buyer's name, with our number and partner references beneath. Two views (PHASES E19),
remembered per browser in `localStorage['wb.checkinListView']`, default Door:

| | Door | Detailed |
|---|---|---|
| Columns | Attendee · Ticket · Arrival · Check in | Attendee · Ticket · Status · Arrival · Action |
| Single-ticket purchase | one row, "Bought by …" when the buyer is someone else | heading row + ticket row |
| Unnamed tickets | two or more fold into "N unnamed tickets" + **Check in next unnamed**; a search hit stays out | all listed |
| Arrival detail | `✓ time`; session, credential and admitting user in the tooltip | written under the time |
| Undo | only on tickets admitted from this device this visit | every arrived row |
| SMD, Linked badge, Export | hidden | shown; Excel / PDF / Print under **Export** |

Colour has one meaning each: green = arrived, amber = unnamed (and the search highlight), the brand
button = Check in. An assigned ticket shows no badge. The page keeps 6rem of bottom padding so the last
row clears the floating assistant button.

A **camera** scan that records a new check-in flashes the whole screen green with a check mark for
300 ms (`components/checkin-success-flash.tsx`), because the badge under the viewfinder went unseen. A
duplicate does not flash; its amber "Already checked in" line stands. BPM's scanner shares the flash.

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
- **Never offer to edit an agent from a ticket screen.** Only a prospect's details are editable in the transfer picker.
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
at narrow widths. Below `sm` the Ticket column is hidden and the ticket number moves under the
attendee's name, so the Door view fits a phone without scrolling sideways; Detailed keeps a minimum width
and scrolls. Door view's Check in buttons are 40px tall for touch. Scanning needs **HTTPS**.

No print styles. Check-in exports `xlsx`/`pdf` server-side instead, which is the right answer for a list
somebody wants on paper.

## 6. Accessibility

Shared primitives supply labelled inputs and Radix-backed dialogs. Stripe's `CardElement` brings its
own accessible field handling.

Not audited: 49 components and 17 pages, with no systematic pass. The public checkout is the highest-value
place to start, since it is the one surface used by people who are not staff and cannot ask for help.

## 7. Styling and theming

No module stylesheet — Tailwind plus `shared/components/ui` throughout. The public pages are themed
**as data**: `BigEvent.theme` picks an entry in `themes/registry.ts`, and `brand_color` overrides its
accent. Nothing is per-event CSS.

| Theme | Scheme | Look |
|---|---|---|
| `classic` | follows the app | the original page |
| `bold_dark` | dark | crimson, Fraunces + DM Sans, pill buttons |
| `minimal_light` | light | Playfair + Inter, square buttons |
| **`champion`** — default for new events | dark | black and warm-black bands, metallic gold buttons with glow, League Spartan uppercase + Montserrat, countdown in its own band |

`PublicEventShell` turns the theme into CSS variables (`--event-brand`, its `-light`/`-deep`/`-glow`/`-ink`
mixes, `--event-hairline`, and for token themes `--event-page|band|surface|text|muted`) and
`data-event-theme`. Sections draw with the shared primitives — `PublicSection`, `SectionTitle`,
`Eyebrow`, `PublicCard`, `BrandButton`, `BrandLink`, `TicketsLink` — so a new section is themed in all
four looks without per-theme code. The accent is hex-validated (`utils/public-brand.ts`), which also
keeps CSS injection out of `color-mix`.

Motion (glow pulse, marquee, word cycle, scroll reveal) is `motion-safe` only.

**Media.** Every public image and the hero MP4/WebM come back as `*_url` fields. With the backend's
`EVENTS_MEDIA_CDN` on they are permanent Firebase Storage download URLs, cached for a year; off, they are
24-hour signed URLs. The client treats both the same way.
