# Plug-in Fees — Overview

| | |
|---|---|
| **Module** | `plugin-fees` |
| **Source** | `src/features/plugin-fees/` |
| **Routes** | `/plugin-fees/statement`, `/admin/plugin-fees/review`, `/admin/plugin-fees/cycles`, `/admin/plugin-fees/payments`, `/admin/plugin-fees/costs`, `/admin/plugin-fees/agents/:id/statement`; three sections embedded in `/settings` |
| **Backend module** | `plugin_fees` → `mlm_platform/docs/plugin_fees/` |
| **API prefix** | `/api/plugin-fees/` |
| **Status** | Merged-not-deployed — **not yet merged**: branch `feature/plugin-fees`, uncommitted; the backend counterpart is in development and nobody holds `plugin_fees:review`, `:manage` or `:payout_approve` |
| **Doc version** | 0.3 |
| **Verified against** | commit `fc7d037` plus the uncommitted `feature/plugin-fees` working tree (P2 + P3 + P4 screens) — 2026-10-01 |

## 1. Purpose

MDs and SMDs pay a monthly **plug-in fee** whose amount depends on whether they have an
approved office, and an SMD's MD fees are routed to them only while they have a verified
assistant. The platform — not Stripe — decides all of that, so it needs the evidence: an
office address with a lease and a photo, an assistant's contact details, hours and photo,
and a saved payment method to collect from.

This module is the frontend for **phases P2, P3 and P4** of that feature.

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

Payouts (P5) are not built; see [PHASES.md](PHASES.md#5-outstanding).

## 2. Scope

**In scope**
- Office section (MD and SMD): effective office, pending submission with Withdraw, submit
  form, rates, history with actions.
- Assistant section (SMD): the same, plus the hours editor, the verification deadline and
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

**Explicitly out of scope**
- Fee configuration, payouts (P5) — pending backend. Ledger adjustments, editing a cost,
  refunds and voiding an invoice — not in the contract.
- The website subscription and its billing portal — [settings](../settings/).
- Any server behaviour — `mlm_platform/docs/plugin_fees/`.

## 3. At a glance

| | |
|---|---|
| Routes | 6 + 3 sections on `/settings` |
| Pages | 6 |
| Components | 47 named component functions in 18 component files (recounted for P4); plus 2 local to the costs page and 1 to the payments page |
| Hooks | 28 (one file) |
| Services | 1 |
| Endpoints consumed | 27 |
| LOC (ts/tsx) | ~6500 |
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

## 5. Dependencies

**Upstream (this module imports)**
- `@/shared/components` — `StagedFilePicker` (lifted here from `admin/content-pages`),
  `ConfirmationDialog` (now takes `children` and `confirmVariant`), `Modal`, `PhoneField`,
  `Button`, `Input`, `Select`, `Textarea`, state components.
- `@/store` — `useToastStore`.

**Downstream (imports this module)**
- `src/features/settings/pages/settings-page.tsx:1548` — renders `PluginFeesSettingsSections`.
- `src/router/plugin-fees-review-route.tsx` — `PluginFeesAccessRoute` (predicate guard) and
  `PluginFeesReviewRoute`; `src/router/index.tsx` — the six routes.
- `src/hooks/use-role-based-menu.ts` — `my-access/` feeds five menu entries through the
  predicates in `utils/plugin-fees-access.ts`.
- `@/shared/components` — `UserAutocompleteDropdown` (cost SMD / recipient pickers);
  `ConfirmationDialog` gained `confirmDisabled`.

**Backend**
- `plugin_fees` — `/api/plugin-fees/my-access/`, `me/…`, `review/…`, `agents/…`,
  `cycles/…`, `costs/…`, `payments/`, `follow-ups/…`, `balances/`, `me/invoices/…`. Contract:
  `mlm_platform/docs/plugin_fees/API.md`.

**External**
- Stripe Checkout (setup mode) and Stripe's hosted invoice payment page (Pay now), reached
  only by redirect to the URL the backend returns.

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
