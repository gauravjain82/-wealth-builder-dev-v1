# Calendar Sync — UI

| | |
|---|---|
| **Module** | `calendar-sync` |
| **Source** | `src/features/calendar-sync/components/` |
| **Routes** | none — a section of `/settings` |
| **Backend module** | `calendarsync` |
| **API prefix** | `/api/calendarsync/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Routes and entry points

**No route.** The module surfaces in three places:

| Entry point | Where | How |
|---|---|---|
| The Calendar Sync section | `/settings`, after "Account Level" | `<CalendarSyncSection />` at `settings-page.tsx:1448`, id `settings-calendar-sync` |
| Deep link to the section | `/settings#settings-calendar-sync` | the fragment scrolls it into view |
| Match Up's entry | `/matchup` | a button navigating to that deep link (`matchup-page.tsx:684`), labelled "Calendar sync: Connected" or "Manage calendar sync" depending on status |
| OAuth return | `/settings?google_connected=1#settings-calendar-sync` | backend redirect target |

Match Up shows the connection state **in the button label** rather than duplicating the
controls. One place manages the connection; everywhere else links to it.

## 2. Screens

### 2.1 The section — `calendar-sync-section.tsx`

Header, connection card, an all-sources Sync now (only when connected), then four source rows.

### 2.2 Connection card — `calendar-connection-card.tsx`

| State | What the user sees |
|---|---|
| Not connected | an explanation and **Connect Google Calendar** |
| Connected | the Google email, and **Disconnect** |
| Needs re-consent | a **prominent banner** above everything, asking the user to reconnect |
| Busy | controls disabled while connecting, disconnecting, or the status query is in flight |

The re-consent banner is prominent by design. The user *is* connected, so without it the
screen would look healthy while every calendar operation failed — see
[ARCHITECTURE.md §6](ARCHITECTURE.md#6-permissions-and-gating).

### 2.3 Source row — `source-calendar-row.tsx`

One row per source: `PERSONAL`, `MATCHUP`, `BPM`, `EVENTS`. Each row is independent.

| Element | Behaviour |
|---|---|
| Source label | from the backend's `label`, e.g. "Match Up training" — not hard-coded here |
| Target calendar `<select>` | the user's existing calendars, plus `➕ Create a Wealth Builder calendar` (`:96`) |
| **Sync** checkbox | the master switch for this source |
| **Push** checkbox | platform → Google. Disabled while Sync is off (`:120`) |
| **Pull** checkbox | Google → platform. Disabled while Sync is off (`:129`) |
| Sync now | per-source; disabled while `sync_enabled` is false (`:71`) |
| Last pushed / Last pulled | humanised timestamps, or a dash (`:137`) |

The create option is in the same `<select>` as the existing calendars rather than behind a
separate button, so "where should this go?" is one decision with one control.

## 3. States

| State | Trigger | What the user sees |
|---|---|---|
| Loading | status query in flight | a loading line in place of the rows (`:90`) |
| Not connected | `connected === false` | the connection card only — **no source rows** (`:92`) |
| Loading settings | connected, settings query in flight | a loading line where the rows will be |
| Ready | connected with mappings | four rows |
| Needs re-consent | `needs_reconsent` | the banner; the calendar list is **not** fetched |
| Calendar list failed | `calendarsQuery.isError && canManage` | an inline error above the rows (`:98`) — shown only when the scope was sufficient, so a 400 from an old scope never lands here |
| Unset target | `google_calendar_id === null` | the `<select>` sits on a placeholder; push has nowhere to go |
| Never synced | `last_pushed_at` / `last_pulled_at` null | a dash rather than a date |
| Saving | a mutation pending | the affected controls disabled |
| Mutation result | success or failure | a toast — never an inline message |

Source rows are hidden entirely while disconnected, rather than shown disabled. There is
nothing useful to configure without a connection, and four dead rows would suggest otherwise.

## 4. Interaction rules

- **Consume the OAuth marker once.** The effect fires the toast, invalidates status, then
  deletes `google_connected` from the search params (`:39-46`). Leaving it would re-toast on
  every re-read.
- **`push` and `pull` follow `sync`.** Both are disabled while the master switch is off, in
  the UI and on the server.
- **Toggles save immediately.** No Save button — each checkbox is a `PUT` with a partial
  update. This is the opposite of the draft-until-apply rule in
  [leaderboards](../leaderboards/UI.md#4-interaction-rules), and correct for the same reason:
  a checkbox has one unambiguous value, while a date range is only meaningful once complete.
- **Report every mutation with a toast.** The controls' effects are invisible — a successful
  push changes a calendar in another tab — so silence would be indistinguishable from failure.
- **Do not fetch the calendar list without the scope.** Decision CS3.
- **Link, do not duplicate.** Match Up navigates here rather than offering its own connect
  button. The orphaned `google-sync-card.tsx` was deleted for this reason.

## 5. Responsive and print behaviour

The section inherits the Settings page's responsive layout. Source rows stack their controls
on narrow widths via `calendar-sync-section.css`; the target `<select>` goes full width.

No print styles. *Not applicable — this is a configuration screen.*

## 6. Accessibility

- Checkboxes use real `<input type="checkbox">` with associated labels, so each toggle is
  reachable and announced.
- The target picker is a native `<select>` — arrow keys and type-ahead work with no custom
  code.
- Disabled states are communicated by the `disabled` attribute, not by styling alone.
- Outcomes arrive as toasts from the shared store.

Two gaps: the loading lines are not `role="status"`, so a screen-reader user gets no
announcement while the section populates; and the emoji in `➕ Create a Wealth Builder
calendar` is read aloud as "plus", which is noise rather than information.

## 7. Styling and theming

One stylesheet, `components/calendar-sync-section.css` — glass/gold surfaces with explicit
dark and light rules.

**The section depends on the Settings page's styles.** `.glass-section` and `.input-field` are
scoped under `.settings-profile-page`, so those classes only resolve because the section
renders inside Settings. Mounting it anywhere else renders it unstyled. This is not obvious
from the component, and it is the constraint that keeps the module route-less — see
[ARCHITECTURE.md §8](ARCHITECTURE.md#8-invariants-and-failure-modes) and decision CS1.
