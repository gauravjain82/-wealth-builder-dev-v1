# BPM — Overview

| | |
|---|---|
| **Module** | `bpm` |
| **Source** | `src/features/bpm/` |
| **Routes** | `/bpm/*` (8 sub-tools), `/bpm/pass/:token` (public) |
| **Backend module** | `bpm` → `mlm_platform/docs/bpm/` |
| **API prefix** | `/api/bpm/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `1335eca` plus the uncommitted October update (incl. All locations) on `feature/bpm-updates-oct` — 2026-10-01 |

## 1. Purpose

A **BPM** — Business Presentation Meeting — is the recruiting event at the centre of the
business. Someone invites a guest, the guest attends, and what happened to that guest is
recorded. This module is the whole operational surface around that: scheduling the meetings,
inviting and tracking guests, checking people in at the door, and configuring how all of it
behaves.

It is the largest module in the app (14,063 lines) because a BPM is not one workflow but
eight, each used by a different person at a different moment: a scheduler setting up next
month, an associate adding a guest, a caller working the invite list the night before, a
greeter at the door with a phone, a host reading rankings off a screen, an admin fixing a
mistake afterwards. The eight sub-tools under `/bpm` are those eight moments, and they share
one selection — which BPM, which date — so moving between them does not mean re-choosing.

Two structural facts shape everything here and are worth reading before any change:

- **One BPM on one day is several occurrences.** A multi-location meeting materialises one
  `BPMOccurrence` per (location, date), so "Tuesday Night BPM on the 14th" can be three rows.
  Any UI presenting "a BPM on a day" must group by event or it shows the same meeting three
  times. Since the **All locations** mode, the sticky selection can also *be* a whole date:
  the lists then show every location's rows together, each labelled with its location, while
  one occurrence — the date's first location — stays the anchor for anything that needs
  exactly one.
- **Status is layered, not a field.** An occurrence override beats an event override beats a
  derived status computed from the clock. See
  [ARCHITECTURE.md §8](ARCHITECTURE.md#8-invariants-and-failure-modes).

## 2. Scope

**In scope**
- Event and occurrence scheduling, including recurrence, multiple locations and offices.
- **All locations** — one date of a multi-location BPM worked as one list on Guest Invites,
  Associate Invites and both check-in pages, with a Location column and filter, and a sticky
  per-BPM choice of where a *new* guest, check-in or QR code lands (D21–D24).
- The guest lifecycle: add, search, de-duplicate, transfer, reschedule, note, flag, follow up.
- Guest and associate check-in, manually and by QR scan.
- Associate invites — who was invited to a given date, and their outcomes.
- Sending the event to guests by email or SMS, with per-guest message history.
- QR identity codes, occurrence check-in codes, and guest passes, in three directions.
- BPM General Settings: BPM managers, the check-in window (opens before, closes after), the
  three QR switches, attachment gates, the two guest-send switches, row-colour rules, stat card
  colours, offices, interest options, and recovery of deleted BPMs and deleted dates.
- Zoom attendance: an expected mark at invite time and an attended mark at the door.
- The public guest-pass page, reachable without a session.

**Explicitly out of scope**
- **Appointments and the 1-on-1 follow-up itself.** `matchup` owns those; BPM hands a guest
  across by creating an appointment.
- **Google Calendar connection.** [calendar-sync](../calendar-sync/) owns it. BPM's Overview
  only reports the connection and offers connect / disconnect through `/api/matchup/google/`.
- **Prospect records.** `team`'s prospect tracker owns the person; BPM references them.
- **The reporting pipeline.** Check-in counts feed rankings computed here, not the
  `wbreporting` leaderboards.

## 3. At a glance

| | |
|---|---|
| Routes | 8 nested + 1 public |
| Pages | 9 |
| Components | 45 modules (41 `.tsx`, 4 `.ts`) + 1 stylesheet |
| Contexts | 2 (selection, config), plus `bpm-config-selectors.ts` and `occurrence-date.ts` |
| Hooks | 2 — `use-bpm-capabilities` (the module's only React Query use) and `use-scope-location` |
| Services | 2 (authenticated, public) |
| Service methods | ~78 |
| Endpoints consumed | 61 path templates under `/api/bpm/` + 1 public, 2 under `/api/matchup/` |
| LOC (ts/tsx) | 15,121 — `components/` 8,657 · `pages/` 3,863 · `types.ts` 966 · `services/` 766 · `context/` 692 · `hooks/` 92 |
| Doc tier | Full |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Event** (`BPMEvent`) | The recurring or one-time meeting definition: name, format, locations, recurrence. |
| **Occurrence** (`BPMOccurrence`) | One (location, date) instance of an event. What guests attend and what check-in operates on. |
| **Sub-tool** | One of the eight screens under `/bpm`. They share the selected event and date. |
| **Guest** (`BPMGuest`) | A prospect invited to a specific occurrence. The row, not the person. |
| **Inviter** | The associate who brought a guest. Drives one of the four ranking dimensions. |
| **Associate invite** (`BPMAssociateInvite`) | A record that an associate was invited to a **date**. Distinct from the event's roster — see [ARCHITECTURE.md §8](ARCHITECTURE.md#8-invariants-and-failure-modes). Stored per (occurrence, user); in All-locations mode read as one row per associate across the date (D21). |
| **All locations** | The selection mode in which the scope is every location of the selected date rather than one occurrence. Offered only for a date with more than one location; the default there (D23). |
| **Scope** | What a list covers: `scopeOccurrences` / `scopeIds` from the selection — the date's locations in All-locations mode, else the one selected occurrence. |
| **Anchor** | The one real occurrence the selection still holds in All-locations mode — the date's first location by `start_at`, then id. `occurrence` in the context. |
| **Scope location** | Where something *new* lands when the scope spans several locations — a guest added, an associate checked in, a QR code shown. Sticky per BPM, by location id (`useScopeLocation`, D24). |
| **Status override** | An explicit `ARCHIVED`/`HIDDEN`/`CANCELLED`/`DELETED` set on an event or an occurrence, overriding the derived status. |
| **Derived status** | `SCHEDULED` / `LIVE` / `COMPLETED`, computed from `start_at`/`end_at` against now. |
| **Check-in window** | The period during which check-in is permitted. Opens `checkin_window_hours` before start and closes `checkin_close_hours` (default 4) after end; after the close only a BPM manager may check in (D13). Undo is never gated. |
| **BPM manager** | A user named in BPM Settings, holding per-user grants of the BPM create/update/delete, schedule and settings permissions (D14). Surfaces as `can_manage_settings` and `can_checkin_after_close`. |
| **C / Z** | Confirmed / Zoom. Z is the *expected* Zoom mark and needs C; Guest Check-In's Z is the *attended* mark (`attended_zoom ?? zoom`). See D17, D18. |
| **Guest pass** | A per-guest QR token (`BPMGuest.pass_qr_token`), deliberately separate from the associate identity code because a pass is given away. |
| **Interest option** | A catalogued follow-up interest, grouped `GOALS` / `BUSINESS` / `SELF_IMPROVEMENT`. |
| **Row colour rule** | A server-stored rule colouring a guest row by condition (e.g. "not interested"). |

## 5. Dependencies

**Upstream (this module imports)**
- `src/shared/components/ui/` — the form and dialog primitives.
- `src/shared/components/row-colors` — the shared rule engine and `BPM_GUEST_ROW_COLORS`
  fallback.
- `src/shared/components/tracker-table`, `tracker-date-range-filter` — the shared table and
  date filter.
- `src/shared/components/qr-code` — QR rendering.
- `@zxing/browser` — lazy-loaded scanner fallback.

**Downstream (imports this module)**
- `src/router/index.tsx` — the nested route tree and both providers.
- `src/features/gms` — `bpm/gms-targets.ts` declares BPM's guidance targets.
- `src/hooks/use-role-based-menu.ts` — reads `useBpmCapabilities()` to drop the BPM Settings
  sidebar link (`src/config/menu.ts`).
- `src/features/team/components/user-details-link.tsx` — loads person details through
  `bpmService.person` (D15). BPM is its only caller.

**Sideways** — `services/bpm-service.ts` imports the `Prospect` type from
`team/prospect/services/prospect-service`; the pages import `matchup`'s
`AppointmentFormModal` for blue-card and row-level bookings.

**Backend**
- `bpm` — 61 path templates ([API.md](API.md)).
- `matchup` — Google status, OAuth start and disconnect; appointment creation from Guest Check-In.

**External** — Twilio (SMS) and SendGrid (email) via the backend; Firebase CDN for
attachments.

## 6. Document map

| Document | Read it when |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Before any change. Holds the status precedence, the two contexts, and the invariant most likely to be re-broken. |
| [UI.md](UI.md) | Changing a sub-tool, the calendar, or a check-in screen. |
| [API.md](API.md) | The endpoints consumed and the payload fields that drive the UI. |
| [OPERATIONS.md](OPERATIONS.md) | Settings, QR trouble, or a check-in that will not open. |
| [PHASES.md](PHASES.md) | **Before "fixing" anything that looks wrong.** Decisions D1–D24: D1–D16 and D21–D22 shared with the backend, D17–D20 and D23–D24 frontend-only. Several look like bugs. |

## 7. Where to start reading

1. `src/features/bpm/types.ts` — 966 lines and the real specification of the domain. The
   status types at `:18-28` and `BPMCapabilities` at `:532` explain most of the UI.
2. `context/bpm-selection-context.tsx` — the sticky selection every sub-tool shares, and the
   All-locations scope (`dayOccurrences`, `scopeOccurrences`, `scopeIds`).
3. `context/bpm-config-context.tsx` — settings and row-colour rules, and an unusually clear
   comment on why they are a provider and not a hook.
4. `services/bpm-service.ts` — all ~78 methods in one object; the three `…ForScope` methods
   are the All-locations reads.
5. `components/bpm-page-shell.tsx` — the frame every sub-tool renders inside.
