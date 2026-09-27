# Events — Overview

| | |
|---|---|
| **Module** | `events` |
| **Source** | `src/features/events/` |
| **Routes** | 14 authenticated under `/events/*`, 4 **public** under `/event/*` |
| **Backend module** | `events` → `mlm_platform/docs/events/` |
| **API prefix** | `/api/events/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Purpose

Events is a ticketing platform: build an event, sell tickets to the public, take payment, assign who
attends, check them in at the door, and settle the money afterwards. At 11,366 lines it is the
third-largest module, and the only one with a **substantial unauthenticated surface** — a guest with a
link can browse, buy, pay and manage a ticket without an account.

That public half is what shapes the module. It means two service layers (one that requires a token and
one that must never send one), a Stripe integration the client is trusted with, and an
email-plus-invoice-number authentication scheme for guests who own tickets but have no login.

Two domain distinctions run through everything and are the first things to learn:

- **Owner is not holder.** The owner controls a ticket and can transfer or assign it; the holder is
  whose name is on the badge. A team leader may own fifty tickets and name fifty different holders.
- **A ticket has two independent statuses**, not one — `assignment_status` and `lifecycle_status` —
  plus attendance, which is a separate record entirely.

## 2. Scope

**In scope**
- The event builder: design, pricing tiers, speakers, partners, add-ons, promo codes, tracked sellers,
  custom fields, policies, payment config.
- The public landing page, guest checkout with Stripe, and ticket management without a login.
- Orders: listing, manual creation (cash, cheque, credit, comp), refunds, invoices.
- Tickets: assign a holder, transfer ownership, history, QR.
- Check-in: scanning, manual, stats, export.
- Post-sale: recognition awards, email blasts, attendee questions, per-event permission delegation,
  and the escrow finance report.

**Explicitly out of scope**
- **Payment capture and webhooks.** Stripe confirms the card in the browser; the backend's webhook
  issues tickets. The client **polls** for that.
- **BPM guests.** Assigning a ticket can optionally create a prospect via a lazy import, but `bpm`
  owns prospects.
- **Subscription billing.** `settings` owns Stripe for subscriptions; this module's Stripe usage is
  event payments only.
- **Recognition outside events.** This is per-event recognition, not the platform's promotion system.

## 3. At a glance

| | |
|---|---|
| Routes | 14 authenticated + 4 public |
| Pages | 17 (13 authenticated, 4 public) |
| Components | 49 |
| Hooks | 9 |
| Services | **6** |
| Type modules | 8 |
| Endpoints consumed | `/api/events/` and `/api/events/public/` families |
| LOC (ts/tsx) | 11,366 — `components/` 5,819 · `pages/` 2,580 · `services/` 892 · `hooks/` 856 · `types/` 793 |
| Doc tier | Full |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Big Event** | The event itself. The backend model is `BigEvent`. |
| **Shortcut** | The event's public URL slug — `/event/:shortcut`. |
| **Pricing tier** | A priced ticket band, usually time-bounded. |
| **Add-on** | An extra purchasable alongside a ticket. |
| **Tracked seller** | Someone whose sales are attributed to them. |
| **Owner** | `current_owner_user` — who controls the ticket. |
| **Holder** | `holder_first_name/last_name/email/phone` — who attends. May differ from the owner. |
| **Assign** | Name the attendee. Updates holder fields, logs it, sets `assignment_status=ASSIGNED`. |
| **Transfer** | Change ownership. Creates a transfer row, clears the holder, sets `TRANSFERRED`. |
| **Assignment status** | `UNASSIGNED` / `ASSIGNED` / `TRANSFERRED`. |
| **Lifecycle status** | `ACTIVE` / `CANCELLED` / `REFUNDED`. **Independent** of assignment. |
| **Attendance** | A separate check-in record. Not a status value. |
| **Invoice number** | `{shortcut}-{padded counter}`, e.g. `SUMMIT2026-00042`. |
| **Escrow** | Stripe funds held pending SMD payout. |
| **Blast** | A bulk email to holders, purchasers or owners. |
| **Claim proof** | Email + invoice number — how a guest with no login proves a ticket is theirs. |

## 5. Dependencies

**Upstream**
- `@stripe/react-stripe-js`, `@stripe/stripe-js` — `CardElement` and `confirmCardPayment`.
- `src/shared/components/ui/` — the form and dialog primitives.
- `src/shared/components/qr-code` — ticket QR.
- `@zxing/browser` — check-in scanning.

**Downstream**
- `src/router/index.tsx` — 18 routes, four of them outside `ProtectedRoute`.
- `bpm` — indirectly: assigning a ticket can create a prospect.

**Backend** — `events`. Payment settlement is Stripe → backend webhook, not the client.

**External** — Stripe.

## 6. Document map

| Document | Read it when |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Before any change. Holds the two service layers, the checkout state machine, and the URL gotcha. |
| [UI.md](UI.md) | Changing the builder, a public page, or check-in. |
| [API.md](API.md) | The endpoint families — and why authenticated URLs have a doubled segment. |
| [OPERATIONS.md](OPERATIONS.md) | Stripe keys, a stuck order, or a check-in problem. |
| [PHASES.md](PHASES.md) | **Before changing ticket status, owner/holder, or config storage.** Several decisions look like normalisation mistakes and are not. |

## 7. Where to start reading

1. `types/public.ts` and `types/ticket.ts` — the public contract and the two-status model.
2. `services/public-event-service.ts:1` — why the public layer is separate, and the URL gotcha, both
   stated in its header.
3. `hooks/use-event-checkout.ts:1` — the three-round-trip checkout state machine, including why step 3
   polls.
4. `components/public/stripe-payment-step.tsx` — the payment step, and what it deliberately never sees.
5. `pages/event-builder-page.tsx` with `components/builder/tabs/` — the largest surface.
