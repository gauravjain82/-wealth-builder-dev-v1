# Settings — Operations

| | |
|---|---|
| **Module** | `settings` |
| **Source** | `src/features/settings/` |
| **Routes** | `/settings` |
| **Backend module** | `accounts`, `authz`, `payments`, `telegram` |
| **API prefix** | four |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Environment and configuration

| Variable | Effect |
|---|---|
| `VITE_API_BASE_URL` | the backend. **Normalised here**, so a trailing slash is tolerated |
| **`VITE_STRIPE_PUBLISHABLE_KEY`** | **required** for the card-update flow |

Everything else is backend state: which products are active, who approves whose requests, the Stripe
account, and the Telegram bot.

## 2. Build and run

Standard ([platform OPERATIONS §2](../platform/OPERATIONS.md#2-build-and-run)). One lazy chunk — which
also carries [calendar-sync](../calendar-sync/), since that section is hosted here rather than routed.

Locally you need a Stripe publishable key for the card flow, and **two accounts** to exercise the
approval workflow: one to request, one assigned to approve.

## 3. Feature flags and rollout

No flags, no guards — everyone has settings.

The only conditional surface is **Pending Approval Requests**, which appears when the server returns
requests `assigned_to_me`. That is work-driven, not permission-driven.

## 4. Tests and checks

No frontend tests ([platform OPERATIONS §4](../platform/OPERATIONS.md#4-tests-and-checks)).

`npm run lint` reports a **pre-existing `loadData` exhaustive-deps warning** in `settings-page.tsx` —
the predictable result of one `useEffect` loading seven things. It is a warning, not one of the repo's 7
errors.

Manual checks:

1. **The full approval round trip**, with two accounts: request an upgrade, approve it from the other,
   confirm the level changes.
2. **Rejection** — confirm the requester sees it and the level does not change.
3. **Card update** via SetupIntent; confirm the new card becomes default and no card number reaches this
   app.
4. **Billing Portal** — confirm the session opens and is short-lived.
5. **Payment history** renders.
6. **Photo upload**, then reload and confirm the avatar persists — note `auth` only refreshes the avatar
   on session restore.
7. **Profile save**, then confirm the header reflects it (it may need a reload — see below).
8. **All three fragments** — visit `#settings-calendar-sync`, `#settings-billing-upgrade` and
   `#settings-manage-subscription` and confirm each scrolls to its section.
9. **The hosted Calendar Sync section renders styled.** If it looks unstyled, `.settings-profile-page`
   scoping was changed.
10. **Telegram link token** is issued.

## 5. Deployment

Ships with any frontend deploy; all four backend apps are in production.

Two things to hold in mind:

- **`VITE_STRIPE_PUBLISHABLE_KEY` is build-time.** A wrong value breaks the card flow and needs a rebuild.
- **This page's styles are another module's dependency.** A restructure of `.settings-profile-page` breaks
  [calendar-sync](../calendar-sync/)'s section, and nothing in either module's source warns you.

## 6. Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| The card form will not mount | `VITE_STRIPE_PUBLISHABLE_KEY` missing | build-time; rebuild after setting it |
| Approving does nothing | the approver is not the assignee | the request's `assigned_to_me` |
| The approval section is missing | there is nothing to approve | expected — it is conditional |
| A duplicate upgrade request | the `old_id` lookup missed | the request list for that `old_id` |
| Level unchanged after approval | the level changes on the backend, via the request | `payments`, then `authz` |
| Profile saved but the header is stale | `useAuth` only refreshes the avatar on session restore | reload; see [auth ARCHITECTURE §4](../auth/ARCHITECTURE.md#4-server-state-and-caching) |
| Calendar Sync section unstyled | it depends on `.settings-profile-page` scoping | do not mount it elsewhere, and do not rename the scope |
| A deep link scrolls nowhere | a section `id` was renamed | three ids are linked from other features |
| `//api/...` in a request | a trailing slash in the env value | tolerated **here**; other modules do not normalise it |
| Portal link expired | sessions are short-lived by design | create a new one |
| Photo upload fails with a parse error | a `Content-Type` was set | let the browser set the multipart boundary |
