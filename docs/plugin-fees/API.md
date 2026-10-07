# Plug-in Fees — API consumed

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

**Authority:** `mlm_platform/docs/plugin_fees/API.md` (contract v0.1: P2 §1–4, P3 §5, P4 §6, P5 §7, P6 §8;
plus the fee configuration endpoints and `ledger.totals`, added 2026-10-03). This file records
what the frontend sends and reads; it does not restate server behaviour.

## 1. Conventions

- Base URL `VITE_API_BASE_URL` (default `http://localhost:8000`); prefix `/api/plugin-fees`.
- `Authorization: Token <localStorage['wb.authToken']>` on every call. JSON calls add
  `Content-Type: application/json`; multipart calls send **only** `Authorization`.
- Every path ends in `/`.
- Errors are `{ "detail": str, "code": str }`, plus `fields` for `validation_error`.
  `PluginFeesError` (`services/plugin-fees-service.ts:71`) carries `status`, `code`,
  `fields`; a non-JSON error body becomes `Request failed: <status>`.
- Money is integer cents; dates `YYYY-MM-DD`; timestamps ISO-8601 UTC.
- File URLs are signed for 15 minutes.
- A `204` (the cost DELETE) resolves to `undefined`; every other success is parsed as JSON.

## 2. Endpoints consumed

| Method | Path | Service function | Hook | Used by |
|---|---|---|---|---|
| GET | `my-access/` | `fetchPluginFeesAccess` | `usePluginFeesAccess` | guard, menu, Settings |
| GET | `me/` | `fetchMyPluginFees` | `useMyPluginFees` | Settings sections |
| POST (multipart) | `me/office/` | `submitOffice` | `useSubmitOffice` | Office form |
| POST | `me/office/{id}/withdraw/` | `withdrawOffice` | `useWithdrawOffice` | Office Withdraw |
| POST (multipart) | `me/assistant/` | `submitAssistant` | `useSubmitAssistant` | Assistant form |
| POST | `me/assistant/{id}/withdraw/` | `withdrawAssistant` | `useWithdrawAssistant` | Assistant Withdraw |
| POST | `me/payment-preference/` | `setPaymentPreference` | `useSetPaymentPreference` | Payment method (automatic vs pay myself) |
| POST | `me/payment-method/setup-session/` | `createPaymentMethodSetupSession` | `useCreatePaymentMethodSetupSession` | Payment method |
| GET | `me/payment-method/cards/` | `fetchSavedCards` | `useSavedCards` | Payment method (saved-card picker) |
| POST | `me/payment-method/use-card/` | `authorizeCard` | `useAuthorizeCard` | Payment method (Authorize) |
| POST | `me/payment-method/use-card/complete/` | `completeCard` | `useAuthorizeCard` | after 3D Secure |
| GET | `review/offices/` | `fetchOfficeReviews` | `useOfficeReviews` | Review → Offices |
| POST | `review/offices/{id}/decide/` | `decideOffice` | `useDecideOffice` | Review → Offices |
| GET | `review/assistants/` | `fetchAssistantReviews` | `useAssistantReviews` | Review → Assistants |
| POST | `review/assistants/{id}/decide/` | `decideAssistant` | `useDecideAssistant` | Review → Assistants |
| GET | `me/statement/` | `fetchMyStatement` | `useMyStatement` | Statement of account |
| GET | `agents/{id}/statement/` | `fetchAgentStatement` | `useAgentStatement` | Agent statement lookup |
| GET | `cycles/` | `fetchCycles` | `useCycles` | Billing cycles list |
| GET | `cycles/preview/?month=` | `fetchCyclePreview` | `useCyclePreview` | Billing cycles → Preview |
| GET | `cycles/{month}/` | `fetchCycleReport` | `useCycleReport` | Billing cycles → report |
| POST | `cycles/{month}/approve/` | `approveCycle` | `useApproveCycle` | Approve dialog |
| GET | `costs/?smd=&month=&page=` | `fetchCosts` | `useCosts` | Costs list |
| POST | `costs/` | `createCost` | `useCreateCost` | Log a cost |
| DELETE (JSON body) | `costs/{id}/` | `deleteCost` | `useDeleteCost` | Delete cost dialog |
| POST | `me/invoices/{id}/pay-link/` | `createInvoicePayLink` | `useCreateInvoicePayLink` | Statement → Pay now |
| GET | `payments/?month=` | `fetchPayments` | `usePayments` | Payments dashboard |
| POST | `cycles/{month}/send/` | `sendCycle` | `useSendCycle` | Payments → Send now |
| GET | `follow-ups/?status=` | `fetchFollowUps` | `useFollowUps` | Payments → Follow-ups |
| POST | `follow-ups/{id}/resolve/` | `resolveFollowUp` | `useResolveFollowUp` | Resolve dialog |
| GET | `balances/` | `fetchBalances` | `useBalances` | Billing cycles → SMD balances |
| GET | `me/connect/` | `fetchMyConnect` | `useMyConnect` | Statement → Get paid (SMD) |
| POST | `me/connect/onboarding-link/` | `createConnectOnboardingLink` | `useCreateConnectOnboardingLink` | Get paid button |
| GET | `payouts/` | `fetchPayouts` | `usePayouts` | Payouts list |
| POST | `payouts/` | `preparePayout` | `usePreparePayout` | Payouts → Prepare report |
| GET | `payouts/{quarter}/` | `fetchPayoutReport` | `usePayoutReport` | Payouts → report |
| POST | `payouts/{quarter}/approve/` | `approvePayout` | `useApprovePayout` | Approve payout dialog |
| POST | `payouts/{quarter}/lines/{id}/retry/` | `retryPayoutLine` | `useRetryPayoutLine` | Payout line Retry |
| GET | `dashboard/` | `fetchDashboard` | `useDashboard` | Overview |
| GET | `sevc-totals/?from=&to=` | `fetchSevcTotals` | `useSevcTotals` | SEVC totals |
| GET | `adjustments/?smd=&page=` | `fetchAdjustments` | `useAdjustments` | Adjustments list |
| POST | `adjustments/` | `createAdjustment` | `useCreateAdjustment` | Adjustment form |
| POST | `invoices/{id}/void/` | `voidInvoice` | `useVoidInvoice` | Void dialog (payments, agent statement) |
| GET | `fee-schedule/` | `fetchFeeSchedule` | `useFeeSchedule` | Fee settings → fee table, scheduled changes, price history, schedule form |
| POST | `fee-schedule/` | `scheduleFeeChange` | `useScheduleFeeChange` | Fee settings → Schedule a price change |
| DELETE (JSON body) | `fee-schedule/{id}/` | `deleteFeeRate` | `useDeleteFeeRate` | Fee settings → scheduled change Remove |
| GET | `settings/` | `fetchBillingSettings` | `useBillingSettings` | Fee settings → Billing settings |
| PATCH | `settings/` | `updateBillingSettings` | `useUpdateBillingSettings` | Fee settings → Billing settings form |
| GET | `config-history/` | `fetchConfigHistory` | `useConfigHistory` | Fee settings → Change history |

