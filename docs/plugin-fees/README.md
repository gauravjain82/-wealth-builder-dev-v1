# Plug-in Fees — Overview

| | |
|---|---|
| **Module** | `plugin-fees` |
| **Source** | `src/features/plugin-fees/` |
| **Routes** | `/plugin-fees/statement`, `/admin/plugin-fees` (overview), `/admin/plugin-fees/review`, `/admin/plugin-fees/cycles`, `/admin/plugin-fees/payments`, `/admin/plugin-fees/payouts`, `/admin/plugin-fees/sevc-totals`, `/admin/plugin-fees/costs`, `/admin/plugin-fees/adjustments`, `/admin/plugin-fees/settings`, `/admin/plugin-fees/agents/:id/statement`; three sections embedded in `/settings` |
| **Backend module** | `plugin_fees` → `mlm_platform/docs/plugin_fees/` |
| **API prefix** | `/api/plugin-fees/` |
| **Status** | Merged-not-deployed — P2–P6 merged to `main` via PR #18 (`e91e5a5`); not deployed. Fee configuration + ledger split (2026-10-03) on branch `feature/plugin-fees-config`, uncommitted. Nobody holds `plugin_fees:review`, `:manage` or `:payout_approve` yet |
| **Doc version** | 0.5 |
| **Verified against** | `main` at `f8b0a78` (P2–P6, merged via PR #18) plus the uncommitted `feature/plugin-fees-config` working tree (fee configuration, ledger totals) — 2026-10-03 |

## 1. Purpose

MDs and SMDs pay a monthly **plug-in fee** whose amount depends on whether they have an
approved office, and an SMD's MD fees are routed to them only while they have a verified
assistant. The platform — not Stripe — decides all of that, so it needs the evidence: an
office address with a lease and a photo, an assistant's contact details, hours and photo,
and a saved payment method to collect from.

This module is the frontend for **phases P2 to P6** of that feature, plus the **fee
configuration** screen and the ledger totals (2026-10-03).

- **P2** gives the agent three sections on the Settings page (office, assistant, payment
  method) and gives the **Hierarchy Assistant** — the SEVC's assistant, holder of
  `plugin_fees:review` — a review page to approve offices and verify (or quarterly
  re-verify) assistants. Without it an agent cannot qualify for the office rate and an SMD
  cannot count as having an assistant.
- **P3** gives every MD and SMD a **statement of account** (invoices by month and, for
  SMDs, the ledger and balance), and gives admins the **billing cycles** screen (dry-run
  preview, stored monthly reports, approval of the go-live month), the **recognition and
  mailing costs** log, and a read-only lookup of any agent's statement.

- **P4** shows each invoice's payment state (scheduled charge, retrying, due / overdue
  self-pay, bank payment processing, failed, paid via — Klarna called out), lets the agent
  **Pay now** on Stripe's hosted page (bank, card or Klarna), and gives admins the
  **payments dashboard** (collection totals, sending progress, Send now, per-invoice
  status, CSV), **follow-ups** with a required resolution note, and **SMD ledger
  balances**.

- **P5** pays SMDs: on their statement an SMD sets up a **Stripe Connect** payout account
  ("Get paid": status, what Stripe still needs, balance, the onboarding redirect and its
  `?connect=` return), and admins get **Payouts** — prepare a finished quarter's report,
  review each SMD's line and the ledger entries behind it, approve it (which sends the
  Stripe transfers), retry a failed or held line, CSV.
- **P6** completes the admin side: the **Plug-in Fees overview** (one card per area, each
  linking to its page, plus the SMDs whose payout account is not set up), **SEVC totals**
  by month with a range and CSV, **manual ledger adjustments**, and **Void** on an
  invoice (payments dashboard and admin agent statement).
- **Fee configuration (2026-10-03)** gives admins **Fee Settings**: the effective-dated fee
  table (MD / SMD × with / without an approved office), scheduling a price change from a
  future 1st of the month, removing a scheduled one, the billing settings (go-live month,
  self-pay due day, re-verification window, assistant verification deadline), and the
  change history — every change with a required reason. Readers (`:review`,
  `:payout_approve`) see it read-only. The SMD ledger gains lifetime totals with MD fees
  from own MDs and rolled up from downline SMDs shown apart.

## 2. Scope

**In scope**
- Office section (every level at or above the Fee Settings level, MD by default): effective office, pending submission with Withdraw, submit
  form, rates, history with actions.
- Assistant section (same audience as the office): the same, plus the hours editor, the verification deadline and
  the re-verification notice.
