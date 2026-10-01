# BPM — Architecture

| | |
|---|---|
| **Module** | `bpm` |
| **Source** | `src/features/bpm/` |
| **Routes** | `/bpm/*`, `/bpm/pass/:token` |
| **Backend module** | `bpm` |
| **API prefix** | `/api/bpm/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `1335eca` plus the uncommitted October update (incl. All locations) on `feature/bpm-updates-oct` — 2026-10-01 |

## 1. Layering

Platform layering ([platform §1](../platform/ARCHITECTURE.md#1-layering)) with **two React
contexts in place of a hooks directory**. Shared server state is held by the providers, and
everything else is local to a page. `hooks/use-bpm-capabilities.ts` exists for a consumer
*outside* the `/bpm` tree — the sidebar — and is not used by the pages.
`hooks/use-scope-location.ts` is a thin reader over the selection context plus
`localStorage`; it fetches nothing.

| Layer | File | Owns |
|---|---|---|
| Types | `types.ts` (966 lines) | the whole domain contract |
| Services | `services/bpm-service.ts`, `public-bpm-service.ts` | ~78 methods, URL building, auth |
| Contexts | `context/bpm-selection-context.tsx`, `bpm-config-context.tsx`, `bpm-config-selectors.ts`, `occurrence-date.ts` | the sticky selection and its All-locations scope; settings + row-colour rules, and narrow readers of them; "the same date" at the event's timezone |
| Hooks | `hooks/use-bpm-capabilities.ts`, `hooks/use-scope-location.ts` | capabilities for the sidebar, through React Query; the sticky per-BPM location a *new* thing lands on in All-locations mode (§3.8) |
| Pages | `pages/` (9) | one per sub-tool, plus the public pass |
| Components | `components/` (45 modules + `bpm-month-calendar.css`) | forms, modals, tables, pickers |

`public-bpm-service.ts` is separate because the public pass page must not send an
`Authorization` header — a guest following an emailed link has no session.

## 2. Component map

```
/bpm ── BpmSelectionProvider          sticky event + date, sessionStorage-backed
         └── BpmConfigProvider        settings singleton + row-colour rules
              └── <Outlet>
                   ├── /overview          BpmOverviewPage      calendar + event list
                   ├── /schedule          BpmSchedulePage      CRUD, statuses, attachments
                   ├── /add-guest         BpmAddGuestPage      add + dedupe
                   ├── /view-invites      BpmViewInvitesPage   guest list, flags, follow-ups
                   ├── /associate-invites BpmAssociateInvitesPage
                   ├── /guest-checkin     BpmGuestCheckinPage  table + QR scan
                   ├── /associate-checkin BpmAssociateCheckinPage
                   └── /settings          BpmSettingsPage      the config surface

