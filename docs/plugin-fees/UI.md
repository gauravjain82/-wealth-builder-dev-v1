# Plug-in Fees — UI

| | |
|---|---|
| **Module** | `plugin-fees` |
| **Source** | `src/features/plugin-fees/` |
| **Routes** | `/plugin-fees/statement`, `/admin/plugin-fees` (overview), `/admin/plugin-fees/review`, `/admin/plugin-fees/cycles`, `/admin/plugin-fees/payments`, `/admin/plugin-fees/payouts`, `/admin/plugin-fees/sevc-totals`, `/admin/plugin-fees/costs`, `/admin/plugin-fees/adjustments`, `/admin/plugin-fees/agents/:id/statement`; three sections embedded in `/settings` |
| **Backend module** | `plugin_fees` → `mlm_platform/docs/plugin_fees/` |
| **API prefix** | `/api/plugin-fees/` |
| **Status** | Merged-not-deployed — **not yet merged**: branch `feature/plugin-fees` (P2–P4 committed at `21294f1`, P5–P6 uncommitted); the backend counterpart is in development and nobody holds `plugin_fees:review`, `:manage` or `:payout_approve` |
| **Doc version** | 0.4 |
| **Verified against** | commit `21294f1` (P2–P4) plus the uncommitted `feature/plugin-fees` working tree (P5 payouts + P6 admin remainder) — 2026-10-01 |

## 1. Routes and entry points

| Entry | Who | Guard |
|---|---|---|
| `/settings` → Office, Assistant, Payment Method for Plug-in Fees sections (after Manage Subscription) | MD, SMD (assistant: SMD only) | none on the route; sections render per `my-access/` |
| `/settings?fee_pm=success` / `?fee_pm=cancelled` | Stripe return | — |
| `/admin/plugin-fees/review` | Hierarchy Assistant | `PluginFeesReviewRoute` (`can_review`) |
| `/plugin-fees/statement` | MD, SMD | `PluginFeesAccessRoute` (`is_billable`) |
| `/admin/plugin-fees/cycles` (`?view=preview\|report&month=YYYY-MM`) | admin, Hierarchy Assistant, approver | `PluginFeesAccessRoute` (`can_manage \|\| can_review \|\| can_approve_payouts`) |
| `/admin/plugin-fees/payments` (`?month=YYYY-MM`) | admin, Hierarchy Assistant (read-only) | `PluginFeesAccessRoute` (`can_manage \|\| can_review`) |
| `/plugin-fees/statement?fee_pay=success` / `?fee_pay=cancelled` | Stripe return from Pay now | — |
| `/admin/plugin-fees/costs` | admin | `PluginFeesAccessRoute` (`can_manage`) |
| `/admin/plugin-fees/agents/:id/statement` | admin, Hierarchy Assistant | `PluginFeesAccessRoute` (`can_review \|\| can_manage`) |
| `/plugin-fees/statement?connect=return` / `?connect=refresh` | Stripe Connect return (P5) | — |
| `/admin/plugin-fees` | admin, Hierarchy Assistant | `PluginFeesAccessRoute` (`can_manage \|\| can_review`) |
| `/admin/plugin-fees/payouts` (`?quarter=YYYY-Qn`) | admin, Hierarchy Assistant, approver | `PluginFeesAccessRoute` (`can_manage \|\| can_review \|\| can_approve_payouts`) |
| `/admin/plugin-fees/sevc-totals` (`?from=YYYY-MM&to=YYYY-MM`) | admin, Hierarchy Assistant | `PluginFeesAccessRoute` (`can_manage \|\| can_review`) |
| `/admin/plugin-fees/adjustments` | admin | `PluginFeesAccessRoute` (`can_manage`) |
| `/admin/plugin-fees/review?tab=offices\|assistants&status=…` | overview deep link | read once (PF42) |
| Settings → "View statement of account →" | `is_billable` | link under the plug-in fee sections |
| Menu "My Plug-in Fees" 💳 | `is_billable` | inserted just under Home |
| Menu "Plug-in Fee Reviews" 🗂️ | `can_review` | appended after the other per-user admin entries |
| Menu "Billing Cycles" 🧾 | `can_manage \|\| can_review \|\| can_approve_payouts` | right after "Plug-in Fee Reviews" (or appended) |
| Menu "Fee Payments" 💵 | `can_manage \|\| can_review` | after "Billing Cycles" (PF30) |
| Menu "Plug-in Fees" 📊 (overview) | `can_manage \|\| can_review` | first of the plug-in fees admin entries, before "Plug-in Fee Reviews" (PF41) |
| Menu "Payouts" 🏦 | `can_manage \|\| can_review \|\| can_approve_payouts` | after "Fee Payments" |
| Menu "SEVC Totals" 📈 | `can_manage \|\| can_review` | after "Payouts" |
| Menu "Recognition Costs" 🎖️ | `can_manage` | after "SEVC Totals" |
| Menu "Adjustments" ⚖️ | `can_manage` | after "Recognition Costs" |

