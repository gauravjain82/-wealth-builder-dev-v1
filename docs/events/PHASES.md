# Events — Phase History

| | |
|---|---|
| **Module** | `events` |
| **Source** | `src/features/events/` |
| **Routes** | 14 authenticated, 4 public |
| **Backend module** | `events` |
| **API prefix** | `/api/events/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Phase numbering comes from `mlm_platform/EVENTS_BUILD_PROGRESS.md` (phases 0–5, all complete) and
> **must not be renumbered**. The design decisions come from `EVENTS_CONTEXT.md` §"Key Design Decisions
> (Resolved)"; the `E` prefix is assigned by this document, since that file recorded them without IDs.
>
> Each has been **re-verified against the code** for this document. They matter unusually much here
> because **four of them look like normalisation mistakes and are not** — E3, E4, E6 and E8 would all
> be "cleaned up" by a well-meaning reader.

## 1. Timeline

Only 4 commits touch this directory: the module arrived in large drops rather than incrementally.

| Phase | Status | Shipped |
|---|---|---|
| 0 | Complete | Foundations |
| 1a | Complete | Models and API (backend) |
| **1b** | **Complete** | **Builder frontend — core tabs** |
| **1c** | **Complete** | **Builder frontend — remaining tabs** |
| **2** | **Complete** | **Public landing and checkout** |
| **3** | **Complete** | **Purchases dashboard** |
| **4** | **Complete** | **Check-in** |
| **5** | **Complete** | **Recognition, escrow, blasts, questions, permissions** |

Later refinements: event routing and `@types/qrcode` (2026-09-04), embedded rendering with menu changes
(2026-09-06), and the QR scan work shared with BPM's Phase 8 including **the fallback decoder iOS needs**
(2026-09-25). **Access-driven Big Event navigation** (2026-10-05, decision E13): the sidebar group, the
event pickers and the in-event tabs follow access instead of role, so a per-event delegate can reach
their event. Coupled with the `mlm_platform` branch of the same name, `feature/wb-big-event-access`.

## 2. Phases

### Phases 1b / 1c — the builder

**What shipped.** `EventBuilderShell`, `tab-registry.ts` and eleven tabs, with `TabForm` +
`use-tab-form` for shared form plumbing and `ConfigCollectionEditor` for every list-shaped resource.

**Decisions.** E4, E6.

**Why one editor serves seven collections.** Each nested config resource is its own REST collection
rather than a nested writable serializer (E6), so speakers, tiers, add-ons, promos, partners, tracked
sellers and custom fields all have the same CRUD shape.

### Phase 2 — public landing and checkout

The phase that shaped the module. It introduced an **unauthenticated surface**, which forced a second
service layer and a client-side Stripe integration.

**What shipped.** `pages/public/` (4 pages), `components/public/` (13 components),
`public-event-service.ts`, and the `use-event-checkout` state machine.

**Decisions.** E1, E7, E9.

**The thing this phase got right and is easy to undo.** Checkout does **not** finish when Stripe says
`succeeded`. Ticket issuance happens on the `payment_intent.succeeded` webhook, so the client polls the
order until it is `PAID` (`hooks/use-event-checkout.ts:1`). Treating the Stripe result as completion
would show a success page with no tickets behind it — and the user has been charged.

### Phase 3 — purchases dashboard

**What shipped.** Orders with filters, `AddPurchaseModal` for manual settled orders (cash, cheque,
credit, comp), `OrderDetailModal`, refunds, and the authenticated assign modal.

**Decisions.** E2, E3, E5, E10.

**Divergence from plan.** The prospect-creation toggle on assign was built in Phase 1a on the backend
but only surfaced here, because it is logged-in-only: the public guest page has no team to attach a
prospect to.

### Phase 4 — check-in

**What shipped.** Scan and manual check-in, stats, filters, `xlsx`/`pdf` export, and **scan reversal**.

### Phase 5 — post-sale

**What shipped.** Recognition awards, email blasts with a recipient preview, attendee questions,
per-event `EventPermission` delegation, and the escrow report — all through one `post-sale-service.ts`
whose header states the module's rule: **pages and hooks depend on a service, never on `fetch`
directly.**

## 3. Decision log

From `EVENTS_CONTEXT.md` §"Key Design Decisions (Resolved)", verified against the code.

| ID | Decision | Rationale |
|---|---|---|
| **E1** | **A separate service for the public surface, which never sends a token** | The authenticated services *throw* when `wb.authToken` is missing, which is the normal state for a guest on `/event/:shortcut`. One shared client would mean either a service that throws on its happiest path or a token on a page a stranger can load. `services/public-event-service.ts:1` |
| **E2** | **Two independent ticket status fields, not one** — `assignment_status` (`UNASSIGNED`/`ASSIGNED`/`TRANSFERRED`) and `lifecycle_status` (`ACTIVE`/`CANCELLED`/`REFUNDED`) | A single enum cannot express "assigned and refunded", which is a real state. **Attendance is neither** — it is the existence of a check-in record — so checking somebody in cannot overwrite the fact that a ticket was transferred |
| **E3** | **Owner and holder are different people** — `current_owner_user` controls the ticket; `holder_*` fields name who attends | A team leader owns fifty tickets and names fifty different holders. Collapsing them would make bulk purchase impossible |
| **E4** | **Assign and transfer are distinct actions** | Transfer changes ownership, writes a transfer row and **clears the holder**; assign sets the holder and writes an assignment log. Merging them would either strand a stranger's name on a transferred badge or silently reassign ownership |
| **E5** | **`OneToOne` config models inlined onto `BigEvent`** as ordinary fields — design, payment config, ticket settings, policy | Avoids `RelatedObjectDoesNotExist` on access, a separate create step with signal coupling, and DRF nested-serializer pain. **This looks like under-normalisation and is a deliberate trade** |
| **E6** | **Each nested config resource is its own REST collection**, not a nested writable serializer | `/events/{id}/speakers/`, `/events/{id}/tiers/` and so on. One CRUD shape means one `ConfigCollectionEditor` serves all seven |
| **E7** | **The public transfer page authenticates with email + invoice number**, rate-limited and stateless | A ticket owner may have no account at all. There is no session; the proof is re-sent with every action and held only in memory (`hooks/use-ticket-claim.ts:1`) |
| **E8** | **Soft delete on every config collection** via `is_active`, filtered by default | An order references the tier it was bought at. Hard-deleting a tier would destroy the record of what somebody paid for |
| **E9** | **The server prices every order and always creates a Stripe payment** | `types/public.ts:125`. The client never computes a total, so a tampered browser cannot change a price |
| **E10** | **Prospect creation on assign goes through a lazy import** | Keeps the events app decoupled from BPM. The toggle is logged-in-only, since a public guest has no team to attach a prospect to |
| E11 | One discount model: `discount_type` (`FLAT`/`PERCENTAGE`/`FIXED_PRICE`) + `discount_value`, plus `max_uses`/`current_uses` | Three promo shapes in one model rather than three models |
| E12 | Invoice numbers are `{shortcut}-{padded counter}`, generated atomically | Human-readable and per-event, and the atomic counter is what makes them usable as half of E7's credential |
| **E13** | **Big Event navigation follows access, from either layer, not role** — the sidebar group, the event pickers and `EventSubnav` read `my-access`; the event list includes delegated events | Chosen over the plan-based group Broker and above had (2026-10-05). The plan menu hid the group from an Agent or Leader delegated `CHECKIN`, and the picker's list required `events:view`, so a delegate the backend would serve had no way in but a hand-typed URL. Conversely a Broker with no events grant saw a group whose pages failed. The screen-to-grant map lives once, in the backend's `events.permissions.SURFACES` |
| **E14** | **`champion` is the default theme for new events only** (2026-10-06) | Chosen over moving existing events onto it. The model default changes; stored values do not, so no live page changes look on deploy. Mirrors backend `docs/events/PHASES.md` E18 |
| **E15** | **The purchase form can sit on the landing page (`checkout` section), and every ticket CTA then scrolls to `#tickets`** (2026-10-06) | Chosen over restyling the separate checkout route only — the reference purchase page (bscpro) works because hero, urgency and form are one scroll. The route stays for shared links; one `CheckoutForm` serves both, so they cannot drift. Stripe.js loads on approach, not with the page |
| **E16** | **A live stat with no value is hidden, not shown as `0`; `tickets_sold` is absent unless an enabled stats section asks for it** (2026-10-06) | Sales volume is commercially sensitive, so adding the stat is the organizer's opt-in (backend E20). Same rule as module masking: absent means "not disclosed", not zero |
| **E17** | **Public event media is served as Firebase Storage download URLs with a deterministic token**, behind `EVENTS_MEDIA_CDN` (2026-10-06) | Chosen over a stored CDN URL per blob field (≈10 fields plus JSON content). Signed URLs expire, so browsers and the CDN could not cache a hero video across days. Backend E19 |
| **E18** | **Refund-policy agreement required on both checkout hosts and enforced by the server** (2026-10-06) | Chosen over a browser-only gate, which a crafted request could skip. When the event has a refund policy, `CheckoutForm` sends `refund_policy_accepted: true` and the backend returns a 400 field error keyed `refund_policy_accepted` without it; the form shows that error under the checkbox (UI §2.3). Resolves former Outstanding item 6 |

