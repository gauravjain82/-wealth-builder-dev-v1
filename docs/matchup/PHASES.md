# Matchup — Phase History

| | |
|---|---|
| **Module** | `matchup` |
| **Source** | `src/features/matchup/` |
| **Routes** | `/matchup`, `/calendar` |
| **Backend module** | `matchup`, `notifications` |
| **API prefix** | `/api/matchup/`, `/api/notifications/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Phases marked `~` are reconstructed from `git log -- src/features/matchup` (36 commits). **There was no
> single phased plan for this module**; instead there are four focused plan files, each fixing or adding
> one thing. The `M` prefix is assigned by this document.
>
> **Two of those plans describe bugs that are now fixed.** Both were verified against the code for this
> document, and the reasoning is recorded because it is what stops a regression — in one case the broken
> behaviour was reachable and plausible-looking.

## 1. Timeline

36 commits, to 2026-09-25.

| Phase | Date | Status | Shipped |
|---|---|---|---|
| ~1 | ≤ 2026-08 | Shipped | Appointments, the matching workflow, the dashboard, the month calendar |
| ~2 | 2026-08-24 → 08-26 | Shipped | Action permissions, contact handling, completion + follow-up, view modes and sorting |
| ~3 | 2026-08-25 → 09-11 | Shipped | Assign-trainer segment filtering, then **company-wide** search |
| ~4 | 2026-09-04 → 09-05 | Shipped | Form defaults, optional URL, editing from the details modal; `GoogleSyncCard` removed |
| ~5 | 2026-09-15 | Shipped | **Reschedule as a first-class operation**; **imported Google events** on the calendar |
| ~6 | 2026-09-25 | Shipped | BPM v2 Phase 4 integration — reschedule / 1-on-1 from Guest Invites |
| ~7 | 2026-10-08 | Shipped | Appointment metrics page (`479a427`), then its visual redesign: phase 1 (`ab12c47`) hero band, attention strip, stacked step bars; phase 2 scannable rows table and prospect journey track + timeline |

## 2. Phases

### ~2 — permissions, completion and follow-up (2026-08-24 → 2026-08-26)

**What shipped.** Action permissions on the dashboard; improved contact handling in the form; the
completion modal with a follow-up prompt; view modes and sorting.

**Decisions.** M1.

**A fix worth noting from this phase**: "Fix logic for displaying follow-up appointment prompt" — the
prompt was appearing when it should not. Completion and follow-up are related but not the same action.

### ~3 — trainer search widens (2026-08-25 → 2026-09-11)

**What shipped.** Segment filtering on the assign modal first, then **company-wide search**.

**Decision.** M4. The ordering matters: the filter came before the widening, so narrowing was available
before the haystack got bigger.

### ~4 — the Google card is removed (2026-09-04)

**What shipped.** Form defaults for the appointment kind, the URL field marked optional, editing from the
details modal — and **`GoogleSyncCard` deleted**.

That deletion is the same event recorded in [calendar-sync](../calendar-sync/PHASES.md#2-phases) as
decision CS2: two places to connect one Google account is two places to disagree about its state. Match Up
now links to Settings instead.

### ~5 — reschedule, and imported events (2026-09-15)

The most consequential phase, and the one that fixed a real bug.

**Reschedule.** `RescheduleAppointmentModal` was added, along with `canReschedule` as a shared predicate,
and the dedicated backend endpoint was finally called.

**What was wrong before.** The reschedule button re-opened the **generic edit form**, which saved through
`PATCH /appointments/{id}/`. The dedicated endpoint already existed and behaved correctly — updating the
row in place, writing an `AppointmentReschedule` record, setting `RESCHEDULED`, notifying, and sending
Google an **update**. `matchupService.reschedule()` existed with **zero callers**: dead code beside a
button that did the wrong thing. The visible symptom was an appointment that behaved as though it had been
cancelled and recreated.

**Decisions.** M2.

**Imported Google events.** `importedToCalendarItem` maps a `calendar-sync` `ImportedEvent` onto the
calendar shape with a **negative id**.

**Decisions.** M5, M6.

### ~6 — BPM integration (2026-09-25)

BPM v2's Phase 4 work reached this module: a guest can be rescheduled or turned into a 1-on-1 from Guest
Invites, which is how a BPM guest becomes an appointment.

### The kind-change fix

Not a dated phase in this repo's history, but present in the code and worth its own entry.

**What was wrong.** Flipping `kind` between `PERSONAL` and `REQUEST_TRAINER` was **reachable and silently
broken**. The dropdown was editable on edit and `PATCH` accepted `kind`, but the update path did not look
at it — and because `status`, `assigned_to` and `assigned_by` are server-set at create time, a flip
changed the label and left the lifecycle fields stale:

- **`PERSONAL` → `REQUEST_TRAINER`**: stayed `ACCEPTED` with `assigned_to` = the creator. It never entered
  the request queue and **assigners were never notified** — a personal appointment wearing a "Request
  Trainer" label.
- **`REQUEST_TRAINER` → `PERSONAL`**: if a trainer had already accepted, `assigned_to` stayed that
  trainer, so the "personal" event lived on the **trainer's** Google calendar.

**What the code does now.** `appointment-form-modal.tsx:417` renders a `role="note"` block whenever
`kindChanged`, stating exactly what the change will do. **Decisions.** M3.

## 3. Decision log

| ID | Decision | Rationale | Source |
|---|---|---|---|
| M1 | The action-required queues are **computed server-side** and returned as three arrays with `can_view` / `can_take_action` | "What is waiting on me" is a permission-and-scope question, not a filter over a list the client already has. Returning the queues means the panel cannot disagree with the backend about what needs doing | `types.ts` `MatchupActionRequiredResponse`; `components/action-required-panel.tsx` |
| **M2** | **Reschedule is a dedicated operation with its own endpoint and modal — never the generic edit form** | The edit form's `PATCH` moved the time but wrote no audit record and made Google delete-and-recreate the event. The dedicated endpoint updates in place, records an `AppointmentReschedule`, sets `RESCHEDULED`, notifies, and sends Google an *update*. `canReschedule` is exported from the modal so all four entry points share one predicate | `~/.claude/plans/concurrent-orbiting-wren.md`; `components/reschedule-appointment-modal.tsx:8` |
| **M3** | **A kind change warns the user before it acts, and the server applies the consequences** | The flip was reachable and produced inconsistent half-states — an unqueued "request", or a "personal" event on a trainer's calendar. The client cannot fix that because `status` and `assigned_to` are server-set; what it can do is say plainly what will happen | `~/.claude/plans/appointment-type-change.md`; `components/appointment-form-modal.tsx:417` |
| M4 | Trainer search is **company-wide**, with segment filtering | An assigner often needs a trainer from outside their own base shop, so the usual downline scope is too narrow. The segment filter shipped *first*, so the widening did not make the list unusable | commits 2026-08-25, 2026-09-11 |
| **M5** | **An imported Google event gets a negative id** (`-block_id`) | It must render beside appointments in a keyed list, and every consumer already compares numeric ids. A negative id stays numeric and **cannot collide** with a real appointment, which a wrapper type or a string id would have required rewriting everything to achieve | `hooks/use-matchup-dashboard.ts:16` |
| M6 | `source: 'IMPORTED'` is the single branch every consumer checks | One flag, so "is this editable" has one answer | `hooks/use-matchup-dashboard.ts` |
| M7 | Status **labels and colours come from the server** | `MatchupStatusMeta` carries value, label and colour, so adding a status or recolouring one needs no frontend release, and the badge cannot drift from the backend's vocabulary | `types.ts` `MatchupStatusMeta`; `/appointments/statuses/` |
| M8 | Time helpers live in the **service**, not a `utils/` module | `browserTimezone`, `formatAppointmentTime`, `localDateTimeValue` are used by six modals. Keeping them beside the client that sends the timestamps means one timezone convention rather than one per modal | `services/matchup-service.ts` |
| **M10** | **The metrics hero shows FNA, AMA and Sale as branches of "showed up", never as a chain with stage-to-stage conversion** | They are independent yes/no answers on the results form. AMA (joined as an agent) and Sale (became a client) are parallel outcomes, and the backend's own leadership funnel lists Clients *before* AMA. A Booked → Showed → FNA → AMA → Sale chain would print conversions that describe nothing. Each is therefore a share of those who showed up, computed client-side; the rows table's AMA rate stays the backend's share of all booked | `mlm_platform` `matchup/services/metrics.py` `RESULT_FLAGS`, `funnel()`; `metrics/components/outcome-hero.tsx` |
| M11 | Fixable problems (form pending, no trainer) sit in their **own attention strip**, not beside the results | They are work someone can do today, not outcomes; as equal-weight tiles they read like results. Each item sorts the rows table by its column, so the strip answers "who" as well as "how many" | `metrics/components/attention-strip.tsx` |
| M12 | Metrics rows with **fewer than 5 booked are not shaded, ranked, or allowed to top a rate sort** | A 3-of-3 row reads as a 100% show rate and would outrank every real team. Its numbers stay visible (muted, italic, with a tooltip saying why); it simply sinks to the bottom of a rate sort in either direction | `metrics/components/rows-table.tsx` `MIN_RATED` |
| M9 | The Google connection is **linked to, not controlled here** | Shared with `calendar-sync`'s CS2. The orphaned `GoogleSyncCard` was deleted rather than wired up | commit 2026-09-04; `pages/matchup-page.tsx:684` |

## 4. Deliberately not built

- **Rescheduling through the edit form.** M2 — the whole point is that it is a different operation.
- **A client-side status machine.** The backend owns transitions; `canReschedule` mirrors one row of that
  table and nothing more.
- **Client-side consequences of a kind change.** M3 — the client warns, the server acts.
- **A wrapper or union type for calendar items.** M5 — the negative id avoids it.
- **Connect/disconnect controls for Google.** M9.
- **Imported-event hooks in `calendar-sync`.** They live here, by that module's decision CS6.
- **A capability guard on the routes.** Authorization is server-side and surfaces through the
  action-required payload.
- **Print styles.** Export is server-side.

## 5. Outstanding

1. **Keep the four reschedule entry points on one predicate.** `canReschedule` is exported precisely so
   they cannot drift, and the bug M2 fixed was exactly one entry point doing something different. Any new
   entry point must use it — this is first because it is the regression this module has actually had.
2. **Shrink or document `matchup-page.css`.** 2,178 lines, the largest module stylesheet in the app, with
   `matchup-*` classes by convention and **no documented containment contract** — unlike `contests.css`
   and `gms.css`, which both state theirs. A reader editing it has no stated rules to follow.
3. **Resolve the imported-event cache split.** They are fetched here and owned by `calendar-sync`, so
   neither module's invalidation reaches the other. Both docs record it; nobody owns it.
4. **Keyboard navigation for the month calendar.** The grid is pointer-only.
5. **Consider React Query.** One hook holds seven kinds of server state with `useEffect`; the same
   trade-off as `bpm` and `team`, at a smaller scale and so a cheaper place to try it first.