Reads of `fee-schedule/`, `settings/` and `config-history/` need `:manage`, `:review` or
`:payout_approve`; every write needs `:manage`. `me/statement/` and
`agents/{id}/statement/` now also carry `ledger.totals` (below).

## 3. Payload types

All in `src/features/plugin-fees/types/index.ts`, mirroring the contract:

| Type | Endpoint | Notes |
|---|---|---|
| `PluginFeesAccess` | `my-access/` | nine fields, incl. `assistant_counts_for_routing` (PF54) |
| `PluginFeesMe` | `me/` | `office?`, `assistant?`, `rates?` are **optional** (absent when not allowed / not configured) |
| `OfficeSubmission`, `AssistantSubmission` | `me/`, write responses | `lease?`/`photo?` optional; `decided_*`, `verified_at`, `reverify_due` nullable |
| `PluginFeesPaymentMethod` | `me/.payment_method` | `type`, `label`, `saved_at` only when `status: 'saved'` |
| `OfficeReviewItem`, `AssistantReviewItem` | `review/…` | submission + `agent` |
| `Paginated<T>` | `review/…`, `costs/` | `count`, `next`, `previous`, `results` |
| `PluginFeesStatement` | `me/statement/` | `invoices`; `ledger?` **optional** (absent for MDs) |
| `AgentStatement` | `agents/{id}/statement/` | statement + `agent` (`ReviewAgent`) |
| `StatementInvoice`, `StatementLine` | statements | `paid_at` nullable; lines sum to `amount_cents`; credits negative. P4 adds the `InvoicePaymentState` fields and `can_pay_now` |
| `InvoicePaymentState` | statement invoices, payments rows | P4: `status` (now incl. `processing`), `collection`, `due_date` (self-pay only), `attempts`, `next_retry_on`, `last_failure` (`PaymentFailure \| null`), `paid_at`, `paid_via` |
| `PaymentsDashboard`, `PaymentRow`, `PaymentTotals`, `PaymentCounts`, `SendingProgress` | `payments/` | `cycle_status` nullable; `rows` exclude `no_charge`; `agent` is a `ReviewAgent` |
| `FollowUp` | `follow-ups/` | `resolved_at`, `resolved_by` nullable |
| `SmdBalance` | `balances/` | highest first; positive = owed to the SMD |
| `PayLinkResponse`, `SendCycleResponse` | pay-link, send | `{url}`, `{queued}` |
| `LedgerEntry`, `StatementLedger` | statements | credits positive, debits negative; `balance_cents` is running |
| `CycleSummary` | `cycles/` | `generated_at`, `approved_at`, `approved_by` nullable |
| `CycleReport`, `CycleTotals`, `SevcTotal`, `CycleAgent` | `cycles/{month}/`, `cycles/preview/`, approve response | `assistant_verified` null for MDs; `md_credit_*`, `closest_sevc_id`, `excluded_reason`, `invoice_id` nullable; P4 `sending?` typed optional |
| `RecognitionCost` | `costs/` | `smd` is a `ReviewAgent`; `recipient_id`, `applied_month` nullable |
| `ConnectAccount`, `ConnectStatus` | `me/connect/` | `requirements_due: string[]`; `updated_at` nullable |
| `OnboardingLinkResponse` | onboarding-link | `{url}` |
| `PayoutSummary`, `PayoutStatus` | `payouts/` | newest first; `approved_by`/`approved_at` nullable; `lines` is a count |
| `PayoutReport`, `PayoutTotals`, `PayoutLine`, `PayoutEntry`, `PayoutLineStatus` | `payouts/{quarter}/`, approve response | entries carry no `id`/`balance_cents`; `stripe_transfer_id`, `sent_at` nullable; `failure` typed `string \| {code?, message?, at?} \| null` (contract shows only `null`) |
| `PluginFeesDashboard`, `DashboardSevcTotal`, `UpcomingPayout`, `ConnectNotOnboarded` | `dashboard/` | `connect_not_onboarded[].status` excludes `enabled`; `sevc_name` typed nullable |
| `SevcMonthTotal` | `sevc-totals/` | a `DashboardSevcTotal` + `month`, `total_cents` |
| `LedgerAdjustment` | `adjustments/` | `agent` assumed `ReviewAgent`; `invoice_id`, `created_by` nullable |
| `PaymentRow` | void response | typed as a payments row; unused (everything refetches) |
| `LedgerTotals` | statements, `ledger.totals?` | lifetime signed sums per `LedgerEntryType` (`md_credit_own`, `md_credit_rollup`, `smd_fee`, `costs`, `charge_collected`, `payout`, `reversal`, `adjustment`); **optional** — absent from older payloads, the summary is then hidden |
| `FeeSchedule`, `FeeMatrixCell`, `FeeRate`, `FeeLevelCode` | `fee-schedule/` (GET, and the POST / DELETE response) | `today`, `next_cycle_month`, `earliest_effective_from`, `billed_levels`; `matrix` (4 cells) with `current` / `next_cycle` nullable and `scheduled[]`; `rows` newest `effective_from` first; `created_by_name`, `created_at` nullable |
| `PluginFeesBillingSettings` | `settings/` (GET, PATCH response) | `go_live_month`, `assistant_verification_deadline`, `updated_at` nullable; `go_live_locked` |
| `ConfigHistory`, `ConfigHistoryEntry` | `config-history/` | `{results}` newest first, max 50; `actor_name`, `source` nullable; `changes: {field: {old, new}}` with `unknown` values |

