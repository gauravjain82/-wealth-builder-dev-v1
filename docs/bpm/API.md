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
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Endpoints **consumed**, not exposed. The backend's own docs are the authority on behaviour.

## 1. Conventions

Platform conventions ([platform API §1](../platform/API.md#1-conventions)), with two
module-specific points:

| | |
|---|---|
| Services | `bpmService` (authenticated) and `publicBpmService` (**no auth header**) |
| Shape | one object literal per service, ~70 methods on `bpmService` |
| Pagination | DRF-style `PaginatedResponse<T>` (`types.ts:80`) on the list endpoints |
| Uploads | `uploadAttachment` sends `FormData`, so it must **not** set `Content-Type` |
| Cancellation | none — BPM does not use React Query |

`publicBpmService` exists precisely so the guest-pass page cannot accidentally send a token. A
guest following an emailed link has no session, and a service that attaches
`Authorization: Token undefined` would fail in a way that looks like a broken link.

## 2. Endpoints consumed

22 under `/api/bpm/`, plus 2 read-only under `/api/matchup/`. Grouped by job rather than listed
flat — the service method is the searchable name.

### Events and occurrences

| Method | Path | Service method |
|---|---|---|
| GET | `/events/` | `events(filters)` |
| GET | `/events/{id}/` | `event(id)` |
| POST | `/events/` | `createEvent` |
| PATCH | `/events/{id}/` | `updateEvent` |
| DELETE | `/events/{id}/` | `deleteEvent` |
| GET | `/events/capabilities/` | `capabilities()` |
| GET | `/events/smd-roster/` | `smdRoster()` |
| GET | `/events/deleted/` | `deletedEvents()` |
| POST | `/events/{id}/undelete/` | `undeleteEvent` |
| PATCH | `/events/{id}/status/` | `setEventStatus` |
| GET | `/events/{id}/occurrences/` | `eventOccurrences(id)` |
| POST · DELETE | `/events/{id}/attachments/` | `uploadAttachment`, `deleteAttachment` |
| GET | `/occurrences/` | `occurrences(filters)` |
| GET | `/occurrences/{id}/` | `occurrence(id)` |
| PATCH | `/occurrences/{id}/status/` | `setOccurrenceStatus` |
| GET | `/occurrences/distinct-locations/` | `distinctLocations(filters)` |

`setEventStatus` and `setOccurrenceStatus` both take `BPMStatusOverride | null` — passing
`null` clears the override and returns the row to its derived status.

### Guests

| Method | Path | Service method |
|---|---|---|
| GET | `/occurrences/{id}/guests/` | `guests(occurrenceId)` |
| POST · DELETE | `/occurrences/{id}/guests/` | `addGuest`, `removeGuest` |
| POST | `/occurrences/{id}/guests/{gid}/transfer/` | `transferGuest` |
| POST | `/occurrences/{id}/guests/{gid}/flags/` | `setGuestFlags` |
| POST | `/occurrences/{id}/guests/{gid}/reschedule/` | `rescheduleGuest`, `rescheduleGuestToAppointment` |
| POST | `/occurrences/{id}/guests/notes/` | `addGuestNote` |
| POST | `/occurrences/{id}/guests/followup/` | `saveGuestFollowup` |
| GET | `/guest-search/`, `/inviter-search/`, `/prospect-search/`, `/prospect-match/` | `searchGuests`, `searchInviters`, `searchProspects`, and the duplicate match |

### Check-in

| Method | Path | Service method |
|---|---|---|
| POST | `/occurrences/{id}/guests/{gid}/checkin/` | `checkInGuest`, `undoCheckInGuest` |
| POST | `/occurrences/{id}/associates/{uid}/checkin/` | `checkInAssociate`, `undoCheckInAssociate` |
| GET | `/occurrences/{id}/associate-checkins/` | `associateCheckins` |
| GET | `/occurrences/{id}/checkin-stats/` | `checkinStats` |

### Associate invites

| Method | Path | Service method |
|---|---|---|
| GET | `/associate-invites/` | `associateInvites(filters)` |
| POST | `/associate-invites/set-flags/` | `setAssociateInviteFlags` |

### QR

| Method | Path | Service method |
|---|---|---|
| GET | `/qr/my-identity/` | `myQrIdentity()` |
| POST | `/qr/regenerate/` | `regenerateQrIdentity()` |
| POST | `/qr/scan/` | `scanQr(scan, occurrenceId?)` |
| GET | `/occurrences/{id}/qr/` | `occurrenceQr` |
| GET | `/occurrences/{id}/guests/{gid}/pass/` | `guestPass(…, regenerate)` |
| GET | `/public/pass/{token}/` | `publicBpmService` — **no auth** |

### Messaging

| Method | Path | Service method |
|---|---|---|
| GET | `/email-templates/`, `/sms-templates/` | `emailTemplates()`, `smsTemplates()` |
| GET | `/occurrences/{id}/guests/{gid}/messages/` | `guestMessages` |
| POST | `/occurrences/{id}/send-event-to-guests/` | `sendEventToGuests` |

### Configuration

| Method | Path | Service method |
|---|---|---|
| GET · PATCH | `/settings/` | `settings()`, `updateSettings` |
| GET · POST · PATCH · DELETE | `/offices/` | `offices`, `createOffice`, `updateOffice`, `deleteOffice` |
| GET · POST · PATCH · DELETE | `/interest-options/` | `interestOptions`, `createInterestOption`, … |
| GET · POST · PATCH · DELETE | `/row-color-rules/` | `rowColorRules`, `createRowColorRule`, … |

### Read-only, from `matchup`

| Method | Path | Why |
|---|---|---|
| GET | `/api/matchup/google/status/` | report whether the user's calendar is connected |
| POST | `/api/matchup/google/oauth/start/` | send them to connect it — [calendar-sync](../calendar-sync/API.md#2-endpoints-consumed) owns this flow |

## 3. Payload types

`src/features/bpm/types.ts`, 859 lines — the real specification of this domain. The ones that
carry the most meaning:

| Type | Note |
|---|---|
| `BPMStatus` / `BPMStatusOverride` | the derived states, and the four explicit overrides |
| `BPMEventListItem` / `BPMEventDetail` / `BPMOccurrence` | note `checkin_open` and `checkin_opens_at` on the occurrence |
| `BPMGuest` | the guest **row**, with its flags, notes and follow-up |
| `GuestInviteOutcomeField` / `GuestCheckinOutcomeField` | two disjoint flag sets, unioned as `GuestOutcomeField` |
| `BPMAssociateInvite*` | the per-**date** invite, not the event roster |
| `CheckinStats` / `CheckinDimensionStats` | four dimensions: `inviter`, `leader`, `md`, `smd` |
| `BPMCapabilities` | the nine flags driving every control |
| `BPMSettings` | the platform-wide configuration singleton |
| `BPMQrDirection` | `associate_to_host` · `host_to_associate` · `host_to_guest` |
| `BPMGuestPass` / `PublicBPMGuestPass` | the authenticated and public shapes of a pass |
| `BPMSendPayload` / `BPMSendReport` / `BPMSendOutcome` | a send and its per-guest result |

**Two comments in this file are stale.** `:687`/`:690` call the guest-send switches "a switch
for a sender that does not exist yet", and `:672` calls `qr_host_to_guest` "the switch, not the
feature". Both features shipped after Phase 8 — `sendEventToGuests`, `send-event-modal.tsx`,
and a guest branch in the resolver. Trust the code.

## 4. Query parameters

| Parameter group | Built by | Notes |
|---|---|---|
| `EventFilters` | `events()` | status, search, include-past |
| `OccurrenceFilters` | `occurrences()`, `distinctLocations()` | event, date range, location |
| `AssociateInviteFilters` | `associateInvites()` | `occurrence`, `sort`, `segment`, `page`, `page_size`, plus a nested `filters` object |
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
| Check-in before the window | 403 | prevented in the UI by `checkin_open`; the server gate is separate from the permission check |
| Scan of an unknown or stale token | 4xx | the outcome line reports it; nothing is recorded |
| Scan after the date has ended | 4xx | refused — the bound that matters for scanning is temporal, not per-second |
| Duplicate guest | — | not an error; a confirm dialog |
| Send partially fails | 200 | a per-guest `BPMSendReport`; some outcomes succeed and some do not |
| Attachment upload rejected | 4xx | surfaced on the form |

`POST /qr/scan/` is **not rate-limited**, and nothing in the platform is. The reasoning: a door
sees one request per person, and the real bound is that a scan is refused once the date has
ended.

## 6. Backend ownership

`bpm` owns, and the client must not recompute:

- **`effective_status`** — the occurrence → event → derived precedence.
- **The check-in window** — `checkin_open` and `checkin_opens_at`, computed from the settings
  row put in the serializer context once per page, not per row. Deriving it in the browser
  would put one rule on both sides of the wire.
- **Whether a list conceals a row, and the lifting of that concealment on detail lookup.**
- **Occurrence materialisation** — one row per (location, date) from a recurrence.
- **Ranking and the four check-in dimensions**, including the decision that attendance means
  **one occurrence**, not every location that day.
- **Attachment `href` presence** — the real view gate; the URL is omitted entirely when off.
- **The automatic `INVITE` send** on `add_guest`, and all message delivery.
- **QR token minting and resolution**, including which of the three directions applies.

The client owns the sticky selection, which controls are offered, grouping a day by event, and
naming what a scan recorded.

**SMS ships with no consent gate** (decision D12). There is no consent field, no STOP-keyword
handling and no opt-out anywhere in the platform; handing over a number at a BPM is treated as
consent. This was raised as a risk and accepted. `messaging._send_sms` on the backend is the
single place a gate would go. Email is unaffected — SendGrid handles unsubscribes.
