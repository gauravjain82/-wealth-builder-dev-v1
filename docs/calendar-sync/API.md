# Calendar Sync — API

| | |
|---|---|
| **Module** | `calendar-sync` |
| **Source** | `src/features/calendar-sync/services/calendar-sync-service.ts` |
| **Routes** | none |
| **Backend module** | `calendarsync` → `mlm_platform/docs/calendarsync/API.md` |
| **API prefix** | `/api/calendarsync/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Endpoints **consumed**, not exposed. The backend's own docs are the authority on behaviour;
> this file records what the client sends and reads.

## 1. Conventions

Platform conventions ([platform API §1](../platform/API.md#1-conventions)). The `request` /
`authHeaders` / `parseError` helpers are a self-contained copy of `matchup-service`'s
(`calendar-sync-service.ts:4`), so error handling matches `matchup` rather than
`leaderboards`: failures are thrown as plain `Error`s carrying the backend's message, with no
typed code.

The service is one object literal, `calendarSyncService`, with eleven methods. There is no
class and no instance state.

## 2. Endpoints consumed

Ten under `/api/calendarsync/`, plus one alias under `/api/matchup/`.

| Method | Path | Service method | Hook | Purpose |
|---|---|---|---|---|
| GET | `/status/` | `status` | `useCalendarSyncStatus` | connection, scopes, capability flags, and the four mappings |
| DELETE | `/status/` | `disconnect` | `useDisconnectGoogle` | drop the stored credential |
| GET | `/calendars/` | `listCalendars` | `useGoogleCalendars` | the user's Google calendars. **400 without the full scope** |
| GET | `/settings/` | `getSettings` | `useCalendarSyncSettings` | the four source mappings |
| PUT | `/settings/` | `updateSettings` | `useUpdateSourceToggles` | partial per-source toggle update |
| POST | `/settings/<source>/` | `setSourceTarget` | `useSetSourceTarget` | set a source's target calendar |
| POST | `/sync/` | `syncAll` | `useSyncAll` | sync every enabled source |
| POST | `/sync/<source>/` | `syncSource` | `useSyncSource` | sync one source |
| GET | `/imported/?start=&end=` | `imported` | — (consumed by `matchup`) | external events in a date range |
| DELETE | `/imported/<blockId>/` | `dismissImported` | — (`matchup`) | dismiss one imported event |
| POST | `/imported/clear/` | `clearImported` | — (`matchup`) | clear all imported events |
| POST | `/api/matchup/google/oauth/start/` | `startGoogleOAuth` | — | begin consent; returns `authorization_url` |

Two things this table makes visible:

- **The last three have no hook here.** `matchup`'s calendar page and dashboard hook call the
  service directly with their own query keys — see
  [ARCHITECTURE.md §8](ARCHITECTURE.md#8-invariants-and-failure-modes).
- **OAuth start lives under `matchup`, deliberately** (`calendar-sync-service.ts:134`).
  Match Up's Google integration came first; reusing its endpoint means one OAuth client, one
  consent screen and one callback rather than two that can drift. Start and callback stay
  there on purpose.

## 3. Payload types

All in `src/features/calendar-sync/types.ts`, mirroring the backend contract. The ones that
carry real meaning:

| Type | Note |
|---|---|
| `CalendarSource` | `'PERSONAL' \| 'MATCHUP' \| 'BPM' \| 'EVENTS'` — a closed set |
| `CalendarProvisioning` | `'EXISTING' \| 'APP_CREATED'` — whether the platform made the calendar |
| `CalendarSyncStatus` | `connected`, `needs_reconsent`, `can_manage_calendars`, `scopes`, plus embedded `sources` |
| `SourceMappingDTO` | one source's target, its three toggles, `allow_primary_fallback`, `creates_own_calendar`, and the two timestamps |
| `SetSourceTargetBody` | a **discriminated union**: `{mode:'existing', calendar_id, …}` or `{mode:'create'}` |
| `PullSummary` | eight optional counters — `changes`, `reflected`, `deleted`, `repushed`, `skipped`, `external`, `busy_imported`, `busy_removed` |
| `SyncResult` | `{source, pushed, pull}` — `pull` is the **object** above, not a string |
| `ImportedEvent` | one external Google event, mirrored as a busy block |

Three field-level details that have caused bugs:

1. **`pull` is an object.** An earlier contract had it as a string. `summarizeSyncResult`
   (`hooks/use-calendar-sync.ts:20`) is the only place that flattens it.
2. **`PullSummary`'s counters are all optional.** Absent is not zero — the engine reports only
   what applied. Do not render a missing counter as `0`.
3. **`google_calendar_id` is nullable.** A source with no target is a normal state, not an
   error.

## 4. Query parameters

| Parameter | Values | Built by |
|---|---|---|
| `start`, `end` | ISO dates, both required | `imported(start, end)`, URI-encoded (`:116`) |
| `next` | a root-relative path | `startGoogleOAuth(next)` |

`next` is the one to be careful with. It is validated server-side by `safe_next_path()` —
root-relative only — and then **sealed into the signed OAuth state**, because Google echoes
`state` verbatim but drops unknown query parameters. Passing an absolute URL does not produce a
redirect elsewhere; it is rejected.

`<source>` is a path segment, not a query parameter, normalised by `sourcePath()` (`:101`).

## 5. Error codes and handling

No stable codes. `parseError` yields a string; the hooks surface it as a toast.

| Situation | Status | Client behaviour |
|---|---|---|
| Not connected, or credential predates the full scope, on `GET /calendars/` | **400** | **prevented, not handled.** `useGoogleCalendars` stays disabled until `connected && can_manage_calendars && !needs_reconsent` |
| Calendar list fails with a sufficient scope | any | inline error above the rows (`calendar-sync-section.tsx:98`) |
| A toggle or target save fails | any | error toast; the query refetches, so the control reverts to server truth |
| A sync fails | any | error toast. Partial success is normal — `pushed` and `pull` are independent |
| Consent declined at Google | — | the user returns without `google_connected=1`; nothing fires, status stays disconnected |
| Token revoked at Google | 4xx on the next sync | surfaces as a sync error. The backend sets `needs_reconsent`, and the banner appears after the status refetch |

The first row is the module's defining error decision: a known-400 case is designed out with
an `enabled` guard rather than caught and displayed. Decision CS3.

## 6. Backend ownership

`calendarsync` owns:

- **The Google credential and every Google API call.** The client never holds a token or talks
  to Google directly.
- **Scope evaluation** — `can_manage_calendars` and `needs_reconsent` are the backend's
  reading of the granted scopes, not the client's.
- **The sync engines.** Push and pull semantics, conflict resolution, what counts as external,
  and every counter in `PullSummary`.
- **Calendar provisioning** — creating and branding an `APP_CREATED` calendar.
- **OAuth return-path safety** — `safe_next_path()` plus sealing `next` into the signed state.
- **The source list and its labels.** Four sources and their display names come from the
  backend; the client renders `label` rather than a hard-coded string.

The client owns the section's layout, which controls are offered, when not to call
`/calendars/`, and consuming the OAuth return marker exactly once.
