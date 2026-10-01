# BPM — Operations

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

## 1. Environment and configuration

No module-specific `VITE_` variables. **Everything configurable is backend state**, set in BPM
Settings by a holder of `bpm_settings:manage` — Admin and the named BPM managers:

| Setting | Default | Effect |
|---|---|---|
| `checkin_window_enabled` | **off** | so existing BPMs keep always-open check-in |
| `checkin_window_hours` | — | hours before `start_at` that check-in opens (0–168) |
| `checkin_close_hours` | 4 | hours after `end_at` that check-in closes (0–168). After it, only BPM managers check in; undo stays open (D13) |
| `qr_associate_to_host` | on | an associate shows their code to the host |
| `qr_host_to_associate` | on | the host shows a code the associate scans |
| `qr_host_to_guest` | **off** | guest passes. The one switch that defaults off — a guest pass is the only BPM code deliberately sent out of the building |
| `attachments_view` | on | **real gate** — off removes `href` from every response |
| `attachments_download` | on | **UI gate only** — off hides the control; the CDN URL stays reachable |
| `text_event_to_guests` | — | gates the SMS channel in the send modal |
| `email_event_to_guests` | — | gates the email channel |
| `stat_card_colors` | server defaults | background per check-in stat card, ten keys, `#rrggbb`; a `PATCH` merges a partial map |

Also backend-stored: the BPM managers list (per-user authz grants, D14), offices, interest
options, and row-colour rules.

Two client-side caches, both `sessionStorage` and both only for first-paint:
`wb.bpm.rowColorRules` and `wb.bpm.selection` (which also holds the All-locations preference;
the URL carries it as `all=1`). Two `localStorage` conveniences: `wb.bpm.lastCollectedBy`, the
blue card's last "Collected by" on this device, and **`wb.bpm.lastLocation.<eventId>`**, the
location id a new guest, check-in or QR code lands on in All-locations mode — a location id, not
an occurrence id, so it carries to the BPM's next date. Clearing it only resets the choice to
the date's first location. All four are wrapped in try/catch for private mode. The sidebar's capabilities read is cached by React Query
for 5 minutes under `['bpm', 'capabilities', userId]`.

## 2. Build and run