/bpm/pass/:token ── BpmGuestPassPage    public, no session, publicBpmService
```

Every sub-tool renders inside `components/bpm-page-shell.tsx`, which supplies the sub-tool
navigation and the event/date pickers, so the selection controls exist once rather than nine
times.

### The 45 component modules, by job

| Group | Components |
|---|---|
| Shell & navigation | `bpm-page-shell`, `bpm-occurrence-picker`, `month-jump-modal`, `office-picker`, `scope-location-select` |
| Scheduling | `bpm-form-modal`, `bpm-month-calendar` (+ `.css`), `bpm-title-link`, `locations-editor`, `occurrence-row-actions`, `status-control`, `event-attachments` |
| Guests | `add-guest-form`, `add-guest-modal`, `guest-list`, `guest-checkin-table`, `sort-button`, `duplicate-prospect-dialog`, `transfer-guest-modal`, `reschedule-guest-modal`, `follow-up-guest-modal`, `blue-card-appointment.ts`, `guest-notes*`, `guest-row-colors` |
| Associates | `invited-associates-card`, `multi-user-select` |
| Check-in | `checkin-stat-cards`, `checkin-window-notice`, `checkin-window.ts` |
| QR | `bpm-qr-modal`, `bpm-event-code-display`, `bpm-qr-scan-panel`, `my-qr-code-modal` |
| Messaging | `send-event-modal`, `guest-message-history` |
| Admin | `bpm-settings-toggles`, `bpm-managers-editor`, `stat-card-colors-editor`, `manage-offices-modal`, `office-form-modal`, `interest-options-admin-modal`, `row-color-rules-editor`, `condition-key-modal` |

`guest-pass-modal` was **deleted** in the October update: Guest Check-In no longer shows a
guest their pass (the guest has it by email). `bpmService.guestPass` remains, with no caller.

The two `.ts` files beside the components (`checkin-window.ts`, `blue-card-appointment.ts`)
and `context/bpm-config-selectors.ts` exist so their neighbours export components only, for
Fast Refresh.

## 3. Primary flows

### 3.1 Selecting a BPM and a date

1. `BpmSelectionProvider` mounts once for the whole `/bpm` tree and restores its last
   selection from `sessionStorage` (`context/bpm-selection-context.tsx:47`, `:153`).
2. It loads the event list and the occurrences for the selection, holding both in context.
3. Every sub-tool reads `useBpmSelection()` rather than fetching or choosing for itself.

The selection is sticky **because it used to not be**: each page held its own `useState` and
the two-step picker refetched and reset on every navigation
(`bpm-selection-context.tsx:21`). Moving between "add a guest" and "check them in" meant
re-choosing the same meeting twice.

The selection can also span **every location of one date** — see §3.8.

### 3.2 Loading configuration

1. `BpmConfigProvider` fetches the settings singleton and the row-colour rule set once per
   `/bpm` mount.
2. It seeds from `sessionStorage` so the second mount in a tab renders coloured immediately
   (`bpm-config-context.tsx:41`).
3. Consumers read settings through the provider; nothing self-fetches.

The reasoning is recorded in the file and is worth preserving: several components on several
pages each need one of these, so a self-fetching hook would issue a request per consumer, and
a module-level cache in the service is worse still — nothing re-renders when it resolves, so a
table paints its fallback and never updates.

**Nothing renders coloured before the rules arrive.** Rows stay plain rather than briefly
wrong, because the colour is a signal people act on and a wrong colour is worse than a missing
one (decision D-rowcolour, recorded as §6.10 of the plan).

### 3.3 Adding a guest, with de-duplication

1. `add-guest-form` searches prospects (`/prospect-search/`) and matches on normalised phone
   as well as email (`/prospect-match/`).
2. A probable match raises `duplicate-prospect-dialog` — "possible duplicate, is this them?" —
   rather than blocking or silently merging.
3. Confirming adds the guest to the occurrence; `POST /occurrences/{id}/guests/`.
4. The backend fires the automatic `INVITE` message on add.

Best-effort is the accepted standard here: the brief said "reduce duplicate entries *if
possible*", so a confirm dialog ships and a true merge tool does not (decision D9).

### 3.4 Checking someone in

1. The occurrence serializer carries `checkin_opens_at`, `checkin_closes_at`, `checkin_open`
   and `checkin_closed`; **the client never re-derives the window.**
   `components/checkin-window.ts` reads them: `checkinWindowState()` checks `checkin_closed`
   first (a closed date also reports `checkin_open === false`), and `canCheckInNow()` is
   *open → everybody, closed → `can_checkin_after_close` only, not yet open → nobody* (D13).
2. `checkin-window-notice` explains either edge — "not yet" or "has closed", worded for a
   manager or not — and the check-in controls are disabled, including Guest Check-In's
   **Add & Check in**, which would otherwise be a way around the gate.
3. Manual check-in calls `checkInGuest` / `checkInAssociate`. The returned row is **patched in
   place** and the stat cards refetch in the background; the table is not reloaded or blanked.
4. A QR scan posts to `/qr/scan/`, which resolves what was scanned; the outcome line names
   whether a guest or an associate was recorded, because the two land on different lists and a
   mis-scan is otherwise invisible until somebody counts. The list then refetches *quietly*.
5. Undo is always available, before, during and after the window.

### 3.5 Sending the event to guests

1. `send-event-modal` picks a channel (email or SMS) and a template.
2. `guest-message-history` shows what has already been sent **for this date, before you
   send** — which is what makes the absence of de-duplication defensible.
3. `POST /occurrences/{id}/send-event-to-guests/` returns a per-guest outcome report.

**Pressing send twice sends twice, on purpose.** Suppressing a repeat would be a guess about
intent; showing the history first lets the sender decide.

### 3.6 Booking a 1-on-1 off a guest row

1. Guest Check-In's row-level **Schedule appointment** and the button inside the blue card open
   the same `matchup` `AppointmentFormModal`, prefilled by `blueCardAppointmentValues()` —
   trainee = the **inviter**, the Step 1 type by slug (D3).
2. The page creates the appointment through `matchupService.createAppointment`, then links it
   with `saveGuestFollowup`, sending the card's current answers back alongside
   `appointment_id`.
3. The backend treats absent card fields as unchanged, and a link alone does not tick
   `blue_card` (`mlm_platform/docs/bpm/API.md` §3). Sending the answers is
   belt-and-braces: linking must never blank a filled card.
4. A failed *create* stays in the form beside Save; a failed *link* closes the form with a
   toast, because the appointment already exists and a second Save would book it twice.

### 3.7 Naming BPM managers

1. `bpm-managers-editor` loads `GET /settings/managers/` and searches with the company-wide
   `searchInviters`, not the team-scoped user search — a manager can sit anywhere.
2. Edits are held until **Save managers**; removal is a real revocation.
3. `PUT /settings/managers/` returns the new list, and the editor invalidates the
   `['bpm', 'capabilities']` prefix so the sidebar re-checks at once — a user who removed
   themselves loses the BPM Settings link without waiting out the cache.

### 3.8 All locations — one date, several occurrences

A multi-location BPM on one date is several occurrences. **All locations** widens the sticky
selection from one of them to all of them, so Guest Invites, Associate Invites and both
check-in pages show the date as one list (D21–D24).

**The scope, in `context/bpm-selection-context.tsx`:**

| Value | What it is |
|---|---|
| `occurrence` | Still one real occurrence — in All mode the **anchor**, the date's first location by `start_at`, then `id`. Everything that needs exactly one (a page not yet opted in, Guest Check-In's window headline) keeps working unchanged |
| `dayOccurrences` (`:313`) | Every location of the anchor's date, **built from all loaded occurrences minus concealed ones — not the `includePast`-filtered `occurrences` list.** A finished date must still cover every location (the check-in pages fix attendance afterwards), and a location that ended earlier must not drop out mid-evening. "Same date" is the date *at the event* (`occurrence-date.ts`, the occurrence's own timezone), so an evening BPM does not split in two for a viewer abroad |
| `allLocations` (`:329`) | `allPreferred && dayOccurrences.length > 1` — a stored preference is ignored on a date with one location |
| `scopeOccurrences` / `scopeIds` | `dayOccurrences` in All mode, else `[occurrence]`. What every list covers |

The preference persists like the rest of the selection: `allLocations` in the
`sessionStorage` blob `wb.bpm.selection`, and `all=1` in the URL beside `event=` and
`occurrence=`. A deep link carries it too (`bpmSubToolPath(…, allLocations)`), and the URL wins
on first load as before. `selectEvent` and `selectOccurrence` leave All mode.

**The anchor is resolved synchronously.** `selectAllLocations(id)` finds the date's first
location itself and sets `occurrence` in the same update as the preference; `selectBoth` does the
same for calendar deep links. Resolving it later, in the effect, would leave one render in which
the *previous* date's anchor meets the new All preference, and every page would fire a union
request for the wrong date.

**Reads are scope-aware; writes are per row.** Three service methods take `scopeIds`:
`guestsForScope`, `associateCheckinsForScope`, `checkinStatsForScope`
(`services/bpm-service.ts:498`, `:597`, `:673`). **One id takes the per-occurrence endpoint**, so
a single-location screen sends exactly what it always did; **several take the collection
endpoint** (`occurrences/guests/?ids=` and friends, [API.md](API.md)). Associate Invites sends
`occurrences=` instead of `occurrence=`. Every union row carries its own `occurrence` and
`occurrence_label`, and **a row mutates through its own occurrence** — check-in, undo, Z, flags,
transfer, notes, booking — never the anchor's. Send-event splits the recipients by
`guest.occurrence` and sends once per location, merging the reports.

**Something new lands on one location, chosen once.** Adding a guest, checking in somebody
not on the list and showing a QR code each need exactly one occurrence. `useScopeLocation()`
supplies it: sticky **per BPM, by location id** (`BPMEventLocation`, not occurrence id, so the
choice carries to the BPM's next date) in `localStorage` `wb.bpm.lastLocation.<eventId>`,
defaulting to the date's first location, and always one of `scopeOccurrences`.
`ScopeLocationSelect` renders it and renders nothing with fewer than two choices. The QR dialog
reads and writes the same choice (D24).

**Associate invites are to the date** (D21). In All mode one row per associate reads a flag
as set if set at any location; an edit goes to `row.invite_occurrence ?? scopeIds[0]`, and
carries `scope_occurrence_ids: scopeIds` so an untick clears the flag everywhere it is set —
without it, a flag held at two locations could never be cleared from this list.

**People count once** (D22). The ranking cards read the union stats, which deduplicate. Guest
Check-In's three counters are computed from the loaded guest list by prospect
(`guestCountCards`), because the stats' guest `totals` count distinct *inviters*. Associate
Check-In reports a person already in at another location rather than checking them in twice.
The lists themselves are **not** merged: a guest listed in the room and on Zoom is two rows.

## 4. Server state and caching

**BPM's pages do not use React Query.** Server state lives in the two contexts and in
per-page `useState`, loaded by `useEffect`. The one exception is the capabilities read the
**sidebar** makes — BPM's first React Query use:

| State | Held by | Refreshed |
|---|---|---|
| Event list, occurrences, selected occurrence | `BpmSelectionProvider` | on selection change; explicit reload after a mutation |
| Settings, row-colour rules | `BpmConfigProvider` | once per `/bpm` mount, seeded from `sessionStorage`; `refresh()` after a Settings save |
| Capabilities, for the sidebar | React Query, `useBpmCapabilities()` | key `['bpm', 'capabilities', userId]`, `staleTime` 5 min, `retry: false`, `signal` forwarded (`hooks/use-bpm-capabilities.ts:19`); invalidated by prefix after a managers save |
| Capabilities, for a page | the page | on mount, via `bpmService.capabilities()` with no signal |
| Guests, invites, stats, messages | the page | on mount; after a mutation, the returned row is patched in or the list refetched quietly |

The capabilities key carries the user id so that signing in as somebody else in the same tab
never shows the previous user's grants. `retry: false` because a refusal is an answer, not a
blip; the sidebar reads "no data" as "no capability", so the Settings link never flashes in and
out. The pages still fetch their own copy: they need it fresh after a grant changes and they
predate the hook.

**Stale responses are guarded by hand.** With no query keys, each list page keeps a request
counter in a ref (`latestLoadRef`, `loadRequest`, `latestWrite`) and drops a response that is
no longer the newest, so a slow load for the previous date cannot paint over the current one.
A *quiet* reload keeps the table on screen; only a change of date shows the loading state.

Since All locations the guards are **keyed on the scope as a string, `scopeIds.join(',')`**
(`scopeKey`), not on the anchor and not on the array. The anchor does not change when the user
switches between one location and All on the same date, so an anchor-keyed guard would let the
single-location response paint over the union; and the array is rebuilt on every occurrence
refetch, so an array-keyed effect would blank and reload an unchanged scope. Mutations capture
the key at start and drop their response if the scope has moved (`patchRecords` on Associate
Check-In, `scopeKeyRef` on Associate Invites). Filters, including the Location filter, reset on a
change of scope.

The consequences are real and worth stating plainly: there is no cache shared between
sub-tools beyond the two contexts, no automatic refetch, no request cancellation, and a
mutation refreshes only what its own page chose to reload. This is the largest module in the
app and the only substantial one outside the platform's React Query convention
([platform §4](../platform/ARCHITECTURE.md#4-server-state-and-caching)). Recorded in
[PHASES.md §5](PHASES.md#5-outstanding) rather than presented as a pattern to copy.

`sessionStorage` is used twice, for the same reason each time — to make the second mount in a
tab render immediately: `wb.bpm.rowColorRules` and the persisted selection (`wb.bpm.selection`,
which includes the All-locations preference).
`localStorage` is used twice, each a per-device convenience: `wb.bpm.lastCollectedBy`
(`follow-up-guest-modal.tsx:72`) and `wb.bpm.lastLocation.<eventId>`, the location id a new
guest, check-in or QR code lands on in All-locations mode (`hooks/use-scope-location.ts`).

## 5. Local and URL state

| State | Owner | Lives in |
|---|---|---|
| Selected event, occurrence, `includePast`, All-locations preference | `BpmSelectionProvider` | context + `sessionStorage`; `?event=&occurrence=` and `all=1` in the URL |
| Where a new guest / check-in / QR lands (All mode) | `useScopeLocation()` | `localStorage` `wb.bpm.lastLocation.<eventId>`, a location id |
| Location filter (Guest Invites, both check-in pages) | the page | `useState`; offered only in All mode, reset on a change of scope |
| Sub-tool | the URL | the nested route path |
| Public pass token | the URL | `/bpm/pass/:token` |
| Filters, sorts, pagination | each page | `useState` — sorting on Guest Invites and Associate Check-In is client-side over the full list |
| Pills: Guest Invites All/Not Confirmed/Confirmed; Guest Check-In attendance and All/Live/Zoom | the page | `useState`; person selects reset on a change of date |
| Rows with a save in flight | Guest Invites, Associate Invites | a `Set` of ids — per row, because C/Z cascade |
| Last "Collected by" | `follow-up-guest-modal` | `localStorage` `wb.bpm.lastCollectedBy` |
| Modal open/target | the page that owns the modal | `useState` |

`bpmSubToolPath()` (`bpm-selection-context.tsx:476`) builds a sub-tool link that preserves the
selection (including `all=1` when asked), so navigation between tools is a route change and not a re-selection.

## 6. Permissions and gating

`GET /api/bpm/events/capabilities/` returns one payload driving every control
(`types.ts:532`):

| Flag | Backend permission | Gates |
|---|---|---|
| `can_read` | `bpm:read` | the module at all |
| `can_create` / `can_update` / `can_delete` | `bpm:create` / `bpm:update` / `bpm:delete` | Create BPM (Overview and Schedule), Edit, and — with `can_manage_schedule` — both delete controls |
| `can_manage_guests` | `bpm_guests:manage` | every mutating control on Guest Invites: add, send, select, C/Z/outcomes, transfer, reschedule, book, remove |
| `can_manage_templates` | `bpm_templates:manage` | the interest-options catalog admin |
| `can_manage_schedule` | `bpm_schedule:manage` | the status control in BPM Schedule, and both delete controls |
| `can_manage_settings` | `bpm_settings:manage` | BPM Settings, deleted-item recovery, **and the sidebar link** |
| `can_checkin_after_close` | `bpm_settings:manage` | checking in after the window has closed (D13) |

**Deleting needs two flags in Schedule.** Deleting — a date through the status control's
*Deleted* option, or a whole series through **Delete BPM** — is a status change, and the status
endpoints demand `bpm_schedule:manage`. So `canDelete = can_delete && can_manage_schedule`
(`pages/bpm-schedule-page.tsx:130`); `bpm:delete` alone would be offered a button that 403s.

**The BPM Settings sidebar link is dropped** by `getMenuForUser(…, canManageBpmSettings)`
(`src/config/menu.ts`) unless `useBpmCapabilities()` reports `can_manage_settings`. Every plan
still lists the link; it is removed per user. The page re-checks on its own.

**Guest Invites without `can_manage_guests` is read-only, not hidden.** C and Z stay visible
and disabled — they are facts worth reading. Granting the permission to Leader, Broker, Senior
Broker and Admin is an **access-console task** (D10), not a code change.

There is **no route guard** on `/bpm` — the nested tree is wrapped in the two providers, not a
capability guard. Controls are hidden per capability instead, and the backend enforces each
independently. A user without `can_read` reaches the route and sees nothing useful.

Two gates behave differently by design (decision D11):

- **Attachment *view* is a real gate.** The serializer omits `href` entirely when off, so the
  URL never reaches the client.
- **Attachment *download* is a UI gate only.** It hides the control; the Firebase CDN URL
  stays reachable to anyone who opens devtools. Accepted as the trade for zero egress cost.

Do not "fix" the second one into a real gate without reading D11 — the egress cost was the
driver.

## 7. Integration points

- **`bpm` backend** — 61 path templates ([API.md](API.md)), three of them the All-locations
  collection reads.
- **`matchup`** — `GET /api/matchup/google/status/` to report calendar connection, the
  OAuth start alias, and `DELETE` on the status path to disconnect. BPM never manages the connection itself; that is
  [calendar-sync](../calendar-sync/).
- **`matchup`, as a destination** — `rescheduleGuestToAppointment` hands a guest across into an
  appointment, and Guest Check-In books one through `matchup`'s `AppointmentFormModal`
  (§3.6). That modal's secondary writes — the contact's profile flags and the note — are now
  **non-fatal**: both write to the *contact's* records, which a door worker booking for
  another shop's guest may not be scoped to, and before the fix the bare 403 escaped the
  handler so Save silently did nothing. The appointment saves, a warning toast names what was
  skipped, and a real error is rendered beside Save (`matchup/components/appointment-form-modal.tsx`).
- **`team`, person details** — `team/components/user-details-link.tsx` opens the read-only
  `ProspectDetailsModal` (D4) fed from `bpmService.person` → `GET /api/bpm/people/{id}/`
  rather than the team-scoped `/api/accounts/users/{id}/` (D15). Same payload shape; titled
  "Details" because it opens associates too. Match Up still opens the modal on the accounts
  endpoint.
- **`team`, Associate Tracker** — a read-only **Training date** column
  (`associate-tracker-columns.tsx`) shows `training_date`, which the backend sets when an
  associate is checked in at a BPM and clears on undo. BPM sends nothing for it.
- **`events`** — `checkin-camera-scanner.tsx` is shared with the scan panel; its viewfinder is
  now orientation-aware (3:4 portrait, 4:3 landscape, height-capped), so the change reaches
  both desks.
- **`team`** — prospects are searched and matched, never created here.
- **`gms`** — `gms-targets.ts` declares this module's guidance targets, emitted into a build
  manifest by `vite-plugin-gms-manifest.ts`.
- **`shared/components/row-colors`** — the rule engine. BPM is currently its only consumer;
  the module is in `shared/` and takes arbitrary `condition_key`s so the trackers can adopt it.

## 8. Invariants and failure modes

| Invariant | Enforced by | Breaks as |
|---|---|---|
| **A rule that hides a row from a list must never hide it from detail lookup** | backend `get_object` lifts status concealment | a cancelled date that cannot be restored, and a hidden BPM that cannot be unhidden — a one-way trap |
| Status precedence is occurrence → event → derived | backend `effective_status` | two screens disagreeing about whether a meeting is live |
| A BPM on a day may be several occurrences | callers group by event (`groupByEvent` in the calendar day modal); the All-locations mode is the one deliberate union — a list of rows, each labelled with its location, over counts that dedupe by person (D22) | the same meeting listed three times, and attendance counted three times |
| All-locations scope is built from every non-concealed occurrence of the date, not the `includePast` list | `dayOccurrences` reads `allOccurrences` | a finished date, or a location that ended earlier, silently dropping out of the union |
| The All-mode anchor is the date's first location and is set in the same update as the preference | `selectAllLocations` / `selectBoth` resolve `occurrence` synchronously | one render pairing the old date's anchor with All, and a union request for the wrong date |
| One scope id → per-occurrence endpoint; several → collection endpoint | the `…ForScope` service methods; `occurrence=` vs `occurrences=` on Associate Invites | a single-location screen's requests changing shape for no reason |
| A row mutates through its own occurrence | `guest.occurrence` / `record.occurrence` / `row.invite_occurrence`; send-event splits by occurrence | a guest checked in, messaged or noted at the anchor's location instead of their own |
| Something new lands on the one chosen location | `useScopeLocation()`, shared by Add to location, Check in at and the QR dialog | a greeter at the Zoom desk adding people to the room's list |
| An All-mode untick clears the flag at every location holding it | `scope_occurrence_ids: scopeIds` on `set-flags` (D21) | a flag read as "set anywhere" that can never be cleared from the list |
| A response for a scope the user has left is dropped | guards keyed on `scopeIds.join(',')` | the single-location list painted over the union on the same date, or the reverse |
| Guest Check-In's counters count people, not rows or inviters | `guestCountCards()` dedupes the list by prospect | "Guests Invited" showing the number of inviters, or a room-and-Zoom guest counted twice |
| The client never re-derives the check-in window | `checkin_open` / `checkin_closed` / `checkin_opens_at` / `checkin_closes_at` on the serializer, read by `checkin-window.ts` | one rule on both sides of the wire, drifting |
| After the window closes, only a BPM manager checks in (D13) | backend `_require_checkin_window`, a **separate** gate; `canCheckInNow()` mirrors it for rendering | attendance, which feeds public rankings, addable by anybody days later |
| `checkin_closed` is tested before `checkin_open` | `checkinWindowState()` | a closed date explained as "not open yet" |
| Undo is ungated | no gate on undo | a mistake stranded permanently |
| Z needs C; Associate Invites' C needs Invited (D18) | server cascade; `setFlag` mirrors it optimistically and holds the row until the save lands | a Z ticked during a C round-trip undone by the C response |
| Linking an appointment never blanks a blue card | backend treats absent card fields as unchanged; the client also re-sends them | a filled card wiped by a row-level booking |
| A response for a date the user has left is dropped | per-page request counters | the previous date's guests painted over the current one |
| A guest pass is a different token from an associate identity code | `BPMGuest.pass_qr_token` vs `User.bpm_qr_token` | an associate badge emailed to a stranger, live from the day they join |
| The public pass page sends no auth header | a separate `public-bpm-service` | a guest link that only works for signed-in staff |
| Nothing renders coloured before the rules load | rows stay plain | a row briefly showing the *wrong* signal colour |

**The invariant at the top is the one most likely to recur.** It was the same bug twice: when
`HIDDEN`/`CANCELLED`/`DELETED` were first filtered out, they were filtered out of *everything*,
so the state became a one-way trap and only the tests caught it. **If you add any new
"hide from lists" rule, write the un-hide test first.**

**Two notions of "an invited associate".** The event roster and `BPMAssociateInvite` (per date)
are different things, and the per-date record wins — it is what Associate Invites counts and
what the `inviter` ranking dimension uses. There is deliberately no fallback to the roster.

**The check-in window trap.** Server-side, `workflow.can_check_in` short-circuits to `True` on
its first line, so a window check written inside it is unreachable code that reads fine in
review and never runs. The window is a separate function called *before* the permission check.
If you are adding a gate on the backend, do not put it in `can_check_in`.

**The stale comments are fixed.** `types.ts:729`, `:736` and `:738` now describe
`qr_host_to_guest` and the two guest-send switches as shipped (D5, D8 reopened after Phase 8).
