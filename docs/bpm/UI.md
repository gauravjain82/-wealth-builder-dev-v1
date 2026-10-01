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
| **Verified against** | commit `1335eca` plus the uncommitted October update (incl. All locations) on `feature/bpm-updates-oct` — 2026-10-01 |

## 1. Routes and entry points

Eight nested sub-tools plus one public page.

| Route | Guard | Component | Capability |
|---|---|---|---|
| `/bpm` | providers only | `<Navigate to="/bpm/overview">` | — |
| `/bpm/overview` | providers | `BpmOverviewPage` | `can_read`; `can_create` for Create |
| `/bpm/schedule` | providers | `BpmSchedulePage` | `can_create` / `can_update`; `can_manage_schedule` for status; both, with `can_delete`, for delete |
| `/bpm/add-guest` | providers | `BpmAddGuestPage` | `can_manage_guests` |
| `/bpm/view-invites` | providers | `BpmViewInvitesPage` | `can_manage_guests` to edit; read-only without |
| `/bpm/associate-invites` | providers | `BpmAssociateInvitesPage` | `can_read` |
| `/bpm/guest-checkin` | providers | `BpmGuestCheckinPage` | `can_manage_guests`; `can_checkin_after_close` after the window |
| `/bpm/associate-checkin` | providers | `BpmAssociateCheckinPage` | `can_read`; `can_checkin_after_close` after the window |
| `/bpm/settings` | providers | `BpmSettingsPage` | `can_manage_settings` — sidebar link hidden without it |
| `/bpm/pass/:token` | **none — public** | `BpmGuestPassPage` | — |

There is no capability guard on the route tree; `/bpm` is wrapped in
`BpmSelectionProvider` and `BpmConfigProvider` instead. Controls are hidden per capability and
the backend enforces each one. Sub-tool links are built by `bpmSubToolPath()` so the selected
event and date survive navigation.

