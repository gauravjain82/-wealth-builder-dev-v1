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
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Layering

Platform layering ([platform §1](../platform/ARCHITECTURE.md#1-layering)) with **two React
contexts in place of a hooks directory**. There is no `hooks/` folder: shared server state is
held by the providers, and everything else is local to a page.

| Layer | File | Owns |
|---|---|---|
| Types | `types.ts` (859 lines) | the whole domain contract |
| Services | `services/bpm-service.ts`, `public-bpm-service.ts` | ~70 methods, URL building, auth |
| Contexts | `context/bpm-selection-context.tsx`, `bpm-config-context.tsx` | the sticky selection; settings + row-colour rules |
| Pages | `pages/` (9) | one per sub-tool, plus the public pass |
| Components | `components/` (37) | forms, modals, tables, pickers |

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

### The 37 components, by job

| Group | Components |
|---|---|
| Shell & navigation | `bpm-page-shell`, `bpm-occurrence-picker`, `month-jump-modal`, `office-picker` |
| Scheduling | `bpm-form-modal`, `bpm-month-calendar`, `locations-editor`, `occurrence-row-actions`, `status-control`, `event-attachments` |
| Guests | `add-guest-form`, `add-guest-modal`, `guest-list`, `guest-checkin-table`, `duplicate-prospect-dialog`, `transfer-guest-modal`, `reschedule-guest-modal`, `follow-up-guest-modal`, `guest-notes*`, `guest-row-colors` |
| Associates | `invited-associates-card`, `multi-user-select` |
| Check-in | `checkin-stat-cards`, `checkin-window-notice` |
| QR | `bpm-qr-modal`, `bpm-qr-scan-panel`, `my-qr-code-modal`, `guest-pass-modal` |
| Messaging | `send-event-modal`, `guest-message-history` |
| Admin | `bpm-settings-toggles`, `manage-offices-modal`, `office-form-modal`, `interest-options-admin-modal`, `row-color-rules-editor` |

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

1. The occurrence serializer carries `checkin_open` and `checkin_opens_at`; **the client never
   re-derives the window.**
2. `checkin-window-notice` explains a closed window and the check-in controls are disabled —
   including Guest Check-In's **Add & Check in**, which would otherwise be a way around the
   gate.
3. Manual check-in calls `checkInGuest` / `checkInAssociate`.
4. A QR scan posts to `/qr/scan/`, which resolves what was scanned; the outcome line names
   whether a guest or an associate was recorded, because the two land on different lists and a
   mis-scan is otherwise invisible until somebody counts.
5. Undo is always available.

### 3.5 Sending the event to guests

1. `send-event-modal` picks a channel (email or SMS) and a template.
2. `guest-message-history` shows what has already been sent **for this date, before you
   send** — which is what makes the absence of de-duplication defensible.
3. `POST /occurrences/{id}/send-event-to-guests/` returns a per-guest outcome report.

**Pressing send twice sends twice, on purpose.** Suppressing a repeat would be a guess about
intent; showing the history first lets the sender decide.

## 4. Server state and caching

**BPM does not use React Query.** Server state lives in the two contexts and in per-page
`useState`, loaded by `useEffect`.

| State | Held by | Refreshed |
|---|---|---|
| Event list, occurrences, selected occurrence | `BpmSelectionProvider` | on selection change; explicit reload after a mutation |
| Settings, row-colour rules | `BpmConfigProvider` | once per `/bpm` mount, seeded from `sessionStorage` |
| Guests, invites, stats, messages | the page | on mount and after its own mutations |

The consequences are real and worth stating plainly: there is no cache shared between
sub-tools beyond the two contexts, no automatic refetch, no request cancellation, and a
mutation refreshes only what its own page chose to reload. This is the largest module in the
app and the only substantial one outside the platform's React Query convention
([platform §4](../platform/ARCHITECTURE.md#4-server-state-and-caching)). Recorded in
[PHASES.md §5](PHASES.md#5-outstanding) rather than presented as a pattern to copy.

`sessionStorage` is used twice, for the same reason each time — to make the second mount in a
tab render immediately: `wb.bpm.rowColorRules` and the persisted selection.

## 5. Local and URL state

| State | Owner | Lives in |
|---|---|---|
| Selected event, occurrence, `includePast` | `BpmSelectionProvider` | context + `sessionStorage` |
| Sub-tool | the URL | the nested route path |
| Public pass token | the URL | `/bpm/pass/:token` |
| Filters, sorts, pagination | each page | `useState` |
| Modal open/target | the page that owns the modal | `useState` |

`bpmSubToolPath()` (`bpm-selection-context.tsx:358`) builds a sub-tool link that preserves the
selection, so navigation between tools is a route change and not a re-selection.

## 6. Permissions and gating

`GET /api/bpm/events/capabilities/` returns one payload driving every control
(`types.ts:489`):

| Flag | Backend permission | Gates |
|---|---|---|
| `can_read` | — | the module at all |
| `can_create`, `can_update`, `can_delete` | — | event and occurrence CRUD |
| `can_manage_guests` | — | guest add, edit, transfer, reschedule, flags |
| `can_manage_templates` | `bpm_templates:manage` | the interest-options catalog admin |
| `can_manage_schedule` | `bpm_schedule:manage` | CRUD and the status control in BPM Schedule |
| `can_manage_settings` | `bpm_settings:manage` | BPM Settings, including deleted-item recovery |

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

- **`bpm` backend** — 22 endpoints ([API.md](API.md)).
- **`matchup`** — `GET /api/matchup/google/status/` to report calendar connection, and the
  OAuth start alias. BPM never manages the connection itself; that is
  [calendar-sync](../calendar-sync/).
- **`matchup`, as a destination** — `rescheduleGuestToAppointment` hands a guest across into an
  appointment.
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
| A BPM on a day may be several occurrences | callers group by event (`groupByEvent` in the calendar day modal) | the same meeting listed three times, and attendance counted three times |
| The client never re-derives the check-in window | `checkin_open` / `checkin_opens_at` on the serializer | one rule on both sides of the wire, drifting |
| The check-in window opens and never closes | backend `_require_checkin_window`, a **separate** gate | corrections after an event becoming impossible |
| Undo is ungated | no gate on undo | a mistake stranded permanently |
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

**A known stale comment.** `types.ts:687` and `:690` describe `text_event_to_guests` and
`email_event_to_guests` as "a switch for a sender that does not exist yet (D5)", and
`qr_host_to_guest` as "reserved … the switch, not the feature (D8)". **Both senders now
exist** — `bpmService.sendEventToGuests` (`services/bpm-service.ts:316`),
`components/send-event-modal.tsx`, and a guest branch in the QR resolver. D5 and D8 were
reopened and shipped after Phase 8. The comments were not updated. Trust the code.
