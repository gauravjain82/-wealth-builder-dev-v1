# Plug-in Fees — Operations

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

## 1. Environment and configuration

| Variable | Use |
|---|---|
| `VITE_API_BASE_URL` | API origin for every call |

No module-specific variables. Stripe keys, fee amounts, the verification deadline and the
re-verification window are backend configuration and arrive in `me/`.

## 2. Build and run

Nothing module-specific; see [platform/OPERATIONS.md §2](../platform/OPERATIONS.md#2-build-and-run).

## 3. Feature flags and rollout

No client-side flags. Visibility comes from `my-access/`:

- Settings sections appear for active MDs/SMDs as soon as the backend is deployed.
- The review page and menu entry appear only for holders of `plugin_fees:review`, granted in
  the backend access console. Nobody holds it today.
- "My Plug-in Fees" (the statement) and the Settings link appear for every active MD/SMD
  (`is_billable`) once the backend is deployed.
- Fee Payments (dashboard + follow-ups): `plugin_fees:manage` or `:review`; Send now and
  Resolve need `:manage`. SMD balances (on Billing Cycles): `:manage`, `:review` or
  `:payout_approve`. Pay now appears for any active MD/SMD on an invoice the backend marks
  `can_pay_now`.
- Billing Cycles: `plugin_fees:manage`, `:review` or `:payout_approve`. Preview needs
  `:manage`, Approve needs `:payout_approve`. Recognition Costs: `:manage`. Nobody holds
  `:manage` or `:payout_approve` today. Grant an approver `:review` too (see PHASES PF15).
- P5: "Get paid" appears on the statement of every active SMD once the backend is
  deployed. Payouts: `:manage`, `:review` or `:payout_approve`; Prepare and Retry need
  `:manage`, Approve `:payout_approve`.
- P6: the Plug-in Fees overview and SEVC Totals: `:manage` or `:review`. Adjustments and
  Void: `:manage` only.

**Coupled branches.** This module depends on `feature/plugin-fees` in `mlm_platform`. The two
must merge and deploy together: merged alone, the frontend's Settings block silently renders
nothing (`my-access/` 404s and the block hides) and the review route redirects to `/home`;
the backend alone has no UI. The coupled-branches list in the repo `CLAUDE.md` does not yet
name this pair — add it there when the branch is merged.

## 4. Tests and checks

No test runner. Checks run on the uncommitted working tree, 2026-10-01:

| Check | Result |
|---|---|
| `npm run type-check` | passes (P5/P6 tree) |
| `npm run build` | passes (each of the ten pages is its own lazy chunk) |
| `npm run lint` | 7 errors / 117 warnings (124 problems) — identical to `main`; no problems in this module's files. `eslint` over the touched files reports only the pre-existing `react-refresh/only-export-components` warning at `src/router/index.tsx:166` |

Manual verification against a running backend has **not** been done — the backend was being
built in parallel. P4 in particular was built from contract §6 alone, before the backend's
P4 views existed, and P5/P6 from contract §7–§8 while the backend built them.

**Stripe return URLs.** The backend builds `<FRONTEND_URL>/plugin-fees/statement?fee_pay=…`
for Pay now, `<FRONTEND_URL>/plugin-fees/statement?connect=…` for Stripe Connect
onboarding (and `/settings?fee_pm=…` for the payment method). If `FRONTEND_URL` on the
backend points at another host, the agent lands there and the poll never runs.

## 5. Deployment

Firebase hosting with the rest of the SPA. Deploy only together with the backend
`feature/plugin-fees` (migrations applied, Stripe webhook configured).

## 6. Troubleshooting

| Symptom | Likely cause |
|---|---|
| No plug-in fee sections on Settings | `my-access/` failed, or the user is inactive or ranks below the Fee Settings submission level (MD by default); check the network tab |
| Assistant or Office section missing | `can_submit_*` false (level below the Fee Settings submission level), or `me.assistant` / `me.office` absent |
| "Waiting for Stripe…" then the 30 s info toast | Stripe webhook late or misconfigured; the method appears on a later `me/` refetch (every 10 min, or reload) |
| Upload rejected with `file_type_invalid` despite the right extension | The backend sniffs bytes; the file is not really that type |
| Every upload fails with 400 | Something set `Content-Type` on the multipart request (boundary lost) |
| A lease/photo link opens an error page | Signed URL expired (15 min); the page refetches every 10 min and on focus — reload |
| Reviewer sees `/home` on `/admin/plugin-fees/review` | `can_review` false or `my-access/` errored |
| Any P3 page redirects to `/home` | the predicate in `utils/plugin-fees-access.ts` is false for this user, or `my-access/` errored |
| Billing Cycles opens but the list shows an error (403) | the user holds only `:payout_approve`; the contract gives reads to `:review` / `:manage` (PF15) |
| No Preview button | the user lacks `plugin_fees:manage` |
| No Approve button on a report | not `can_approve_payouts`, or the report is not `generated` (later months are approved at generation; previews cannot be approved) |
| Approve → "no longer awaiting approval" | someone else approved it; the report refetches |
| Cost save → error on "SMD charged" | the picked user is not an SMD (`fields.smd_id`) |
| Cost has no Delete button | already netted (`applied_month` set); `409 already_applied` otherwise |
| CSV opens with a leading `'` in some cells | deliberate: cells starting `= + - @` are neutralised (PF18) |
| Pay now → "can no longer be paid here" | `409 not_payable`: already paid, void, no charge, or not yet sent; the statement refetches |
| Pay now → "temporarily unavailable" | `503 stripe_unavailable` — Stripe keys or connectivity on the backend |
| Back from Stripe, "Waiting for Stripe…" then the info toast | webhook late or not configured; the invoice updates on a later refetch. If storage is blocked there is no poll at all (PF26) |
| An invoice shows "Overdue" a day before/after the agent expects | overdue is judged on the UTC date (PF25, D5) |
| No "Fee Payments" menu entry for an approver | by design: the payments page is `:manage`/`:review`; approvers see balances on Billing Cycles (PF29, PF30) |
| No Send now button | not `can_manage`, the cycle is not `approved`, or nothing is pending |
| Send now → "has not been approved yet" | `409 not_approved` |
| Resolve → "already resolved" | someone else resolved it, or the invoice was paid (auto-resolve); the list refetches |
| Self-pay open + Overdue tab counts disagree with the totals cards | the tabs are computed client-side and assume the two counts are disjoint (PF27) |
| No "Get paid" panel for an SMD | `my-access/` level is not `SMD`, or the statement has no `ledger` (PF34) |
| "Get paid" → "Payouts are for active SMDs." | `me/connect/` answered `403 not_eligible` (inactive SMD) |
| Back from Stripe Connect, "Waiting…" then the info toast | Stripe's account update is late, or the status did not change (e.g. the SMD left without submitting); reload later. Storage blocked → it waits for `enabled` (PF35) |
| "The link expired — click Finish setup again" | `?connect=refresh`: the onboarding link expired; a new click makes a new one |
| Prepare report → "has not ended yet" | `409 quarter_not_ended`; only ended quarters are offered, so the browser clock is probably off |
| A payout stays "Approved — queuing transfers" | the backend's transfer job has not run; the page polls every 5 s |
| No Retry on a held line | the payout is still `draft` (approve it first), or the user lacks `:manage` |
| A payout line's detail has a "carried in" row | its balance includes amounts from before the quarter (PF38) |
| No "Expiring within 14 days" link | the viewer lacks `:review`, so the review page is not theirs to open (PF42) |
| Adjustment → error on SMD | `fields.smd_id`: the user cannot hold a ledger |
| Void → "can no longer be voided" | `409 not_voidable`: paid or processing since the page loaded |
| Voided an SMD invoice but the balance did not change | by design — voiding never touches the ledger; post an adjustment (PF44) |
