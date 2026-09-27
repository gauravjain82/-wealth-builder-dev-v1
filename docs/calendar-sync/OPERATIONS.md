# Calendar Sync — Operations

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

## 1. Environment and configuration

| Variable | Default | Effect |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | the backend |
| `VITE_FRONTEND_BASE_URL` | — | **not read by this module**, but the backend's `FRONTEND_URL` must match this app's origin or the OAuth callback redirects somewhere the user is not |

Everything else is backend or Google configuration: the OAuth client, the requested scopes,
`FRONTEND_URL`, and the sync engine's behaviour. No client-side configuration exists — the
four sources and their labels come from the API.

## 2. Build and run

Standard ([platform OPERATIONS §2](../platform/OPERATIONS.md#2-build-and-run)). The module has
no route, so it ships inside the `settings` chunk rather than one of its own.

**Local development needs real Google consent.** There is no mock mode. To exercise anything
past the connect button you need a backend with a working OAuth client whose redirect URI
matches your backend, and a `FRONTEND_URL` pointing at your dev server — otherwise consent
succeeds and the callback sends you to the wrong origin.

## 3. Feature flags and rollout

*Not applicable — no capability gates this module.* Connecting your own Google account is not
a privileged action, so every authenticated user sees the section.

The effective gating is Google's, via the three status flags in
[ARCHITECTURE.md §6](ARCHITECTURE.md#6-permissions-and-gating). A scope change on the backend
changes what users can do here with no frontend deploy — and puts previously connected users
into `needs_reconsent`.

## 4. Tests and checks

No automated tests in this repo
([platform OPERATIONS §4](../platform/OPERATIONS.md#4-tests-and-checks)). The backend side is
covered: `matchup/tests/test_google_sync.py` includes `GoogleOAuthCallbackTests` and
`GoogleOAuthPkceTests`, which cover the `next` sealing and the callback — the part of this
flow that is both security-relevant and hardest to verify by hand.

Verified at the time of the original work: `npm run type-check` passes and this module's files
are lint-clean. The repo's 7 lint errors are elsewhere, though note there is a **pre-existing**
`loadData` exhaustive-deps warning in `settings-page.tsx`, the file that hosts this section.

Manual checks after any change here:

1. **Connect** from a disconnected account; land back on the section with the success toast,
   and confirm `google_connected` is **gone from the URL**.
2. **Re-consent** — with an old-scope credential, confirm the banner shows and the target
   pickers are not populated by a failed request.
3. **Target selection** — pick an existing calendar, then `Create a Wealth Builder calendar`;
   confirm the row updates and the new calendar appears in Google.
4. **Toggles** — turn Sync off and confirm Push and Pull become disabled.
5. **Sync now**, per source and all sources; check the toast summary against what changed in
   Google.
6. **Disconnect** and confirm the source rows disappear rather than showing disabled.
7. **Match Up entry** — `/matchup`'s button label reflects the connection state and lands on
   the section, scrolled into view.
8. **Imported events** — on `/matchup`'s calendar, confirm external Google events appear
   tagged `Imported`, and that dismissing one sticks. This path lives in `matchup`, so this
   module's own checks will not catch a regression in it.

## 5. Deployment

Ships with any frontend deploy. Backend phases 1–6 have been complete and live since
2026-09-04; there is no coupled branch.

Two deployment-time hazards, neither visible in this repo:

- **`FRONTEND_URL` mismatch.** The callback builds its redirect from the backend's
  `FRONTEND_URL` plus the sealed `next`. If it points at a different origin — a stale staging
  value, say — consent succeeds and the user lands on the wrong app with
  `?google_connected=1`.
- **Scope changes force re-consent.** Widening the requested scopes puts every existing
  credential into `needs_reconsent`. Users are not signed out and nothing looks broken; they
  simply cannot sync until they reconnect. Expect support contacts, and check the banner
  renders before shipping such a change.

## 6. Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| Connected, but the target pickers are empty | `needs_reconsent` or a narrow scope — the calendar list is deliberately not fetched | `GET /api/calendarsync/status/` for `needs_reconsent` and `can_manage_calendars`. The banner should be showing |
| Connect returns to the wrong app or a blank page | backend `FRONTEND_URL` does not match this origin | the redirect `Location` from the OAuth callback |
| Success toast fires repeatedly | `google_connected` not stripped from the URL | the effect at `calendar-sync-section.tsx:39-46` |
| Consent completes, still shows disconnected | the callback failed before persisting, or `next` was rejected | backend logs for `safe_next_path`; the user returns without `google_connected=1` |
| Section looks unstyled | it was mounted outside the Settings page | `.glass-section` / `.input-field` are scoped under `.settings-profile-page`. Do not mount it elsewhere |
| Toggling Push does nothing | Sync is off, so Push is disabled | the Sync checkbox for that row |
| Sync reports success, nothing appears in Google | no target calendar set, or Push off | the row's `google_calendar_id` and toggles; an unset target is a normal state |
| `Last pulled` never advances | Pull is off for that source, or nothing changed | the toggle first; `PullSummary` counters are omitted when nothing applied |
| Sync summary reads oddly, with zeros | a `PullSummary` counter rendered as `0` when it was absent | absent ≠ zero. See [API.md §3](API.md#3-payload-types) |
| Imported events missing on the calendar | this path runs through `matchup`, with `matchup`'s cache | invalidate there — `calendarSyncKeys.root` will not touch it |
| Worked, now every sync 4xx | the user revoked access at Google | the backend sets `needs_reconsent`; the banner appears after the status query refetches (30 s `staleTime`) |
