# Calendar Sync — Architecture

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

## 1. Layering

Standard ([platform §1](../platform/ARCHITECTURE.md#1-layering)), with no page layer because
the module has no route:

| Layer | File | Owns |
|---|---|---|
| Types | `types.ts` | the DTOs, mirroring the backend contract |
| Service | `services/calendar-sync-service.ts` | eleven endpoints as one object literal |
| Hooks | `hooks/use-calendar-sync.ts` | query keys, toggles, mutations, toasts |
| Components | `components/` (4 + CSS) | the section and its rows |

The service is a **self-contained copy** of the `request` / `authHeaders` / `parseError`
helpers from `matchup-service` (`services/calendar-sync-service.ts:4`). That duplication is
the app-wide pattern described in
[platform §8](../platform/ARCHITECTURE.md#8-invariants-and-failure-modes), not a local choice.

## 2. Component map

```
/settings  (settings-page.tsx:1448)
  └── CalendarSyncSection                     components/calendar-sync-section.tsx
       ├── CalendarConnectionCard             connect · disconnect · re-consent banner
       ├── SyncNowButton (all sources)        shown only when connected
       └── SourceCalendarRow × 4              PERSONAL · MATCHUP · BPM · EVENTS
            ├── target-calendar <select>      existing calendars + "Create a…"
            ├── sync / push / pull checkboxes
            └── SyncNowButton (one source)

matchup/calendar-page.tsx ──┐
matchup/use-matchup-dashboard.ts ──┴──> calendarSyncService.imported*()
```

| File | Role |
|---|---|
| `calendar-sync-section.tsx` | Composition root. Owns the queries, derives `connected` / `canManage`, handles the OAuth return. |
| `calendar-connection-card.tsx` | Connected state, Connect/Disconnect, and the prominent re-consent banner. |
| `source-calendar-row.tsx` | One source: target picker, three toggles, last-pushed/pulled hints, per-source Sync now. |
| `sync-now-button.tsx` | Two variants — one source, or all sources. |
| `calendar-sync-section.css` | Glass/gold styling, dark and light. |

**`matchup` bypasses the hooks and calls the service directly.** Its calendar page and
dashboard hook import `calendarSyncService` rather than a hook from here, so the imported-events
queries live in `matchup` with `matchup`'s cache keys. That keeps this module's hooks focused
on the settings section, at the cost of the imported-events cache being invalidated from two
places.

## 3. Primary flows

### 3.1 Connecting

1. `CalendarConnectionCard`'s Connect calls
   `calendarSyncService.startGoogleOAuth('/settings#settings-calendar-sync')`.
2. That posts to the **`matchup`** OAuth start alias
   (`services/calendar-sync-service.ts:142`) with the return path as `next`.
3. The backend validates the path with `safe_next_path()` — root-relative only, which is what
   blocks an open redirect — and **seals it into the signed OAuth state**, because Google
   echoes `state` verbatim and drops unknown query parameters.
4. The browser goes to Google, the user consents, Google returns to the backend callback.
5. The backend redirects to `FRONTEND_URL + next + '?google_connected=1' + '#fragment'`.
6. `CalendarSyncSection`'s effect sees `google_connected=1`, fires a success toast,
   invalidates the status query, and **strips the parameter from the URL**
   (`components/calendar-sync-section.tsx:39-46`).
7. The `#settings-calendar-sync` fragment scrolls the section into view.

Step 6's cleanup matters: leaving the parameter would re-fire the toast on every later render
that re-reads the search params.

### 3.2 Choosing a target calendar

1. The row's `<select>` lists the user's existing calendars plus
   `➕ Create a Wealth Builder calendar` (`components/source-calendar-row.tsx:96`).
2. Picking an existing one posts `{mode: 'existing', calendar_id, calendar_summary}`;
   picking the create option posts `{mode: 'create'}`.
3. `POST /api/calendarsync/settings/<source>/` returns the updated mapping.
4. `useSetSourceTarget` invalidates both `settings` and `status`, because a new target changes
   the status payload's embedded `sources` too.

### 3.3 Toggling sync, push and pull

1. A checkbox calls `handleToggle(flag, next)` (`source-calendar-row.tsx:63`).
2. `PUT /api/calendarsync/settings/` takes a **partial** per-source update.
3. `push` and `pull` are `disabled` while `sync_enabled` is false (`:120`, `:129`) — the
   master switch gates the two directions in the UI as well as on the server.

### 3.4 Syncing on demand

1. `SyncNowButton` calls `syncSource(source)` or `syncAll()`.
2. `POST /api/calendarsync/sync/[<source>/]` returns `{source, pushed, pull}` — where `pull`
   is an **object summary**, not a string.
3. `summarizeSyncResult` (`hooks/use-calendar-sync.ts:20`) turns that into one sentence for a
   toast.
4. The mutation invalidates `settings`, refreshing the last-pushed and last-pulled hints.

## 4. Server state and caching

Keys come from the `calendarSyncKeys` factory (`hooks/use-calendar-sync.ts:32`), so every
hook and every invalidation names the same thing.

| Hook | Key | staleTime | Notes |
|---|---|---|---|
| `useCalendarSyncStatus` | `keys.status` | 30 s | connection, scopes, and the four mappings |
| `useCalendarSyncSettings` | `keys.settings` | 30 s | the mappings on their own |
| `useGoogleCalendars(enabled)` | `keys.calendars` | 5 min | **conditionally disabled** — see below |

| Mutation | Invalidates |
|---|---|
| `useUpdateSourceToggles` | `settings` + `status` |
| `useSetSourceTarget` | `settings` + `status` |
| `useSyncSource`, `useSyncAll` | `settings` |
| `useDisconnectGoogle` | `keys.root` — everything |

**The disabled calendar list is the important detail.** `useGoogleCalendars` is enabled only
when `connected && can_manage_calendars && !needs_reconsent`
(`components/calendar-sync-section.tsx:34`). The reason is a backend behaviour rather than a
preference: `GET /calendars/` answers **400** for a user whose credential predates the full
`calendar` scope. Fetching unconditionally would show a hard error to exactly the users who
need to see the re-consent banner instead. Decision CS3.

Every mutation surfaces a success or error toast from the hook, not from the component
(`hooks/use-calendar-sync.ts:6`), so the four call sites cannot disagree about wording.

## 5. Local and URL state

| State | Owner | Lives in |
|---|---|---|
| `connecting` | `CalendarSyncSection` | `useState`, while the OAuth URL is being fetched |
| `connected`, `canManage` | derived | computed from the status query each render, never stored |
| OAuth return marker | the URL | `?google_connected=1`, consumed then deleted |
| Scroll target | the URL | `#settings-calendar-sync` |

`canManage` folds two flags into one (`can_manage_calendars && !needs_reconsent`), because
every consumer wants the same combination. Keeping them separate at the type level and joined
at the point of use is deliberate — the section still needs `needs_reconsent` alone, to decide
whether to show the banner.

## 6. Permissions and gating

There is **no capability gate.** Any authenticated user can reach the section, because
connecting your own Google account is not a privileged act.

The real gating is Google's, expressed through three status flags that are easy to conflate:

| Flag | Means | If wrong |
|---|---|---|
| `connected` | a credential exists | the connect button shows when it should not |
| `can_manage_calendars` | the granted scope can list and create calendars | the target picker offers options that will fail |
| `needs_reconsent` | the credential predates the full `calendar` scope | a connection that looks live and silently cannot work |

`needs_reconsent` is the one worth understanding: the user *is* connected, so nothing looks
broken, but no calendar operation can succeed. That is why it gets a prominent banner rather
than an inline hint.

## 7. Integration points

- **`calendarsync`** — ten endpoints ([API.md](API.md)).
- **`matchup`, as a backend app** — the OAuth start alias. The consent flow is shared with
  Match Up's own Google integration, so there is one OAuth client and one callback.
- **`matchup`, as a frontend module** — consumes `calendarSyncService` for imported events,
  and links to this section from its page (`matchup-page.tsx:684`) instead of offering its own
  connect button.
- **`settings`** — hosts the section. The dependency is stylistic as well as structural: see
  §8.
- **`useToastStore`** — every mutation reports through it.

## 8. Invariants and failure modes

| Invariant | Enforced by | Breaks as |
|---|---|---|
| The calendar list is not fetched without the full scope | `enabled` on `useGoogleCalendars` | a 400 shown to users who should see the re-consent banner |
| `?google_connected=1` is consumed exactly once | the effect deletes it after firing | a success toast on every later render |
| The OAuth return path cannot be an open redirect | backend `safe_next_path()`, and sealing `next` into the signed state | a redirect to an attacker's origin after consent |
| `push` and `pull` cannot be on while `sync` is off | `disabled` in the UI, and the server | a source that claims to sync in a direction it does not |
| Every mutation reports its outcome | toasts in the hooks | a silent failure on a control whose effect is invisible |
| One invalidation vocabulary | `calendarSyncKeys` | a stale mapping after a successful save |

**The styling coupling.** `.glass-section` and `.input-field` are scoped under
`.settings-profile-page`, so this section only looks right *because it renders inside the
Settings page*. Mounting `CalendarSyncSection` anywhere else — a route of its own, a modal —
renders it unstyled. This is the strongest technical reason decision CS1 still holds, and it
is invisible from the component's own source.

**The divergence worth knowing.** The imported-events endpoints are consumed from `matchup`,
not from here, so this module's hooks have no knowledge of that cache. A change to imported
events must be invalidated in `matchup`; invalidating `calendarSyncKeys.root` will not do it.