- Payment method section (MD and SMD): saved method, Stripe setup-session redirect and the
  `?fee_pm=` return.
- Review page at `/admin/plugin-fees/review`: office and assistant queues, filters, search,
  pagination, approve / verify / re-verify / reject.
- Gating: `usePluginFeesAccess()`, the route guards, the menu entries.
- Statement of account at `/plugin-fees/statement` (MD and SMD): invoices with expandable
  lines; for SMDs the balance and the ledger with running balance.
- Billing cycles at `/admin/plugin-fees/cycles`: month preview, generated-cycle list,
  report (totals, SEVC totals, filterable agents table, CSV export), Approve.
- Recognition and mailing costs at `/admin/plugin-fees/costs`: list, log, delete.
- Agent statement lookup at `/admin/plugin-fees/agents/:id/statement` (read-only).
- Payment state on every invoice; Pay now and the `?fee_pay=` return.
- Payments dashboard and follow-ups at `/admin/plugin-fees/payments`; SMD balances on the
  billing cycles page; sending progress on an approved cycle report.
- "Get paid" (Stripe Connect) on the SMD's statement; the `?connect=` return.
- Payouts at `/admin/plugin-fees/payouts`: list, prepare, report with expandable ledger
  detail, approve, retry, CSV.
- Overview at `/admin/plugin-fees`; SEVC totals at `/admin/plugin-fees/sevc-totals`; ledger
  adjustments at `/admin/plugin-fees/adjustments`; Void on invoices.
- Fee settings at `/admin/plugin-fees/settings`: fee table, schedule / remove a price
  change, billing settings, change history, price history; ledger totals on statements.

**Explicitly out of scope**
- Editing a cost, editing or deleting an adjustment, refunds — not in the contract.
- Changing a price already in force — the backend forbids it by design; schedule a new
  price from a future month instead.
- The website subscription and its billing portal — [settings](../settings/).
- Any server behaviour — `mlm_platform/docs/plugin_fees/`.

## 3. At a glance

| | |
|---|---|
| Routes | 11 + 3 sections on `/settings` |
| Pages | 11 |
| Components | 68 named component functions in 26 component files (recounted 2026-10-03); plus a few local to pages |
| Hooks | 46 (one file, incl. `useDebouncedValue`) |
| Services | 1 |
| Endpoints consumed | 45 |
| LOC (ts/tsx) | ~10850 |
| Doc tier | Full |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| Plug-in fee | The monthly fee an MD or SMD pays; lower with an approved office |
| Office submission | Address + lease + photo. `pending → approved / rejected`; also `withdrawn`, `superseded` |
| Assistant submission | Name, phone, email, weekly hours, photo. `pending → verified / rejected`; `verified → expired` if not re-verified |
| Effective | The submission billing uses today: latest `approved` office, latest `verified` assistant |
| Re-verification | Quarterly check of a verified assistant; the window opens 14 days before `reverify_due` (`reverify_open`) |
| Hierarchy Assistant | The reviewer role; capability `plugin_fees:review` |
| Rates | `with_office_cents` / `without_office_cents` for the next cycle, integer cents |
| Fee schedule | Effective-dated prices per level × office; a price starts on a 1st of the month, never changes once in force, and each cycle freezes the price it used |
| Go-live month | The first billed month; the only one that waits for approval. Locked once any cycle is approved (`go_live_locked`) |
| Statement of account | An agent's invoices (and, for SMDs, ledger) — spec D16 |
| Invoice status | `draft` "Scheduled" · `no_charge` "Nothing to pay" · `open` (due / charge scheduled / retrying) · `processing` (bank payment in flight, ~4 business days) · `paid` · `failed` (retries exhausted or reversed; can still pay now) · `void` |
| Collection | `automatic` (charged on the 1st, retried on failure) or `self_pay` (payment link, due by `due_date`) — D19b |
| Pay now | A Stripe-hosted page for one invoice offering bank, card or Klarna; only the agent's choice (D19) |
| Follow-up | A payment needing a human: `retries_exhausted` or `self_pay_overdue` (D19a); resolved with a note, or automatically when paid |
| Sending | How many of an approved month's invoices have gone to Stripe ("118 of 120 sent") |
| Ledger | An SMD's running account: MD fee credits (own vs rolled up), SMD fee, costs, collections, payouts. Positive balance = owed to the SMD, paid quarterly |
| Rolled up | An MD fee that passed over an SMD without a verified assistant to the next SMD or SEVC |
| Billing cycle | One month's computation. `preview` (dry run, nothing saved) → `generated` → `approved`. Only the go-live month waits for approval (D18) |
| Excluded | A billable-level agent not billed; `no_sevc` = no SEVC on the recruiting line |
| Recognition costs | Recognition and mailing costs charged to an SMD, netted on the 1st of the month after `date_sent` |
| Connect status | An SMD's Stripe Connect payout account: `none` "Not set up" · `onboarding` "Setup started — finish it" · `restricted` "Stripe needs more information" · `enabled` "Ready to receive payouts" |
| Payout | A quarter's report (`YYYY-Qn`): `draft` → `approved` → `sending` → `sent` / `partial`. One line per SMD with a positive balance at `period_end` |
| Payout line | `pending` · `held_no_connect` "Not onboarded — balance carries forward" · `sent` (transfer id) · `failed` |
| Adjustment | A manual, signed ledger entry by an admin (credit +, debit −) with a required note; never edited or deleted |
| Void | Cancels a `draft` / `open` / `failed` invoice and its retries; never changes the ledger |
| SEVC totals | What each SEVC received per month: SMD fees, costs, MD fees with no SMD assistant (`md_unrouted_cents`) |

