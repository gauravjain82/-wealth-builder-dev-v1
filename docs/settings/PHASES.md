# Settings — Phase History

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

> Phases marked `~` are reconstructed from the commit history. There was no phased plan for this module;
> three focused plan files cover its billing work. The `ST` prefix is assigned by this document.
>
> Relevant plans: `majestic-coalescing-star.md` (Stripe Billing Portal self-service),
> `woolly-imagining-lampson.md` ("Update Credit Card" via the Portal), `cosmic-bubbling-goblet.md`
> (phone editing + SMS onboarding). The backend's `payments/ROLE_TRANSITION_MASTER_GUIDE.md` and
> `DB_ENTRY_FLOW_REFERENCE.md` document what an approved request actually does.

## 1. Timeline

| Phase | Date | Status | Shipped |
|---|---|---|---|
| ~1 | 2026-05-01 | Shipped | The Stripe upgrade request — the earliest billing work |
| ~2 | 2026-06 | Shipped | Profile, account level, the page's section structure |
| ~3 | 2026-09 | Shipped | Billing Portal self-service, card update via SetupIntent |
| ~4 | 2026-09-04 | Shipped | Hosting `<CalendarSyncSection />`; privacy/terms links |

## 2. Phases

### ~1 — the upgrade request (2026-05-01)

**What shipped.** "stripe upgrade request" — the first billing surface, and the origin of the approval
workflow: an upgrade is **requested** and somebody approves it.

**Decisions.** ST1.

### ~3 — self-service billing (2026-09)

**What shipped.** A Stripe **Billing Portal** session, and card updates through a **SetupIntent**.

**Decisions.** ST2, ST3.

**Why the Portal rather than our own screens.** Cancel, plan change, invoice history and dunning are all
things Stripe already does correctly and that a reimplementation gets subtly wrong. A short-lived hosted
session is the whole integration.

### ~4 — hosting Calendar Sync (2026-09-04)

**What shipped.** `<CalendarSyncSection />` after Account Level, at `settings-page.tsx:1448`, plus
privacy-policy and terms links for Google's OAuth branding review.

**Decisions.** ST4.

**A consequence nobody chose.** `.glass-section` and `.input-field` are scoped under
`.settings-profile-page`, so the hosted section is **stylistically dependent** on this page. That is now
the strongest technical reason `calendar-sync` has no route of its own — see its decision CS1.

## 3. Decision log

| ID | Decision | Rationale | Source |
|---|---|---|---|
| **ST1** | **An upgrade is a request that somebody approves, not a self-service purchase** | A level change has downstream consequences across reporting and hierarchy, so it needs an accountable approver. The request lives in `payments` beside the money rather than in `accounts` | commit 2026-05-01; `payments/subscription-requests/` |
| ST2 | **Subscription management goes to Stripe's Billing Portal**, via a short-lived session | Cancel, plan change, invoices and dunning are solved problems that a reimplementation gets subtly wrong. One endpoint replaces a screen we would otherwise own | `~/.claude/plans/majestic-coalescing-star.md`; `createBillingPortalSession` |
| ST3 | **A card update uses a SetupIntent**, not a payment | The point is to store a card without charging it. Stripe collects it, so no card number reaches this application | `~/.claude/plans/woolly-imagining-lampson.md`; `createSetupIntent` |
| ST4 | **Calendar Sync is hosted as a section here** rather than being its own route | Connecting a calendar is account configuration, and this is where account configuration lives. Shared with `calendar-sync`'s CS1 | `settings-page.tsx:1448` |
| ST5 | **`getApiBaseUrl()` normalises a trailing slash** | A `VITE_API_BASE_URL` ending in `/` otherwise produces `//api/...`. Only this module and `auth` do this; every other module concatenates raw | `services/settings-billing-service.ts:194` |
| ST6 | **One list endpoint serves two questions** — `?old_id=` and `?assigned_to_me=true` | "Is there already a request for this?" and "what must I approve?" are two readings of the same collection, so one endpoint with two filters rather than two endpoints | `services/settings-billing-service.ts:342`, `:361` |

## 4. Deliberately not built

- **Self-service level change.** ST1 — approval is the point.
- **Our own subscription-management screens.** ST2.
- **Card collection in this app.** ST3.
- **A route for Calendar Sync.** ST4.
- **Level editing.** Levels are granted in [admin](../admin/)'s access console; this page displays them.
- **Password change.** [auth](../auth/) owns it.
- **A `components/` or `types/` directory.** The page is one file and the types are inline — not a
  decision so much as a state, and the first item below.

## 5. Outstanding

1. **Split `settings-page.tsx`.** 1,783 lines in one component, holding seven sections' state, is the
   largest single file in the app. It is why the `loadData` exhaustive-deps warning exists, why the
   conditional approval section is easy to forget, and why editing one section risks the others. Six
   section components and a container would be a mechanical change with a large payoff.
2. **Document or break the style coupling with `calendar-sync`.** That module cannot leave this page
   without losing its styles, and this page cannot restructure `.settings-profile-page` without breaking
   it. Neither module's source says so.
3. **Mark the section-title emoji `aria-hidden`.** They are announced as icon names before the section
   name.
4. **Refresh the profile in `useAuth` after a save.** The header can stay stale until a reload, because
   `auth` only re-reads the avatar on session restore.
5. **Adopt the trailing-slash normalisation app-wide.** ST5 is correct and lives in two modules out of
   twenty-eight.
6. **Give the module a `types/` file.** The six payload types are inline in the service.
