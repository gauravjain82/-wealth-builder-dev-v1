# Plug-in Fees — Phases

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

Phase numbers follow the backend's plan for `plugin_fees` (P2 is §1–4, P3 is §5, P4 is §6,
P5 is §7 and P6 is §8 of the contract in `mlm_platform/docs/plugin_fees/API.md`); do not
renumber.

## 1. Timeline

| Date | Event |
|---|---|
| 2026-09-30 | Spec v3 received (`mlm_platform/docs/integrations/plugin-fees/SPEC_v3.md`) |
| 2026-10-01 | P2 contract v0.1 published; frontend P2 built on `feature/plugin-fees` (uncommitted) |
| 2026-10-01 | P3 contract (§5) published; frontend P3 screens built on the same branch (uncommitted) |
| 2026-10-01 | P4 contract (§6, collection) published; frontend P4 screens built on the same branch, backend P4 not yet built |
| 2026-10-01 | P2–P4 frontend committed (`21294f1`) |
| 2026-10-01 | P5 (§7, payouts / Stripe Connect) and P6 (§8, admin remainder) contract published; frontend P5 + P6 built on the same branch (uncommitted) while the backend builds them in parallel |
| — | P5–P6 committed (`9cfa5db`); P2–P6 merged to `main` via PR #18 (`e91e5a5`). Not deployed |
| 2026-10-03 | Backend adds fee configuration (`fee-schedule/`, `settings/`, `config-history/`) and `ledger.totals`; frontend Fee Settings page + ledger totals built on `feature/plugin-fees-config` (uncommitted) |
| 2026-10-05 | The nine admin menu entries folded into one collapsible "Plug-in Fees" group (PF53) on `main` |
| 2026-10-05 | Office and assistant opened to every level at or above a Fee Settings level (MD by default), with backend D21; billing unchanged (PF54) |
| 2026-10-07 | "My Plug-in Fees" removed from the sidebar; the statement is reached from Settings (PF56) |

## 2. Phases

### P2 — Submissions, review queues, payment method

