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
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Phase numbering and the `D` decision prefix come from `mlm_platform/BPM_V2_PLAN.md` (phases
> 0–8 plus post-8 work) and **must not be renumbered** — the same number means the same thing in
> both repos. That plan is 152 KB and remains the fullest record; this file documents what the
> **frontend** shipped and what a reader here needs to know before changing it.
>
> All eleven original decisions were settled on 2026-09-24 and shipped on 2026-09-25. D12 was
> added later as an accepted risk. Two decisions — D5 and D8 — were **reopened and shipped after
> Phase 8**, which is why some code comments still describe them as unbuilt.

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

### Phase 6 — Associate Invites

**What shipped.** `BPMAssociateInvite` per date, replacing the event roster as the meaning of
"invited"; `invited_by` giving the associate audience an `inviter` ranking; the Invited
Associates panel placed **on the page** rather than behind a click.

**Divergence.** Both audiences now carry all four dimensions, but Associate Check-In still
*renders* only Top SMD and Top MD, because the row is shared with the two counters.

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

## 3. Decision log

Summarised from `BPM_V2_PLAN.md` §2. All shipped.

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

## 4. Deliberately not built

- **A true duplicate-merge tool.** D9.
- **Rotating or short-lived QR tokens.** D6.
- **Reissuing somebody else's code.** It would be the start of an account-recovery surface.
  Reissue is self-service.
- **QR codes encoding a URL.** They encode the bare token, because a code a stranger's camera
  can act on is a code a *photograph of the room's screen* can act on. The resolver accepts a
  URL anyway, so adding one later is a client change only.
- **Rate limiting on `/qr/scan/`.** Nothing in the platform is rate-limited, and the bound that
  matters here is temporal — a scan is refused once the date has ended. A door sees one request
  per person.
- **A per-BPM check-in window override.** Platform-wide only, which is what the brief asks for.
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

1. **Fix the three stale comments in `types.ts`.** `:672`, `:687` and `:690` describe D5's
   sender and D8's guest pass as unbuilt. Both shipped. This is the highest-value item here
   because it is the one place in the module where the code actively misinforms a reader — and
   it is a three-line edit.
2. **Decide whether BPM adopts React Query.** It is the largest module in the app and the only
   substantial one outside the platform convention: no shared cache beyond the two contexts, no
   request cancellation, no automatic refetch, and each page reloading only what it chose to.
   Migrating all nine pages at once would be reckless; the contexts are the natural first step,
   since they already own the cross-page state.
3. **Re-show the hidden fields, or remove them.** Trainers, per-stage templates and
   per-location check-in are wired but invisible. The current state costs a reader time on every
   pass through the form code.
4. **An accessibility pass.** 37 components, no systematic review.
5. **Reconsider `_OPEN_CHECKIN`.** Still `True`. D6 said escalate on evidence, and Phase 5 made
   the evidence worth watching for: check-in counts feed public rankings.
6. **Adopt row colours in the trackers**, if the signal is wanted there. The engine is already
   shared; only the `condition_key` emission is missing.
