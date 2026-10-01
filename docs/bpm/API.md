# BPM — API

| | |
|---|---|
| **Module** | `bpm` |
| **Source** | `src/features/bpm/services/` |
| **Routes** | `/bpm/*`, `/bpm/pass/:token` |
| **Backend module** | `bpm` → `mlm_platform/docs/bpm/API.md` |
| **API prefix** | `/api/bpm/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `1335eca` plus the uncommitted October update (incl. All locations) on `feature/bpm-updates-oct` — 2026-10-01 |

> Endpoints **consumed**, not exposed. The backend's own docs are the authority on behaviour.

## 1. Conventions

Platform conventions ([platform API §1](../platform/API.md#1-conventions)), with two
module-specific points:

| | |
|---|---|
| Services | `bpmService` (authenticated) and `publicBpmService` (**no auth header**) |
| Shape | one object literal per service, ~78 methods on `bpmService` |
| Pagination | DRF-style `PaginatedResponse<T>` (`types.ts:80`) on the list endpoints |
| Uploads | `uploadAttachment` sends `FormData`, so it must **not** set `Content-Type` |
| Cancellation | only `capabilities(signal?)`, for the sidebar's React Query caller; every other call is uncancelled |

`publicBpmService` exists precisely so the guest-pass page cannot accidentally send a token. A
guest following an emailed link has no session, and a service that attaches
`Authorization: Token undefined` would fail in a way that looks like a broken link.

## 2. Endpoints consumed

61 path templates under `/api/bpm/` on `bpmService`, one public path on `publicBpmService`, and
2 under `/api/matchup/`. The October update added seven: `people/{id}/`, `settings/managers/`,
`occurrences/deleted/` and `occurrences/{id}/set-associate-checkin-zoom/`, then the three
**All-locations** collection reads — `occurrences/guests/`, `occurrences/associate-checkins/`
and `occurrences/checkin-stats/`, each taking `?ids=` (§3). Grouped by job
rather than listed flat — the service method is the searchable name. All paths are under
`/api/bpm/`.

### Events and occurrences

| Method | Path | Service method |
|---|---|---|
| GET | `events/` | `events(filters)` |
| GET | `events/{id}/` | `event(id)` |
| POST | `events/` | `createEvent` |
| PATCH | `events/{id}/` | `updateEvent` |
| DELETE | `events/{id}/` | `deleteEvent` |
| GET | `events/capabilities/` | `capabilities(signal?)` |
| GET | `events/smd-roster/` | `smdRoster()` |
| GET | `events/deleted/` | `deletedEvents()` |
| POST | `events/{id}/undelete/` | `undeleteEvent` |
| POST | `events/{id}/set-status/` | `setEventStatus` — also **Delete BPM** (`DELETED`) |
| GET | `events/{id}/occurrences/` | `eventOccurrences(id)` |
| POST | `events/{id}/upload-attachment/` | `uploadAttachment` |
| DELETE | `events/{id}/attachments/{aid}/` | `deleteAttachment` |
| GET | `occurrences/` | `occurrences(filters)` |
| GET | `occurrences/{id}/` | `occurrence(id)` |
| GET | `occurrences/deleted/` | `deletedOccurrences()` — **new**; the Deleted dates list |
| POST | `occurrences/{id}/set-status/` | `setOccurrenceStatus` — also restores a deleted date (`null`) |
| POST | `occurrences/{id}/cancel/`, `complete/`, `reschedule/` | `cancelOccurrence`, `completeOccurrence`, `rescheduleOccurrence` — no caller |
| GET | `occurrences/distinct-locations/` | `distinctLocations(filters)` |

`setEventStatus` and `setOccurrenceStatus` both take `BPMStatusOverride | null` — passing
`null` clears the override and returns the row to its derived status.

### Guests

| Method | Path | Service method |
|---|---|---|
| GET | `occurrences/{id}/guests/` | `guests(occurrenceId)`; also `guestsForScope` with one id |
| GET | `occurrences/guests/?ids=` | `guestsForScope(occurrenceIds)` with two or more ids — **new**; the union of each location's list, rows not merged |
| POST | `occurrences/{id}/add-guest/`, `remove-guest/` | `addGuest`, `removeGuest` |
| POST | `occurrences/{id}/transfer-guest/` | `transferGuest` |
| POST | `occurrences/{id}/set-guest-flags/` | `setGuestFlags` — outcomes, `confirmed`, `zoom`, `attended_zoom` |
| POST | `occurrences/{id}/reschedule-guest/`, `reschedule-guest-to-appointment/` | `rescheduleGuest`, `rescheduleGuestToAppointment` |
| POST | `occurrences/{id}/add-guest-note/` | `addGuestNote` |
| POST | `occurrences/{id}/save-guest-followup/` | `saveGuestFollowup` — the blue card, and the appointment link |
| GET | `guest-search/`, `inviter-search/`, `prospect-search/`, `prospect-match/` | `searchGuests`, `searchInviters`, `searchProspects`, `matchProspect` |

### People

| Method | Path | Service method |
|---|---|---|
| GET | `people/{id}/` | `person(userId)` — **new**; read-only details for anyone a BPM list names (D15). Same shape as `/api/accounts/users/{id}/`, typed as `team`'s `Prospect` |

### Check-in

| Method | Path | Service method |
|---|---|---|
| POST | `occurrences/{id}/check-in-guest/`, `undo-check-in-guest/` | `checkInGuest`, `undoCheckInGuest` — both return the guest, patched in place |
| POST | `occurrences/{id}/check-in-associate/`, `undo-check-in-associate/` | `checkInAssociate`, `undoCheckInAssociate` |
| POST | `occurrences/{id}/set-associate-checkin-zoom/` | `setAssociateCheckinZoom` — **new**; `{user_id, zoom}`, not window-gated |
| GET | `occurrences/{id}/associate-checkins/` | `associateCheckins`; also `associateCheckinsForScope` with one id |
| GET | `occurrences/associate-checkins/?ids=` | `associateCheckinsForScope` with two or more ids — **new**; union, rows not merged |
| GET | `occurrences/{id}/checkin-stats/` | `checkinStats`; also `checkinStatsForScope` with one id |
| GET | `occurrences/checkin-stats/?ids=&audience=` | `checkinStatsForScope` with two or more ids — **new**; each person counted once (D22) |

**The `…ForScope` methods pick the path by the number of ids.** One id sends exactly the
per-occurrence request a single-location screen always sent; several send the collection
request. Writes have no collection form: a union row is changed through its own
`occurrence`.

### Associate invites

| Method | Path | Service method |
|---|---|---|
| GET | `associate-invites/` | `associateInvites(filters)` — exactly one of `occurrence=` or, in All-locations mode, `occurrences=1,2,…`; with the second a flag reads true if true at any location (D21) |
| POST | `associate-invites/set-flags/` | `setAssociateInviteFlags` — any of `invited`, `called`, `confirmed`, `zoom`; in All-locations mode also `scope_occurrence_ids`, so an untick and its cascade clear the flag at every scope location holding it. Ticks land on `occurrence_id` only |

### QR

| Method | Path | Service method |
|---|---|---|
| GET | `qr/my-identity/` | `myQrIdentity()` — now with `name`, `agency_code` |
| POST | `qr/regenerate/` | `regenerateQrIdentity()` |
| POST | `qr/scan/` | `scanQr(scan, occurrenceId?)` |
| GET | `occurrences/{id}/qr/` | `occurrenceQr` — read by the event-code poster |
| POST | `occurrences/{id}/guest-pass/` | `guestPass(…, regenerate)` — **no caller** since `guest-pass-modal` was deleted |
| GET | `public/pass/{token}/` | `publicBpmService` — **no auth** |

### Messaging

| Method | Path | Service method |
|---|---|---|
| GET | `email-templates/`, `sms-templates/` | `emailTemplates()`, `smsTemplates()` |
| GET | `occurrences/{id}/guest-messages/?guest_id=` | `guestMessages` |
| POST | `occurrences/{id}/send-event-to-guests/` | `sendEventToGuests` |

### Configuration

| Method | Path | Service method |
|---|---|---|
| GET · PATCH | `settings/` | `settings()`, `updateSettings` |
| GET · PUT | `settings/managers/` | `bpmManagers()`, `setBpmManagers(userIds)` — **new**; `PUT {user_ids}` makes the list exact and returns it (D14) |
| GET · POST · PATCH · DELETE | `offices/` | `offices`, `createOffice`, `updateOffice`, `deleteOffice` |
| GET · POST · PATCH · DELETE | `interest-options/` | `interestOptions`, `createInterestOption`, … |
| GET · POST · PATCH · DELETE | `row-color-rules/` | `rowColorRules`, `createRowColorRule`, … |

### From `matchup`

| Method | Path | Why |
|---|---|---|
| GET | `/api/matchup/google/status/` | report whether the user's calendar is connected |
| DELETE | `/api/matchup/google/status/` | `disconnectGoogle` — the Overview's disconnect button |
| GET | `/api/matchup/google/oauth/start/` | send them to connect it — [calendar-sync](../calendar-sync/API.md#2-endpoints-consumed) owns this flow |

Guest Check-In also creates appointments through `matchupService.createAppointment`, from
`matchup`'s own service; that endpoint is documented there.

## 3. Payload types

`src/features/bpm/types.ts`, 966 lines — the real specification of this domain. The ones that
carry the most meaning:

| Type | Note |
|---|---|
| `BPMStatus` / `BPMStatusOverride` | the derived states, and the four explicit overrides |
| `BPMEventListItem` / `BPMEventDetail` / `BPMOccurrence` | note `checkin_opens_at`, `checkin_closes_at`, `checkin_open` and `checkin_closed` on the occurrence |
| `BPMGuest` | the guest **row**, with its flags, notes and follow-up; `zoom` (expected, needs `confirmed`) and `attended_zoom` (`boolean \| null`, read as `attended_zoom ?? zoom`); **`occurrence_label`** — the row's location label, null with no location; what the Location column shows |
| `AssociateCheckIn` | gains `zoom`, defaulted from the invite; and **`occurrence`** (id) plus **`occurrence_label`** — which location they were checked in at |
| `GuestInviteOutcomeField` / `GuestCheckinOutcomeField` | two disjoint flag sets, unioned as `GuestOutcomeField` |
| `BPMAssociateInvite*` | the per-**date** invite, not the event roster; rows and state carry `confirmed` and `zoom`, and **`invite_occurrence`** / **`invite_occurrence_label`** — the location the invite is stored on (the one with `invited` ticked, else the earliest with a row), null when there is none. `BPMAssociateInviteState` carries them only when the write sent `scope_occurrence_ids` |
| `AssociateInviteFilters` | `occurrence?` or `occurrences?` — exactly one is sent |
| `CheckinStats` / `CheckinDimensionStats` | `inviter`, `leader`, `md`, `smd`, and `direct` for associates only (D16). **`occurrence` is null** on an All-locations payload, and **`occurrences`** lists every id the numbers cover (one on the single path) |
| `CheckinRankEntry` | gains optional `leader_name`, `md_name`, `smd_name` — the ranked person's upline |
| `BPMCapabilities` | the nine flags driving every control, now including `can_checkin_after_close` |
| `BPMSettings` | the platform-wide singleton; gains `checkin_close_hours` and `stat_card_colors: Record<BPMStatCardKey, string>` |
| `BPMStatCardKey` | the five counter cards plus every `CheckinDimension` — ten keys |
| `SaveGuestFollowupPayload` | gains `spouse_name`; absent fields are left unchanged server-side |
| `BPMQrDirection` | `associate_to_host` · `host_to_associate` · `host_to_guest` |
| `BPMQrToken` | `{token, label}`, plus optional `name` and `agency_code` on identity codes |
| `BPMGuestPass` / `PublicBPMGuestPass` | the authenticated and public shapes of a pass |
| `BPMSendPayload` / `BPMSendReport` / `BPMSendOutcome` | a send and its per-guest result |

The three comments that described the guest senders and guest passes as unbuilt were fixed
in the October update (`types.ts:729`, `:736`, `:738`).

**All locations — the contract** (backend: `mlm_platform/docs/bpm/API.md` §3, "All locations";
D21, D22). The same input rule applies to `ids=`, `occurrences=` and `scope_occurrence_ids`:

- **1–20 positive integers**, duplicates ignored; otherwise **400**. The client sends 2 or more —
  one id takes the per-occurrence path.
- Every id must be visible exactly as the detail routes see it, else **404 for the whole
  request** — one invisible location fails the union rather than silently shrinking it.
- All ids must belong to **one event**, else **400**. `scope_occurrence_ids` must also share
  `occurrence_id`'s event.
- Permissions are those of the per-occurrence equivalent. Lists come back ordered by occurrence
  (`start_at`, `id`), then each list's own order.
- **Lists are unions, not merges**: a prospect on the room's list and on Zoom's is two rows.
  **Counts deduplicate** (D22): guests by prospect, associates by user. Guest `totals` in the
  stats still count distinct *inviters*, as on one occurrence — which is why Guest Check-In's
  counters are computed from the list instead ([UI.md §2.7](UI.md#27-guest-check-in--pagesguest-checkin-pagetsx)).

## 4. Query parameters

| Parameter group | Built by | Notes |
|---|---|---|
| `EventFilters` | `events()` | status, search, include-past |
| `OccurrenceFilters` | `occurrences()`, `distinctLocations()` | event, date range, location |
| `AssociateInviteFilters` | `associateInvites()` | `occurrence` **or** `occurrences` (comma-joined), `sort`, `segment`, `page`, `page_size`, plus a nested `filters` object that may carry `invited` / `called` / `confirmed` / `zoom`. With `occurrences`, filters and sort act on the unioned flags |
| `audience` + `dimension` | `checkinStats()` | `direct` only with `audience=associate` |
| `ids` (+ `audience`) | the three `…ForScope` methods | comma-joined occurrence ids; `checkinStatsForScope` sends no `dimension`, so one request feeds every card |
| `interestOptions` params | `interestOptions()` | `group`, `is_active`, `ordering` |
| search `q` + `limit` | the four search methods | `limit` defaults 25, or 10 for prospects |

The date range on Associate Invites is passed as inherited `from_date` / `to_date` and
deliberately **kept out of** the nested `filters` object. The same bug is left standing on the
Associate Tracker in `team`.

## 5. Error codes and handling

No typed error class and no stable code vocabulary — failures are thrown as `Error` with the
backend's message and surfaced per page.

| Situation | Status | Client behaviour |
|---|---|---|
| Missing capability | 403 | the control was hidden; a direct call still fails |
| Check-in before the window | 403 | prevented in the UI by `canCheckInNow()`; the server gate is separate from the permission check |
| Check-in after the window closes, not a manager | 400 | prevented in the UI; the message says check-in closed and only BPM managers can still check in |
| `zoom: true` on an unconfirmed guest, or a contradictory invite-flag body | 400 | prevented in the UI — Z is disabled until C; the optimistic flip is rolled back |
| `set-associate-checkin-zoom/` for somebody not checked in | 404 | toast; the row is left as it was |
| `PUT settings/managers/` refused — unknown user, protected grant, or removing your own only access | 400 | toast with the server's message; the editor keeps the unsaved draft |
| `people/{id}/` for somebody BPM could not have shown you | 404 | the details modal reports it |
| Scan of an unknown or stale token | 4xx | the outcome line reports it; nothing is recorded |
| Scan after check-in has closed | 4xx | refused — `checkin_closes_at` with the window on, `end_at` with it off, and **no** manager bypass. The event-code poster says so |
| All-locations ids malformed, more than 20, or from two events | 400 | not reachable from the UI — the scope is one event's date; the page shows its load error |
| An All-locations id not visible to the user | 404 | the whole union fails and the page shows its load error; it is not narrowed to the visible locations |
| Duplicate guest | — | not an error; a confirm dialog |
| Send partially fails | 200 | a per-guest `BPMSendReport`; some outcomes succeed and some do not |
| Attachment upload rejected | 4xx | surfaced on the form |

`POST /qr/scan/` is **not rate-limited**, and nothing in the platform is. The reasoning: a door
sees one request per person, and the real bound is that a scan is refused once the date has
ended.

## 6. Backend ownership

`bpm` owns, and the client must not recompute:

- **`effective_status`** — the occurrence → event → derived precedence.
- **The check-in window** — `checkin_opens_at`, `checkin_closes_at`, `checkin_open` and
  `checkin_closed`, computed from the settings row put in the serializer context once per page,
  not per row. `checkin_open` is per date, not per viewer: the client combines `checkin_closed`
  with `can_checkin_after_close`. Deriving the times in the browser would put one rule on both
  sides of the wire.
- **The C/Z cascade** — which flag needs which, and what an un-tick clears. The client mirrors
  it optimistically and then takes the response.
- **Who is a BPM manager** — whoever holds a per-user grant of `bpm_settings:manage` (D14).
- **Who may be shown in person details** — the people-endpoint bound (D15).
- **`training_date`** on the Associate Tracker, set by check-in and cleared by undo.
- **Whether a list conceals a row, and the lifting of that concealment on detail lookup.**
- **Occurrence materialisation** — one row per (location, date) from a recurrence.
- **Ranking and the four check-in dimensions**, including the decision that attendance means
  **one occurrence**, not every location that day — extended by D22: an explicit All-locations
  request counts the set, each person once.
- **Where an associate's date invite is stored** (`invite_occurrence`) and the untick-everywhere
  rule behind `scope_occurrence_ids` (D21).
- **Attachment `href` presence** — the real view gate; the URL is omitted entirely when off.
- **The automatic `INVITE` send** on `add_guest`, and all message delivery.
- **QR token minting and resolution**, including which of the three directions applies.

The client owns the sticky selection and its All-locations scope (which ids to send, and the
anchor), which location a *new* guest or check-in lands on, which controls are offered,
grouping a day by event, naming what a scan recorded, reading `attended_zoom ?? zoom`, and
Guest Check-In's three counters.

**SMS ships with no consent gate** (decision D12). There is no consent field, no STOP-keyword
handling and no opt-out anywhere in the platform; handing over a number at a BPM is treated as
consent. This was raised as a risk and accepted. `messaging._send_sms` on the backend is the
single place a gate would go. Email is unaffected — SendGrid handles unsubscribes.
