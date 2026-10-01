# BPM — Phase History

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

> Phase numbering and the `D` decision prefix come from `mlm_platform/BPM_V2_PLAN.md` (phases
> 0–8 plus post-8 work) and **must not be renumbered** — the same number means the same thing in
> both repos. That plan is 152 KB and remains the fullest record; this file documents what the
> **frontend** shipped and what a reader here needs to know before changing it.
>
> All eleven original decisions were settled on 2026-09-24 and shipped on 2026-09-25. D12 was
> added later as an accepted risk. Two decisions — D5 and D8 — were **reopened and shipped after
> Phase 8**. D13–D16 are the backend's October decisions, recorded under the same numbers;
> D17–D20 were made on the frontend alone and take the next free numbers. D21–D22 are the
> backend's All-locations decisions, again under the same numbers; D23–D24 are frontend-only.

## 1. Timeline

| Phase | Status | Shipped |
|---|---|---|
| 0 | Shipped | Foundations — no feature code |
| 1 | Shipped | Sticky selection, navigation, layout |
| 2 | Shipped | Event lifecycle: statuses, soft delete, attachments |
| 3 | Shipped | BPM Overview rework |
| 4 | Shipped | Guest Invites (was View Invites) |
| 5 | Shipped | Check-in upgrades, and the four ranking dimensions |
| 6 | Shipped | Associate Invites — a new sub-tool |
| 7 | Shipped | BPM General Settings |
| 8 | Shipped | QR — identity, occurrence and scan |
| post-8 | Shipped | D5's sender, D8's guest pass, guest QR on Guest Check-In, Associate Invites date range |
| Oct | **Uncommitted** (2026-10-01) | Zoom marks, the window closes, BPM managers, person details, deleted dates, stat card colours, Top Direct, Guest Invites and check-in rework, the event-code poster, All locations |

## 2. Phases

### Phase 1 — sticky selection

**Goal.** Stop making the user choose the same meeting on every screen.

**What shipped.** `BpmSelectionProvider` holding the event, occurrence and `includePast`,
persisted to `sessionStorage`; `bpmSubToolPath()` for links that preserve it; the nested route
tree so all eight sub-tools sit under one provider.

**Why.** Each page previously held its own `useState`, and the two-step picker refetched and
reset on every navigation (`bpm-selection-context.tsx:21`).

### Phase 2 — event lifecycle

**What shipped.** `status_override` on both event and occurrence with occurrence → event →
derived precedence; soft delete with recovery; attachments.

**Decisions.** D1, D2.

