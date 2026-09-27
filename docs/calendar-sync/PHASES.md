# Calendar Sync — Phase History

| | |
|---|---|
| **Module** | `calendar-sync` |
| **Source** | `src/features/calendar-sync/` |
| **Routes** | none — a section of `/settings` |
| **Backend module** | `calendarsync` |
| **API prefix** | `/api/calendarsync/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Phase numbering follows `mlm_platform/CALENDAR_SYNC_PROGRESS.md`, where phases 1–6 are
> backend and the frontend work is phases 7–10. It **must not be renumbered** — the same phase
> number means the same thing in both repos. Phase 11 is assigned by this document for work
> that post-dates the handover log.
>
> This module's history is the one case in this repo where a frontend handover log existed:
> the former root `CALENDAR_SYNC_PROGRESS.md`, now in
> [`docs/_archive/`](../_archive/CALENDAR_SYNC_PROGRESS.md). Every claim in it was verified
> against the source for this document and held, which is why it is archived rather than
> superseded. The `CS` decision prefix is assigned here; the log recorded its decisions without
> IDs.

## 1. Timeline

3 commits touching `src/features/calendar-sync`.

| Phase | Date | Status | Shipped |
|---|---|---|---|
| 1–6 | ≤ 2026-09-04 | Shipped (backend) | Credential storage, scope handling, push and pull engines, the API |
| 7–10 | 2026-09-04 | Shipped | The frontend module: types, service, hooks, four components, Settings wire-in, Match Up link, orphan removal |
| 11 | 2026-09-15 | Shipped | Imported external events — three endpoints, consumed from `matchup` |

## 2. Phases

### Phases 7–10 — the frontend module (2026-09-04)

**Goal.** Give the backend's two-way sync a place to be configured.

**What shipped.**
- `types.ts` — DTOs mirroring the backend contract: `CalendarSource`, `SourceMappingDTO`,
  `CalendarSyncStatus`, `PullSummary`, `SyncResult`.
- `services/calendar-sync-service.ts` — typed wrappers over `/api/calendarsync/*`, with a
  self-contained copy of `matchup-service`'s `request` / `authHeaders` / `parseError`.
- `hooks/use-calendar-sync.ts` — the `calendarSyncKeys` factory, three queries, five
  mutations, `summarizeSyncResult`, and toasts on every mutation.
- Four components: the connection card with its re-consent banner, the per-source row, the
  Sync-now button in two variants, and the section that composes them.
- `calendar-sync-section.css` — glass/gold, dark and light.
- Wire-in: `<CalendarSyncSection />` in `settings-page.tsx` after "Account Level".
- `matchup-page.tsx`'s Connect/Disconnect button replaced by a link to the section, and its
  now-dead `connectGoogle` / `disconnectGoogle` handlers removed.
- **Deleted** `src/features/matchup/components/google-sync-card.tsx` — defined but never
  imported.

**Decisions.** CS1, CS2, CS3, CS4, CS5.

**The OAuth return path**, resolved within this phase rather than deferred: the frontend sends
`?next=/settings#settings-calendar-sync` to the start endpoint; the backend validates it with
`safe_next_path()` (root-relative only, which blocks open redirects) and **seals it into the
signed OAuth state**, because Google echoes `state` verbatim and drops unknown query
parameters. The callback redirects to `FRONTEND_URL + next + '?google_connected=1#fragment'`.
Backend tests were added in `matchup/tests/test_google_sync.py`.

**Divergence from plan.** None. The handover log's claims were re-verified for this document —
the eight files, the Settings wire-in, the Match Up link and the deleted orphan are all as
described.

### Phase 11 — imported external events (2026-09-15)

**Goal.** Let the platform see commitments it did not create.

**What shipped.** Three endpoints — `GET /imported/?start=&end=`,
`DELETE /imported/<blockId>/`, `POST /imported/clear/` — plus the `ImportedEvent` and
`ClearImportedResult` types. External Google events are mirrored as busy blocks and shown on
Match Up's calendar tagged `Imported`, where the user can convert one into an appointment or
dismiss it.

**Decisions.** CS6.

**Divergence from plan.** This phase post-dates the handover log entirely, so the log describes
a module with eight endpoints where the code has eleven. **This is the gap that made the log
unsafe to publish as current documentation** — it was accurate on 2026-09-04 and silently
incomplete eleven days later. It is also why these three endpoints have no hook in this module:
the consumers are in `matchup`, so the queries were written there.

## 3. Decision log

| ID | Decision | Rationale | Source |
|---|---|---|---|
| CS1 | A section inside the existing Settings page, **not** a route or menu item | Calendar sync is account configuration, and Settings is where account configuration lives. A fifth top-level nav entry for a screen used twice a year is a poor trade. Reinforced by an accident: `.glass-section` and `.input-field` are scoped under `.settings-profile-page`, so the section only renders correctly inside Settings | archived handover log; `settings-page.tsx:1448` |
| CS2 | Match Up links to the section instead of offering its own controls | Two places to connect the same account is two places to disagree about state. The button label carries the status, so nothing is lost | `matchup-page.tsx:684` |
| CS3 | Do not fetch `/calendars/` unless `connected && can_manage_calendars && !needs_reconsent` | The endpoint answers **400** for old-scope users. Fetching anyway shows a hard error to exactly the users who should be reading the re-consent banner. A known error is designed out, not caught | `hooks/use-calendar-sync.ts:60`; `calendar-sync-section.tsx:34` |
| CS4 | Reuse `matchup`'s OAuth start endpoint rather than adding one | Match Up's Google integration came first. One OAuth client, one consent screen, one callback — two would drift, and the second would be the one nobody tested | `calendar-sync-service.ts:134` |
| CS5 | Seal the OAuth return path into the signed state, validated root-relative | Google echoes `state` verbatim but drops unknown query parameters, so a plain `?next=` would not survive the round trip. Validating root-relative is what stops the parameter becoming an open redirect | backend `safe_next_path()`; `matchup/tests/test_google_sync.py` |
| CS6 | Imported-events queries live in `matchup`, not here | Their only consumers are Match Up's calendar and dashboard. Putting the hooks here would mean this module owning a cache no screen of its own reads. Cost: imported events must be invalidated in `matchup` | `matchup/pages/calendar-page.tsx:5`; `matchup/hooks/use-matchup-dashboard.ts:3` |

## 4. Deliberately not built

- **A route and a menu entry.** Decision CS1.
- **A Connect button in Match Up.** Decision CS2, and the orphaned `google-sync-card.tsx` was
  deleted rather than left for someone to wire up.
- **Client-side scheduled sync.** The client syncs on demand; anything periodic is the
  backend's. A browser tab is the wrong place for a schedule.
- **A styled switch component for the toggles.** Native checkboxes were kept. The handover log
  flagged extracting one *if* the visual language later needs to match other toggles — it has
  not.
- **A hook layer for imported events.** Decision CS6.
- **Per-source scope handling.** Scopes are per credential, not per source, so all four rows
  share one connection state.

## 5. Outstanding

1. **Manual QA against a staging backend.** Carried over from the handover log and still the
   right first item: this module's failure modes are all environmental — `FRONTEND_URL`,
   redirect URIs, scope state — and none of them can be caught by `type-check` or by a local
   run. The eight checks in [OPERATIONS.md §4](OPERATIONS.md#4-tests-and-checks) are the list.
2. **Announce the loading states.** The section's loading lines are not `role="status"`, so a
   screen-reader user gets no announcement while it populates. The rest of the app does this
   correctly.
3. **Drop the emoji from the create option.** `➕ Create a Wealth Builder calendar` is read
   aloud as "plus". A label without it says the same thing.
4. **Reconsider the styling coupling.** The section cannot be mounted outside Settings. That is
   fine while CS1 holds, but it is an invisible constraint — a comment in the component, or
   scoping the classes locally, would stop someone discovering it the hard way.
5. **Consider a styled switch component** — only if other toggles in the app move to one.
   Recorded because the handover log raised it, not because it is needed.