**Sub-tool order** is Overview, Add Guest, Guest Invites, Associate Invites, **Guest Check-In,
Associate Check-In**, BPM Schedule, BPM Settings in the sidebar (`src/config/menu.ts`, every
plan), and the same relative order in the jump buttons (`occurrence-row-actions.tsx` `TARGETS`). Guest Check-In
moved ahead of Associate Check-In in the October update. The **BPM Settings** link is removed
from the sidebar unless the user holds `can_manage_settings`
([ARCHITECTURE.md §6](ARCHITECTURE.md#6-permissions-and-gating)).

## 2. Screens

### 2.1 Page shell — `components/bpm-page-shell.tsx`

The frame all eight sub-tools render inside: the sub-tool navigation plus the event and date
pickers. The pickers live here, once, rather than in nine pages.

**All locations in the date picker** (`bpm-occurrence-picker.tsx`). For a date with more than
one location the picker lists **"<date> · All locations (N)"** first, value `all:<YYYY-MM-DD>`,
then each location with its full date and time — not indented under the All entry, because a
closed select shows one option and on a phone it has to say which date. Picking All anchors on
the date's first location (D23). The **selected date's locations are always offered**, even once
they are past and "Include past dates" is off; otherwise the select could not show what is
selected and N would count fewer than the scope covers. Only the sticky picker offers All — the
destination select inside transfer and reschedule (`BPMOccurrenceSelect`) does not, since a
destination is one place.

### 2.2 Overview — `pages/bpm-overview-page.tsx`

The month calendar (`bpm-month-calendar`) and the event list. Each day cell shows **one chip
per BPM**, not per occurrence, and the count badge counts BPMs the same way. Clicking a day
opens the day modal, which **groups by event** and turns location into a dropdown — otherwise a
three-location BPM would appear three times. Guests and associates are summed across locations
in that view.

On a multi-location day the location dropdown's first option is **All locations**, and it is
the **default** (D23). It carries **no count**: the day's list may be narrowed by the Overview's
filters, while the sub-tool it opens scopes every location of the date. With All chosen the item
shows the first location's time and status and the jump buttons open the sub-tool in
All-locations mode (`all=1`) anchored there; picking one location opens that location as before.
The choice is remembered per BPM while the page is open, and falls back to the default on a
day where the remembered location does not occur.

The day modal is ~90% of the viewport wide (full width inside the 16px gutter under 640px), and
each item stacks title, time and counts above the jump buttons until 1024px, so five buttons no
longer overflow a phone. Styled by BPM's own `components/bpm-month-calendar.css`; the grid
itself still borrows Matchup's classes.

**The BPM's name opens its attachments** (`bpm-title-link.tsx`), on the Overview list, the day
modal and BPM Schedule. It is an underlined button only when the BPM `has_attachments` **and**
`attachments_view` is on; otherwise it is plain text, so a link never promises an empty popup.
The paperclip that used to trail the jump buttons is gone.

Stat cards and the Guest/Associate tabs were **removed** from this page per the brief; the
sub-tools serve those needs now.

### 2.3 Schedule — `pages/bpm-schedule-page.tsx`

Event CRUD via `bpm-form-modal`, with `locations-editor` for multi-location setup,
`occurrence-row-actions` for per-date actions, `status-control` for overrides, and
`event-attachments`.

Each control has its own gate, and a control the user lacks is **hidden, not disabled**:
**Create BPM** needs `can_create`, **Edit** `can_update`, the status control
`can_manage_schedule`. Deleting needs `can_delete` *and* `can_manage_schedule`, because it is a
status change: the status control's *Deleted* option deletes one date, and **Delete BPM** on the
group row sets the event-level `DELETED` override after a confirm. Every date without an
override of its own goes with it, and BPM Settings restores it as one item. The button is not
shown on a BPM that is already deleted.

Deliberately hidden, not deleted: trainer selection, per-stage email-template assignment, and
per-location check-in fields. The state and payload wiring are intact, so re-showing them is a
one-line change; `BPMEvent.trainers` and `email_template_assignments` remain on the model and
the API.

### 2.4 Add Guest — `pages/bpm-add-guest-page.tsx`

`add-guest-form` with prospect search, then `duplicate-prospect-dialog` on a probable match —
"possible duplicate, is this them?" — matching on normalised phone as well as email.

In All-locations mode an **Add to location** select sits above the form: a guest is invited to
one location. It is the sticky per-BPM choice from `useScopeLocation()`, shared with every other
"Add to location" and "Check in at" select and the QR dialog.

### 2.5 Guest Invites — `pages/view-invites-page.tsx`

The guest list for the selected date: per-guest invite outcomes (`called`, `left_message`,
`not_interested`, `reschedule`), notes, follow-ups with interest options, transfer, reschedule,
and the send-event modal with its message history. Rows are coloured by server-stored rules.

| Column | Notes |
|---|---|
| **C** | Confirmed. The leftmost data column, distinct from the unlabelled select-for-send box |
| **Z** | Expected on Zoom (`zoom`). Disabled and unticked until C is ticked; un-ticking C clears it (D18) |
| Guest | sortable |
| Location | **All-locations mode only** — `occurrence_label`, sortable; also a line on the phone card. Absent (and its sort dropped) on one location |
| Contact | phone above email, each its own sort button (`sort-button.tsx`); phone sorts on digits only |
| Inviter · Leader · MD · SMD | each sortable; names open person details |
| Outcome, Notes, Actions | Actions pinned to the right edge so a wide table's scroll never hides it |

Sorting is client-side — the guests endpoint returns the date's whole list — and blanks sort
last in both directions. Above the table: **All / Not Confirmed / Confirmed** pills with counts,
**Inviter / Leader / MD / SMD** selects that narrow cumulatively, and "Showing N of M". Select-all
and the send target follow the *visible* rows, so a filtered-out guest is never messaged.

Without `can_manage_guests` the page is **read-only**: Add Guest, send, selection, transfer,
reschedule, book and remove are absent; C, Z and the outcomes are shown disabled.

Row actions patch the returned guest into place. While a row's flag save is in flight its
boxes are held, because an un-confirm response would otherwise undo a Z ticked meanwhile. Add
and send refetch quietly, without the loading swap.

**In All-locations mode** the list is every location's guests, **one row per (guest,
location)** — not merged, so a prospect on the room's list and Zoom's appears twice, each
labelled. A **Location** select joins the people selects ("All Locations" plus the locations
present, in the date's order). **Add to location** sits left of **+ Add Guest** and decides where
the new guest lands; the Add Guest modal repeats it, because the calendar's `?add=1` opens the
modal over the page. Every row action — flags, notes, transfer, reschedule, booking, remove —
acts on the row's own location; a booking takes that location's start time.

**Send event** splits the recipients by location and sends once per location, so each guest
gets their own location's details. The report is merged into one view, each outcome labelled
with its location, and a location whose send was refused is named under **Not sent to every
location** rather than failing the ones that went.

### 2.6 Associate Invites — `pages/associate-invites-page.tsx`

Who was invited to this **date**, with segment and team-scope filters, sorting and pagination,
plus a `TrackerDateRangeFilter`. The date range is deliberately kept out of the `filters`
object.

The per-date boxes are **Invited, C, Z, Called**, in that order. They are a chain: C needs
Invited, Z needs C, and un-ticking a box clears everything downstream of it, on the server and
optimistically here (D18). Every save writes all four back, so a row is held while one is in
flight. C and Z are marked not sortable: the list sorts server-side, and the column comment
predates the backend accepting `?sort=zoom`.

**In All-locations mode** there is still **one row per associate** — an invite is to the date
(D21). A box reads ticked if it is ticked at any location. A **Location** column, placed before
the name, shows where the invite is stored (`invite_occurrence_label`, `—` when there is none).
An edit goes to that location, else the date's first; an untick sends `scope_occurrence_ids` and
so clears the box at every location holding it. The column is **not sortable** — the list sorts
server-side on known keys only — and has no filter.

### 2.7 Guest Check-In — `pages/guest-checkin-page.tsx`

`guest-checkin-table` with `checkin-stat-cards` above it and the QR dialog for camera
scanning. A scan records a guest when a guest pass was scanned and an associate otherwise, and
**the outcome line names which** — the two land on different lists, so a mis-scan is otherwise
invisible until somebody counts. Guests can still be taken by name from the list, which stays
the answer when a camera cannot open.

- **Cards:** Guests Invited, Guests Checked In, Attendance Ratio, then Top Inviter / Leader /
  MD / SMD. Colours come from `stat_card_colors` in Settings, with the built-in Tailwind colour
  as a fallback until settings resolve. The ranking modal adds the ranked person's upline —
  only the levels *above* the dimension (Top MD shows SMD; Top SMD shows none).
- **Filters:** the attendance pills, a second independent **All / Live / Zoom** pill group
  (D19), and **SMD / MD / Leader / Inviter** selects. Each pill group's counts are taken with the
  other group applied, so a row of pills always adds up.
- **Z** is the *attended* mark: it reads `attended_zoom ?? zoom` and writes `attended_zoom`,
  never the invite-time `zoom` (D17). It is only live once the guest is checked in.
- **Row-level Schedule appointment** books the blue card's 1-on-1 without opening the card
  ([ARCHITECTURE.md §3.6](ARCHITECTURE.md#36-booking-a-1-on-1-off-a-guest-row)). Hidden when an
  appointment is already linked, or the guest has no prospect.
- **Blue card button** is outlined until the card holds something — an interest, a collector, a
  referral, a spouse name or a linked appointment — and solid after. The old
  "Blue card · N interests" badge is gone. **Collected by** defaults to the saved collector,
  else the last one picked on this device (`wb.bpm.lastCollectedBy`), else the logged-in user.
- **QR** sits at the right of the date picker's heading (`dateAction`), beside the date its
  code belongs to. **Show pass** is gone — the guest has the pass by email — and
  `guest-pass-modal` was deleted.
- Row actions patch the returned guest in place; the stat cards refetch in the background.
  Quick-add, the Add Guest modal and scans refetch quietly. The table never blanks after a load.

**Add & Check in** is disabled with the rest of the check-in controls when `canCheckInNow()` is
false; it adds *and* checks in, so leaving it enabled would be a way around the gate.

**The three counters are computed from the guest list, not the stats payload.** The stats'
guest `totals` count distinct *inviters* — how many people brought somebody — which is the wrong
number for "Guests Invited". `guestCountCards()` counts **people, deduplicated by prospect** (a
row without a prospect counts on its own): a guest on two locations' lists is one invited, and
checked in if checked in at either (D22). So these cards need not match the ranking modals'
totals; that is by design ([OPERATIONS.md §6](OPERATIONS.md#6-troubleshooting)).

**In All-locations mode:**

- The table is every location's guests, **one row per (guest, location)**, with a sortable
  **Location** column (a line on the phone card) and a **Location** select among the person
  filters, offered only in this mode.
- **Check-in is gated per row**: each row's button is judged by `canCheckInNow()` against *its
  own* location's window, because locations on one date need not start at the same hour. The
  window notice above the cards speaks for the anchor — the date's first location — and is the
  headline, not the gate.
- **Add to location** beside "Prospects not yet invited" decides where **Add & Check in** puts a
  new guest, and that button is gated on that location's window. The Add Guest modal offers the
  same choice.
- The **stat cards** read the union stats (`checkinStatsForScope`); a scan at any location in
  scope reloads the list quietly, one outside it does not.

### 2.8 Associate Check-In — `pages/associate-checkin-page.tsx`

The associate table, the `invited-associates-card` panel, and the stat cards. The Invited
Associates list is **on the page rather than behind a click**, because it is read down while
people arrive and a modal would be the wrong trade. It lists only who is **still expected** —
arrivals drop out, since the table below lists them — with "N still expected · M arrived" in
its header. *Agents Invited* and *Agents Checked In* are counts, not rankings, and are not
clickable.

Cards: Agents Invited, Agents Checked In, then **Top SMD, Top MD, Top Leader, Top Direct**
(`ASSOCIATE_DIMENSIONS`). Top Direct ranks by `recruited_by` and exists for this audience only
(D16). `inviter` is the one dimension left off — here it mostly repeats Top Leader.

The table: Name · Leader · **MD** · SMD · **Mission** · Checked in · **Z** · Actions. Name,
Leader, MD, SMD and Checked in are sortable and have a text filter each, above the table so they
wrap on a phone; "Showing N of M", **Clear** and **Refresh** sit with them. **Mission** is the
column once headed 4X4 and still shows the three 4X4 milestone dots — its data source is pending
confirmation ([PHASES.md §5](PHASES.md#5-outstanding)). **Z** toggles `AssociateCheckIn.zoom`
through `setAssociateCheckinZoom`, defaulted at check-in from the associate's invite; it is not
window-gated.

A check-in or undo patches the list in place, Z patches the row without moving it, and
Refresh refetches quietly. The associate search is disabled while a date's first load runs,
since a check-in then would be overwritten by the load. QR is the picker's `dateAction`, as on
Guest Check-In.

**In All-locations mode** the table lists every location's check-ins with a **Location**
column (between SMD and Checked in) and its text filter; a **Check in at** select before the
associate search decides where a new check-in lands, and the window notice, the search's
placeholder and its gate all follow *that* location. A person counts once across the date (D22):
checking in somebody already in at another location is refused with "Already checked in at
<location>." rather than recorded twice. Undo and Z act on the row's own location. The Invited
Associates panel reads the date's invites across every location, each name labelled with where
its invite is stored, and an arrival at any location drops the name.

### 2.9 Settings — `pages/bpm-settings-page.tsx`

Gated on `can_manage_settings`. Top to bottom:

1. **BPM managers** (`bpm-managers-editor`) — a multi-select over the company-wide inviter
   search, held until **Save managers**, with Discard. Besides Admin, these people create, edit
   and delete BPMs and use Settings (D14).
2. **Feature controls** (`bpm-settings-toggles`) — **Check-in window for Guests and
   Associates**: one switch and two 0–168 hour boxes, "opens N hours before the BPM starts" and
   "closes M hours after the BPM completes" (default 4), each saved on blur; the QR, attachment
   and guest-send switches.
3. **Row color schemes** (`row-color-rules-editor`) — the condition key is a **select** over
   `BPM_GUEST_CONDITIONS` rather than free text, because a mistyped key never fires. A key
   outside the catalogue stays selectable as "(custom)". The eye button, or the locked key on a
   built-in row, opens **Show condition key** (`condition-key-modal`): a sample guest row painted
   by the real resolver in the draft color, what the condition means, and where it appears.
4. **Stat card colors** (`stat-card-colors-editor`) — ten cards, a picker and hex box each, and
   a white-on-colour preview so a too-pale colour shows here rather than at the door. One Save
   for the map.
5. **Deleted BPMs** and **Deleted dates**, each with Restore. The second list is the fix for
   "deleted BPMs don't show up": Schedule deletes a *date* (an occurrence override), and the old
   list showed only events deleted whole. Restoring a date is `setOccurrenceStatus(id, null)`.

### 2.10 Public guest pass — `pages/public/bpm-guest-pass-page.tsx`

A guest's QR pass, reachable from an emailed link with no session. Uses
`publicBpmService`, which sends no `Authorization` header.

### 2.11 QR — `bpm-qr-modal`, `bpm-event-code-display`, `my-qr-code-modal`

The **QR dialog** on both check-in pages holds only the scanner and a **Show event code**
button (absent from the profile menu's copy, which has no date). Pressing it replaces the
dialog with **`BpmEventCodeDisplay`**: a full-screen, portrait-first poster, rendered in a
portal — a navy background, a gold serif "ASSOCIATE CHECK-IN" heading, the BPM's name, four
numbered steps (go to this host, tap the profile icon, Scan QR, Use Camera), the code on a white
card sized to the viewport (`qrSizeFor`, 180–520px), date · location below it, a line saying
scanning stops when check-in closes at `checkin_closes_at` (or when the BPM finishes, with the
window off), and the Wealth Builders logo. Escape or the X closes it; body scroll is locked
while it is up. Name, date and place come from the selected occurrence, falling back to the
code's label.

**In All-locations mode the QR dialog asks which location** (D24): a **Location** select
("<label> · <time>") above the scanner, because a code — and an identity scan — belongs to one
location. It **defaults to, and writes back to, the page's own choice** — Guest Check-In's "Add
to location", Associate Check-In's "Check in at" — so a greeter who picked the Zoom desk once
scans into Zoom and sees Zoom's code. The poster shows the chosen location. Outside the mode the
select is absent.

**My QR Code** shows the holder's name large and their agency code beneath it — the host
confirms who they are scanning across a table, and the agency code separates two people with
one name. Older payloads with only `label` still render.

The camera viewfinder (shared with Events) follows orientation: 3:4 in portrait, 4:3 in
landscape, capped at 60vh / 70vh so the controls under it stay on screen.

### 2.12 Person details — `team/components/user-details-link.tsx`

Every name on a BPM list opens a read-only **Details** modal loaded from
`GET /api/bpm/people/{id}/` (D15). It opens guests of other shops, their inviters, and
associates at shared BPMs, which the team-scoped accounts endpoint refused with a 404.

## 3. States

| State | Trigger | What the user sees |
|---|---|---|
| No selection | first visit with nothing in `sessionStorage` | the pickers, prompting a choice |
| Loading events / occurrences | selection change | per-picker loading from the selection context |
| Rules not yet loaded | first mount in a tab | rows render **plain**, never mis-coloured |
| Check-in too early | `checkin_open === false`, `checkin_closed === false` | "not open yet" notice and every check-in control disabled |
| Check-in closed | `checkin_closed === true`, no `can_checkin_after_close` | "Check-in has closed" notice with the close time; check-in disabled, **undo still live** |
| Check-in closed, manager | `checkin_closed === true` with `can_checkin_after_close` | the notice says "as a BPM manager you can still check people in"; controls enabled |
| Guest Invites, no grant | `can_manage_guests` false | read-only list; C/Z/outcomes disabled; no Add, send or row actions |
| Filters match nothing | pills or selects exclude every row | "No guests match these filters." / "No check-ins match these filters." |
| Everyone arrived | every invited associate checked in | the Invited Associates panel says so instead of listing struck-through names |
| Scan unavailable | no `BarcodeDetector`, `@zxing/browser` loading | the fallback scanner; guests can be taken by name meanwhile |
| Scan resolved | `/qr/scan/` returned | an outcome line naming guest **or** associate |
| Duplicate suspected | phone or email matched | the confirm dialog, not a block and not a silent merge |
| Send report | after a send | per-guest outcomes; a repeat send is allowed |
| Status override | `ARCHIVED`/`HIDDEN`/`CANCELLED`/`DELETED` | the override wins over the derived status in the badge |
| Deleted | `DELETED` | absent from lists; a whole BPM under **Deleted BPMs**, a single date under **Deleted dates** in Settings |
| Attachments hidden | `attachments_view` off | the BPM name is plain text — `href` never reaches the client |
| Managers failed to load | `GET /settings/managers/` failed | "BPM managers could not be loaded." — the rest of Settings works |
| All locations not offered | the date has one location | no "All locations (N)" entry in the picker and no All option in the day modal; a stored All preference reads as off |
| All locations | "<date> · All locations (N)" chosen, or `all=1` in a deep link | Location column (and filter, except Associate Invites) on the four lists; union rows, one per location; "Add to location" / "Check in at" selects; a Location select in the QR dialog |
| All locations, date now past | a finished multi-location date is selected | the date and its locations stay in the picker with "Include past dates" off; the union still covers every location |
| All locations, one location's window open | locations on one date start at different hours | per-row check-in buttons enabled only on the open location's rows; the notice speaks for the first location |
| Already in elsewhere | Associate Check-In, person checked in at another location in scope | "Already checked in at <location>." — no second check-in |
| Send refused at one location | All-mode send, one location's request failed | the merged report for the rest, with "Not sent to every location" naming the failure |
| Union load refused | a location in scope is not visible to the user (404) | the page's load error; the list is not narrowed to the visible locations |

## 4. Interaction rules

- **The selection is sticky.** It persists in `sessionStorage` across sub-tools and across
  reloads in the tab, All-locations mode included. Breaking this reintroduces the problem it was built for: re-choosing the
  same meeting on every navigation.
- **Group by event when presenting a day.** Three locations are three occurrences of one
  meeting. The All-locations lists are the deliberate exception: they union the rows —
  **one row per location, never merged** — label each with its location, and count people once.
- **All locations is the first choice, and the default where it is offered** — in the picker
  and in the day modal (D23). It is offered only for a date with more than one location.
- **A new thing asks where; a row already knows.** Adding a guest, checking in someone new and
  the QR dialog use the one sticky per-BPM location (`wb.bpm.lastLocation.<eventId>`, D24); a
  row's actions go to its own location.
- **Never re-derive the check-in window in the browser.** Read `checkin_open` from the
  occurrence.
- **Undo is always offered.** Before the window opens there is nothing to undo; after it
  closes, gating undo would strand a mistake with nobody but a manager able to fix it.
- **Two Zoom marks, never one.** Guest Invites' Z is the expectation (`zoom`, needs C); Guest
  Check-In's Z is what happened (`attended_zoom`, read as `attended_zoom ?? zoom`). Associates
  carry the same pair: the invite's Z, then `AssociateCheckIn.zoom`. (D17)
- **Unticking cascades.** Un-inviting clears C and Z; un-confirming clears Z. (D18)
- **Row actions patch in place.** Only a change of date shows a loading state; everything else
  swaps the returned row in or refetches quietly, because the list is being read while it
  changes.
- **Name what a scan recorded.** Guest and associate check-ins go to different lists.
- **Show message history before allowing a send.** This is what makes an un-deduplicated send
  defensible.
- **Confirm a duplicate; do not merge.** Best-effort by decision D9.
- **Milestone-style config is set in Settings, not per view.** The check-in window, the QR
  switches and the attachment gates are platform-wide.
- **Do not colour a row until the rules arrive.**

## 5. Responsive and print behaviour

Tailwind utilities throughout, plus one BPM stylesheet, `components/bpm-month-calendar.css`,
for the day modal (below). The check-in pages are the ones used on a phone at a door, so the
scan panel and the table are the parts that must work at narrow widths.

| Surface | Narrow behaviour |
|---|---|
| Overview day modal | full width under 640px; items stacked until 1024px |
| Guest Invites | a **card per guest under `lg`** with a sort select, the table from `lg` up. The table's Actions column sat past a 1000px minimum width, so on a phone the buttons were off-screen and read as missing |
| Guest Invites table | Actions column `sticky right-0`, opaque, with a shadow |
| Check-in stat cards | grid by card count (`gridClass`), so a row never ends with one orphan |
| Associate Check-In | the column filters sit above the table and wrap |
| Event-code poster | portrait-first; type sized with `clamp()`; QR sized from the viewport |
| Camera viewfinder | aspect follows orientation |

No print styles. *Not applicable — check-in is done on a screen.*

Camera scanning needs **HTTPS**, and iOS in-app webviews are unreliable for camera access. The
`@zxing/browser` fallback (~200 KB, lazy-loaded inside the branch that needs it) turned out to
be load-bearing rather than optional: the events desk can survive a missing `BarcodeDetector`
by letting somebody type a ticket number, and a BPM guest has no number to type.

## 6. Accessibility

Shared UI primitives supply labelled inputs and Radix-backed dialogs with focus trapping. The
QR scan panel's outcome line is the module's most important announcement, since the operator is
looking at a queue of people rather than the screen.

The pill groups carry `role="group"`, an `aria-label` and `aria-pressed`; C and Z headers are
`<abbr>` with their full names. The event-code poster is `role="dialog"` `aria-modal`, closes on
Escape and locks body scroll, but is hand-rolled and does **not** trap focus.

Not audited: this is the largest module in the app, and no systematic accessibility pass has
been made over its 45 component modules. Treat the shared primitives as the accessible path and any
hand-rolled overlay as needing its own focus management.

## 7. Styling and theming

One module stylesheet, `components/bpm-month-calendar.css`, with the **`wb-bpm-`** prefix
(`wb-bpm-day-modal`, `wb-bpm-day-list`, `wb-bpm-day-item*`). It exists because Matchup's
`.matchup-day-modal-item` is a no-wrap row that overflows a phone, and Matchup's stylesheet is
Matchup's. The panel class is doubled (`.wb-bpm-day-modal.wb-bpm-day-modal`) to beat the
Modal's Tailwind `max-w-[860px]` on specificity rather than stylesheet order.

**Stat card colours** are server state (`stat_card_colors`, ten keys, `#rrggbb`) read through
`useStatCardColors()` / the provider; each card keeps a Tailwind fallback until settings
resolve, so the row never paints as blank boxes. Card text is white.

**UI copy uses American spelling** — "color", "Color schemes", "Not a hex color" — since the
October update. Code comments and these docs are not held to it.

Row colours come from the server and are resolved by
`shared/components/row-colors`, with `BPM_GUEST_ROW_COLORS` kept **only as a lifeboat for a
failed fetch** — the six schemes originally shipped as a client constant were moved into the
database in Phase 7 (`bpm/0020`) so an admin can recolour or disable one from BPM Settings.

The rule module is in `shared/` and accepts arbitrary `condition_key`s, so the Prospect and
Associate trackers can adopt it by emitting keys and calling the resolver. Nothing else emits
keys yet.