**Status:** merged to `main` (PR #18), not deployed.

- Settings sections: office, assistant, payment method; Stripe setup-session return.
- Review page with office and assistant queues.
- `usePluginFeesAccess()`, `PluginFeesReviewRoute`, menu entry.
- Shared: `StagedFilePicker` lifted to `src/shared/components/`; `ConfirmationDialog`
  accepts `children` and `confirmVariant`.

### P3 — Statements, billing cycles, recognition costs

**Status:** merged to `main` (PR #18), not deployed.

- Statement of account `/plugin-fees/statement` (`is_billable`): invoices with expandable
  lines; SMD balance and ledger with running balance, rolled-up MD credits tagged.
- Billing cycles `/admin/plugin-fees/cycles`: preview (`can_manage`), generated-cycle list,
  report with totals, SEVC totals, filterable agents table, client-side CSV, Approve
  (`can_approve_payouts`, required note).
- Recognition costs `/admin/plugin-fees/costs` (`can_manage`): list with month / SMD
  filters, log form, delete with required reason.
- Agent statement lookup `/admin/plugin-fees/agents/:id/statement` (`can_review ||
  can_manage`), linked from the report.
- `PluginFeesAccessRoute` (predicate guard), `utils/plugin-fees-access.ts`, three menu
  entries, the Settings "View statement of account →" link.
- Shared: `ConfirmationDialog` gained `confirmDisabled`.

### P4 — Collection: Stripe, retries, self-pay, Klarna, follow-up

**Status:** merged to `main` (PR #18), not deployed. Built from the contract alone: when it was
written the backend had no P4 views yet (its `FeeInvoice` model still lacked
`processing`), so nothing here has run against a server.

- Invoice payment state everywhere an invoice shows (`utils/plugin-fees-payment.ts`,
  `components/payments/payment-state.tsx`): the new `processing` status; `open` worded by
  collection and attempts; `failed`; last failure humanised; attempts; paid via with
  Klarna called out.
- Pay now on the agent's statement (`can_pay_now`) → `me/invoices/{id}/pay-link/` →
  redirect; the `?fee_pay=` return with a 3 s × 30 s poll.
- Payments dashboard `/admin/plugin-fees/payments` (`can_manage || can_review`): month,
  cycle status and sending progress, Send now (`can_manage`), totals and counts, Klarna
  card, filter tabs, search, CSV; follow-ups with Resolve (`can_manage`, required note).
- SMD ledger balances on the billing cycles page.
- The cycle report shows sending progress once approved.
- Menu entry "Fee Payments"; the agent statement lookup's back link returns to the page
  that opened it.

### P5 — Quarterly payouts: Stripe Connect

**Status:** merged to `main` (PR #18), not deployed. Built from contract §7 alone, in parallel with
the backend; nothing here has run against a server.

- "Get paid" on the SMD's own statement (`components/payouts/connect-panel.tsx`):
  `me/connect/` status badge, what Stripe still needs (humanised), balance, the
  explanation, and Set up payouts / Finish setup / Update details →
  `me/connect/onboarding-link/` → redirect; the `?connect=return|refresh` return with a
  3 s × 30 s poll (PF34–PF36).
- Statement ledger: `payout`, `reversal` and `adjustment` entries tagged (PF45).
- Payouts `/admin/plugin-fees/payouts` (`can_manage || can_review || can_approve_payouts`):
  list, Prepare report (`can_manage`, quarter select, PF37), report with header, totals,
  lines (agent link, amount, line status, payout account), expandable ledger entries that
  reconcile to the amount (PF38), CSV, Approve (`can_approve_payouts`, draft, required
  note), Retry (`can_manage`, PF39), 5 s polling while transfers are in flight.

### P6 — Admin dashboard remainder

**Status:** merged to `main` (PR #18), not deployed. Built from contract §8 alone.

- Overview `/admin/plugin-fees` (`can_manage || can_review`), the landing menu entry
  (PF41): payments, follow-ups, verifications (deep-linked to the review queue, PF42),
  recognition costs, this month's SEVC totals, upcoming payout, payout accounts not set up.
- SEVC totals `/admin/plugin-fees/sevc-totals` (`can_manage || can_review`), its own route
  (PF40): month range in the URL, rows per month × SEVC, grand totals, CSV.
- Ledger adjustments `/admin/plugin-fees/adjustments` (`can_manage`): list with SMD filter
  and paging; form with direction + amount → signed cents, required note, optional
  invoice id, restating confirmation (PF43). "Adjust ledger…" on the admin agent
  statement.
- Void (`can_manage`) on payments rows and admin agent statement invoices in `draft`,
  `open` or `failed` (PF44).

### Fee configuration and ledger split (2026-10-03)

**Status:** built on `feature/plugin-fees-config`, uncommitted, not merged, not deployed.
Built from the backend's endpoint description alone; not run against a server.

- Fee Settings `/admin/plugin-fees/settings` (`canSeeFeeSettings`: `can_manage ||
  can_review || can_approve_payouts`; edits `can_manage`, `canManageFeeSettings`), menu
  "Fee Settings" (PF48): fee table with upcoming prices, Schedule a price change (only
  changed prices sent, confirmation old → new, PF49), Scheduled changes with Remove
  (required reason), Billing settings (only changed fields sent, go-live locked, PF50),
  Change history, collapsible Price history.
- Statement ledger: "Totals, all time" tiles from `ledger.totals`, MD fees from own MDs
  and rolled up from downline SMDs apart; hidden when `totals` is absent (PF52).
- Service + hooks: `fetchFeeSchedule` / `scheduleFeeChange` / `deleteFeeRate`,
  `fetchBillingSettings` / `updateBillingSettings` (the first PATCH in the module),
  `fetchConfigHistory`; keys `['plugin-fees','fee-schedule' | 'settings' |
  'config-history']`.

## 3. Decision log

| ID | Decision | Rationale | Source |
|---|---|---|---|
| PF1 | The Settings block renders **nothing** (no section, no denial message) for a user with none of the three capabilities | Most users are not MDs/SMDs; an empty "not eligible" box on everyone's Settings is noise. The alternative — always show and disable — was rejected | `components/plugin-fees-settings-sections.tsx` |
| PF2 | Show a section only when the capability is true **and** the payload carries it (`me.office` / `me.assistant`) | The contract makes both statements; requiring both means a disagreement hides the section instead of crashing on an absent key | contract §2; `plugin-fees-settings-sections.tsx` |
| PF3 | "Count for *X* routing" names the month **after** `deadlines.assistant_verification` | The contract gives only the date. Using `rates.month` was rejected because `rates` may be absent. Revisit if the backend adds the month explicitly | contract §2; `utils/plugin-fees-format.ts` `monthAfter` |
| PF4 | `me/` and review queries refetch every 10 min and on focus, though the app default is `refetchOnWindowFocus: false` | File URLs are signed for 15 min; a long-open page would otherwise show dead links | contract preamble; `hooks/use-plugin-fees.ts` `SIGNED_URL_REFRESH_MS` |
| PF5 | All plug-in fee mutations set `retry: false` | The app-wide `mutations.retry: 1` would resend an upload after an ambiguous failure and earn `already_pending` — or record a decision twice | `src/infrastructure/query/provider.tsx:15` |
| PF6 | Payment-method polling stops at the first `status: 'saved'` (3 s × up to 30 s) | Simple and correct for the first save. Replacing an existing method stops immediately because the old one already reads `saved`; comparing `saved_at` was rejected because after a full-page redirect there is no cached baseline | `plugin-fees-settings-sections.tsx` |
| PF7 | `StagedFilePicker` lifted to shared, with the content-pages 413 warning made opt-in | Its "use an external link for videos" text is wrong for an office lease; content-pages now passes the same warning explicitly, so its behaviour is unchanged | `src/shared/components/staged-file-picker.tsx` |
| PF8 | Approve/Verify uses `ConfirmationDialog` with a note field; Reject uses a dedicated `Modal` | Reject needs a blocking required-field rule the confirmation dialog cannot express; extending `ConfirmationDialog` additively (`children`, `confirmVariant`) kept approve on the shared component | `components/review/decision-dialogs.tsx` |
| PF9 | The assistant form prefills from the verified assistant (not the pending one) | Re-submission usually changes one field; the photo still has to be re-chosen because a stored file cannot be re-sent | `components/assistant-section.tsx` |
| PF10 | The payment section offers **"charge me automatically"** (default) or **"I'll pay each month myself"** (bank, card or Klarna, due by `self_pay_due_day`) | Owner decisions D19/D19b (2026-10-01): Klarna is never an automatic fallback, only the agent's choice; Klarna cannot be charged automatically, so choosing it means paying each month | `components/payment-method-section.tsx`; backend `IMPACT_ANALYSIS.md` §6.0 |
| PF11 | A bank account on micro-deposits shows **"Waiting for bank verification"**, and a failed verification is shown with a prompt to save again | A micro-deposit account is not chargeable until Stripe verifies it; showing it as saved would let the agent believe they are ready for the 1st | `components/payment-method-section.tsx` |
| PF12 | One predicate per surface in `utils/plugin-fees-access.ts`, used by the route guards, the menu hook and the pages; a single `PluginFeesAccessRoute({allow})` guard, with `PluginFeesReviewRoute` kept as a wrapper | Four new gates over one payload; separate guard files would drift from the menu. A refused user is redirected to `/home` like the review guard — an in-page "not available" state was rejected because the menu already hides the entry, so only a typed URL reaches it | `src/router/plugin-fees-review-route.tsx`; `utils/plugin-fees-access.ts` |
| PF13 | "My Plug-in Fees" is inserted just **after My Team** (originally under Home; moved 2026-10-01 at product request, falling back to under Home); Billing Cycles and Recognition Costs right **after** "Plug-in Fee Reviews" | The statement is an agent's own page, not an admin tool (same reasoning as Home v2's placement); the admin entries stay grouped | `src/config/menu.ts` |
| PF14 | The cost form's SMD and recipient pickers use the shared `UserAutocompleteDropdown` with no role filter | It searches all users; its `roleFilter` matches account roles, not the MD/SMD level, so filtering client-side would be guesswork. The backend rejects a non-SMD with `fields.smd_id`, which the form shows on the field | `components/costs/cost-form.tsx`; contract §5 `POST costs/` |
| PF15 | The cycles page is shown to `can_approve_payouts` | **Resolved on the backend (2026-10-01):** `:payout_approve` now also reads `cycles/` and `cycles/{month}/`, since an approver must read the report they approve | contract §5 table; `utils/plugin-fees-access.ts` `canSeeCycles` |
| PF16 | P3 money always shows cents (`formatMoney`, `$250.00`), with a true minus (`−$150.00`); P2's rates keep `formatCents` (`$200`) | Statements and reports must reconcile to the cent; rates are round marketing numbers. Changing P2's formatter was rejected to keep P2 screens unchanged | `utils/plugin-fees-format.ts` |
| PF17 | The open report lives in the URL (`?view=preview\|report&month=`) | The agent name links away to a statement; Back must return to the same report, filters aside | `pages/plugin-fees-cycles-page.tsx` |
| PF18 | Agent filters and the CSV are client-side over `report.agents`; the CSV exports exactly the filtered rows, dollars with two decimals, and prefixes `= + - @` cells with `'` | The report already carries every agent and the brief forbids a new endpoint. The prefix stops a name like `=HYPERLINK(...)` from executing in a spreadsheet | `components/cycles/cycle-agents-table.tsx`; `utils/plugin-fees-format.ts` `toCsv` |
| PF19 | MD credit recipient and SEVC rows show names | **Resolved on the backend (2026-10-01):** the report carries `closest_sevc_name`, `md_credit_recipient_name` and `sevc_totals[].sevc_name`; the CSV includes them too | contract §5 report |
| PF20 | An invoice's expanded lines end with a **Total** taken from `amount_cents`, not summed client-side | The contract guarantees the lines sum to the total; showing the server's figure means a contract breach shows as a visible mismatch rather than a silently "corrected" total | `components/statement/statement-view.tsx` `LinesTable` |
| PF21 | The costs list shows "Page n" with Previous / Next from `previous` / `next`, not "Page n of m" | The contract does not state the costs page size; computing a page count would assume 25 | `pages/plugin-fees-costs-page.tsx` |
| PF22 | Approve writes the returned report into `['plugin-fees','cycle',month]` and still invalidates list, report and preview; a `409` closes the dialog with a warning | Shows `approved` immediately; the invalidation keeps the list's approved-by/at honest. A 409 means someone else acted — retrying is pointless | `hooks/use-plugin-fees.ts` `useApproveCycle` |
| PF23 | Logging or deleting a cost also invalidates every cycle preview | A pending cost changes next month's numbers; a cached preview would understate it | `hooks/use-plugin-fees.ts` `useInvalidateCosts` |
| PF24 | The payment-state wording lives in one function, `describePayment(state, audience)`, used by the statement and the dashboard; `failed` reads "please pay now" to the agent but "the agent can still pay now" to an admin | One vocabulary on both screens. Telling an admin to "pay now" was rejected as wrong-audience copy | `utils/plugin-fees-payment.ts` |
| PF25 | "Overdue" is computed client-side for a row (self-pay, `open`, `due_date` before **today in UTC**) | The rows carry no overdue flag, only the totals count it. UTC because the backend's dates are UTC (D5). The browser's local date was rejected: west of UTC it would call an invoice overdue a day late, east of it a day early | `utils/plugin-fees-payment.ts` `isOverdue`, `todayUtc` |
| PF26 | The `?fee_pay=` return polls for the invoice that was paid, remembered in `sessionStorage` (`wb.pf.payingInvoiceId`) before the redirect; without it (storage blocked) the page refetches once and does not poll | The contract's return URL does not name the invoice. Stopping on *any* `paid` invoice was rejected — earlier months are already paid, so polling would stop at once | `pages/plugin-fees-statement-page.tsx` |
| PF27 | The "Self-pay open" and "Overdue" tabs are disjoint, like the `self_pay_open` and `self_pay_overdue` counts beside them | The contract does not say whether `self_pay_open` includes overdue invoices. Disjoint tabs reconcile with disjoint counts; revisit if the backend counts overdue inside open | `components/payments/payments-table.tsx` `matches` |
| PF28 | Follow-ups are a **section on the payments page**, not their own route | Same audience as the dashboard (`:manage`/`:review`), and a follow-up is a payment question; one more menu entry was rejected. The list covers every month (the endpoint has no month filter) and says so | `components/payments/follow-ups-section.tsx` |
| PF29 | SMD balances are on the **billing cycles page**, not the payments page | `balances/` is readable by `:payout_approve`, who cannot open the payments page (`:manage`/`:review` only); the cycles page has exactly the endpoint's audience | `components/payments/balances-section.tsx`; `utils/plugin-fees-access.ts` `canSeeBalances` |
| PF30 | A new menu flag `canViewPluginFeePayments` (positional, appended) rather than reusing `canViewPluginFeeCycles`; the entry is labelled **"Fee Payments"** and sits between Billing Cycles and Recognition Costs | The cycles flag includes `:payout_approve`, the payments page does not — reusing it would show an approver an entry that redirects to `/home`. "Payments" alone was rejected: the menu is flat, and it reads as the website subscription | `src/config/menu.ts`; `src/hooks/use-role-based-menu.ts` |
| PF31 | Send now asks for confirmation; Pay now and Resolve's note dialog follow the existing patterns (`NO_RETRY`, `ConfirmationDialog` with `confirmDisabled`) | Send now pushes every pending invoice to Stripe at once and cannot be undone. A `409 not_approved` is a warning toast; the dashboard and the cycle refetch on settle either way | `pages/plugin-fees-payments-page.tsx`; `hooks/use-plugin-fees.ts` `useSendCycle` |
| PF32 | The agent statement lookup's back link honours `location.state.backTo` (only `/admin/plugin-fees/…` paths), defaulting to Billing cycles | It is now reached from four places; a hard-coded "← Billing cycles" from the payments page was wrong. Restricting the path keeps the state from being an open redirect | `pages/plugin-fees-agent-statement-page.tsx` |
| PF33 | The SMD balances total is the sum of **positive** balances only, labelled "Total owed" | A negative balance is what an SMD owes, not what is owed to them; netting it in would understate the quarterly payout | `components/payments/balances-section.tsx` |
| PF34 | "Get paid" renders above the ledger only when the statement has a `ledger` **and** `my-access/` says `is_billable` with `level_code === 'SMD'` (`canSetUpPayouts`); the panel owns its `?connect=` return | `me/connect/` answers anyone but an active SMD `403 not_eligible`; requiring both keeps an MD (or a stale access payload) from provoking it. Putting the return handling in the panel keeps the statement page's `?fee_pay=` logic untouched | contract §7; `components/payouts/connect-panel.tsx`; `pages/plugin-fees-statement-page.tsx` |
| PF35 | `?connect=return` polls `me/connect/` every 3 s for up to 30 s until the status **differs from the one before the redirect**, remembered in `sessionStorage['wb.pf.connectStatusBefore']`; with storage blocked it polls until `enabled`. `?connect=refresh` only toasts "The link expired — click Finish setup again" | After a full-page redirect there is no cached baseline (the PF6 problem); remembering it per tab is the same fix as PF26. Stopping on `enabled` alone was rejected: an SMD who submits and lands in `restricted` would wait 30 s for nothing | `components/payouts/connect-panel.tsx` |
| PF36 | `requirements_due` is shown in plain words from a map of common Stripe requirement paths, duplicates folded (the three `dob.*` paths read "Date of birth" once); unknown paths show their last segment humanised. Shown for any status but `enabled` | Raw paths (`individual.verification.document`) mean nothing to an agent. The contract asks for the list on `restricted`; `onboarding` can carry requirements too, and hiding them there was rejected | `utils/plugin-fees-payout.ts` `humanizeRequirements` |
| PF37 | Prepare report defaults to the **most recently ended quarter on the UTC calendar** and offers only the last 8 ended quarters. The response is not cached; the list and that quarter's report are refetched | A quarter that has not ended only earns `409 quarter_not_ended` (still handled, as a toast). UTC because the backend's dates are (D5). The contract says prepare "returns the existing draft" without pinning the body, so writing it into the report cache was rejected | `utils/plugin-fees-payout.ts` `lastEndedQuarter`; `hooks/use-plugin-fees.ts` `usePreparePayout` |
| PF38 | A payout line's expanded ledger detail adds a row **"Balance carried in from before the quarter"** = `amount_cents` − Σ`entries`, when non-zero, and the footer shows the server's `amount_cents` | `amount_cents` is the balance at `period_end`, but `entries` are only those posted in the quarter; a held line's carried balance would otherwise make the detail not add up. Hiding the difference, or showing a client sum as the total, was rejected (PF20) | `components/payouts/payout-report.tsx` `EntriesTable` |
| PF39 | Retry is offered (`can_manage`) on a `failed` or `held_no_connect` line of any payout past `draft` (`approved`, `sending`, `sent`, `partial`). The report — and the list, while any row is in flight — is polled every 5 s while `approved` or `sending` | The contract says "an approved payout"; `sent`/`partial` are later states of one, and the server answers `409 not_retryable` if not. Polling only in flight keeps an idle page quiet | `utils/plugin-fees-payout.ts` `isLineRetryable`; `hooks/use-plugin-fees.ts` `usePayoutReport`, `usePayouts` |
| PF40 | SEVC totals is **its own route** `/admin/plugin-fees/sevc-totals` with a menu entry; the overview shows only this month's, linking there. Range in the URL (`?from=&to=`), default the 6 months ending with the current UTC month; the grand total sums the rows' server `total_cents` | It is a range report with its own URL state and CSV; folding a range picker into the at-a-glance overview was rejected as clutter. The URL makes a range shareable and survives Back | `pages/plugin-fees-sevc-totals-page.tsx` |
| PF41 | The menu gains "Plug-in Fees" (overview, landing), "Payouts", "SEVC Totals" and "Adjustments" through **two** new positional flags: `canViewPluginFeeOverview` (overview and SEVC totals, `:manage`/`:review`) and `canViewPluginFeePayouts` (`:manage`/`:review`/`:payout_approve`). Adjustments reuse `canManagePluginFees` (`:manage`, the costs flag). The overview is inserted **before** "Plug-in Fee Reviews" | Flags follow audiences, not pages (PF30): a third flag for SEVC totals or adjustments would duplicate an existing predicate. The overview leads the group because it is the landing page | `src/config/menu.ts`; `src/hooks/use-role-based-menu.ts` |
| PF42 | Verification cards link to the review page with `?tab=&status=` (read once, as the opening tab and filter). "Expiring within 14 days" links to the assistants' `reverify_due` filter. Links are shown only where the viewer may open the target (e.g. a `:manage`-only admin sees counts without review links) | The queue has no "expiring" filter; the re-verification window opens 14 days before `reverify_due`, so the two sets should coincide. A link that redirects to `/home` was rejected | `pages/plugin-fees-overview-page.tsx`; `pages/plugin-fees-review-page.tsx`; `components/review/review-queue.tsx` `initialStatus` |
| PF43 | The adjustment form takes a **direction** (Credit — owed to the SMD, + / Debit — the SMD owes, −) and an unsigned dollar amount, combined into one signed integer of cents; submit opens a confirmation restating the effect and that adjustments are never edited or deleted. The admin agent statement's "Adjust ledger…" (`:manage`, shown for level SMD or any statement with a ledger) passes the SMD in `location.state`, not the URL | A signed dollar field invites sign mistakes; the confirmation is the last chance since there is no undo. Router state keeps an id-prefilled money form out of shareable URLs; the SMD picker and the server's `fields.smd_id` remain the check (as PF14) | `components/adjustments/adjustment-form.tsx`; `pages/plugin-fees-adjustments-page.tsx`; `pages/plugin-fees-agent-statement-page.tsx` |
| PF44 | One `VoidInvoiceDialog` (owning its mutation, required note, the contract's "does not change the SMD ledger" sentence) serves the payments rows and the admin agent statement. On settle it invalidates payments, every statement, follow-ups and the overview — **not** balances. The agent statement drops its "read-only" label for `:manage` | Voiding never touches the ledger (contract §8), so refetching balances would only suggest it does. Follow-ups are refetched because voiding resolves them | `components/invoices/void-invoice-dialog.tsx`; `hooks/use-plugin-fees.ts` `useVoidInvoice` |
| PF45 | Ledger rows keep the backend's `label` and `memo` and add a tag: `payout` "Payout" (green), `reversal` "Reversal" (red), `adjustment` "Manual adjustment" (blue); fallback labels only when `label` is empty | The backend already words payouts ("Quarterly payout sent (2026-Q4)"); a tag makes the three non-routine entry types scannable without rewriting server copy. The adjustment's note is expected in `memo` | `components/statement/statement-view.tsx` `LedgerDescription` |
| PF46 | Payout approve / retry also invalidate every statement; an adjustment also invalidates `['plugin-fees','connect','me']` | Beyond the brief's list: a sent payout posts a `payout` ledger entry, and an adjustment changes the SMD's balance that "Get paid" shows | `hooks/use-plugin-fees.ts` `useInvalidatePayouts`, `useCreateAdjustment` |
| PF47 | The agent statement's back link also honours `/admin/plugin-fees` itself (the overview), still nothing outside the module | PF32's `/admin/plugin-fees/…` prefix rejected the overview's own path | `pages/plugin-fees-agent-statement-page.tsx` `backTarget` |
| PF48 | "Fee Settings" reuses the `canViewPluginFeeCycles` menu flag (no new positional flag); the route uses its own predicate `canSeeFeeSettings` | Its audience (`:manage`/`:review`/`:payout_approve`) is exactly the cycles audience; PF41's rule is flags follow audiences. A separate predicate keeps the route honest if the two ever diverge | `src/config/menu.ts`; `utils/plugin-fees-access.ts` |
| PF49 | A price change compares each input with the cell's **`next_cycle`** price and sends only the differing ones; the confirmation shows `next_cycle` → new. A blank price input is an error when the cell has a price | The backend keeps the price of any rate left out, so sending all four would record no-op changes in the history. For a month later than an already scheduled change, "old" is still the next cycle's price, not the price in force just before the chosen month — the brief asked for `next_cycle`; revisit if admins schedule far ahead | `components/fee-settings/schedule-change-form.tsx` |
| PF50 | Billing settings: the form remounts (`key = updated_at`) after a save or refetch; `go_live_month` is never sent while `go_live_locked`; a cleared month/date is sent as `null`. Readers see plain values, not disabled inputs | Remounting is the simplest way to show the stored values after a save. Disabled inputs for readers were rejected as implying they could be enabled | `components/fee-settings/billing-settings-form.tsx`; `pages/plugin-fees-settings-page.tsx` |
| PF51 | Fee schedule writes put the returned schedule in the cache, then invalidate the schedule, the history, `me/` (the agent's `rates`) and every cycle preview; a settings save also invalidates `me/` (deadlines) | The POST/DELETE answer the whole schedule; `me/.rates` and a cached preview price the next cycle and would be stale | `hooks/use-plugin-fees.ts` |
| PF52 | `ledger.totals` is typed optional and the tiles are hidden without it; "Other" = `charge_collected + reversal + adjustment` | Older payloads lack it; a zero row would misreport history. The three are folded per the brief to keep six tiles | `components/statement/statement-view.tsx` `LedgerTotalsGrid` |
| PF53 | The admin entries (overview, reviews, cycles, payments, payouts, SEVC totals, costs, adjustments, fee settings) are children of one "Plug-in Fees" group; the overview child is "Overview" and the review child "Reviews". The group is added only when at least one child is visible, and the sidebar opens any group holding the current page. "My Plug-in Fees" stays a top-level entry | Nine flat entries spread through the sidebar read as unrelated tools (user report, 2026-10-05). Per-entry gates are unchanged; only placement moves. The statement is the agent's own page, not an admin tool, so it stays out of the group. Supersedes the placement in PF41 | `src/config/menu.ts` (`getMenuForUser`); `src/shared/layouts/sidebar.tsx` |
| PF54 | Who may add an office and an assistant comes from `can_submit_*`, which the backend now derives from a level threshold (`settings.submission_min_level`, rank ≥; the level coded MD when unset) set on Fee Settings — not from hard-coded MD/SMD. Fee and routing wording on Settings follows separate flags: `is_billable` (office, payment method) and the new `assistant_counts_for_routing` (an SMD) | User, 2026-10-05: "anyone MD and above should have both", configurable from the database; billing unchanged (D7 stands, an MD's assistant changes no fee). Telling a non-billed EVC "you are billed at the no-office rate" would be false, so the wording keys on the billing flags, not on submission. The default label comes from `submission_min_level_default`, so "MD" is not hard-coded here | `mlm_platform` IMPACT_ANALYSIS D21; `components/office-section.tsx`, `assistant-section.tsx`, `fee-settings/billing-settings-form.tsx` |
| PF55 | MDs and SMDs can authorize **any card already saved on their Stripe account** for plug-in fees, with one consent tick and **Authorize**, with no redirect. The website subscription's card comes first. If they chose that card and it later changes, Settings asks whether to switch. Switching is never automatic | Owner, via user, 2026-10-07: "single click user clicks on authorize and we start using the same old card", and "during that change … ask do you want to change the card for plugin also". Picking any saved card was the one later option chosen. Auto-follow, a remembered "Keep current" and a switch-back-to-bank path were offered and not chosen. The billing portal cannot ask questions, so the backend reports `changed` and Settings asks instead. An automatic switch was rejected because consent names a specific card. ACH stays the preferred method | `mlm_platform` IMPACT_ANALYSIS D22; `components/payment-method-section.tsx` `SavedCardPicker`; `hooks/use-plugin-fees.ts` `useAuthorizeCard` |
| PF56 | "My Plug-in Fees" is **removed from the sidebar**. The statement route `/plugin-fees/statement` and its `is_billable` guard stay; agents reach it through "View statement of account →" on their profile Settings page, and Stripe returns there as before. The `isPluginFeesBillable` menu flag is dropped from `getMenuForUser` | User, 2026-10-07: "remove the Plug-in fees from the sidebar menu. User check it via profile account statement link … keep page". Supersedes the placement in PF13 and the top-level entry in PF53 | `src/config/menu.ts`; `src/hooks/use-role-based-menu.ts`; `components/plugin-fees-settings-sections.tsx` |

## 4. Deliberately not built

- Client-side feature flags — rollout is backend grants only.
- A fully URL-synced review tab/filter — the overview's deep link is read once (PF42).
- Any fee or payout editing by the Hierarchy Assistant — they cannot change them (spec);
  adjustments and void are `:manage` only.
- Editing or deleting an adjustment — the contract forbids it; post an opposite one.
- A server-side payout or SEVC CSV — both are built client-side from the payload.
- Editing a logged cost — the contract has no update endpoint; delete and re-log.
- Server-side CSV or report search — the report carries every agent (PF18).

## 5. Outstanding

- Verify against the real backend once `feature/plugin-fees` in `mlm_platform` is runnable.
- Contract ambiguities to confirm with the backend: whether `level_code` (access, `me/`)
  and `agent.agency_code` / `agent.level_code` can be `null` (typed nullable here);
  whether a decide response includes `agent` (typed as the bare submission); whether
  `actions[].action` has a fixed vocabulary (typed `string`, humanised for display).
- PF6: detect a *replaced* payment method after redirect (needs a backend marker, e.g. the
  setup session id in the return URL).
- Add the coupled branch pair to the repo `CLAUDE.md` when merged.
- P3 contract points, answered by the backend: an approver reads `cycles/` (PF15). A
  preview of an already generated month returns the **stored** report with its stored
  status (`generated` / `approved`), not `preview`. Open: the full vocabulary of a cycle agent's `status` (contract says
  `draft | no_charge | excluded | …`; typed as invoice statuses + `excluded`, unknown
  values humanised); that report `agents[].lines` share the invoice line shape; whether
  `DELETE costs/{id}/` answers `204` (handled) or a body; the costs page size (PF21).
- P4 contract points to confirm with the backend: whether `self_pay_open` includes overdue
  invoices (PF27); whether a preview report carries `sending` (typed optional, shown only
  on approved reports); the response body of `follow-ups/{id}/resolve/` (typed as the
  follow-up, unused); whether `resolved_by` is a name string (typed `string | null`; an
  auto-resolved follow-up shows "Automatically"); the full `last_failure.code`
  vocabulary (known Stripe codes are worded, others humanised); whether an
  `agent` in `payments/` / `follow-ups/` / `balances/` is the same shape as
  `ReviewAgent` (assumed).
- Run P4 against the backend once its §6 views exist.
- P5 / P6 contract points to confirm with the backend: the shape of a payout line's
  `failure` (contract shows only `null`; typed `string | {code?, message?, at?}`); the
  response bodies of `POST payouts/` (assumed the report, not used — PF37) and
  `…/retry/` (typed `unknown`, unused) and of `invoices/{id}/void/` (typed as a payments
  row, unused); whether `adjustments/` rows' `agent` is a `ReviewAgent` and `created_by` a
  name string; whether the adjustment note becomes the ledger entry's `memo` (PF45);
  whether `sevc_name` can be null (typed nullable); which date `costs_this_month_cents`
  counts by (shown as "This month"); whether `assistants_expiring_14d` is exactly the
  `reverify_due` queue (PF42); whether `me/connect/`.balance_cents equals the statement's
  ledger balance (assumed).
- Fee configuration points to confirm with the backend: whether a rate's `note` is the
  reason given when it was scheduled (shown as "Note"); whether `config-history` `changes`
  ever carry non-scalar values (rendered as JSON); the vocabulary of `source` (shown as
  "via *source*"); whether `rates[i]` field-error indices follow the request order
  (assumed, PF49).
- Run P5 / P6 against the backend once its §7–§8 views exist; Stripe Connect onboarding
  needs a test-mode Connect platform on the backend.