## 5. Dependencies

**Upstream (this module imports)**
- `@/shared/components` — `StagedFilePicker` (lifted here from `admin/content-pages`),
  `ConfirmationDialog` (now takes `children` and `confirmVariant`), `Modal`, `PhoneField`,
  `Button`, `Input`, `Select`, `Textarea`, state components.
- `@/store` — `useToastStore`.

**Downstream (imports this module)**
- `src/features/settings/pages/settings-page.tsx:1548` — renders `PluginFeesSettingsSections`.
- `src/router/plugin-fees-review-route.tsx` — `PluginFeesAccessRoute` (predicate guard) and
  `PluginFeesReviewRoute`; `src/router/index.tsx` — the eleven routes.
- `src/hooks/use-role-based-menu.ts` — `my-access/` feeds nine menu entries (six
  positional flags) through the predicates in `utils/plugin-fees-access.ts`.
- `@/shared/components` — `UserAutocompleteDropdown` (cost SMD / recipient pickers);
  `ConfirmationDialog` gained `confirmDisabled`.

**Backend**
- `plugin_fees` — `/api/plugin-fees/my-access/`, `me/…`, `review/…`, `agents/…`,
  `cycles/…`, `costs/…`, `payments/`, `follow-ups/…`, `balances/`, `me/invoices/…`,
  `me/connect/…`, `payouts/…`, `dashboard/`, `sevc-totals/`, `adjustments/`,
  `invoices/{id}/void/`, `fee-schedule/…`, `settings/`, `config-history/`. Contract:
  `mlm_platform/docs/plugin_fees/API.md`.

**External**
- Stripe Checkout (setup mode; payment mode for Pay now) and Stripe Connect Express
  onboarding, reached only by redirect to the URL the backend returns.

## 6. Document map

| Document | Read it when |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | You need the layering, query keys, polling, or the gating rules |
| [UI.md](UI.md) | You are reproducing what an agent or reviewer sees in a given state |
| [API.md](API.md) | You are wiring or debugging a call to `/api/plugin-fees/` |
| [OPERATIONS.md](OPERATIONS.md) | You are deploying, granting access, or debugging a stuck payment method |
| [PHASES.md](PHASES.md) | Before changing a behaviour — several are decisions |

## 7. Where to start reading

1. `src/features/plugin-fees/types/index.ts` — the wire contract, field for field.
2. `src/features/plugin-fees/hooks/use-plugin-fees.ts` — keys, caching, mutations.
3. `src/features/plugin-fees/components/plugin-fees-settings-sections.tsx` — what the agent
   sees, and the Stripe return.
4. `src/features/plugin-fees/components/review/review-queue.tsx` — the reviewer's queue.
5. `src/features/plugin-fees/utils/plugin-fees-access.ts` — who sees which page.
6. `src/features/plugin-fees/pages/plugin-fees-cycles-page.tsx` and
   `components/cycles/` — the billing cycle report.
7. `src/features/plugin-fees/utils/plugin-fees-payment.ts` and `components/payments/` — the
   P4 payment state and the payments page.
8. `src/features/plugin-fees/utils/plugin-fees-payout.ts` and `components/payouts/` — P5
   wording (Connect, payout and line status, quarters), "Get paid" and the payout report.
