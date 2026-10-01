# Plug-in Fees — Operations

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

**Coupled branches.** This module depends on `feature/plugin-fees` in `mlm_platform`. The two
must merge and deploy together: merged alone, the frontend's Settings block silently renders
nothing (`my-access/` 404s and the block hides) and the review route redirects to `/home`;
the backend alone has no UI. The coupled-branches list in the repo `CLAUDE.md` does not yet
name this pair — add it there when the branch is merged.

## 4. Tests and checks

No test runner. Checks run on the uncommitted working tree, 2026-10-01:

| Check | Result |
|---|---|
| `npm run type-check` | passes |
| `npm run build` | passes (each of the six pages is its own lazy chunk; `plugin-fees-payments-page` ≈ 15 kB) |
| `npm run lint` | 7 errors / 117 warnings (124 problems) — identical to `main`; no problems in this module's files |

Manual verification against a running backend has **not** been done — the backend was being
built in parallel. P4 in particular was built from contract §6 alone, before the backend's
P4 views existed.

**Stripe return URLs.** The backend builds `<FRONTEND_URL>/plugin-fees/statement?fee_pay=…`
for Pay now (and `/settings?fee_pm=…` for the payment method). If `FRONTEND_URL` on the
backend points at another host, the agent lands there and the poll never runs.

## 5. Deployment

Firebase hosting with the rest of the SPA. Deploy only together with the backend
`feature/plugin-fees` (migrations applied, Stripe webhook configured).

## 6. Troubleshooting

| Symptom | Likely cause |
|---|---|
| No plug-in fee sections on Settings | `my-access/` failed, or the user is not an active MD/SMD; check the network tab |
| Assistant section missing for an SMD | `can_submit_assistant` false, or `me.assistant` absent |
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