Standard ([platform OPERATIONS §2](../platform/OPERATIONS.md#2-build-and-run)). BPM-specific
notes:

- **Nine lazy chunks**, one per page, plus `@zxing/browser` (~200 KB) loaded dynamically only
  inside the branch that needs it. A build that inlines zxing into a page chunk is a
  regression.
- `vite-plugin-gms-manifest.ts` reads `src/features/bpm/gms-targets.ts` at build time and emits
  `build/gms-targets.bpm.json`. A successful build prints how many targets it wrote — 7 at
  commit `7e3b7f1`.
- **Camera scanning needs HTTPS.** `npm run dev` on plain `http://localhost` cannot open the
  camera, so the scan panel must be tested over HTTPS or on a device.

## 3. Feature flags and rollout

No client-side flags. Access is per-capability, from
`GET /api/bpm/events/capabilities/`:

| Capability | Backend permission | Without it |
|---|---|---|
| `can_read` | `bpm:read` | the route loads and shows nothing useful |
| `can_create` / `can_update` / `can_delete` | `bpm:create` / `bpm:update` / `bpm:delete` | no Create / Edit; no delete (which also needs `can_manage_schedule`) |
| `can_manage_guests` | `bpm_guests:manage` | Guest Invites read-only, no guest check-in |
| `can_manage_templates` | `bpm_templates:manage` | no interest-options admin |
| `can_manage_schedule` | `bpm_schedule:manage` | no status control or delete in Schedule |
| `can_manage_settings` | `bpm_settings:manage` | no Settings, no sidebar link, no deleted-item recovery |
| `can_checkin_after_close` | `bpm_settings:manage` | no check-in once the window has closed |

**Role permissions are granted in the access console, never in a migration** (decision D10).
"People below broker level can view but not CRUD" is a console configuration, not code, and so
is giving Leader, Broker, Senior Broker and Admin `bpm_guests:manage` for Guest Invites.

**BPM managers are the exception that is not a role grant.** Naming someone in BPM Settings
writes per-user `UserPermission` GRANTs of all five of `bpm:create`, `bpm:update`, `bpm:delete`,
`bpm_schedule:manage`, `bpm_settings:manage` (D14). The console shows and revokes them too.
Somebody who manages through a role is not on the list, and the list cannot revoke them.

## 4. Tests and checks

No frontend tests ([platform OPERATIONS §4](../platform/OPERATIONS.md#4-tests-and-checks)). The
backend is well covered and its suite is the real safety net for this module — the status
precedence, the concealment-lifting on detail lookup, and the check-in window all have tests
there, and all three are things a frontend change can appear to work against.

Lint was re-run for the October update (eslint 2026-10-01, through a `node:20-alpine`
container): 0 errors in this module and 8 warnings, all on lines the update did not touch
(`bpm-occurrence-picker`, `locations-editor`, both contexts). Repo-wide it reports 6 errors and
117 warnings, none of them in files this update changed. `tsc --noEmit` passes.

Manual checks after any change, ordered by how often they catch something:

1. **Sticky selection** — pick a BPM and date, move through all eight sub-tools, reload. The
   selection survives.
2. **Multi-location day** — open a day with a three-location BPM in the calendar modal. One
   entry, location as a dropdown, guests summed.
3. **Un-hide** — archive, hide, then cancel an event and a date, and restore each. **If you
   touched any list filter, this is the check that matters most.**
4. **Check-in window** — with the window enabled, check both edges. Before it opens: the
   notice shows and every check-in control is disabled, including **Add & Check in**. After it
   closes: an ordinary user sees "Check-in has closed" and cannot check in; a BPM manager sees
   the manager wording and can. Undo works on both sides.
5. **Scan** — over HTTPS, scan an associate code and a guest pass; confirm the outcome line
   names which was recorded, and that they land on different lists.
6. **Duplicate** — add a guest whose phone matches an existing prospect in a different format.
7. **Send** — check the history renders before sending, then send twice and confirm two sends.
8. **Attachments** — turn `attachments_view` off and confirm no `href` in the network response,
   not merely a hidden control; the BPM name should then be plain text.
9. **C/Z cascade** — on Guest Invites tick C then Z, untick C: Z clears. On Associate Invites,
   untick Invited: C and Z clear. Tick quickly on one row; nothing flips back.
10. **Managers** — add and remove a manager; the removed user loses the BPM Settings sidebar
    link and cannot check in after close. Removing yourself as your only access is refused.
11. **Deleted dates** — delete one date in Schedule, find it under Deleted dates, restore it.
12. **Person details** — open a guest invited by another shop; the details modal loads.
13. **All locations** — on a BPM with two locations on one date, pick "All locations (2)" and
    visit Guest Invites, Associate Invites and both check-in pages: Location columns appear, rows
    stay one per location, and a check-in on a row lands at that row's location. Pick a
    "Check in at" location, open QR — the dialog shows the same location. Untick an associate's
    Invited that is set at both locations; it stays unticked after a reload. Switch between one
    location and All on the same date quickly; the list never shows the other scope's rows.

## 5. Deployment

**`feature/bpm-v2` is coupled to its backend counterpart** in `mlm_platform` and they must
merge and deploy together. Merging the frontend alone produces eight pages that render and then
fail.

**`feature/bpm-updates-oct` is coupled the same way**, to the `mlm_platform` branch of the same
name (uncommitted on both sides at 2026-10-01). It needs backend migrations `bpm/0026` and
`tracker/0053`. Without them the new fields (`zoom`, `attended_zoom`, `checkin_closes_at`,
`checkin_closed`, `stat_card_colors`, `training_date`) are absent and the four new endpoints
404 — the Deleted dates list, the managers editor and every person-details link fail.

**All locations rides on the same coupled pair and needs no migration** (`BPMAssociateInvite`
stays per occurrence, D21). Against a backend without it, single-location screens are unaffected
— one id takes the old per-occurrence paths — but choosing All fails every list: the three
`occurrences/…/?ids=` reads and `associate-invites/?occurrences=` are unknown, and the Location
column is empty because `occurrence_label` is absent.

Two forward-only decisions that must not be "repaired":

- **Historical `CANCELLED` dates have no Google Calendar events.** Migration `0015` is
  forward-only by design: those occurrences had their calendar events deleted under the old
  rule, and are left as they are (decision D1).
- **`_OPEN_CHECKIN` is still `True`** on the backend, unchanged since before this work
  (decision D6). Phase 5 made it matter more, not less: check-in counts feed public rankings,
  so inflated attendance is the plausible abuse vector.

## 6. Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| A cancelled date cannot be restored | a list filter is also hiding it from detail lookup | the backend's `get_object` — this exact bug has occurred twice. See [ARCHITECTURE.md §8](ARCHITECTURE.md#8-invariants-and-failure-modes) |
| The same meeting appears three times | the caller is not grouping by event | one occurrence per (location, date); group like the calendar day modal does. (All-locations *lists* are different — see below) |
| Check-in controls disabled with no explanation | the window has not opened, or has closed | `checkin_open` / `checkin_closed` / `checkin_opens_at` / `checkin_closes_at` on the occurrence. `checkin-window-notice` should be showing |
| A manager cannot check in after close | `can_checkin_after_close` is false, or the page loaded its capabilities before the grant | reload the page; check the per-user `bpm_settings:manage` grant in the access console |
| Somebody still sees BPM Settings after being removed | the sidebar's capabilities are cached 5 minutes | the managers editor invalidates the cache for the editor's own session only; others refresh on the next fetch |
| A backend window check "does nothing" | it was written inside `can_check_in`, which short-circuits to `True` on its first line | the window is a **separate** gate called before the permission check |
| Camera will not open | not HTTPS, or an iOS in-app webview | expected. Take the guest by name from the list |
| Scanning works but the person is on the wrong list | a guest pass was scanned where an associate was expected, or the reverse | the outcome line names which was recorded — that is what it is for |
| A scanned code worked yesterday, not today | a scan is refused once check-in has closed (`checkin_closes_at`, or `end_at` with the window off), with no manager bypass | expected, and deliberate — it is the temporal bound that stands in for rate limiting |
| A deleted BPM "does not show up" in Settings | it was one **date** deleted from Schedule, not the whole BPM | the **Deleted dates** list, not Deleted BPMs |
| Z will not tick on Guest Invites | the guest is not confirmed | tick C first (D18) |
| Guest Check-In's Z disagrees with Guest Invites' Z | they are different marks — expected vs attended | by design (D17); Check-In shows `attended_zoom ?? zoom` |
| The details modal 404s | the person is outside what BPM could have shown | by design (D15); the bound is server-side |
| Blue card button solid with nothing on the card | should not happen — it keys on content, not on a followup row existing | `hasBlueCardContent` in `guest-checkin-table.tsx` |
| Booking from the appointment form "does nothing" | a secondary write (profile flags, note) failed | fixed: the appointment saves and a warning names what was skipped; a real error shows beside Save |
| A guest got an associate badge | a pass was minted from `User.bpm_qr_token` instead of `BPMGuest.pass_qr_token` | these are deliberately different tokens |
| Rows are briefly uncoloured | the rule set has not resolved | expected. A briefly *wrong* colour would be worse |
| Rows are the wrong colour | a server rule, not a client constant | BPM Settings → row-colour rules. `BPM_GUEST_ROW_COLORS` is only a failed-fetch lifeboat |
| Attachment control hidden but the file is reachable | `attachments_download` is a UI gate only | by design (D11). Only `attachments_view` removes the URL |
| A send went twice | sends are not de-duplicated, on purpose | the history panel shows prior sends before you send |
| A guest got an SMS they did not expect | there is no consent gate | decision D12 — accepted risk, recorded |
| Associate Invites count disagrees with the roster | the roster and the per-date invite are different things | `BPMAssociateInvite` wins; there is deliberately no roster fallback |
| Date range on Associate Invites seems ignored | it is passed as `from_date`/`to_date`, not inside `filters` | deliberate |
| Stat cards missing from Overview | removed per the brief | expected; the sub-tools serve those needs |
| Trainer / template / per-location fields missing | hidden, not deleted | state and payload wiring are intact; re-showing is a one-line change |
| "All locations" missing from the picker or the day modal | the date has **one** location (a concealed location does not count) | expected — All is offered only for more than one; a stored All preference reads as off on such a date |
| An associate's flag will not clear in All-locations mode | the untick went without `scope_occurrence_ids`, so another location still holds the flag and the union reads it as set | `set-flags` body in the network tab; Associate Invites sends the scope whenever it spans more than one id (D21) |
| Guest Check-In's cards disagree with the ranking modals' totals | the cards count **people, deduplicated by prospect**, from the list; the stats' guest totals count distinct *inviters* | by design — `guestCountCards()` in `guest-checkin-page.tsx` (D22) |
| The same guest appears twice in All-locations mode | they are on two locations' lists — the lists are unions, not merges | expected; the Location column says which. Counts still take them once |
| A new guest or check-in landed at the "wrong" location | the sticky per-BPM choice (`wb.bpm.lastLocation.<eventId>`) points elsewhere | the "Add to location" / "Check in at" select, or the QR dialog's Location — they are one choice |
| One location's rows cannot be checked in while another's can | each location keeps its own check-in window | expected — gated per row; the notice above speaks for the first location |
| Every All-locations list fails to load | one location in scope is not visible to the user (404 for the whole request), or the backend lacks All locations | the failing `?ids=` request; see §5 |