## 4. Deliberately not built

- **Client-side pricing.** E9.
- **A single ticket status field.** E2.
- **Separate tables for the `OneToOne` configs.** E5 — do not "normalise" these.
- **Nested writable serializers for config.** E6.
- **A session for public ticket management.** E7 — the proof is re-sent each time.
- **Hard delete of config.** E8.
- **A direct BPM dependency.** E10 — the import is lazy, on the backend.
- **Completion on Stripe's client-side success.** The webhook is the system of record.
- **A capability guard on the authenticated routes.** Authorization is `authz` plus per-event
  `EventPermission`.
- **Print styles.** Check-in exports `xlsx`/`pdf` server-side instead.
- **Per-event branding in CSS.** A theme key plus an accent colour, stored as data — UI §7.
- **YouTube as a hero background.** An embedded player shows its own title and controls over the hero; the background is an uploaded MP4/WebM served from the CDN.

## 5. Outstanding

1. **Verify the Stripe webhook before any event goes on sale.** The one failure in this module that
   takes money and delivers nothing, and the frontend cannot distinguish it from a slow network. It
   belongs first because it is operational, recurring, and the consequence is a charged customer with no
   ticket.
2. **Accessibility pass on the public checkout.** 49 components and 17 pages have had none, and checkout
   is the one surface used by people who are not staff and cannot ask for help.
3. **Consider React Query for the authenticated surfaces.** Eighteen routes share no cache, so moving
   between the order list and check-in refetches everything. The two state machines (checkout, claim)
   should stay as they are — they model a sequence, not a cache.
4. **Reconsider the doubled URL segment.** `/api/events/events/{id}/` is correct but reads as a typo in
   every service file, and it is the kind of thing that gets "fixed" into a 404. A backend router change
   would remove the confusion permanently.
5. **A second look at manual-order reconciliation.** Cash, cheque, credit and comp orders are recorded as
   settled with no payment trail, which is right for the workflow but means the escrow report and the
   Stripe balance will not agree by design. Worth stating in a finance runbook rather than leaving to be
   rediscovered.
