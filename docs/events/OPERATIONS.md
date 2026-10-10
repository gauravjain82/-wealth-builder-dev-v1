# Events — Operations

| | |
|---|---|
| **Module** | `events` |
| **Source** | `src/features/events/` |
| **Routes** | 14 authenticated, 4 public |
| **Backend module** | `events` |
| **API prefix** | `/api/events/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27; guest checkout confirmation against `fix/event-payment-confirmation` — 2026-10-10 |

## 1. Environment and configuration

**The only module besides `settings` that needs a Stripe key.**

| Variable | Effect |
|---|---|
| `VITE_API_BASE_URL` | the backend |
| **`VITE_STRIPE_PUBLISHABLE_KEY`** | **required** — without it the payment step cannot mount and guest checkout is dead |
| `VITE_FRONTEND_BASE_URL` | the origin the backend builds public event links against |

Per-event configuration is data, set in the builder: pricing tiers, ticket settings, payment config
(including `stripe_account_id`), design, policies, and the seven soft-deleted config collections.

## 2. Build and run

Standard ([platform OPERATIONS §2](../platform/OPERATIONS.md#2-build-and-run)). Eighteen lazy chunks —
one per route — which is why this module's size does not cost a reader of `/home` anything.

Two dependencies land here: `@stripe/react-stripe-js` for checkout and `@zxing/browser` for check-in
scanning.

**Local development needs three things a normal module does not:** a Stripe publishable key, a backend
with the matching secret key and a webhook path, and **HTTPS** if you intend to test scanning. Guest
checkout cannot be exercised end to end without the webhook — you can take a payment and never see a
ticket.

## 3. Feature flags and rollout

**No flags and no capability guards.** The authenticated routes sit under `ProtectedRoute` only.

Authorization is server-side and has two layers:

| Layer | Grants |
|---|---|
| `authz` resources | configured in the access console, **not in migrations** |
| **`EventPermission`** | **per-event delegation**, scoped `EVENT` / `PURCHASE` / `CHECKIN` / `QUESTION` |

Per-event delegation is how a door volunteer gets check-in rights for one event and nothing else. The
screen is `/events/:eventId/access`.

**The sidebar follows both layers** (decision [E13](PHASES.md#3-decision-log)). Granting a delegate
`CHECKIN` puts **Big Event → Check-in** in their sidebar; granting a platform-wide events permission —
through a role, a level, or **Admin → User Permissions** — puts in every screen it opens. `my-access` is
cached for five minutes, so the grantee sees the change on their next page load after that, or at once
after a refresh.

**The four public routes are ungated by design.** An event is meant to be shared; the protections are
Stripe for money and email-plus-invoice-number (rate-limited) for ticket management.

## 4. Tests and checks

No frontend tests ([platform OPERATIONS §4](../platform/OPERATIONS.md#4-tests-and-checks)).
`npm run lint` reports nothing in this module.

This module handles **money and strangers**, so the manual list is longer than elsewhere and the first
four matter most:

1. **Full guest checkout, end to end, against a real webhook.** Buy a ticket as a logged-out guest and
   confirm the page waits in `confirming` and only then shows tickets. **Do not accept a local test
   where the webhook is not wired** — that is precisely the failure this flow is built to survive.
2. **A declined card.** Confirm the order stays unpaid and is retryable, with Stripe's message shown.
3. **Assign versus transfer.** Assign a holder, then transfer the ticket, and confirm the holder is
   **cleared** by the transfer.
4. **Refund.** Confirm the payment reverses and every ticket is marked refunded, and that assignment
   status is untouched.
5. **Claim with no login** — right email and invoice number, then wrong ones; confirm rejection and
   rate limiting.
6. **Sales state** — set an event to not-started, ended and sold-out, and confirm the page states the
   reason rather than just hiding the button.
7. **Promo code** — confirm it is previewed server-side and that the total comes from the server.
8. **Check-in**, over HTTPS: scan, mis-scan, **undo**, manual, then export `xlsx` and `pdf`.
9. **Blast** — preview recipients before sending. A blast cannot be recalled.
10. **Soft delete** — remove a pricing tier and confirm existing orders that referenced it still read
    correctly.
11. **Per-event permission** — grant `CHECKIN` only, and confirm that account can check in and nothing
    else.
12. **Manual order** — record a cash and a comp order and confirm they are distinguishable from a
    Stripe one (`OrderSource`, `TransactionType`).

## 5. Deployment

Ships with any frontend deploy, **except `feature/event-champion-theme`**, which has a counterpart branch
in `mlm_platform` (migration `events/0010_champion_theme`). Deployed alone, the frontend offers a theme
and section types the API rejects with 400 on save.

**Firebase CDN for event media** is a backend switch, `EVENTS_MEDIA_CDN`, off by default. Order, from
`mlm_platform/docs/events/OPERATIONS.md` §3.1: deploy with it off (new uploads are already stamped) → set
`FIREBASE_MEDIA_TOKEN_SECRET` → run `manage.py stamp_event_media_cdn` (dry run, then `--apply`) → turn
`EVENTS_MEDIA_CDN` on. Turning it on before the backfill makes every older image and video 403.
Rollback is turning it off. Rotating the secret breaks every URL until a re-stamp.

Three deployment-time hazards, all about money:

- **A missing or wrong `VITE_STRIPE_PUBLISHABLE_KEY` breaks checkout silently for guests** — the
  payment step simply cannot mount. It is baked in at build time, so a wrong value needs a rebuild.
- **The Stripe endpoint must be subscribed to `payment_intent.succeeded`,
  `payment_intent.payment_failed` and `charge.refunded`.** On 2026-10-10 it was not: two buyers were
  charged and their orders stayed `PENDING`. The status poll now settles a paid order by asking Stripe
  (PHASES E23), so a buyer who keeps the page open gets tickets regardless — but one who closes the
  tab is settled only by the webhook, or by `manage.py reconcile_stripe_orders` on the backend.
- **`stripe_account_id` is per event.** A wrong value routes money to the wrong account, and nothing in
  the client can detect that.

## 6. Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| A guest paid and got no tickets | they left before the poll settled it, **and the webhook did not run** | Stripe dashboard → the endpoint's subscribed events and delivery log. Repair: `manage.py reconcile_stripe_orders` (dry run), then `--apply` |
| "Payment received — issuing your tickets" for 45 s, then a success page with no tickets | the server could not settle the order — Stripe unreachable from the backend, or ticket issue failed (capacity) | the backend log for that order; the same command once fixed |
| A declined card produced a second order | should not happen since E23 — the buyer stays on the card step | `use-event-checkout.ts` `fail()` |
| The payment step will not render | `VITE_STRIPE_PUBLISHABLE_KEY` missing | it is build-time; rebuild after setting it |
| Money reached the wrong account | the event's `stripe_account_id` | the Payments tab |
| An authenticated page threw "No authentication token found" | the service throws rather than sending anonymously | expected — it is a bug signal, not a state |
| A public page 401s | it used an authenticated service | public pages must use `public-event-service`, which sends no token |
| `/api/events/events/...` looks wrong | the router is mounted at `/api/events/` | **correct.** The doubled segment is real; public paths have one |
| A transferred ticket shows a stranger's name | transfer should clear the holder | the transfer action; assign and transfer are different operations |
| A refunded ticket still reads "assigned" | the two statuses are **independent** | expected, and deliberate |
| Attendance disappeared after a status change | it should not — attendance is a separate record | the check-in record, not the ticket enum |
| Removing a tier broke old orders | config soft-deletes | `is_active` — do not hard-delete config |
| The sales button is missing with no explanation | the page should render the `SalesState` reason | `SalesState.reason` |
| A promo gave an unexpected total | the server prices it | the promo preview response, not client arithmetic |
| A door volunteer can see too much | per-event permission scope | `/events/:eventId/access`; grant `CHECKIN` alone |
| A user has a grant but no Big Event in the sidebar | `my-access` is cached for five minutes, or the grant is on another event | refresh; then `GET /api/events/events/my-access/` as that user |
| A Broker lost the Big Event group | the group follows access now, not role (E13) | grant the events permissions to their role or level, or per user |
| Scanning will not open the camera | not HTTPS, or an iOS in-app webview | expected; check in by name instead |
| A mis-scan cannot be undone | undo exists | `checkin-service.ts:96` |
| A blast went to the wrong people | audience is `holders`/`purchasers`/`owners` | preview recipients first; sends are not recallable |
| Invoice numbers collided | generated atomically server-side | should be impossible; investigate the counter |
