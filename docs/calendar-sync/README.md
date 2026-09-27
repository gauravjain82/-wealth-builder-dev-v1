# Calendar Sync — Overview

| | |
|---|---|
| **Module** | `calendar-sync` |
| **Source** | `src/features/calendar-sync/` |
| **Routes** | **none** — a section of `/settings`, plus a service `matchup` consumes |
| **Backend module** | `calendarsync` → `mlm_platform/docs/calendarsync/` (OAuth start via `matchup`) |
| **API prefix** | `/api/calendarsync/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Purpose

`calendar-sync` connects a user's Google account and keeps four kinds of platform
appointment in step with their Google calendars, in both directions. Pushing puts platform
appointments on a Google calendar so they appear beside the rest of the user's day. Pulling
notices what Google knows that the platform does not — moved events, deletions, and
externally created events that make the user busy — and reflects that back.

The two-way part is what makes it worth the complexity. A one-way push produces a Google
calendar the user cannot trust, because moving something in Google would silently diverge.
Pulling means the platform's idea of when someone is free survives the user editing their
own calendar.

Four **sources** sync independently, each to its own target calendar: `PERSONAL`, `MATCHUP`,
`BPM` and `EVENTS`. Independence is the point — a user can mirror their Match Up training
without publishing their personal appointments.

If this module were removed, appointments would still exist in the platform and nothing would
break; users would go back to reading two calendars and the platform would lose any knowledge
of external commitments.

## 2. Scope

**In scope**
- The Google connection: connect, disconnect, and the re-consent path when a stored
  credential predates the scope the feature needs.
- Per-source target-calendar selection, including creating a branded Wealth Builder calendar.
- Per-source `sync` / `push` / `pull` toggles, and on-demand "Sync now" per source or for all.
- Imported external events: listing them for a date range, dismissing one, clearing all.
- The Calendar Sync section rendered inside the Settings page.

**Explicitly out of scope**
- **A route of its own.** Decision CS1 — this is a Settings section, not a page. The
  `/calendar` route belongs to [matchup](../README.md#full).
- **Scheduled syncing.** The client triggers sync on demand; any periodic sync is the
  backend's.
- **Appointment creation and editing.** `matchup` and `bpm` own those.
- **Rendering a calendar.** `matchup`'s calendar page does that, using this module's service
  for the imported-events overlay.
- **The OAuth callback.** Backend, reusing the `matchup` alias — see
  [API.md §2](API.md#2-endpoints-consumed).

## 3. At a glance

| | |
|---|---|
| Routes | 0 |
| Pages | 0 — one embedded section |
| Components | 4 + 1 stylesheet |
| Hooks | 7 + a query-key factory |
| Services | 1 (`calendarSyncService`, 11 methods) |
| Endpoints consumed | 11 |
| LOC (ts/tsx) | 816 |
| Doc tier | Full |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Source** | One class of platform appointment that syncs as a unit: `PERSONAL`, `MATCHUP`, `BPM`, `EVENTS`. Each has its own target calendar and its own toggles. |
| **Target calendar** | The Google calendar a source writes to. Either one the user already had (`EXISTING`) or one the platform made (`APP_CREATED`). |
| **Provisioning** | Which of those two a target is. Determines whether the platform may manage the calendar itself. |
| **Push** | Platform → Google. Platform appointments appear as Google events. |
| **Pull** | Google → platform. Moves, deletions and external events are reflected back. |
| **Imported event** | An event on the user's Google calendar that the platform did not create, mirrored as an external busy block. Shown tagged `Imported`, convertible or dismissible. |
| **Re-consent** | The state where a credential exists but was granted before the full `calendar` scope. The connection looks live and cannot list calendars. |
| **Primary fallback** | Whether a source may write to the user's primary calendar when it has no target of its own. |

## 5. Dependencies

**Upstream (this module imports)**
- `src/shared/components/ui/` — `Button`.
- `src/store` — `useToastStore` for success and error toasts.

**Downstream (imports this module)**
- `src/features/settings/pages/settings-page.tsx:34` — renders `CalendarSyncSection`.
- `src/features/matchup/pages/calendar-page.tsx:5` — uses `calendarSyncService` for imported
  events.
- `src/features/matchup/hooks/use-matchup-dashboard.ts:3` — same, plus the `ImportedEvent`
  type.

**Backend**
- `calendarsync` — ten endpoints.
- `matchup` — one: the OAuth start alias.

**External**
- Google Calendar, through the backend. The client never holds a Google credential.

## 6. Document map

| Document | Read it when |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Changing the section, the hooks, or the OAuth return handling. |
| [UI.md](UI.md) | Changing the section's controls or its states. |
| [API.md](API.md) | The eleven endpoints, and why one of them lives under `matchup`. |
| [OPERATIONS.md](OPERATIONS.md) | Debugging a connection, or the re-consent case. |
| [PHASES.md](PHASES.md) | **Before "fixing" the disabled calendar list or the scope check.** Both are deliberate. |

## 7. Where to start reading

1. `src/features/calendar-sync/types.ts` — the DTOs. `CalendarSyncStatus` in particular:
   `connected`, `needs_reconsent` and `can_manage_calendars` are three different things.
2. `services/calendar-sync-service.ts` — eleven endpoints as one object literal.
3. `components/calendar-sync-section.tsx` — the composition root, and the `?google_connected=1`
   return handling.
4. `hooks/use-calendar-sync.ts` — the key factory and why the calendar list is conditionally
   disabled.