## 2. Screens

### 2.1 Office (Settings)

1. Callout: "The office rate applies only after your office is approved; until then you are
   billed at the no-office rate." plus, when `rates` is present, both rates for
   `rates.month` formatted as dollars.
2. **Approved office** — status badge, address, lease link, photo thumbnail, decided by/at,
   Withdraw. Otherwise "No approved office — you are billed at the no-office rate".
3. **Awaiting review** (if pending) — the same card with Withdraw.
4. **Submit form** — address line 1, line 2 (optional), city, state (2 letters, uppercased),
   ZIP, lease (PDF/JPEG/PNG/WebP ≤ 15 MB), photo (JPEG/PNG/WebP ≤ 10 MB). Disabled with an
   explanation while a pending submission exists. With an approved office: "stays in effect
   until the new one is approved".
5. **History (n)** — collapsed `<details>`; each submission with its actions (who, what,
   when, note), including rejection notes.

### 2.2 Assistant (Settings, SMD)

1. Callout, bold: "Assistant must be verified by *{deadlines.assistant_verification}* to
   count for *{month after it}* routing." Both come from the payload.
2. When the effective assistant has `reverify_open`: a warning callout with `reverify_due`.
3. **Verified assistant** — name, phone, email, hours, photo, verified at, re-verify due.
4. **Awaiting verification** (if pending), with Withdraw.
5. **Submit form** — name, email, phone (`PhoneField`, E.164), hours editor (day + start +
   end rows; add / remove; at least one row; start < end), photo. Prefilled from the
   verified assistant except the photo.
6. **History (n)**.

### 2.3 Payment Method for Plug-in Fees (Settings)

Saved method label, type (Bank account (ACH) / Card), saved time — or "No payment method
saved", or "Waiting for Stripe to confirm…" while polling. Hint: ACH is the default and
preferred method; separate from the website subscription. Button: "Save bank account"
(or "Replace with a bank account" when one is saved).

### 2.4 Review page

Heading, then tabs **Offices** · **Assistants**. Each tab: status select, debounced search
("name, agency code or email"), result count, then one card per submission — agent line
(name, agency code · level · email), the submission card (photos as thumbnails, lease as a
link, submitted time, decision, actions history) and the action buttons. Pagination
(Previous / Next, "Page n of m") appears above 25 results.

| Tab | Status options | Default |
|---|---|---|
| Offices | Pending · Approved · Rejected · All | Pending |
| Assistants | Pending · Re-verification due · Verified · Rejected · Expired · All | Pending |

| Item | Buttons |
|---|---|
| Office `pending` | Approve · Reject |
| Assistant `pending` | Verify · Reject |
| Assistant `verified` with `reverify_open` | **Re-verify** · Reject |
| anything else | none |

### 2.5 Statement of account (`/plugin-fees/statement`)

Heading "My Plug-in Fees", a line pointing to Settings, then:

