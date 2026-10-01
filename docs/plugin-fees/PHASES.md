# Plug-in Fees — Phases

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

Phase numbers follow the backend's plan for `plugin_fees` (P2 is §1–4, P3 is §5 and P4 is
§6 of the contract in `mlm_platform/docs/plugin_fees/API.md`); do not renumber.

## 1. Timeline

| Date | Event |
|---|---|
| 2026-09-30 | Spec v3 received (`mlm_platform/docs/integrations/plugin-fees/SPEC_v3.md`) |
| 2026-10-01 | P2 contract v0.1 published; frontend P2 built on `feature/plugin-fees` (uncommitted) |
| 2026-10-01 | P3 contract (§5) published; frontend P3 screens built on the same branch (uncommitted) |
| 2026-10-01 | P4 contract (§6, collection) published; frontend P4 screens built on the same branch (uncommitted), backend P4 not yet built |

## 2. Phases

### P2 — Submissions, review queues, payment method

**Status:** built, not merged, not deployed (backend in development in parallel).

- Settings sections: office, assistant, payment method; Stripe setup-session return.
- Review page with office and assistant queues.
- `usePluginFeesAccess()`, `PluginFeesReviewRoute`, menu entry.
- Shared: `StagedFilePicker` lifted to `src/shared/components/`; `ConfirmationDialog`
  accepts `children` and `confirmVariant`.

### P3 — Statements, billing cycles, recognition costs

**Status:** built, not merged, not deployed (backend in development in parallel; not run
against it).

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

**Status:** built, not merged, not deployed. Built from the contract alone: when it was
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

### P5 — Payouts

**Status:** pending backend. Nothing built here.

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
| PF13 | "My Plug-in Fees" is inserted just **under Home**; Billing Cycles and Recognition Costs right **after** "Plug-in Fee Reviews" | The statement is an agent's own page, not an admin tool (same reasoning as Home v2's placement); the admin entries stay grouped | `src/config/menu.ts` |
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

## 4. Deliberately not built

- Client-side feature flags — rollout is backend grants only.
- A URL-synced review tab/filter — not asked for; easy to add.
- Any fee, ledger or payout editing — the Hierarchy Assistant cannot change them (spec).
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
- P5 UI.
