# Plug-in Fees — Architecture

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

## 1. Layering

Page/component → hook → service → API, as everywhere else
([platform](../platform/ARCHITECTURE.md)).

| Layer | File | Rule |
|---|---|---|
| Types | `types/index.ts` | Mirror the backend contract; absent ≠ null |
| Service | `services/plugin-fees-service.ts` | The only place a URL is built or `fetch` is called |
| Hooks | `hooks/use-plugin-fees.ts` | Query keys, caching, invalidation; no URLs |
| Utils | `utils/plugin-fees-format.ts` | Formatting (incl. `formatMoney`, `parseDollarsToCents`), file pre-checks, hours validation, error text, CSV |
| Utils | `utils/plugin-fees-access.ts` | One predicate per surface over `my-access/`; shared by guards, menu and pages |
| Utils | `utils/plugin-fees-payment.ts` | P4: an invoice's payment state in words (`describePayment`), overdue / retrying, failure codes, paid-via labels; P6 `isVoidable` |
| Utils | `utils/plugin-fees-payout.ts` | P5: Connect / payout / payout-line status wording, `requirements_due` in plain words, retryability, quarters (`lastEndedQuarter`, `formatQuarter`) |
| Utils | `utils/plugin-fees-fee-schedule.ts` | Fee configuration: cell keys and labels, upcoming / scheduled prices, a rate's standing, change-history field labels and values |
| Components | `components/` | Never call `fetch` |
| Pages | `pages/plugin-fees-review-page.tsx` | Composes `ReviewQueue` twice |
| Pages | `pages/plugin-fees-statement-page.tsx`, `plugin-fees-agent-statement-page.tsx` | Fetch a statement, render `StatementView` |
| Pages | `pages/plugin-fees-cycles-page.tsx` | Month picker, cycle list, report selection (URL), approve mutation |
| Pages | `pages/plugin-fees-costs-page.tsx` | Filters, list, delete dialog; embeds `CostForm` |
| Pages | `pages/plugin-fees-payments-page.tsx` | Month (URL), dashboard, Send now, Void; embeds `PaymentsTable` and `FollowUpsSection` |
| Pages | `pages/plugin-fees-payouts-page.tsx` | Quarter (URL), list, prepare / approve / retry mutations; embeds `PayoutReportView` |
| Pages | `pages/plugin-fees-overview-page.tsx` | `dashboard/` as linked cards |
| Pages | `pages/plugin-fees-sevc-totals-page.tsx` | Range (URL), table, grand totals, CSV |
| Pages | `pages/plugin-fees-adjustments-page.tsx` | List, SMD filter, paging; embeds `AdjustmentForm` |
| Pages | `pages/plugin-fees-settings-page.tsx` | Fee schedule, billing settings, change history; edit controls for `can_manage` only |

## 2. Component map

```
settings-page.tsx
└── PluginFeesSettingsSections          my-access + me, ?fee_pm= return, polling
    ├── OfficeSection                    effective · pending · form · history
    │   ├── OfficeSummary  (submission-summaries.tsx)
    │   ├── StagedFilePicker ×2  (@/shared/components)
    │   └── ConfirmationDialog (withdraw)
    ├── AssistantSection                 + deadline, reverify notice
    │   ├── AssistantSummary
    │   ├── HoursEditor, PhoneField, StagedFilePicker
    │   └── ConfirmationDialog (withdraw)
    └── PaymentMethodSection             setup-session redirect

/admin/plugin-fees/review → PluginFeesReviewRoute → PluginFeesReviewPage
└── ReviewQueue (offices | assistants)   status · search · page · decisions
    ├── OfficeSummary / AssistantSummary (+ Approve/Verify/Re-verify, Reject)
    ├── ApproveDialog  (ConfirmationDialog + optional note)
    └── RejectModal    (Modal + required note)
```