0. **Get paid** (P5) — only for an SMD (a `ledger`, and `my-access/` level `SMD`, PF34):
   "Your positive balance is paid quarterly to your bank via Stripe. Stripe collects your
   bank and tax details (W-9) securely."; the payout account badge — `none` "Not set up"
   (grey), `onboarding` "Setup started — finish it" (amber), `restricted` "Stripe needs
   more information" (red), `enabled` "Ready to receive payouts" (green) — with "Checked
   with Stripe *time*"; the balance; for any status but `enabled`, a "Stripe still
   needs:" list of `requirements_due` in plain words (PF36); and the button **Set up
   payouts** (`none`) / **Finish setup** (`onboarding`, `restricted`) / **Update details**
   (`enabled`, outline) → "Opening Stripe…" → redirect. Back with `?connect=return`: toast
   "Back from Stripe. Checking your payout account…", a "Waiting for Stripe to update your
   payout account…" line, polling 3 s × 30 s until the status changes (PF35), then a toast
   with the new status, or on timeout "Stripe has not updated your payout account yet…".
   `?connect=refresh`: warning toast "The link expired — click Finish setup again."
   Errors: `not_eligible` "Only an active SMD can set up payouts." (load: "Payouts are for
   active SMDs."); `stripe_unavailable` "Payout setup is temporarily unavailable…".
1. **Balance and ledger** — only when the payload has `ledger` (SMDs). A balance card:
   positive → "Owed to you, paid quarterly" (green), negative → "You owe" with the
   absolute amount (red), zero → "Balance $0.00". Then the ledger table: date
   (`posted_at`), month (`Nov 2026`), description (label, memo underneath; a
   `md_credit_rollup` entry carries a **Rolled up** tag; P5/P6: `payout` a green
   **Payout** tag — the backend labels it "Quarterly payout sent (2026-Q4)" —, `reversal`
   a red **Reversal** tag, `adjustment` a blue **Manual adjustment** tag with its memo
   (the admin's note) underneath, PF45), amount (`+$50.00` green /
   `−$150.00` red), running balance.
2. **Invoices** — month, kind (MD/SMD), payment state (badge + sentence, below), amount,
   paid date (plus "($x paid)" when `paid_cents` differs from the amount) and, on the
   agent's own statement, **Pay now** on each invoice with `can_pay_now`, with the copy
   beside it: "Pay by bank, card, or Klarna (pay over time, subject to Klarna's approval
   and fees)." The ▸ button expands the row to the invoice `lines`, a **Total** row equal
   to `amount_cents` (a negative line is a credit, `−$150.00`, green), and the payment
   facts: collection, due by (self-pay), charge attempts, next retry, last failure (worded,
   with the raw code and time), paid, paid via (Klarna tagged).

| Status | Badge | Sentence (own statement) |
|---|---|---|
| `draft` | Scheduled (blue) | Not sent yet |
| `no_charge` | Nothing to pay (grey) | — |
| `open`, self-pay | Due (amber) | Due by *due_date* |
| `open`, self-pay, past `due_date` (UTC) | Overdue (red) | Was due by *due_date* |
| `open`, automatic, attempts 0 | Charge scheduled (blue) | Charge scheduled |
| `open`, automatic, attempts ≥ 1 | Retrying (amber) | Payment failed — retrying on *next_retry_on* |
| `processing` | Processing (blue) | Bank payment in progress — settles in about 4 business days |
| `paid` | Paid (green) | Paid *date* · *paid via* |
| `failed` | Failed (red) | Payment failed — please pay now (admin: "…the agent can still pay now") |
| `void` | Void (grey) | — |

Paid via: Automatic charge · Automatic retry · Payment link · Pay now · **Klarna (pay over
time)**, the last with a pink "Klarna" tag. Failure codes are worded (`insufficient_funds`
→ "Insufficient funds", `card_declined` → "Card declined", …); unknown codes are
humanised.

**Pay now flow.** Pay now → "Opening…" (every Pay now disabled) → Stripe. Back with
`?fee_pay=success`: toast "Payment submitted…", a "Waiting for Stripe to confirm your
payment…" status line, polling every 3 s for up to 30 s until that invoice is `paid`
("Payment received. Thank you.") or `processing` ("Bank payment in progress…"); on
timeout an info toast. `?fee_pay=cancelled`: "Payment was cancelled. Nothing was
charged." `not_payable`: warning toast, the statement refetches. `stripe_unavailable`:
"Payments are temporarily unavailable…".

Money on P3 screens always shows cents (`formatMoney`); negative amounts use a true minus
sign, `−$150.00`.

### 2.6 Billing cycles (`/admin/plugin-fees/cycles`)

1. **Month + Preview** (only `can_manage`): a month input defaulting to next month and a
   Preview button → `cycles/preview/?month=`. Invalid month → "Enter a month as YYYY-MM."
2. **Generated cycles** (`cycles/`): month, status badge, generated at, approved at · by,
   and "View report" (disabled while `generating`; "Showing" for the open one).
3. **Report** — opened from either; the selection is in the URL so browser Back from an
   agent statement restores it.
   - Header: month, badge (`preview` Preview · `generated` **Awaiting approval** ·
     `approved` Approved), Approve… (only `can_approve_payouts` and `generated`), a
     "Dry run: nothing was saved" callout for previews, approved by / at, requires
     approval, snapshot digest (first 16 chars).
   - Totals cards: agents billed; agents excluded (amber when > 0); MDs count + total;
     SMDs count + total; nothing to pay; self-pay; and, when
     `automatic_without_verified_method > 0`, a full-width **warning** card: "*n* will be
     charged automatically but have no verified payment method."
   - **By SEVC**: SEVC #id, SMD fees, costs.
   - **Agents**: search (name / agency code), level (MD/SMD), status (the statuses present),
     flag (automatic without verified method · self-pay · MD credit rolled up · no approved
     office · SMD without verified assistant), "Excluded only", the "n of m" count and
     **Download CSV**. Columns: ▸, name (links to the agent statement for
     `can_review || can_manage`), agency code, level, office ✓/✗, assistant ✓/✗/— (— for
     MDs), fee, costs, amount due, status, payment (Automatic / Self-pay), method (amber
     when automatic and not verified), MD credit to (`SMD #id` / `SEVC #id` + Rolled up
     tag), excluded. ▸ expands to the agent's lines, closest SEVC and invoice id.
   - An excluded row (`excluded_reason`) is tinted red with a red edge and reads "No SEVC
     on recruiting line — not billed; fix the hierarchy".
   - An **approved** report shows the sending progress under the details: "*sent* of
     *total* sent", a bar, and "*n* waiting to be sent…" (amber) or "Every invoice has
     been sent."
4. **SMD ledger balances — owed to SMDs, paid quarterly** (`canSeeBalances`), between the
   cycle list and the report: SMD (links to the statement for `can_review ||
   can_manage`), agency code, balance (green positive / red negative), highest first, and
   "Total owed" (sum of positive balances, PF33). Empty: "No SMD has a ledger balance yet."
5. **Approve dialog**: the totals again, "Approving releases these invoices to be charged.
   This cannot be undone.", and a required "What did you check?" note — the Approve
   button stays disabled while it is blank.

### 2.7 Agent statement lookup (`/admin/plugin-fees/agents/:id/statement`)

"← Billing cycles" link (or "← Payments", "← Payouts", "← Plug-in Fees", "← Adjustments"
— whichever page opened it, PF32/PF47), heading "Statement of account — *name*", a line
"agency code · level · email" (plus "· read-only" unless `can_manage`), then the §2.5
statement worded for a third party ("Owed to the agent…", "The agent owes"), without
"Get paid" or Pay now.

P6, `can_manage` only:
- **Adjust ledger…** — in the ledger card's header (or under the heading when there is no
  ledger) for an SMD; opens §2.13 with that SMD prefilled.
