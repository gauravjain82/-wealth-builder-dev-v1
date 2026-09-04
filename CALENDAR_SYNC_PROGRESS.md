# Calendar Sync — Frontend Progress & Handover Log

> Living handover log for the **frontend** of the Two-Way, Multi-Calendar Google
> Sync feature. Backend (Phases 1–6) is complete in the `mlm_platform` repo; its
> contract + handover live in `mlm_platform/CALENDAR_SYNC_PROGRESS.md`. Plan
> (target): `~/.claude/plans/tidy-zooming-ocean.md`.

## Status
| Area | Status | Date |
|------|--------|------|
| `calendar-sync` feature module (types/service/hooks) | ✅ Done | 2026-09-04 |
| Components (connection card, source row, sync-now, section) | ✅ Done | 2026-09-04 |
| Settings-page wire-in | ✅ Done | 2026-09-04 |
| Match Up page: button → "Manage calendar sync" link | ✅ Done | 2026-09-04 |
| Retire orphaned `google-sync-card.tsx` | ✅ Done | 2026-09-04 |

## Decisions (locked with user)
- **UI placement:** a "Calendar Sync" glass-section inside the existing Settings
  page (`settings-page.tsx`), **not** a new route/menu item.
- **Match Up card:** the old Connect/Disconnect button is replaced by a
  "Manage calendar sync" link → `/settings#settings-calendar-sync`.

## What's done

New feature module `src/features/calendar-sync/`:
- `types.ts` — DTOs mirroring the backend contract (`CalendarSource`,
  `SourceMappingDTO`, `CalendarSyncStatus`, `PullSummary`, `SyncResult`, …).
- `services/calendar-sync-service.ts` — typed wrappers over `/api/calendarsync/*`
  (`status`, `disconnect`, `listCalendars`, `getSettings`, `updateSettings`,
  `setSourceTarget`, `syncAll`, `syncSource`, `startGoogleOAuth`). Self-contained
  copy of the `request`/`authHeaders`/`parseError` helpers from `matchup-service`.
- `hooks/use-calendar-sync.ts` — TanStack Query hooks + `calendarSyncKeys` factory
  (`useCalendarSyncStatus`, `useCalendarSyncSettings`, `useGoogleCalendars(enabled)`,
  mutations `useUpdateSourceToggles`/`useSetSourceTarget`/`useSyncSource`/`useSyncAll`/
  `useDisconnectGoogle`) + `summarizeSyncResult()`.
- `components/`:
  - `calendar-connection-card.tsx` — connected/not-connected + Connect/Disconnect +
    prominent **re-consent banner** when `needs_reconsent`.
  - `source-calendar-row.tsx` — per-source calendar `<select>` (existing calendars +
    "➕ Create a Wealth Builder calendar"), sync/push/pull checkboxes, per-source
    Sync now, last pushed/pulled hints.
  - `sync-now-button.tsx` — per-source + all-sources variants.
  - `calendar-sync-section.tsx` — the section embedded in Settings; owns data via
    the hooks and handles the `?google_connected=1` OAuth return.
  - `calendar-sync-section.css` — glass/gold styling, dark + light themes.

Modified:
- `src/features/settings/pages/settings-page.tsx` — import + `<CalendarSyncSection />`
  rendered after the "Account Level" section (id `settings-calendar-sync`).
- `src/features/matchup/pages/matchup-page.tsx` — Connect/Disconnect button replaced
  by a link to the settings section; removed the now-dead `connectGoogle`/
  `disconnectGoogle` handlers.
- Deleted `src/features/matchup/components/google-sync-card.tsx` (was orphaned —
  defined but never imported).

## Consumed backend contract
See `mlm_platform/CALENDAR_SYNC_PROGRESS.md` (§ API contract). Key notes baked into
the frontend:
- `GET /calendars/` returns **400** for old-scope/not-connected users →
  `useGoogleCalendars` stays **disabled** until `connected && can_manage_calendars &&
  !needs_reconsent`.
- `POST /sync/<source>/` → `pull` is an **object** summary (not a string).
- OAuth connect reuses the matchup alias `/api/matchup/google/oauth/start/`.

## Learnings & gotchas
- **QueryClientProvider** is wired at `src/infrastructure/query/provider.tsx` (via
  `App.tsx`), so TanStack hooks work app-wide — no extra provider needed.
- **Toasts:** `useToastStore().addToast({ type, message })` from `@/store`.
- **`Button`** (`@shared/components/ui`) variants: `default | secondary | outline |
  ghost | destructive | link`; sizes `sm | default | lg | icon`.
- **`.glass-section` / `.input-field`** are scoped under `.settings-profile-page`, so
  the section only picks up those styles because it renders inside the Settings page.
- `npm run lint` uses `--max-warnings 0`; there is a **pre-existing** warning in
  `settings-page.tsx` (`loadData` exhaustive-deps) unrelated to this change. The new
  files are clean. `npm run type-check` passes.

## OAuth return path (resolved — backend `next` support)
The connect flow now returns the user to the Calendar Sync section:
- Frontend `startGoogleOAuth('/settings#settings-calendar-sync')` sends `?next=` to
  the start endpoint.
- Backend (`matchup/services/google_calendar.py` + `matchup/views.py`) validates the
  path via `safe_next_path()` (root-relative only — blocks open redirects), **seals
  it into the signed OAuth state** (Google echoes `state` verbatim; it drops unknown
  query params), and the callback redirects to
  `FRONTEND_URL + next + ?google_connected=1#fragment`.
- The section's `useEffect` on `?google_connected=1` then fires the success toast +
  status invalidation, and the `#settings-calendar-sync` fragment scrolls to it.
- Backend tests added/updated in `matchup/tests/test_google_sync.py`
  (`GoogleOAuthCallbackTests`, `GoogleOAuthPkceTests`) — all pass.

## Open questions / TODOs
- Manual QA against a staging backend still pending (see plan § Verification).
- Consider extracting the checkbox toggles into a styled switch component if the
  visual language needs to match other toggles later.
