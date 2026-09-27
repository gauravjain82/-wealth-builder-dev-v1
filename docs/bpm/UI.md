# BPM — UI

| | |
|---|---|
| **Module** | `bpm` |
| **Source** | `src/features/bpm/pages/`, `components/` |
| **Routes** | `/bpm/*`, `/bpm/pass/:token` |
| **Backend module** | `bpm` |
| **API prefix** | `/api/bpm/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Routes and entry points

Eight nested sub-tools plus one public page.

| Route | Guard | Component | Capability |
|---|---|---|---|
| `/bpm` | providers only | `<Navigate to="/bpm/overview">` | — |
| `/bpm/overview` | providers | `BpmOverviewPage` | `can_read` |
| `/bpm/schedule` | providers | `BpmSchedulePage` | `can_manage_schedule` for CRUD |
| `/bpm/add-guest` | providers | `BpmAddGuestPage` | `can_manage_guests` |
| `/bpm/view-invites` | providers | `BpmViewInvitesPage` | `can_manage_guests` to edit |
| `/bpm/associate-invites` | providers | `BpmAssociateInvitesPage` | `can_read` |
| `/bpm/guest-checkin` | providers | `BpmGuestCheckinPage` | `can_manage_guests` |
| `/bpm/associate-checkin` | providers | `BpmAssociateCheckinPage` | `can_read` |
| `/bpm/settings` | providers | `BpmSettingsPage` | `can_manage_settings` |
| `/bpm/pass/:token` | **none — public** | `BpmGuestPassPage` | — |

There is no capability guard on the route tree; `/bpm` is wrapped in
`BpmSelectionProvider` and `BpmConfigProvider` instead. Controls are hidden per capability and
the backend enforces each one. Sub-tool links are built by `bpmSubToolPath()` so the selected
event and date survive navigation.

## 2. Screens

### 2.1 Page shell — `components/bpm-page-shell.tsx`

The frame all eight sub-tools render inside: the sub-tool navigation plus the event and date
pickers. The pickers live here, once, rather than in nine pages.

### 2.2 Overview — `pages/bpm-overview-page.tsx`

The month calendar (`bpm-month-calendar`) and the event list. Clicking a day opens the day
modal, which **groups by event** and turns location into a dropdown — otherwise a
three-location BPM would appear three times. Guests and associates are summed across locations
in that view.

Stat cards and the Guest/Associate tabs were **removed** from this page per the brief; the
sub-tools serve those needs now.

### 2.3 Schedule — `pages/bpm-schedule-page.tsx`

Event CRUD via `bpm-form-modal`, with `locations-editor` for multi-location setup,
`occurrence-row-actions` for per-date actions, `status-control` for overrides, and
`event-attachments`.

Deliberately hidden, not deleted: trainer selection, per-stage email-template assignment, and
per-location check-in fields. The state and payload wiring are intact, so re-showing them is a
one-line change; `BPMEvent.trainers` and `email_template_assignments` remain on the model and
the API.

### 2.4 Add Guest — `pages/bpm-add-guest-page.tsx`

`add-guest-form` with prospect search, then `duplicate-prospect-dialog` on a probable match —
"possible duplicate, is this them?" — matching on normalised phone as well as email.

### 2.5 Guest Invites — `pages/view-invites-page.tsx`

The guest list for the selected date: per-guest invite outcomes (`called`, `left_message`,
`not_interested`, `reschedule`), notes, follow-ups with interest options, transfer, reschedule,
and the send-event modal with its message history. Rows are coloured by server-stored rules.

### 2.6 Associate Invites — `pages/associate-invites-page.tsx`

Who was invited to this **date**, with segment and team-scope filters, sorting and pagination,
plus a `TrackerDateRangeFilter`. The date range is deliberately kept out of the `filters`
object.

### 2.7 Guest Check-In — `pages/guest-checkin-page.tsx`

`guest-checkin-table` with `checkin-stat-cards` above it and `bpm-qr-scan-panel` for camera
scanning. A scan records a guest when a guest pass was scanned and an associate otherwise, and
**the outcome line names which** — the two land on different lists, so a mis-scan is otherwise
invisible until somebody counts. Guests can still be taken by name from the list, which stays
the answer when a camera cannot open.

**Add & Check in** is disabled with the rest of the controls when the window is closed; it adds
*and* checks in, so leaving it enabled would be a way around the gate.

### 2.8 Associate Check-In — `pages/associate-checkin-page.tsx`

The associate table, the `invited-associates-card` panel, and the stat cards. The Invited
Associates list is **on the page rather than behind a click**, because it is read down while
people arrive and a modal would be the wrong trade. *Agents Invited* and *Agents Checked In*
are counts, not rankings, and are not clickable.

The page renders only Top SMD and Top MD, although all four ranking dimensions exist in the
payload, because the row is shared with the two counters.

### 2.9 Settings — `pages/bpm-settings-page.tsx`

`bpm-settings-toggles` plus the admin modals: offices, interest options, row-colour rules, and
deleted-item recovery. Gated on `can_manage_settings`.

### 2.10 Public guest pass — `pages/public/bpm-guest-pass-page.tsx`

A guest's QR pass, reachable from an emailed link with no session. Uses
`publicBpmService`, which sends no `Authorization` header.

## 3. States

| State | Trigger | What the user sees |
|---|---|---|
| No selection | first visit with nothing in `sessionStorage` | the pickers, prompting a choice |
| Loading events / occurrences | selection change | per-picker loading from the selection context |
| Rules not yet loaded | first mount in a tab | rows render **plain**, never mis-coloured |
| Check-in too early | `checkin_open === false` | `checkin-window-notice` and every check-in control disabled |
| Scan unavailable | no `BarcodeDetector`, `@zxing/browser` loading | the fallback scanner; guests can be taken by name meanwhile |
| Scan resolved | `/qr/scan/` returned | an outcome line naming guest **or** associate |
| Duplicate suspected | phone or email matched | the confirm dialog, not a block and not a silent merge |
| Send report | after a send | per-guest outcomes; a repeat send is allowed |
| Status override | `ARCHIVED`/`HIDDEN`/`CANCELLED`/`DELETED` | the override wins over the derived status in the badge |
| Deleted | `DELETED` | absent from lists, recoverable from Settings |
| Attachments hidden | `attachments_view` off | no attachment UI at all — `href` never reaches the client |

## 4. Interaction rules

- **The selection is sticky.** It persists in `sessionStorage` across sub-tools and across
  reloads in the tab. Breaking this reintroduces the problem it was built for: re-choosing the
  same meeting on every navigation.
- **Group by event when presenting a day.** Three locations are three occurrences of one
  meeting.
- **Never re-derive the check-in window in the browser.** Read `checkin_open` from the
  occurrence.
- **Undo is always offered.** Before the window opens there is nothing to undo; after it opens
  the window never closes, so gating undo could only strand a mistake.
- **Name what a scan recorded.** Guest and associate check-ins go to different lists.
- **Show message history before allowing a send.** This is what makes an un-deduplicated send
  defensible.
- **Confirm a duplicate; do not merge.** Best-effort by decision D9.
- **Milestone-style config is set in Settings, not per view.** The check-in window, the QR
  switches and the attachment gates are platform-wide.
- **Do not colour a row until the rules arrive.**

## 5. Responsive and print behaviour

Tailwind utilities throughout; BPM adds no stylesheet of its own. The check-in pages are the
ones used on a phone at a door, so the scan panel and the table are the parts that must work at
narrow widths.

No print styles. *Not applicable — check-in is done on a screen.*

Camera scanning needs **HTTPS**, and iOS in-app webviews are unreliable for camera access. The
`@zxing/browser` fallback (~200 KB, lazy-loaded inside the branch that needs it) turned out to
be load-bearing rather than optional: the events desk can survive a missing `BarcodeDetector`
by letting somebody type a ticket number, and a BPM guest has no number to type.

## 6. Accessibility

Shared UI primitives supply labelled inputs and Radix-backed dialogs with focus trapping. The
QR scan panel's outcome line is the module's most important announcement, since the operator is
looking at a queue of people rather than the screen.

Not audited: this is the largest module in the app, and no systematic accessibility pass has
been made over its 37 components. Treat the shared primitives as the accessible path and any
hand-rolled overlay as needing its own focus management.

## 7. Styling and theming

No module stylesheet. Row colours come from the server and are resolved by
`shared/components/row-colors`, with `BPM_GUEST_ROW_COLORS` kept **only as a lifeboat for a
failed fetch** — the six schemes originally shipped as a client constant were moved into the
database in Phase 7 (`bpm/0020`) so an admin can recolour or disable one from BPM Settings.

The rule module is in `shared/` and accepts arbitrary `condition_key`s, so the Prospect and
Associate trackers can adopt it by emitting keys and calling the resolver. Nothing else emits
keys yet.