```
/plugin-fees/statement → PluginFeesAccessRoute(is_billable) → PluginFeesStatementPage
/admin/plugin-fees/agents/:id/statement → PluginFeesAccessRoute(review|manage) → PluginFeesAgentStatementPage
└── StatementView (components/statement/statement-view.tsx)
    ├── BalanceCard + LedgerTable        only when `ledger` is present
    └── InvoicesTable                    ExpandButton → LinesTable

/admin/plugin-fees/cycles → PluginFeesAccessRoute(manage|review|payout_approve) → PluginFeesCyclesPage
├── month form → ?view=preview&month=   (can_manage only)
├── cycles table → ?view=report&month=
└── CycleReportView (components/cycles/cycle-report.tsx)
    ├── TotalsGrid, SevcTotalsTable
    ├── CycleAgentsTable (cycle-agents-table.tsx)   filters · CSV · rows → LinesTable
    └── ApproveCycleDialog (ConfirmationDialog + required note, confirmDisabled)

/admin/plugin-fees/payments → PluginFeesAccessRoute(manage|review) → PluginFeesPaymentsPage
├── month form → ?month=YYYY-MM
├── header: CycleStatusBadge, SendingProgress, Send now (manage) → ConfirmationDialog
├── TotalsCards (Stat ×11, Klarna card)
├── PaymentsTable (components/payments/payments-table.tsx)   tabs · search · CSV
│   └── PaymentStateCell, PaidVia (components/payments/payment-state.tsx)
└── FollowUpsSection (follow-ups-section.tsx)   status filter · ResolveDialog (manage)

/admin/plugin-fees/cycles additionally renders BalancesSection (balances-section.tsx)
when canSeeBalances; CycleReportView renders SendingProgress on an approved report.
StatementView's invoice rows render PaymentStateCell, PaymentFacts in the expanded row,
and Pay now (own statement only, passed as `payNow`).

/admin/plugin-fees/costs → PluginFeesAccessRoute(manage) → PluginFeesCostsPage
├── CostForm (components/costs/cost-form.tsx)   UserAutocompleteDropdown ×2
├── costs table + pagination
└── DeleteCostDialog (ConfirmationDialog + required reason)

/plugin-fees/statement (SMD with a ledger) additionally renders, above StatementView:
└── ConnectPanel (components/payouts/connect-panel.tsx)   me/connect, ?connect= return, polling

/admin/plugin-fees/payouts → PluginFeesAccessRoute(manage|review|payout_approve) → PluginFeesPayoutsPage
├── prepare form (manage) → POST payouts/ → ?quarter=
├── payouts table → ?quarter=YYYY-Qn
└── PayoutReportView (components/payouts/payout-report.tsx)
    ├── PayoutStatusBadge, Stat ×5, CSV
    ├── LinesTable   ExpandButton → EntriesTable · ConnectStatusBadge · Retry (manage)
    └── ApprovePayoutDialog (ConfirmationDialog + required note)

/admin/plugin-fees → PluginFeesAccessRoute(manage|review) → PluginFeesOverviewPage
└── OverviewCard ×6 (Stat, CountLink, ConnectStatusBadge)

/admin/plugin-fees/sevc-totals → PluginFeesAccessRoute(manage|review) → PluginFeesSevcTotalsPage
/admin/plugin-fees/adjustments → PluginFeesAccessRoute(manage) → PluginFeesAdjustmentsPage
└── AdjustmentForm (components/adjustments/adjustment-form.tsx)   confirmation dialog

/admin/plugin-fees/settings → PluginFeesAccessRoute(manage|review|payout_approve) → PluginFeesSettingsPage
├── FeeTable, ScheduledChanges (+ RemoveRateDialog, manage), PriceHistory   (fee-settings/fee-schedule-tables.tsx)
├── ScheduleChangeForm (manage)   confirmation dialog                      (fee-settings/schedule-change-form.tsx)
├── BillingSettingsForm (manage) | BillingSettingsView                     (fee-settings/billing-settings-form.tsx)
└── ConfigHistoryTable                                                     (fee-settings/config-history-table.tsx)

VoidInvoiceDialog (components/invoices/void-invoice-dialog.tsx) is rendered by the
payments page (PaymentsTable `onVoid`) and the agent statement page (StatementView
`voidInvoice`), for can_manage. StatementView also takes `ledgerAction` (the agent
statement's "Adjust ledger…").
```