**The bug this phase created and fixed.** Filtering `HIDDEN`/`CANCELLED`/`DELETED` out of
*everything* made the states a one-way trap — a cancelled date could not be restored. Detail
lookup now lifts status concealment. This is the invariant in
[ARCHITECTURE.md §8](ARCHITECTURE.md#8-invariants-and-failure-modes) and it has been broken
twice.

### Phase 3 — Overview rework

**What shipped.** The month calendar with a day modal that **groups by event**, summing guests
and associates across locations and turning location into a dropdown. Stat cards and the
Guest/Associate tabs were removed per the brief.

### Phase 4 — Guest Invites

**What shipped.** The guest list with invite outcomes, notes, follow-ups and interest options;
transfer and reschedule; normalised-phone duplicate matching with a confirm dialog.

**Decisions.** D3, D4, D9.

### Phase 5 — check-in upgrades

**What shipped.** Check-in stat cards and the four ranking dimensions (`inviter`, `leader`,
`md`, `smd`).

**The choice that had to be made consciously.** A leaderboard counting "attendance at this BPM"
had to decide whether that means one occurrence or every location that day. It means **one
occurrence**. Anything new that counts attendance must make the same choice deliberately.
*Extended, not reversed, by D22*: an explicit All-locations request counts the date's
locations together, each person once.

### Phase 6 — Associate Invites

**What shipped.** `BPMAssociateInvite` per date, replacing the event roster as the meaning of
"invited"; `invited_by` giving the associate audience an `inviter` ranking; the Invited
Associates panel placed **on the page** rather than behind a click.

**Divergence.** Both audiences now carry all four dimensions, but Associate Check-In still
*renders* only Top SMD and Top MD, because the row is shared with the two counters. *Superseded in the October update* — it now renders SMD, MD, Leader and Direct.

### Phase 7 — BPM General Settings

**What shipped.** The settings singleton and its UI: the check-in window, three QR switches, the
two attachment gates, the two guest-send switches, offices, interest options, row-colour rules,
and deleted-item recovery. Row colours moved from a client constant into the database
(`bpm/0020`).

**Decisions.** D5 (switches only, at the time), D8 (switch disabled), D11.

### Phase 8 — QR

**What shipped.** `User.bpm_qr_token` and `BPMOccurrence.checkin_qr_token` as nullable unique
UUIDs minted on demand; `POST /qr/regenerate/`; the scan panel using native `BarcodeDetector`
with `@zxing/browser` lazy-loaded as fallback.

**Decisions.** D6, D7.

**What the fallback turned out to be.** Not optional but load-bearing: the events desk survives
a missing `BarcodeDetector` because somebody can type a ticket number, and a BPM guest has no
number to type. Putting zxing behind the existing scanner gave the events desk iOS support too.

### post-Phase 8 — the two reopened decisions

**D5's sender.** `bpm/services/messaging.py` and
`POST /occurrences/{id}/send-event-to-guests/`, with `BPMGuestMessage` history and the
`send-event-modal`. Both guest-send switches now gate something.

**D8's guest pass.** Reopened because D5 removed its blocker — there *is* now a message to
guests, so the brief's "if/when we have an email with a QR code" condition was met. The Phase 8
note predicted one branch in the resolver and no schema change; **it was wrong on both
counts.** Guests got their own `BPMGuest.pass_qr_token` (migration `0024`) rather than the
prospect's `bpm_qr_token`, because a pass is *given away* and an associate identity code must
not be, and because a guest is checked in by a different code path. The switch still defaults
**off**.

**Also shipped:** guest QR check-in on the Guest Check-In page, with the outcome line naming
whether a guest or an associate was recorded; and a date-range filter on Associate Invites.

### Oct — the October update (`feature/bpm-updates-oct`)

**Status.** Uncommitted on both sides at 2026-10-01, on top of `1335eca` here and `669da0d` in
`mlm_platform`. Coupled; needs backend migrations `bpm/0026` and `tracker/0053`.

**Goal.** A round of product feedback across every sub-tool, built against a frontend contract
written with the backend at the same time.

**What shipped.**

- **Overview** — one calendar chip per BPM; a ~90%-wide, phone-friendly day modal in BPM's first
  stylesheet (`bpm-month-calendar.css`, `wb-bpm-`); the paperclip replaced by the BPM's
  underlined name (`bpm-title-link.tsx`), a link only with attachments and `attachments_view`.
- **Navigation** — Guest Check-In before Associate Check-In; the BPM Settings link hidden without
  `can_manage_settings` through `useBpmCapabilities()` — BPM's first React Query use (D20).
- **Schedule** — Create / Edit / Delete on their own capabilities; status and both deletes also
  need `can_manage_schedule`; **Delete BPM** at the event level.
- **Settings** — the window closes as well as opens (D13); **BPM managers** (D14); **stat card
  colours**; **Deleted dates** with restore; the row-colour editor's condition-key select and
  "Show condition key" preview; American spelling in UI copy.
- **Guest Invites** — sortable columns, a Contact column, Leader / MD / SMD, confirmation pills and
  people selects with a row count, **C** and **Z** (D17, D18), a card layout under `lg` and a
  pinned Actions column, every mutating control on `can_manage_guests`, rows patched in place
  with a per-row saving guard.
- **Associate Invites** — C and Z after Invited, with the cascade.
- **Guest Check-In** — counter cards, configured card colours, upline columns in the ranking
  modal, an Inviter filter, the All / Live / Zoom pills (D19), the attended **Z**, row-level
  **Schedule appointment**, **Show pass** removed (`guest-pass-modal` deleted), QR moved to the
  picker, the blue card solid only with content, Collected-by defaults, no full-table reloads.
- **Associate Check-In** — Top Leader and **Top Direct** (D16), the invited panel listing only
  who is still expected, an MD column, 4X4 renamed **Mission**, **Z**, client sort and filter,
  Refresh, a row count, no blanking reloads.
- **QR** — the event code became a full-screen poster (`bpm-event-code-display.tsx`) from the
  reference image IMG_0387; My QR Code shows name and agency code large; the shared camera
  viewfinder follows orientation.
- **Person details** — every BPM name opens details from `people/{id}/` (D15).
- **Outside the module** — `matchup`'s appointment form stops a failed secondary write from
  blocking Save; `team`'s Associate Tracker gains a read-only Training date column.
- **The stale `types.ts` comments** on D5 and D8 were fixed.

**Backend changes the frontend relies on.** `save-guest-followup` leaves absent card fields
unchanged, and an `appointment_id` alone links an appointment **without** ticking `blue_card` —
which is what lets a row-level booking link without wiping or faking a card. Restoring a deleted
date through `set-status` needs only `bpm_settings:manage`, which the Settings list can assume.
The stats cache key was versioned so no pre-`direct` payload is served.

**Divergence.** Phase 6's note that Associate Check-In renders only Top SMD and Top MD is
superseded: it renders SMD, MD, Leader and Direct. `inviter` is still left off.

#### All locations

**Goal.** Work one date of a multi-location BPM — a room and Zoom, say — as one list, instead
of choosing each location in turn. Requested in the October brief; listed as not built until
this round.

**What shipped.**

- **Selection** — `allLocations`, `dayOccurrences`, `scopeOccurrences` and `scopeIds` on
  `BpmSelectionProvider`; the anchor `occurrence` is the date's first location; persisted in
  `wb.bpm.selection` and as `all=1` in the URL; `selectAllLocations`, and `selectBoth` /
  `bpmSubToolPath` taking the flag ([ARCHITECTURE.md §3.8](ARCHITECTURE.md#38-all-locations--one-date-several-occurrences)).
- **Pickers** — "<date> · All locations (N)" first for every multi-location date, and the
  selected date's locations always offered even when past; **All locations** first and default
  in the Overview day modal, without a count (D23).
- **Reads** — `guestsForScope`, `associateCheckinsForScope`, `checkinStatsForScope` (one id →
  per-occurrence path, several → the collection endpoint); `associateInvites({occurrences})`.
- **Lists** — Location columns and filters on Guest Invites, Guest Check-In and Associate
  Check-In; a Location column on Associate Invites, one row per associate (D21). Union rows stay
  one per location; every row action uses the row's own occurrence.
- **New things** — `useScopeLocation()` and `ScopeLocationSelect`: "Add to location" on Guest
  Invites, Add Guest, the Add Guest modal and Guest Check-In, "Check in at" on Associate
  Check-In, and a Location select in the QR dialog tied to the same sticky choice (D24).
- **Check-in** — per-row window gating; Associate Check-In refuses a second check-in at another
  location; Guest Check-In's counters computed from the list, deduplicated by prospect (D22).
- **Send** — split per location, one request each, with a merged report and failed locations
  named.
- **Associate Invites writes** — to `invite_occurrence`, else the first location, with
  `scope_occurrence_ids` so an untick clears everywhere (D21).
- **Stale-response guards** re-keyed on `scopeIds.join(',')`.

**Backend it relies on.** The three `?ids=` collection actions, `associate-invites/?occurrences=`,
`scope_occurrence_ids` on `set-flags`, and the new label fields — `mlm_platform/docs/bpm/API.md`
§3 "All locations". No migration; stats cache key `v3`.

**Open.** The brief's sentence beginning "We may be scanning multiple…" was never answered or
clarified. This round reads it no further than D24 — one scanner, pointed at one chosen location
— and nothing here scans into several locations at once. Revisit if the answer says otherwise.

## 3. Decision log

D1–D12 summarised from `BPM_V2_PLAN.md` §2, all shipped. D13–D16 are the backend's, from
`mlm_platform/docs/bpm/PHASES.md` §3, with the frontend's side of each. D17–D20 are frontend
decisions. D21–D22 are the backend's All-locations decisions, likewise; D23–D24 are frontend
decisions. D13–D24 are uncommitted.

| ID | Decision | Rationale |
|---|---|---|
| D1 | Only `DELETED` tears down participants' Google Calendar events; Hidden/Cancelled/Archived leave them | Cancelling a date should not silently wipe everyone's calendar. **Forward-only — historical `CANCELLED` dates are left as they are. Do not repair.** |
| D2 | `status_override` on **both** event and occurrence; precedence occurrence → event → derived | A whole series and a single date need to be suppressible independently |
| D3 | "Step 1 appointment" is an appointment **type**, not a new field | The existing form already renders every `AppointmentType` as a checkbox; a `step` field would duplicate it |
| D4 | Promote the read-only `ProspectDetailsModal` for guests, inviters and associates | `TrackerUserProfileModal` is editable and can terminate a user — wrong tool for a guest list |
| D5 | The brief asked for the **switches**, not a sender | Re-reading the brief settled it. **Reopened on request and shipped after Phase 8** — both switches now drive a real sender |
| D6 | Permanent per-user QR token, not rotating | Ship the simple thing; escalate on evidence. A dedicated opaque `qr_token` keeps a later swap to a rotating code local to the resolver and the render. **Watch:** check-in counts feed public rankings, so inflated attendance is the abuse vector, not account compromise |
| D7 | Native `BarcodeDetector`, `@zxing/browser` as lazy fallback | `qrcode` only generates. Scanning needs HTTPS and iOS webviews are unreliable, so the fallback matters |
| D8 | Host → Guest QR out of scope while the brief's condition was unmet | **Reopened and shipped after Phase 8** once D5 gave a guest something to be sent. Guests got their own token; the switch still defaults off |
| D9 | Duplicate reduction is best-effort: phone matching plus a confirm | The brief said "if possible". A true merge tool stays out of scope |
| D10 | Role permissions are granted in the access console, never in a migration | Standing convention |
| D11 | Attachment **view** is a real gate; **download** is a UI gate only | View omits `href` entirely. Download hides a control and the CDN URL stays reachable — accepted as the trade for zero egress cost, since the Firebase download-token URL needs no re-signing |
| D12 | SMS to guests ships with **no consent gate** | There is no consent field, no STOP handling and no opt-out anywhere in the platform. Handing over a number at a BPM is treated as consent. Raised as a risk and accepted; `messaging._send_sms` is where a gate would go. Email has SendGrid's unsubscribe handling |
| D13 | **The check-in window closes** `checkin_close_hours` after the end (default 4); after that only a BPM manager (`can_checkin_after_close`) may check in; undo stays ungated. Supersedes the plan's §6.11 "opens and never closes" | Chosen over "never closes" because attendance feeds public rankings and should stop being addable by anybody days later; the corrections §6.11 protected survive as hours of grace, then a manager. Frontend: `checkin-window.ts` reads `checkin_closed` before `checkin_open`; the notice has a manager wording. A scan closes at the same instant with **no** bypass. Source: `mlm_platform/docs/bpm/PHASES.md` D13 |
| D14 | **Settings access = BPM managers**, named in BPM Settings and stored as per-user `authz` GRANTs of the five BPM permissions | Chosen over a BPM table or a role: the console already shows and revokes overrides, and they are audited. Consistent with D10, which forbids *role* grants in migrations. Frontend: `bpm-managers-editor` searches company-wide, holds edits until Save, and invalidates the sidebar's capabilities. Source: `mlm_platform/docs/bpm/PHASES.md` D14 |
| D15 | **Full read-only person details for BPM users**, about anybody a BPM screen can show, from `GET /api/bpm/people/{id}/` | The team-scoped accounts endpoint 404'd for guests of other shops and associates at shared BPMs — most of the names people click. **Revises D4's surface, not D4**: still the read-only `ProspectDetailsModal`, now fed from the BPM endpoint via a `load` prop and titled "Details"; Match Up keeps the accounts endpoint. Source: `mlm_platform/docs/bpm/PHASES.md` D15; `team/components/user-details-link.tsx` |
| D16 | **Top Direct is associate-only**, grouping by `User.recruited_by` | A guest's recruiter is the inviter, so on the guest audience it would duplicate Top Inviter. Frontend: `ASSOCIATE_DIMENSIONS` gains `leader` and `direct`. Source: `mlm_platform/docs/bpm/PHASES.md` D16 |
| D17 | **Two Zoom marks everywhere — expected and attended.** Guests: `zoom` (Guest Invites' Z) and `attended_zoom` (Guest Check-In's Z, read as `attended_zoom ?? zoom`). Associates: the invite's `zoom`, then `AssociateCheckIn.zoom` | Chosen over one field that the door overwrites, which would erase what was promised the night before and make "said Zoom, came live" invisible. Check-In writes only `attended_zoom`. Source: product answer, October brief; `types.ts` `GuestFlagField` |
| D18 | **C/Z cascade.** Z needs C; on Associate Invites C needs Invited. Un-ticking clears everything downstream, server-side and optimistically; a row is held while its save is in flight | Chosen over independent flags, which would allow "on Zoom but not confirmed". Per-row, not per-box, saving because a cascade response rewrites several boxes and would undo a tick made meanwhile. Source: product answer, October brief; `pages/associate-invites-page.tsx` `FLAG_DEPENDENTS` |
| D19 | **"All Live, Zoom" is a second, independent All / Live / Zoom pill group** on Guest Check-In, combining with the attendance pills | **An assumption**: the request was not answered. Chosen over folding Live and Zoom into the attendance pills, which would make "Checked In and on Zoom" unaskable. Each group's counts are taken with the other applied. Revisit if the answer differs. Source: `pages/guest-checkin-page.tsx` `ZOOM_FILTERS` |
| D20 | **The sidebar reads capabilities through React Query** (`hooks/use-bpm-capabilities.ts`, key `['bpm','capabilities', userId]`); the pages keep their own fetch | The sidebar renders on every screen and needs a shared, cancellable, cached read; migrating the pages at the same time was out of scope. Keyed by user so a second sign-in in one tab never shows the first user's grants. First step on [§5](#5-outstanding) item 2, not a pattern change for the pages. Source: the hook's header comment |
| D21 | **An associate invite is to the *date*.** In All-locations mode Associate Invites shows one row per associate; a flag reads as set if set at any of the date's locations. An edit goes to `invite_occurrence` (where the invite is stored), else the date's first location — the frontend picks the `occurrence_id` — and carries `scope_occurrence_ids`, so an untick and its cascade clear the flag at every location holding it. Ticks never create rows elsewhere | Chosen over one row per location, which would ask a leader to invite the same person twice for one evening. The scope clear was added in review: a flag unioned as "any" could otherwise never be unticked from All mode once two locations held it. No migration. Frontend: `associate-invites-page.tsx` `setFlag`; the Invited Associates panel reads the date the same way. Source: `mlm_platform/docs/bpm/PHASES.md` D21 |
| D22 | **A person counts once across a date's locations.** Associates by user, guests by prospect; totals and every ranking use the deduplicated population. **Lists stay unions of rows** | Extends Phase 5's "one occurrence" rather than reversing it: on one occurrence nothing changes, and the union is an explicit, separate request. Frontend: the cards read `checkinStatsForScope`; Guest Check-In's three counters dedupe the list by prospect (`guestCountCards`) because the stats' guest totals count distinct inviters; Associate Check-In refuses a second check-in at another location. Source: `mlm_platform/docs/bpm/PHASES.md` D22 |
| D23 | **All locations is the first choice, and the default where it is offered** — first for each multi-location date in the picker ("<date> · All locations (N)"), first and default in the Overview day modal's location select (no count there). Offered only for a date with more than one location | The brief asked for a date to be worked as one list; a location-by-location default would make the request's main case the long way round. The day modal shows no count because its list may be narrowed by the Overview filters while the sub-tool scopes every location. Picking one location still works exactly as before. **Product answer, 2026-10-01** — the recommended default was accepted. Source: All-locations brief and that answer; `bpm-occurrence-picker.tsx`, `bpm-month-calendar.tsx`, `occurrence-row-actions.tsx` |
| D24 | **A new thing lands on one chosen location, sticky per BPM, and the QR dialog asks which** — `useScopeLocation()`, stored by *location* id in `localStorage` `wb.bpm.lastLocation.<eventId>`, shared by "Add to location", "Check in at" and the QR dialog's Location select, which defaults to and writes back to the page's choice | A code and an identity scan belong to one occurrence, and a greeter stands at one door all night: asking once and remembering beats asking on every add. One shared choice, not one per control, so the QR shown and the check-ins taken cannot point at different locations. Location id, not occurrence id, so the choice carries to the BPM's next date. QR asking which location was the recommended option, **accepted 2026-10-01**; the sentence "We may be scanning multiple…" is still unanswered and may refine it (§2 Oct, All locations). Source: `hooks/use-scope-location.ts`, `bpm-qr-modal.tsx` |

## 4. Deliberately not built

- **A true duplicate-merge tool.** D9.
- **Rotating or short-lived QR tokens.** D6.
- **A manager bypass for scans after close.** D13: only a button has one.
- ~~**An "All Locations" mode**~~ — **shipped** in the October update (§2 Oct, All locations;
  D21–D24). What stays unbuilt is **merging** union rows: a guest on two locations' lists is
  two rows, by design (D22), and there is no All mode for a transfer or reschedule
  destination.
- **Reissuing somebody else's code.** It would be the start of an account-recovery surface.
  Reissue is self-service.
- **QR codes encoding a URL.** They encode the bare token, because a code a stranger's camera
  can act on is a code a *photograph of the room's screen* can act on. The resolver accepts a
  URL anyway, so adding one later is a client change only.
- **Rate limiting on `/qr/scan/`.** Nothing in the platform is rate-limited, and the bound that
  matters here is temporal — a scan is refused once the date has ended. A door sees one request
  per person.
- **A per-BPM check-in window override.** Platform-wide only, which is what the brief asks for —
  for the closing edge as much as the opening one.
- **Showing a guest their pass at the door.** Removed with `guest-pass-modal` in the October
  update; the guest has it by email. `bpmService.guestPass` is left without a caller.
- **De-duplicating a send.** Pressing twice sends twice; the history is shown *before* you
  send, which is what makes that defensible rather than a trap.
- **Scheduled or automatic reminders.** `BPMEmailStage` has `DAY_BEFORE` and `POST_EVENT`
  values that nothing fires on a timer; only `INVITE` is automatic, on `add_guest`. Celery beat
  is already in the stack for it.
- **Cross-BPM contact history.** The send screen asks "have we already contacted them about
  *this* date". A prospect's whole history is reachable but showing it on the row would dilute
  the signal.
- **Per-stage template assignment UI.** The form fields are hidden, so templates are chosen in
  the send modal instead.
- **Trainers, email-template and per-location check-in fields.** Hidden, not deleted — the
  model, API, state and payload wiring are all intact.
- **Consent capture / STOP handling.** D12.
- **Clickable *Agents Invited* / *Agents Checked In* cards.** A count is not a ranking. Phase 6
  gave *Agents Invited* a real list on the page instead.
- **Row colours outside BPM.** The module is in `shared/` and takes arbitrary
  `condition_key`s, so the trackers can adopt it; nothing else emits keys yet.

## 5. Outstanding

1. ~~**Fix the three stale comments in `types.ts`.**~~ **Done** in the October update —
   `types.ts:729`, `:736`, `:738` now describe D5's sender and D8's guest pass as shipped.
2. **Decide whether BPM adopts React Query.** It is the largest module in the app and the only
   substantial one outside the platform convention: no shared cache beyond the two contexts, no
   request cancellation, no automatic refetch, and each page reloading only what it chose to.
   The October update took one step (D20, the sidebar's capabilities) and hand-rolled stale
   response guards on three pages and a panel — which is the cost of not migrating. Migrating all nine pages
   at once would be reckless; the contexts are the natural next step.
3. **Re-show the hidden fields, or remove them.** Trainers, per-stage templates and
   per-location check-in are wired but invisible. The current state costs a reader time on every
   pass through the form code.
4. **An accessibility pass.** 45 component modules, no systematic review. The event-code
   poster does not trap focus.
5. **Reconsider `_OPEN_CHECKIN`.** Still `True`. D6 said escalate on evidence, and Phase 5 made
   the evidence worth watching for: check-in counts feed public rankings.
6. **Adopt row colours in the trackers**, if the signal is wanted there. The engine is already
   shared; only the `condition_key` emission is missing.
7. **The Mission column's data source — the one remaining open product item.** Associate
   Check-In's 4X4 column was renamed Mission
   and still reads the three 4X4 milestones (`finish_1st_recruit`, `finish_1st_savings`,
   `big_event_1st`). Which fields it should read is **pending confirmation**; only the header
   changed (`pages/associate-checkin-page.tsx`, `MissionTrackerDots`).
8. ~~**"All Locations" union mode.**~~ **Shipped** in the October update (D21–D24). One
   brief sentence is still open: "We may be scanning multiple…" was never answered; D24 reads it
   as one scanner at one chosen location. The Mission column (item 7) is the only other open
   product question from the brief.
9. **Merge and deploy `feature/bpm-updates-oct` with its backend counterpart**, after
   `bpm/0026` and `tracker/0053`. Neither side is committed yet.
10. **Remove or re-use `bpmService.guestPass`** and the three unused occurrence actions
    (`cancelOccurrence`, `completeOccurrence`, `rescheduleOccurrence`).