**Request bodies**

| Endpoint | Body |
|---|---|
| `me/office/` | multipart: `address_line1`, `address_line2`, `city`, `state`, `zip`, `lease`, `photo` |
| `me/assistant/` | multipart: `name`, `phone` (E.164), `email`, `hours` (**JSON string** of `[{day,start,end}]`), `photo` |
| `setup-session/` | `{ "return_path": "/settings" }` |
| `use-card/` | `{ "payment_method_id": "pm_…", "authorize": true }` (the consent tick; the button is disabled until it is ticked) |
| `use-card/complete/` | `{ "setup_intent_id": "seti_…" }` |
| `…/decide/` | `{ "decision": "approve"\|"reject" }` (offices) or `"verify"\|"reject"` (assistants), `"note": str` |
| `…/withdraw/` | no body |
| `cycles/{month}/approve/` | `{ "note": str }` — required, trimmed, never sent blank |
| `costs/` (POST) | `{ smd_id, recipient_name, item, recognition_cents, date_sent }` plus `recipient_id`, `mailing_cents`, `note` only when given. Cents are parsed from the dollar text, never via floats |
| `costs/{id}/` (DELETE) | `{ "reason": str }` — required; sent as a JSON body on the DELETE |
| `me/invoices/{id}/pay-link/` | no body |
| `cycles/{month}/send/` | no body |
| `follow-ups/{id}/resolve/` | `{ "note": str }` — required, trimmed, never sent blank |
| `me/connect/onboarding-link/` | no body |
| `payouts/` (POST) | `{ "quarter": "YYYY-Qn" }` |
| `payouts/{quarter}/approve/` | `{ "note": str }` — required, trimmed, never sent blank |
| `payouts/{quarter}/lines/{id}/retry/` | no body |
| `adjustments/` (POST) | `{ smd_id, amount_cents, note }` plus `invoice_id` only when given; `amount_cents` signed, non-zero, from direction × dollar text |
| `invoices/{id}/void/` | `{ "note": str }` — required, trimmed, never sent blank |
| `fee-schedule/` (POST) | `{ effective_from: "YYYY-MM", reason, rates: [{ level_code, with_office, amount_cents }] }` — `reason` required and trimmed; only the rates whose amount differs from the cell's `next_cycle` are sent (1–4); cents parsed from the dollar text, never via floats |
| `fee-schedule/{id}/` (DELETE) | `{ "reason": str }` — required; sent as a JSON body on the DELETE |
| `settings/` (PATCH) | `{ reason, …changed fields only }` — any of `go_live_month` (`YYYY-MM` or `null` when cleared), `self_pay_due_day` (1–28), `reverify_window_days` (1–90), `assistant_verification_deadline` (`YYYY-MM-DD` or `null`), `submission_min_level` (a level `id`, or `null` for the default); `go_live_month` never sent while `go_live_locked` |