Shared presentational pieces (`StatusBadge` — now with a `tone` override —, `FileLink`,
`ActionsList`, `HoursList`, `History`, `Detail`) live in `components/submission-parts.tsx`;
`InvoiceStatusBadge`, `LinesTable`, `ExpandButton`, `SignedAmount` in
`components/statement/statement-view.tsx`.

## 3. Primary flows

**Submit an office / assistant.** The form pre-checks required fields, state code, and file
type/size (`checkFile`, `utils/plugin-fees-format.ts:30`; `validateHours`, `:247`). The
hook posts multipart with only the `Authorization` header
(`services/plugin-fees-service.ts`, `getMultipartHeaders`). `hours` is sent as a JSON
string. A `validation_error` maps `fields` onto the inputs; any other `code` shows the
backend's `detail` in a form-level error and a toast. `me/` is invalidated on settle.

**Withdraw.** Always through a `ConfirmationDialog`. Withdrawing an *approved* office says
billing moves to the no-office rate from the next cycle.

**Save a payment method.** POST `setup-session/` with `return_path: '/settings'`, then
`window.location.href = url` — the same shape as `handleOpenBillingPortal` in the Settings
page. On return, `PluginFeesSettingsSections` reads `?fee_pm=`:
`success` → toast, invalidate `me/`, poll every 3 s for up to 30 s until
`payment_method.status === 'saved'` (`plugin-fees-settings-sections.tsx:23-24`);
`cancelled` → info toast. The param is removed with `replace`.

**Decide (review).** Approve/Verify/Re-verify opens `ApproveDialog` (optional note);
Reject opens `RejectModal`, whose submit is disabled while the note is blank. The decide
mutation invalidates `['plugin-fees','review',<kind>]`. A `409` (`not_pending` /
`not_decidable`) toasts a warning, closes the dialog and the queue refetches.

**Preview / open a cycle.** The page writes `?view=preview|report&month=YYYY-MM`; the
matching query is enabled from the URL (`useCyclePreview` only when `can_manage`). The
report is rendered whole; all agent filtering, sorting of statuses and CSV export happen
client-side over `report.agents` (no extra request).

**Approve a cycle.** Only for `can_approve_payouts` and `status === 'generated'`. The note
is required (button disabled while blank). On success the returned report is written to
`['plugin-fees','cycle',month]`; on settle `cycles`, `cycle/month` and
`cycle-preview/month` are invalidated. A `409 not_awaiting_approval` toasts a warning,
closes the dialog and refetches.

