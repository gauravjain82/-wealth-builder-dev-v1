# Plug-in Fees — UI

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
| Settings → "View statement of account →" | `is_billable` | link under the plug-in fee sections |
| Menu "My Plug-in Fees" 💳 | `is_billable` | inserted just under Home |
| Menu "Plug-in Fee Reviews" 🗂️ | `can_review` | appended after the other per-user admin entries |
| Menu "Billing Cycles" 🧾 | `can_manage \|\| can_review \|\| can_approve_payouts` | right after "Plug-in Fee Reviews" (or appended) |
| Menu "Fee Payments" 💵 | `can_manage \|\| can_review` | after "Billing Cycles" (PF30) |
| Menu "Recognition Costs" 🎖️ | `can_manage` | after "Fee Payments" |

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

1. **Balance and ledger** — only when the payload has `ledger` (SMDs). A balance card:
   positive → "Owed to you, paid quarterly" (green), negative → "You owe" with the
   absolute amount (red), zero → "Balance $0.00". Then the ledger table: date
   (`posted_at`), month (`Nov 2026`), description (label, memo underneath; a
   `md_credit_rollup` entry carries a **Rolled up** tag), amount (`+$50.00` green /
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

"← Billing cycles" link (or "← Payments" when opened from the payments page, PF32), heading "Statement of account — *name*", a line "agency code ·
level · email · read-only", then the §2.5 statement worded for a third party ("Owed to the
agent…", "The agent owes"). No actions.

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
   hover), paid (date + paid via), follow-up ("Open" red tag).
4. **Follow-ups** — status select Open (default) · Resolved · All and a count; "Across all
   months." Columns: reason (Retries exhausted red / Self-pay overdue amber), agent (link),
   month, amount, opened, resolved (Open badge, or date and resolver — "Automatically"
   when no resolver), note, and **Resolve…** (`can_manage`, open only) → dialog with the
   follow-up summary and a required "What was done?" note.

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
- Payments CSV cells beginning `= + - @` are prefixed with `'`, as for the agents CSV.
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
"Waiting for Stripe…" line is `role="status"`.

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
override where it sets a colour.