## 4. Query parameters

`review/offices/` and `review/assistants/`: `status` (always sent), `search` (sent only
when non-blank, trimmed), `page` (1-based). Values: see [UI.md §2.4](UI.md#24-review-page).
The page size (25) is the server's; the client only computes "Page n of m" from `count`.

`payments/`: `month` (`YYYY-MM`, always sent; default the current UTC month).
`follow-ups/`: `status` (`open` default · `resolved` · `all`, always sent).

`sevc-totals/`: `from` and `to` (`YYYY-MM`, always sent; `from <= to` validated
client-side; default the 6 months ending with the current UTC month). `adjustments/`:
`smd` (only when a filter is picked), `page` — "Page n" with Previous / Next, as costs.
Quarters in paths are `YYYY-Qn`, URL-encoded.

`cycles/preview/`: `month` (`YYYY-MM`, validated client-side). `costs/`: `smd` (user id,
only when a filter is picked), `month` (`YYYY-MM` of `date_sent`, only when set), `page`.
The costs page size is not in the contract, so the costs list shows "Page n" and enables
Previous / Next from `previous` / `next` rather than computing a page count.

## 5. Error codes and handling

| Code | Status | Where | Handling |
|---|---|---|---|
| `validation_error` | 400 | submit | `fields` mapped to inputs; `detail` in form error + toast |
| `file_type_invalid` | 400 | submit | `detail` in form error + toast |
| `file_size_invalid` | 400 | submit | same |
| `already_pending` | 400 | submit | same; `me/` refetches and the form disables |
| `not_eligible` | 403 | submit, setup-session | toast |
| `not_withdrawable` | 409 | withdraw | toast; `me/` refetches |
| `stripe_unavailable` | 503 | setup-session, cards | toast; button re-enabled. On the GET the picker is just hidden |
| `authorization_required` | 400 | use-card | prevented client-side; toast |
| `card_not_found` | 404 | use-card | toast; the list refetches |
| `card_declined` | 402 | use-card, complete, or a failed 3D Secure | toast; the previous method stays |
| `forbidden` | 403 | review | `ErrorState` (the guard normally prevents this) |
| `note_required` | 400 | decide | prevented client-side; toast if it happens |
| `not_pending` / `not_decidable` | 409 | decide | warning toast, dialog closes, queue refetches |
| `note_required` | 400 | approve cycle | prevented client-side (button disabled); error toast if it happens |
| `not_awaiting_approval` | 409 | approve cycle | warning toast, dialog closes, report and list refetch |
| `not_found` | 404 | cycle report / approve | `ErrorState` / error toast |
| `validation_error` (`fields.smd_id`, …) | 400 | create cost | `fields` mapped to inputs; form error + toast |
| `already_applied` | 409 | delete cost | warning toast, dialog closes, list refetches |
| `forbidden` | 403 | any P3 endpoint | `ErrorState` / toast (the guards normally prevent this) |
| `not_found` | 404 | pay-link | error toast |
| `not_payable` | 409 | pay-link | warning toast; the statement refetches |
| `stripe_unavailable` | 503 | pay-link | error toast ("temporarily unavailable"); button re-enabled |
| `not_approved` | 409 | send | warning toast; dashboard and cycle refetch (on settle) |
| `note_required` | 400 | resolve follow-up | prevented client-side; error toast if it happens |
| `already_resolved` | 409 | resolve follow-up | warning toast, dialog closes, follow-ups refetch |
| `not_eligible` | 403 | `me/connect/`, onboarding-link | panel: "Payouts are for active SMDs."; button: warning toast |
| `stripe_unavailable` | 503 | onboarding-link (and `me/connect/` if it happens) | error toast; button re-enabled / inline error + Retry |
| `quarter_not_ended` | 409 | prepare payout | warning toast |
| `note_required` | 400 | approve payout, adjustment, void | prevented client-side; error toast / note field error if it happens |
| `not_draft` | 409 | approve payout | warning toast, dialog closes, report refetches |
| `not_retryable` | 409 | retry payout line | warning toast, report refetches |
| `validation_error` (`fields`) | 400 | adjustment | `fields` mapped to inputs (`smd_id`, `amount_cents`, `note`, `invoice_id`); form error + toast |
| `not_voidable` | 409 | void | warning toast, dialog closes; everything refetches on settle |
| `reason_required` | 400 | schedule price, remove price, save settings | prevented client-side; shown on the reason field + toast if it happens |
| `validation_error` (`fields`) | 400 | schedule price | `effective_from`, `reason` → their inputs; `rates[i]…` → the price input of the i-th **sent** rate; `rates` → under the form |
| `effective_from_not_future` | 400 | schedule price | `detail` on the month input + form error + toast |
| `cycle_exists` | 409 | schedule price, remove price | form error + warning toast (schedule); warning toast, dialog closes (remove); the schedule refetches on settle |
| `conflict` | 409 | schedule price | form error + warning toast; the schedule refetches on settle |
| `not_found`, `rate_started` | 404, 409 | remove price | warning toast, dialog closes; the schedule refetches |
| `validation_error` (`fields`) | 400 | save settings | `fields` mapped to the inputs; form error + toast |
| `go_live_locked` | 409 | save settings | `detail` on the go-live input + warning toast (the input is disabled while `go_live_locked`, so only a race reaches this) |

**Stripe return.** `pay-link` sends the agent to Stripe, which returns to
`/plugin-fees/statement?fee_pay=success|cancelled`; `onboarding-link` to Stripe Connect,
which returns to `/plugin-fees/statement?connect=return|refresh`; see
[ARCHITECTURE.md §3](ARCHITECTURE.md#3-primary-flows).

Messages prefer the backend `detail`; a fixed per-code message is the fallback
(`describeError`, `utils/plugin-fees-format.ts:216`).

## 6. Backend ownership

`plugin_fees` app in `mlm_platform`, on its `feature/plugin-fees` branch. Contract:
`mlm_platform/docs/plugin_fees/API.md`; operations: `mlm_platform/docs/plugin_fees/OPERATIONS.md`.
Spec background: `mlm_platform/docs/integrations/plugin-fees/SPEC_v3.md`.