**Log / delete a cost.** Dollars are parsed as text into integer cents
(`parseDollarsToCents`); `mailing_cents`, `recipient_id` and `note` are omitted when
empty. A `validation_error` maps `fields` (e.g. `smd_id`) to the inputs. Delete sends
`DELETE costs/{id}/` with a JSON `{reason}` body; `409 already_applied` toasts a warning.
Both invalidate every `['plugin-fees','costs',…]` page and every
`['plugin-fees','cycle-preview',…]` (a cost changes the next month's preview).

**Pay now (P4).** Shown on the agent's own statement for an invoice with `can_pay_now`.
POST `me/invoices/{id}/pay-link/`, remember the invoice id in `sessionStorage`
(`wb.pf.payingInvoiceId`), then `window.location.href = url`. Stripe returns to
`/plugin-fees/statement?fee_pay=`: `success` → toast, refetch, and poll
`['plugin-fees','statement','me']` every 3 s for up to 30 s until that invoice reads `paid`
or `processing` (then a "received" / "bank payment in progress" toast; on timeout an info
toast); `cancelled` → info toast. The id is cleared and the param removed with `replace`
either way. Without a remembered id it refetches once (PF26). `409 not_payable` → warning
toast + refetch; `503 stripe_unavailable` → error toast.

**Send now (P4).** Payments page, `can_manage`, only when `cycle_status === 'approved'` and
`sending.pending > 0`; confirmed first (PF31). On settle it invalidates every
`['plugin-fees','payments',…]`, `['plugin-fees','cycle',month]` and `cycles`. `409
not_approved` → warning toast.

**Resolve a follow-up (P4).** `can_manage`; dialog with a required note
(`confirmDisabled`). On settle invalidates every `['plugin-fees','follow-ups',…]` and
`['plugin-fees','payments',…]` (the rows' follow-up flag). `409 already_resolved` →
warning toast, dialog closes, refetch.

**Payment state (P4).** `describePayment(state, audience)` maps status × collection ×
attempts to a badge and a sentence: `open` self-pay "Due by *date*" (or "Overdue" once the
UTC date is past `due_date`, PF25); `open` automatic "Charge scheduled" (attempts 0) or
"Payment failed — retrying on *date*"; `processing` "Bank payment in progress — settles in
about 4 business days"; `failed` "Payment failed — please pay now" (agent) / "…the agent
can still pay now" (admin). Payments filters, overdue and CSV are client-side over `rows`.

**Get paid (P5).** Only for an SMD with a ledger (PF34). `GET me/connect/` (no query
retry: a 403/503 shows at once). The button POSTs `me/connect/onboarding-link/`,
remembers the current status in `sessionStorage['wb.pf.connectStatusBefore']`, then
`window.location.href = url`. Stripe returns to `/plugin-fees/statement?connect=`:
`return` → toast, refetch, poll `['plugin-fees','connect','me']` every 3 s for up to 30 s
until the status differs from the remembered one (or is `enabled` when none was
remembered, PF35); `refresh` → warning toast. The param is removed with `replace`.

**Payouts (P5).** Prepare (`can_manage`) POSTs `payouts/` with the selected quarter, then
writes `?quarter=`; on settle `payouts`, `payout/<quarter>` and `dashboard` are
invalidated (the response is not cached, PF37). Approve (`can_approve_payouts`, `draft`,
required note) writes the returned report into `['plugin-fees','payout',quarter]`; approve
and retry invalidate the report, the list, `balances`, `dashboard` and every statement
(PF46). `409 not_draft` / `not_retryable` → warning toast + refetch. While a report (or any
list row) is `approved` or `sending`, its query polls every 5 s (`refetchInterval` as a
function of the data). Line entries reconcile to the amount via a carried-in row (PF38).

**Overview, SEVC totals (P6).** One `dashboard/` call; SEVC totals reads `?from=&to=` (both
`YYYY-MM`, `from <= to`, else the 6-month default) and keys the query on both.

**Adjustment (P6).** Direction × unsigned dollars → signed integer cents
(`parseDollarsToCents`, never floats), required note, optional numeric invoice id;
confirmation first (PF43). On settle invalidates every adjustments page, every
statement, `balances`, `dashboard` and `connect/me`. `validation_error` / `note_required`
map onto fields.

**Void (P6).** `VoidInvoiceDialog` with a required note → `POST invoices/{id}/void/`. On
settle invalidates every payments month, every statement, every follow-ups filter and the
dashboard — not balances (PF44). `409 not_voidable` → warning toast.

## 4. Server state and caching

| Key | Hook | staleTime | Refetch | Invalidated by |
|---|---|---|---|---|
| `['plugin-fees','my-access']` | `usePluginFeesAccess` | 5 min | — | — |
| `['plugin-fees','me']` | `useMyPluginFees` | 60 s | every 10 min, on focus; every 3 s while polling | submit / withdraw (office, assistant), `?fee_pm=success` |
| `['plugin-fees','review','offices',{status,search,page}]` | `useOfficeReviews` | 30 s | every 10 min, on focus | `useDecideOffice` |
| `['plugin-fees','review','assistants',{status,search,page}]` | `useAssistantReviews` | 30 s | every 10 min, on focus | `useDecideAssistant` |
| `['plugin-fees','statement','me']` | `useMyStatement` | 60 s | every 3 s while polling after `?fee_pay=success` | — (refetched directly on return and on `not_payable`) |
| `['plugin-fees','statement','agent',id]` | `useAgentStatement` | 60 s | app default | — |
| `['plugin-fees','cycles']` | `useCycles` | 30 s | app default | `useApproveCycle`, `useSendCycle` |
| `['plugin-fees','cycle',month]` | `useCycleReport` | 30 s | app default | `useApproveCycle` (set from response, then invalidated), `useSendCycle` |
| `['plugin-fees','cycle-preview',month]` | `useCyclePreview` | 60 s | never on focus | `useApproveCycle` (that month); `useCreateCost`, `useDeleteCost` (all months) |
| `['plugin-fees','costs',{smd,month,page}]` | `useCosts` | 30 s | app default | `useCreateCost`, `useDeleteCost` (prefix `['plugin-fees','costs']`) |
| `['plugin-fees','payments',month]` | `usePayments` | 30 s | app default | `useSendCycle`, `useResolveFollowUp` (prefix `['plugin-fees','payments']`) |
| `['plugin-fees','follow-ups',status]` | `useFollowUps` | 30 s | app default | `useResolveFollowUp` (prefix `['plugin-fees','follow-ups']`) |
| `['plugin-fees','balances']` | `useBalances` | 60 s | app default | `useApprovePayout`, `useRetryPayoutLine`, `useCreateAdjustment` |
| `['plugin-fees','connect','me']` | `useMyConnect` | 60 s | every 3 s while polling after `?connect=return`; query `retry: false` | `useCreateAdjustment` |
| `['plugin-fees','payouts']` | `usePayouts` | 30 s | every 5 s while any row is `approved`/`sending` | `usePreparePayout`, `useApprovePayout`, `useRetryPayoutLine` |
| `['plugin-fees','payout',quarter]` | `usePayoutReport` | 30 s | every 5 s while `approved`/`sending` | `usePreparePayout`, `useApprovePayout` (set from response, then invalidated), `useRetryPayoutLine` |
| `['plugin-fees','dashboard']` | `useDashboard` | 30 s | app default | prepare / approve / retry payout, `useCreateAdjustment`, `useVoidInvoice` |
| `['plugin-fees','sevc-totals',from,to]` | `useSevcTotals` | 60 s | app default | — |
| `['plugin-fees','adjustments',{smd,page}]` | `useAdjustments` | 30 s | app default | `useCreateAdjustment` (prefix `['plugin-fees','adjustments']`) |
| `['plugin-fees','fee-schedule']` | `useFeeSchedule` | 30 s | app default | `useScheduleFeeChange`, `useDeleteFeeRate` (set from response, then invalidated) |
| `['plugin-fees','settings']` | `useBillingSettings` | 30 s | app default | `useUpdateBillingSettings` (set from response, then invalidated) |
| `['plugin-fees','config-history']` | `useConfigHistory` | 30 s | app default | every fee schedule and settings write |

Fee schedule writes also invalidate `['plugin-fees','me']` and every cycle preview; a
settings save also invalidates `['plugin-fees','me']` (PF51).

P5/P6 also invalidate existing keys: every statement (prefix `['plugin-fees','statement']`)
on approve / retry payout, adjustment and void; every payments month and follow-ups filter
on void.

- Every `queryFn` forwards React Query's `signal` into `fetch`, and review keys carry the
  full selection — together a superseded page or search is both irrelevant and cancelled.
- Review, costs, payments and follow-ups queries use `placeholderData: keepPreviousData` so
  paging does not flash empty. The payments page ignores placeholder data for another
  month (it checks `data.month`) and shows "Loading *Month*…" instead.
- The pay-link mutation invalidates nothing — the page navigates away to Stripe.
- P3 payloads carry no signed URLs, so they do not use the 10-minute refresh.
- The 10-minute refresh (`SIGNED_URL_REFRESH_MS`, `hooks/use-plugin-fees.ts:70`) exists
  because file URLs are signed for 15 minutes (decision PF4).
- Every mutation sets `retry: false`, overriding the app-wide `mutations.retry: 1`
  (`src/infrastructure/query/provider.tsx:15`) — decision PF5.

## 5. Local and URL state

| State | Where | Notes |
|---|---|---|
| Form fields, staged files, field errors | `OfficeSection`, `AssistantSection` | Assistant fields prefill from the effective assistant (photo must be re-chosen) |
| Withdraw target | section `useState` | Drives the confirmation dialog |
| Polling start time | `PluginFeesSettingsSections` | `null` when not polling |
| `?fee_pm=` | URL | Read once, then removed |
| Active tab | `PluginFeesReviewPage` | Not in the URL |
| Status, search (debounced 350 ms), page | `ReviewQueue` | Page resets to 1 on a status/search change |
| Pending decision | `ReviewQueue` | `{ item, mode }` |
| Open report | `?view=preview\|report&month=YYYY-MM` | URL, so Back from an agent statement restores it; invalid values show "No report open" |
| Month input | `PluginFeesCyclesPage` | Defaults to next month (`nextMonthValue`) |
| Agent filters, expanded rows | `CycleAgentsTable` | Reset when another report opens (keyed by view+month) |
| Expanded invoices | `InvoicesTable` | Set of invoice ids |
| Cost filters (month, SMD), page | `PluginFeesCostsPage` | Page resets to 1 on a filter change |
| Cost form, delete target | `CostForm`, `PluginFeesCostsPage` | Form keeps the SMD and date after a save, clears the rest |
| `?fee_pay=` | URL | Read once, then removed |
| Paying invoice id | `sessionStorage['wb.pf.payingInvoiceId']` | Set before the Stripe redirect, taken (and cleared) on return; read/write wrapped in try/catch |
| Poll target + start time | `PluginFeesStatementPage` | `null` when not polling |
| Payments month | `?month=YYYY-MM` | URL; default the current UTC month; invalid → default |
| Payments filter tab, search | `PaymentsTable` | Reset when the month changes (keyed by month) |
| Follow-up status filter, resolve target | `FollowUpsSection` | Default `open` |
| Agent statement back link | `location.state.{backTo,backLabel}` | Only `/admin/plugin-fees` and `/admin/plugin-fees/…` honoured (PF32, PF47) |
| `?connect=` | URL | Read once, then removed |
| Connect status before redirect | `sessionStorage['wb.pf.connectStatusBefore']` | Set before the Stripe redirect, taken on return; wrapped in try/catch |
| Connect poll baseline + start time | `ConnectPanel` | `null` when not polling |
| Open payout report | `?quarter=YYYY-Qn` | URL; invalid → "No report open" |
| Prepare quarter, retrying line | `PluginFeesPayoutsPage` | Defaults to the last ended UTC quarter |
| Expanded payout lines | `PayoutReportView` `LinesTable` | Reset per quarter (keyed) |
| SEVC range | `?from=&to=` | URL; invalid → the 6-month default |
| Adjustment prefill + back link | `location.state.{prefillSmd,backTo,backLabel}` | From the agent statement; read once; only plug-in fees admin paths honoured |
| Adjustment SMD filter, page; form fields; confirmation | `PluginFeesAdjustmentsPage`, `AdjustmentForm` | Page resets to 1 on a filter change |
| Void target | payments page / agent statement page | Drives `VoidInvoiceDialog` |
| Review tab + status deep link | `?tab=&status=` | Read once as the opening tab / filter (PF42) |

## 6. Permissions and gating

`GET my-access/` is the only client-side gate, read through `usePluginFeesAccess()`.

| Surface | Shown when |
|---|---|
| Office section | `can_submit_office` **and** `me.office` present; fee wording only when `is_billable` (PF54) |
| Assistant section | `can_submit_assistant` **and** `me.assistant` present; deadline and routing wording only when `assistant_counts_for_routing` (PF54) |
| Payment method section | `can_save_payment_method` |
| Whole Settings block | at least one of the three; otherwise renders nothing (`me/` is not even requested) |
| Review route, menu "Plug-in Fees › Reviews" | `can_review` (`PluginFeesReviewRoute`, `src/router/plugin-fees-review-route.tsx`); loader while pending, `<Navigate to="/home">` on error or false |
| Statement route, menu "My Plug-in Fees", Settings link | `is_billable` (`canSeeOwnStatement`) |
| Cycles route, menu "Billing Cycles" | `can_manage \|\| can_review \|\| can_approve_payouts` (`canSeeCycles`) |
| Preview form | `can_manage` (`canPreviewCycles`) |
| Approve button | `can_approve_payouts` (`canApproveCycles`) and report `status === 'generated'` |
| Agent statement route; agent-name links in the report | `can_review \|\| can_manage` (`canSeeAgentStatements`) |
| Costs route, menu "Recognition Costs" | `can_manage` (`canManageCosts`) |
| Payments route (incl. follow-ups), menu "Fee Payments" | `can_manage \|\| can_review` (`canSeePayments`) |
| Send now | `can_manage` (`canSendCycles`), cycle `approved`, `sending.pending > 0` |
| Resolve follow-up | `can_manage` (`canResolveFollowUps`) and the follow-up open |
| SMD balances (cycles page) | `can_manage \|\| can_review \|\| can_approve_payouts` (`canSeeBalances`); names link only for `canSeeAgentStatements` |
| Pay now | own statement only, invoice `can_pay_now` (server-computed) |
| Get paid panel | `is_billable && level_code === 'SMD'` (`canSetUpPayouts`) and the statement has a `ledger` |
| Payouts route, menu "Payouts" | `can_manage \|\| can_review \|\| can_approve_payouts` (`canSeePayouts`) |
| Prepare report, Retry | `can_manage` (`canPreparePayouts`); Retry also needs a failed/held line on a non-draft payout |
| Approve payout | `can_approve_payouts` (`canApprovePayouts`) and `status === 'draft'` |
| Overview route, menu "Plug-in Fees › Overview" | `can_manage \|\| can_review` (`canSeeOverview`); each card's link only when its own predicate allows |
| SEVC totals route, menu "SEVC Totals" | `can_manage \|\| can_review` (`canSeeSevcTotals`) |
| Adjustments route, menu "Adjustments", "Adjust ledger…" | `can_manage` (`canManageAdjustments`) |
| Void | `can_manage` (`canVoidInvoices`) and status `draft`/`open`/`failed` (`isVoidable`) |
| Fee settings route, menu "Fee Settings" | `can_manage \|\| can_review \|\| can_approve_payouts` (`canSeeFeeSettings`; the menu rides `canViewPluginFeeCycles`, PF48) |
| Schedule / remove a price, save billing settings | `can_manage` (`canManageFeeSettings`) |

All P3 routes use `PluginFeesAccessRoute({ allow })` — the same loader / redirect as the
review guard, which is now a thin wrapper over it. Menu entries arrive through positional
booleans appended to `getMenuForUser` (`canReviewPluginFees`, `isPluginFeesBillable`,
`canViewPluginFeeCycles`, `canManagePluginFees`, `canViewPluginFeePayments`, and for P5/P6
`canViewPluginFeeOverview`, `canViewPluginFeePayouts` — PF41), computed in
`use-role-based-menu.ts` with the same predicates and listed in its `useMemo` deps.

The guards and the menu decide rendering only. Every endpoint checks its capability
itself; removing a guard is a UX regression, not an escalation. The approver
(`:payout_approve`) reads `cycles/` and `cycles/{month}/` (PF15, resolved on the backend).

## 7. Integration points

- **Settings page** renders `<PluginFeesSettingsSections />` after the Manage Subscription
  block (`settings-page.tsx:1548`). The sections reuse the page's scoped classes
  (`glass-section`, `field-group`, `input-field`, `btn-primary`) and add `wb-pf-` ones.
- **Shared components changed:** `StagedFilePicker` moved to
  `src/shared/components/staged-file-picker.tsx` (theme-aware text, optional `error`,
  opt-in `largeFileWarning` that `admin/content-pages` now passes);
  `ConfirmationDialog` gained optional `children`, `confirmVariant` and (P3)
  `confirmDisabled` (defaults unchanged).
- **`UserAutocompleteDropdown`** (shared) picks the cost's SMD and recipient, and the SMD
  filter. It searches `/api/accounts/users/` itself; it cannot filter to SMDs, so the
  backend's `fields.smd_id` error is the check (PF14).
- **Stripe** only through the backend-issued URL.

## 8. Invariants and failure modes

| Invariant | Enforced by | Breaks as |
|---|---|---|
| Every path ends in `/` | service paths | APPEND_SLASH redirect drops the POST body |
| Multipart sends no `Content-Type` | `getMultipartHeaders` | boundary missing → 400 on every upload |
| An absent field renders `—`, never `0` / `$0` | `formatCents`, `FileLink`, `Detail` callers | a masked or unconfigured rate reads as free |
| File URLs are used as given, never stored | `FileLink` | expired links after 15 min |
| Reject cannot be sent with an empty note | `RejectModal` | backend `400 note_required` |
| A pending submission blocks the form | `fieldset disabled` | backend `400 already_pending` |
| Uploads never auto-retry | `retry: false` | duplicate POST → `already_pending` |
| Money is integer cents end to end; dollars typed by an admin are parsed as text | `parseDollarsToCents` | `0.29` → 28 cents via floats |
| An invoice's lines are shown with a Total equal to `amount_cents` (the server's), never a client sum | `LinesTable` | a client rounding difference would contradict the invoice |
| Approve / delete-cost cannot be sent without a note / reason | `confirmDisabled` | `400 note_required`, or an unexplained delete |
| A preview is never refetched on focus | `useCyclePreview` | an expensive recompute every tab switch |
| Payment wording comes from one function for both audiences | `describePayment` | statement and dashboard disagree about the same invoice |
| "Overdue" uses the UTC date | `todayUtc` | an invoice flips to overdue a day early/late by timezone |
| Pay now never auto-retries | `NO_RETRY` | two pay links / sessions for one click |
| Resolve cannot be sent without a note | `confirmDisabled` | `400 note_required` |
| Payout approve, void and adjustment cannot be sent without a note | `confirmDisabled` / form validation | `400 note_required` |
| An adjustment is always confirmed and its amount is a non-zero signed integer of cents | `AdjustmentForm` | a sign or rounding mistake that can only be undone by an opposite entry |
| A payout line's detail reconciles to its amount | `EntriesTable` carried-in row | detail and amount disagree silently (PF38) |
| `me/connect/` is requested only for an SMD | `canSetUpPayouts` + `ledger` | a `403 not_eligible` on every MD statement |
| Payout mutations and the onboarding link never auto-retry | `NO_RETRY` | two transfers queued / two links for one click (the backend is idempotent, the UI does not rely on it) |

Polling stops as soon as `status === 'saved'`; if a method was already saved before the
redirect, polling stops immediately and the new method appears on the next refresh
(see [PHASES.md](PHASES.md#5-outstanding)).