- **Void…** on each `draft`, `open` or `failed` invoice → the void dialog: "Void the
  *Month* invoice for *name* (*$x*)? Voiding cancels the charge and any scheduled retries.
  It does not change the SMD ledger — post an adjustment if the month's fee must be
  undone.", a required "Why is it being voided?" note; "Void invoice" disabled while
  blank. `409 not_voidable` → warning toast, dialog closes.

### 2.8 Recognition & mailing costs (`/admin/plugin-fees/costs`)

1. **Log a cost** form: SMD charged (user search), recipient user (optional user search,
   with Clear; picking one fills an empty recipient name), recipient name, item,
   recognition $, mailing $ (optional), date sent (default today), a live **Total**, note
   (optional). "The cost is netted against the SMD on the 1st of the month after it was
   sent."
2. **Logged costs**: month-sent filter (+ "All months"), SMD filter (+ "All SMDs"), count;
   table of date sent, SMD (name, agency code), recipient, item (note underneath),
   recognition, mailing, total, netting ("Netted in Dec 2026" or "Pending — will be
   netted on the 1st of next month"), logged by, Delete (only while not netted).
   Previous / Next when the server pages.
3. **Delete dialog**: what is being deleted, and a required reason; Delete stays disabled
   while it is blank.

### 2.9 Payments (`/admin/plugin-fees/payments`)

Heading "Plug-in Fee Payments" (with "Read-only." for a `:review`-only user), then:

1. **Month + Show** — `?month=YYYY-MM`, default the current UTC month.
2. **Month card** — month, cycle badge (Awaiting approval / Approved) or "No cycle
   generated"; for `generated`, "Awaiting approval. Nothing is sent to Stripe before the
   cycle is approved."; sending progress ("118 of 120 sent", bar, pending); **Send now**
   (`can_manage`, approved, pending > 0) → confirmation → `cycles/{month}/send/`.
   - Totals: Invoiced, Paid, Outstanding (amber when > 0).
   - Counts: Paid; Processing; Charge scheduled (`open_automatic`); Retrying (amber when
     > 0); Self-pay open; Self-pay overdue (amber when > 0); Failed (red when > 0);
     Nothing to pay.
   - Klarna card: count · paid total, "Klarna fees are higher; every Klarna payment is
     logged."
3. **Invoices** — tabs with counts: All · Failed · Retrying · Self-pay open · Overdue ·
   Processing · Paid · Klarna (PF27); search name / agency code; "n of m"; **Download
   CSV** of exactly the rows showing (`plugin-fees-payments-<month>-<tab>.csv`, dollars
   with two decimals). Columns: agent (links to the statement, agency code under it),
   level, kind, amount, status (§2.5 wording, admin audience), collection, attempts, next
   retry / due ("Retry *date*" or "Due *date*"), last failure (worded, date; message on
   hover), paid (date + paid via), follow-up ("Open" red tag), and for `can_manage`
   **Void…** on `draft` / `open` / `failed` rows (the §2.7 dialog, P6).
4. **Follow-ups** — status select Open (default) · Resolved · All and a count; "Across all
   months." Columns: reason (Retries exhausted red / Self-pay overdue amber), agent (link),
   month, amount, opened, resolved (Open badge, or date and resolver — "Automatically"
   when no resolver), note, and **Resolve…** (`can_manage`, open only) → dialog with the
   follow-up summary and a required "What was done?" note.

### 2.10 Payouts (`/admin/plugin-fees/payouts`)

Heading "Quarterly Payouts" and an explanation, then:

1. **Quarter + Prepare report** (only `can_manage`): a select of the last 8 ended quarters
   ("Q3 2026 (Jul–Sep)"), defaulting to the most recently ended (PF37); "Preparing…";
   success toast and the report opens. `409 quarter_not_ended` → warning toast.
2. **Payout reports** (`payouts/`): quarter, period end, status badge, total, SMDs, held,
   failed (amber when > 0), approved at · by, "View report" / "Showing".
3. **Report** (`?quarter=`):
   - Header: quarter, badge — `draft` "Draft — awaiting approval" (amber), `approved`
     "Approved — queuing transfers" (blue), `sending` "Sending" (blue), `sent` "Sent"
     (green), `partial` "Partly sent" (red); **Download CSV**; **Approve…**
     (`can_approve_payouts`, `draft`). A draft callout ("nothing has been sent… held lines
     carry to next quarter"); while `approved`/`sending` a "Transfers are being sent. This
     report refreshes every few seconds." status line (5 s polling). Period end, approved
     by, approved at, approval note.
   - Totals cards: Total (+ SMD count), Payable, Held (amber, "*n* not onboarded"), Sent,
     Failed (red, "*n* lines").
   - **Lines**: ▸, SMD (links to the agent statement for `can_review || can_manage`;
     agency code under it), amount, line status — `pending` "Pending", `held_no_connect`
     "Not onboarded — balance carries forward", `sent` "Sent" with the date and the
     transfer id, `failed` "Failed" with the failure —, payout account badge, and for
     `can_manage` **Retry** on a failed or held line of a non-draft payout (PF39). ▸
     expands to the ledger entries (date, month, label + memo, signed amount), a "Balance
     carried in from before the quarter" row when they do not add up to the amount (PF38),
     and a "Payout amount" footer.
   - CSV (`plugin-fees-payout-<quarter>.csv`): one row per line with entries total.
4. **Approve dialog**: Total · SMDs, Payable now, Held — not onboarded (amber); "Approving
   sends Stripe transfers to every SMD whose payout account is ready. This cannot be
   undone."; a note that accounts are re-checked; required "What did you check?" —
   "Approve and send" disabled while blank. `409 not_draft` → warning toast + refetch.

### 2.11 Overview (`/admin/plugin-fees`)

Heading "Plug-in Fees", then cards (each header links to its page when the viewer may open
it):

1. **Payments — *Month*** → Payments (`?month=`): Outstanding, Paid, Processing, Retrying,
   Self-pay overdue, Failed, Klarna, Follow-ups open (all months).
2. **Verifications** → Reviews: Offices pending, Assistants pending, Re-verification due,
   Expiring within 14 days — each a card linking to the matching tab and filter (PF42),
   amber when > 0; plain counts for a viewer without `can_review`.
3. **Recognition costs** → Costs (`can_manage`): this month's total. **Upcoming payout**
   → Payouts: quarter, positive balances, SMD count, period end; Not onboarded (amber).
4. **SEVC totals — *Month*** → SEVC totals by month: SEVC, SMD fees, costs, MD fees with
   no SMD assistant. Empty: "Nothing received by an SEVC this month."
5. **Payout accounts not set up**: SMD (statement link), payout account badge, balance.
   Empty: "Every SMD with a balance has a payout account ready."

### 2.12 SEVC totals (`/admin/plugin-fees/sevc-totals`)

Heading "SEVC Totals" and what the columns mean; From / To month inputs (default the 6
months ending this UTC month; "The start month must not be after the end month."), Show,
**Download CSV** (`plugin-fees-sevc-totals-<from>-<to>.csv`). Table newest month first:
month, SEVC, SMD fees, costs, MD fees with no SMD assistant, total; a **Grand total**
footer.

### 2.13 Ledger adjustments (`/admin/plugin-fees/adjustments`)

"← Statement" when opened from an agent statement; heading "Ledger Adjustments" and the
never-edited rule. Then:

1. **Post an adjustment**: SMD (user search, prefilled from the statement), Direction
   (Credit — owed to the SMD (+) / Debit — the SMD owes (−)), Amount ($) with "Posts
   +$45.00 / −$45.00" beneath, Invoice id (optional, digits), Note (required). "Post
   adjustment…" → confirmation: "This will credit/debit *name*'s ledger by $X.
   Adjustments cannot be edited or deleted — correct a mistake with an opposite
   adjustment." plus amount, note and invoice. Field errors from `fields` / `note_required`.
2. **Adjustments**: SMD filter (+ "All SMDs"), count; posted, SMD (statement link), signed
   amount, note, invoice, by. Previous / Next.

## 3. States

| Surface | Loading | Empty | Error | Denied |
|---|---|---|---|---|
| Settings block | nothing while `my-access/` loads; "Loading plug-in fee details…" while `me/` loads | n/a | "Unable to load your office, assistant and payment details." + Try again | renders nothing |
| Office / assistant section | — | "No approved office…" / "No verified assistant." | form-level error box + toast; per-field errors for `validation_error` | section absent |
| Review queue | "Loading…" | `NonIdealState` ("No submissions with this status." / "…match this search.") | `ErrorState` with retry | route redirects to `/home` |
| Statement (own / agent) | "Loading…" | "No invoices yet." / "No ledger entries yet."; no ledger section for MDs | `ErrorState` with retry | route redirects to `/home`; bad `:id` → "Unknown agent" |
| Cycles list | "Loading…" | "No cycle has been generated yet." | `ErrorState` with retry | route redirects to `/home` |
| Cycle report | "Computing the *Month* preview…" / "Loading report…" | "No report open" until one is chosen; agents filter → "No agents match these filters." | `ErrorState` with retry (e.g. `404 not_found`) | `?view=preview` without `can_manage` → "Preview not available" |
| Payments | "Loading *Month*…" | "No invoices have been sent for this month." / "No invoices match this filter."; "No cycle generated" in the header | `ErrorState` with retry | route redirects to `/home` |
| Follow-ups | "Loading…" | "Nothing needs following up." / "No follow-ups with this status." | `ErrorState` with retry | Resolve absent without `can_manage` |
| SMD balances | "Loading…" | "No SMD has a ledger balance yet." | `ErrorState` with retry | section absent |
| Statement Pay now | "Opening…" | no Pay now column when no invoice has `can_pay_now` | toast by code | not shown on the admin lookup |
| Costs list | "Loading…" | "No costs have been logged." / "No costs match these filters." | `ErrorState` with retry | route redirects to `/home` |
| Cost form | "Saving…" | — | per-field errors (client and `validation_error` `fields`, e.g. `smd_id` not an SMD) + form error + toast | — |
| Get paid | "Loading your payout account…" | n/a | inline error + Retry; `not_eligible` → "Payouts are for active SMDs." | panel absent unless an SMD with a ledger |
| Payouts list | "Loading…" | "No payout report has been prepared yet." | `ErrorState` with retry | route redirects to `/home` |
| Payout report | "Loading the *quarter* payout…" | "No report open"; "No lines" when nobody had a positive balance | `ErrorState` with retry | Prepare / Retry absent without `can_manage`; Approve without `can_approve_payouts` |
| Overview | "Loading…" | per-card empty lines | `ErrorState` with retry | route redirects to `/home` |
| SEVC totals | "Loading…" | "No SEVC received anything in this range." | `ErrorState` with retry | route redirects to `/home` |
| Adjustments | "Loading…" | "No adjustment has been posted." / "No adjustments for this SMD." | `ErrorState` with retry | route redirects to `/home` |
| Adjustment form | "Posting…" | — | field errors + form error + toast | — |

## 4. Interaction rules

- Withdraw always confirms. Withdrawing an **approved office**: "From the next billing cycle
  you will be billed at the no-office rate ($X)."
- Reject requires a note; the Reject button is disabled while the note is blank, and a
  blurred empty field shows "A note is required to reject."
- Approve / Verify / Re-verify confirm with an optional note.
- After a decision: success toast, dialog closes, the queue refetches. On `409`: warning
  toast, dialog closes, the queue refetches.
- Changing status or search returns to page 1.
- File pre-checks are advisory; the server's verdict wins.
- Approve cycle: success → toast, the report reloads as `approved`. `409
  not_awaiting_approval` → warning toast, dialog closes, the report and list refetch.
- Delete cost: success → toast. `409 already_applied` → warning toast, dialog closes, the
  list refetches.
- Send now: confirmation, then a success toast; `409 not_approved` → warning toast; the
  dashboard refetches either way.
- Resolve follow-up: the Resolve button is disabled while the note is blank. Success →
  toast, dialog closes. `409 already_resolved` → warning toast, dialog closes, the list
  refetches.
- Payments CSV cells beginning `= + - @` are prefixed with `'`, as for the agents CSV
  (and the payout and SEVC totals CSVs).
- Approve payout: success toast, the report reloads and polls while sending. `409
  not_draft` → warning toast, dialog closes, refetch.
- Retry a payout line: "Retrying…" (every Retry disabled); `409 not_retryable` → warning
  toast, refetch.
- Post an adjustment: always confirmed; on success the amount, note and invoice clear, the
  SMD stays.
- Void: the note is required; success toast; `409 not_voidable` → warning toast. Payments,
  statements, follow-ups and the overview refetch either way.
- Dollar inputs accept `30`, `30.5`, `1,200.00`; negatives and more than two decimals are
  rejected with "Enter dollars, at most two decimals, not negative."
- Download CSV exports exactly the filtered agents (dollars with two decimals, booleans as
  yes/no), named `plugin-fees-<month>-<status>-agents.csv`. Cells beginning `= + - @` are
  prefixed with `'`.

## 5. Responsive and print behaviour

Form grids collapse to one column below 640 px; hours rows wrap to two columns
(`components/plugin-fees.css`). Wide tables (agents, costs, ledger) scroll horizontally
inside `.wb-pf-table-wrap`, never the page. No print styles.

## 6. Accessibility

Every input has a `<label>`; hours rows carry `aria-label`s. Errors use `role="alert"`, the
re-verification notice `role="status"`. Tabs use `role="tablist"`/`tab`/`tabpanel` with
`aria-selected` and `aria-controls`. Dialogs are the shared `Modal` (focus trap, labelled
title). Thumbnails have `alt` text naming the file. Expandable rows use a button with
`aria-expanded` / `aria-controls`; ✓/✗ carry `aria-label`s; the no-verified-method warning
card is `role="alert"`, the balance card `role="status"`. P4: the sending bar is a
`role="progressbar"` with `aria-valuenow`/`max`; payments filter tabs are a `tablist`
over one `tabpanel`; each Pay now is `aria-describedby` its payment-options copy; the
"Waiting for Stripe…" line is `role="status"`. P5/P6: payout lines expand with the same
`aria-expanded` button; the Connect and payout "waiting" lines are `role="status"`; the
overview's count cards are real links with a visible focus border.

## 7. Styling and theming

Classes are prefixed `wb-pf-` (`components/plugin-fees.css`), with light-mode overrides
scoped to those classes only. Inside Settings the sections also use the page's own scoped
classes. Status badge tones: pending / re-verify amber, approved / verified green,
rejected / expired red, others neutral; P3 adds `info` (blue) and `neutral` through
`StatusBadge`'s `tone` prop, and light-mode text colours for the amber/green/red tones.
Credits are green and debits red (`wb-pf-amount--credit` / `--debit`). P4 adds
`wb-pf-pay-*` (payment state, Pay now copy), `wb-pf-stat--danger`, `wb-pf-stat--klarna`,
`wb-pf-tag--klarna` / `--danger`, `wb-pf-sending` / `wb-pf-progress*`, `wb-pf-tabs--scroll`
(filter tabs scroll inside on a phone) and `wb-pf-tab-count`, each with a light-mode
override where it sets a colour. P5/P6 add `wb-pf-connect-head`, `wb-pf-requirements`,
`wb-pf-tag--payout` / `--adjustment`, `wb-pf-stat--link` (a count card that is a link),
`wb-pf-overview-grid` and `wb-pf-total-row`, each colour with a light-mode override.
