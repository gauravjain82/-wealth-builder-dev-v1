# Settings — UI

| | |
|---|---|
| **Module** | `settings` |
| **Source** | `src/features/settings/pages/settings-page.tsx` |
| **Routes** | `/settings` |
| **Backend module** | `accounts`, `authz`, `payments`, `telegram` |
| **API prefix** | four |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Routes and entry points

| Route | Guard | Component |
|---|---|---|
| `/settings` | `ProtectedRoute` only | `SettingsPage` |

**Three fragment entry points are a real API**, navigated to from other modules:

| Fragment | Target | Linked from |
|---|---|---|
| `#settings-calendar-sync` | the hosted Calendar Sync section | `matchup` (`matchup-page.tsx:684`), `bpm` |
| `#settings-billing-upgrade` | Subscription & Billing | upgrade prompts |
| `#settings-manage-subscription` | Manage Subscription | billing prompts |

Also `?google_connected=1`, the OAuth return marker, consumed and stripped by the hosted section.

## 2. Screens

One page, six sections plus a hosted seventh, each a `.glass-section` with an emoji-titled header.

| # | Section | Contains |
|---|---|---|
| 1 | 👤 **Profile** | name, contact details, birthday, photo upload |
| 2 | ⭐ **Account Level** | the current level, read-only |
| 3 | 💎 **Subscription & Billing** | active products, and requesting an upgrade |
| 4 | 🔧 **Manage Subscription** | the Stripe Billing Portal, and updating a card |
| 5 | 🧾 **My Upgrade Requests** | requests this user raised, and their state |
| 6 | ✅ **Pending Approval Requests** | **conditional** — requests assigned to this user |
| 7 | 📆 Calendar Sync | `<CalendarSyncSection />`, owned by [calendar-sync](../calendar-sync/) |

Section 6 renders **only when the user has requests to approve**, so most people never see it. It is the
easiest part of the page to forget when changing anything.

Section 2 displays the level and does not edit it — levels are granted in [admin](../admin/)'s access
console.

## 3. States

| State | Trigger | What the user sees |
|---|---|---|
| Loading | the page's single load | per-section loading |
| No products | none active | the upgrade section with nothing to request |
| Request pending | an open subscription request | its state in My Upgrade Requests |
| Request approved / rejected | resolved | the outcome |
| Nothing to approve | no `assigned_to_me` requests | **section 6 is absent entirely** |
| Card save in progress | SetupIntent confirming | Stripe's own state |
| Portal session | clicked | redirect to Stripe |
| Photo uploading | `FormData` in flight | disabled control |
| Telegram unlinked | no link | a link token to use |
| Calendar sync | see [calendar-sync UI §3](../calendar-sync/UI.md#3-states) | its own states, inside its section |

## 4. Interaction rules

- **An upgrade is requested, not bought.** The flow ends in somebody approving it.
- **Never collect card details in this app.** SetupIntent for saving, the Portal for everything else.
- **Send the user to Stripe for subscription management.** Do not reimplement cancel, plan change or
  invoices.
- **Photo upload sends `FormData`** with no `Content-Type`.
- **Do not rename a section `id`.** Three of them are linked from other features, and nothing will fail at
  compile time.
- **Leave `.glass-section` and `.input-field` scoped where they are.** The hosted Calendar Sync section
  depends on them.

## 5. Responsive and print behaviour

Tailwind plus the page's own `glass-section` styling, scoped under `.settings-profile-page`. Sections stack
on narrow widths.

No print styles. Payment history is the only thing anyone might print, and it is a list on screen.

## 6. Accessibility

Sections use real headings (`h3.section-title`) with the emoji as a decorative `span`, so the heading
structure is navigable. Stripe's own elements bring their accessible field handling.

Two gaps: the emoji in each title is not marked `aria-hidden`, so it is announced as an icon name before
the section name; and at 1,783 lines with no landmarks beyond the headings, the page is a long single
region to move through.

## 7. Styling and theming

**This page's styles are load-bearing for another module.** `.glass-section` and `.input-field` are scoped
under `.settings-profile-page`, and [calendar-sync](../calendar-sync/UI.md#7-styling-and-theming)'s section
only renders correctly because it is inside that scope. It is the reason that module deliberately has no
route of its own (its decision CS1).

So a restructure here is a two-module change, and nothing in either module's source says so except this
document and the note in `calendar-sync`.
