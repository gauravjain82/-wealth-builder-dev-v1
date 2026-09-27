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
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Environment and configuration

No module-specific `VITE_` variables. **Everything configurable is backend state**, set in BPM
Settings by a holder of `bpm_settings:manage`:

| Setting | Default | Effect |
|---|---|---|
| `checkin_window_enabled` | **off** | so existing BPMs keep always-open check-in |
| `checkin_window_hours` | — | hours before `start_at` that check-in opens. It never closes again |
| `qr_associate_to_host` | on | an associate shows their code to the host |
| `qr_host_to_associate` | on | the host shows a code the associate scans |
| `qr_host_to_guest` | **off** | guest passes. The one switch that defaults off — a guest pass is the only BPM code deliberately sent out of the building |
| `attachments_view` | on | **real gate** — off removes `href` from every response |
| `attachments_download` | on | **UI gate only** — off hides the control; the CDN URL stays reachable |
| `text_event_to_guests` | — | gates the SMS channel in the send modal |
| `email_event_to_guests` | — | gates the email channel |

Also backend-stored: offices, interest options, and row-colour rules.

Two client-side caches, both `sessionStorage` and both only for first-paint:
`wb.bpm.rowColorRules` and the persisted selection. Both are wrapped in try/catch for private
mode.

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
| `can_read` | — | the route loads and shows nothing useful |
| `can_create` / `can_update` / `can_delete` | — | no event CRUD |
| `can_manage_guests` | — | read-only guest lists, no check-in |
| `can_manage_templates` | `bpm_templates:manage` | no interest-options admin |
| `can_manage_schedule` | `bpm_schedule:manage` | no CRUD or status control in Schedule |
| `can_manage_settings` | `bpm_settings:manage` | no Settings, no deleted-item recovery |

**Role permissions are granted in the access console, never in a migration** (decision D10).
"People below broker level can view but not CRUD" is a console configuration, not code.

## 4. Tests and checks

No frontend tests ([platform OPERATIONS §4](../platform/OPERATIONS.md#4-tests-and-checks)). The
backend is well covered and its suite is the real safety net for this module — the status
precedence, the concealment-lifting on detail lookup, and the check-in window all have tests
there, and all three are things a frontend change can appear to work against.

`npm run lint` reports nothing in this module.

Manual checks after any change, ordered by how often they catch something:

1. **Sticky selection** — pick a BPM and date, move through all eight sub-tools, reload. The
   selection survives.
2. **Multi-location day** — open a day with a three-location BPM in the calendar modal. One
   entry, location as a dropdown, guests summed.
3. **Un-hide** — archive, hide, then cancel an event and a date, and restore each. **If you
   touched any list filter, this is the check that matters most.**
4. **Check-in window** — with the window enabled, confirm the notice shows, every control is
   disabled including **Add & Check in**, and that undo still works after check-in.
5. **Scan** — over HTTPS, scan an associate code and a guest pass; confirm the outcome line
   names which was recorded, and that they land on different lists.
6. **Duplicate** — add a guest whose phone matches an existing prospect in a different format.
7. **Send** — check the history renders before sending, then send twice and confirm two sends.
8. **Attachments** — turn `attachments_view` off and confirm no `href` in the network response,
   not merely a hidden control.

## 5. Deployment

**`feature/bpm-v2` is coupled to its backend counterpart** in `mlm_platform` and they must
merge and deploy together. Merging the frontend alone produces eight pages that render and then
fail.

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
| The same meeting appears three times | the caller is not grouping by event | one occurrence per (location, date); group like the calendar day modal does |
| Check-in controls disabled with no explanation | the window has not opened | `checkin_open` / `checkin_opens_at` on the occurrence. `checkin-window-notice` should be showing |
| A backend window check "does nothing" | it was written inside `can_check_in`, which short-circuits to `True` on its first line | the window is a **separate** gate called before the permission check |
| Camera will not open | not HTTPS, or an iOS in-app webview | expected. Take the guest by name from the list |
| Scanning works but the person is on the wrong list | a guest pass was scanned where an associate was expected, or the reverse | the outcome line names which was recorded — that is what it is for |
| A scanned code worked yesterday, not today | a scan is refused once the date has ended | expected, and deliberate — it is the temporal bound that stands in for rate limiting |
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
