# Contests — Architecture

| | |
|---|---|
| **Module** | `contests` |
| **Source** | `src/features/contests/` |
| **Routes** | `/contests`, `/admin/contest-settings`, embedded card |
| **Backend module** | `wbreporting` |
| **API prefix** | `/api/wbreporting/` |
| **Status** | Gated |
| **Doc version** | 1.0 |
| **Verified against** | commit `83119fc` + phase 20 working tree — 2026-09-29 (§3.4 and §8 re-read for parity phase 20; §2 `66fba39`; §1, §3.1–§3.2, §4, §5, §7 `8880009`; §6 `04cbcf3`; the rest `7e3b7f1`) |

## 1. Layering

Platform layering ([platform §1](../platform/ARCHITECTURE.md#1-layering)), one file per layer, and
deliberately shaped after `leaderboards` rather than diverging from it — same auth header, same
`{code, detail}` handling, same guarded JSON parse for a proxy that returns HTML
(`services/contests-service.ts:9`).

| Layer | File | Owns |
|---|---|---|
| Types | `types/index.ts` (356) | the wire contract, mirroring `wbreporting/serializers_contests.py` |
| Service | `services/contests-service.ts` (334) | 13 `wbreporting` endpoints plus the `accounts/users/` person search, `ContestError`, `standingsParams` |
| Hooks | `hooks/use-contests.ts` | 8 queries + the access selector, 2 prefetches, the person lookup, `buildStandingsQuery`, 7 mutations, one shared invalidation |
| | `hooks/use-contest-board.ts` | the board's state — contest, applied filters, tiers, sort, dialogs — and the switch rule, for both placements |
| Components | `components/` (12, plus `scope-options.ts`) | card, board, board parts, contest selector, filter bar, standings, cell, tier selector, filters modal, dialogs, settings, tier editor |
| Pages | `pages/` (2) | thin wrappers — 30 and 17 lines |

Both pages are almost empty on purpose. `/contests` renders `ContestsBoard` and `/home-v2` embeds
`ContestsCard`; both read `useContestBoard`, so an expanded placement may show more but cannot use
different qualification rules. The two differ only in the rows they arrange around the shared
standings region and dialogs (`contest-board-parts.tsx`).

## 2. Component map

```
                useContestBoard   one state: contest, applied filters, tiers, sort, dialogs
                 │                (switchContest resets tiers + sort, keeps filters + direction)
/home-v2 ─── ContestsCard                     compact; unchanged by parity phases 18 and 19
              ├── <select> of contests · Flyer / Filters / Help pills
              ├── TierSelector
              ├── applied-filter line · team-credit note
              ├── ContestFilters (in a Modal)  DRAFT state; Apply commits
              ├── StandingsRegion ──┐  variant "card"
              │    └── ContestStandings   table + cards; the only scrolling element
              │         └── ContestCell   a percentage, pills, or a blank
              └── BoardDialogs ─────┤  contest-board-parts.tsx, shared
                                    │
/contests ── ContestsPage           │
              └── ContestsBoard     │          dtez's layout, parity phase 18
                   ├── title · status line · ? Help
                   ├── ContestSelector         contests as buttons
                   ├── ContestFilterBar        DRAFT state; Apply / Enter commits;
                   │                           Upline / Leader via useAgentProfile
                   ├── contest title row       name · status · period · view · flyer icon
                   ├── TierCards               dtez's tier cards = tier toggles; sticky strip on a phone
                   ├── StandingsRegion ─────────┤  variant "page", parity phase 19
                   │    └── ContestResults     dtez's one grid; one card per agent on a phone
                   │         └── ResultCell    "Tier: state · N%", tinted, pills; or a blank
                   └── BoardDialogs ────────────┘  4 dialogs via shared Modal (portals to document.body)

contest-format.ts   formatPercent · formatAmount · pillTitle (C5 / C15) · toggleTier, for both
                        ├── proof     ── useProof      (enabled on open)
                        ├── profile   ── useAgentProfile
                        ├── flyer     ── useFlyer
                        └── Help

/admin/contest-settings ── ContestSettingsPage
                            └── ContestSettings
                                 └── TierEditor  × n
```

Guards: `ContestsRoute` on `can_view_contests`, `ContestSettingsRoute` on `can_manage`. A reader who
opens the settings URL is sent back to `/contests` rather than to a 403 they can do nothing about.
`/home-v2` sits behind `LeaderboardsRoute`, wrapped in `PrefetchContests` (`router/contests-route.tsx`)
so the contest list starts before that guard resolves.

## 3. Primary flows

### 3.1 Reading standings

Request order on `/contests` (Phase 12):

```
t0 ─┬─ my-access  (shared key; ContestsRoute blocks on it)
    └─ contest list (usePrefetchContests in ContestsRoute — not after the guard)
         └─ standings for contests[0]  (the card, once the list and the page chunk are in)
              └─ other contests' standings, two at a time  (usePrefetchOtherStandings)
```

Two round trips on the critical path to first standings — list, then standings — with the access
check alongside the list, not ahead of it. The list goes out before the guard has decided, which is
safe because the guard decides rendering, not permission: an ungranted caller gets a 403 and a
redirect.

1. `useContests()` lists readable contests for the selector; on `/contests` and `/home-v2` it finds
   the guard's prefetch already in flight (same `contestListOptions`, same key). The backend sends
   them in dtez's order (C26); the default contest is `contests[0]`.
2. `useContestBoard` composes a `StandingsQuery` with **`buildStandingsQuery`** — contest, applied
   filters, selected tiers, sort tier, direction.
3. `useStandings(query)` puts **the whole query** in the key and fetches, forwarding the signal.
4. The response carries `tiers`, `rows` of `evaluations`, the applied `filters`, `total_rows`,
   `next_cursor`, `near_percent` and display switches. The client renders; it aggregates nothing.

### 3.1a Switching contest

A switch sets the contest, **keeps** the applied filters and direction, and **resets** the selected
tiers to `[]` and the sort tier to `null`. So the key a switch produces is exactly

```
buildStandingsQuery({ filters, contestId: other, tierIds: [], sortTier: null, direction })
```

On `/contests` (`prefetchOtherContests`), once the first standings have been shown,
`usePrefetchOtherStandings` warms that key for every other contest in the list, two at a time
(`PREFETCH_CONCURRENCY`), through the same `standingsOptions` and with the signal forwarded. A switch
is then served from cache; one made before its prefetch has finished joins the request in flight
rather than sending a second. The card and the prefetch both call `buildStandingsQuery`, and the
switch handler carries a comment tying the two together: a key that differs by one field is a
silent cache miss.

When the applied filters or the direction change, the prefetch starts over for the new keys and
cancels any old one still in flight that nothing is observing. A switch alone does not restart it.
The latch that enables it (`firstStandingsShown`) stays on after the first success, so a tier toggle
does not stop and restart the prefetch.

On `/home-v2` the card does **not** prefetch other contests (decision C24).

### 3.2 Filtering — draft until Apply

`ContestFilters` (the card's modal) and `ContestFilterBar` (the page's bar) each own local draft
state and call `onApply` only on Apply, or Enter in the bar's search box. Picking a person changes
the draft, not the standings. Without this, every keystroke in the person picker would refetch a
whole standings page.

The bar's search box asks `accounts/users/` for suggestions (`usePersonSearch`, debounced 300 ms,
key `['contests', 'people', term]`). On Apply it resolves the typed text through the same key
(`useFindPeople`, a `fetchQuery`), so an Enter before the suggestions arrive still finds the
person, and an Enter after them costs no request. An empty box resolves to nobody. A person-based
view with nobody is refused in the browser, with the error under the bar and the box focused.

Upline and Leader read the applied person's profile (`useAgentProfile`) through the **first**
contest rather than the shown one: the profile does not depend on the contest, so a switch does
not refetch it. They apply the rest of the draft with the new person, as dtez does.

### 3.3 Tier selection — the three-state gesture

Implemented exactly as specified (`components/tier-selector.tsx:4`):

- nothing selected → every visible tier is shown;
- one or more selected → only those;
- toggling the **last** selected tier off → back to all.

The third rule is what makes the gesture reversible without a separate "clear" control, and it is why
"none selected" and "all selected" are the same instruction rather than opposites. `aria-pressed`
carries the state.

### 3.4 Opening proof

1. A cell's metric pill raises a proof target.
2. `useProof` is `enabled`-gated on the dialog being open, so opening the card does not fetch four
   dialogs' worth of data.
3. The request sends `agent_id`, `tier_id`, `metric` and an optional cursor — **and no dates.**

**No dates is a deliberate boundary.** A browser-supplied window is not authoritative, and a client
that could choose one could show a number the standings cell never claimed
(`services/contests-service.ts:130`). The server resolves the period from the tier.

4. The dialog renders the server's `columns` in one of dtez's three shapes (recruits, points per
   policy, events; [UI.md §2.6](UI.md#26-dialogs--componentscontest-dialogstsx)). It adds no
   arithmetic: `source_total` is computed by the server over **every** source row, so the summary
   is the metric's value even when the table is the first 1,000 rows.
5. A person in the table opens the profile **on top of** the proof (parity phase 20):
   `BoardDialogs` passes `dialogs.openProfile` straight through and no longer closes the proof. The
   profile's `Modal` mounts after the proof's, so its portal sits above it, and the shared `Modal`'s
   stack sends Escape to the top dialog only.
6. `{ }` appears only when the response carries `sql`, which the server includes for
   `wbreporting:manage` holders only. Hiding the button is not the gate — the key's absence is.

### 3.5 Saving a contest

1. `useEditableContests` supplies contests **with `revision` tokens** — from
   `/contest-settings/contests/`, not Package 1's CRUD, because that serializer has no revision.
2. The editor holds contest and tier drafts, marking removals `pending_delete`.
3. A save PUTs the complete tier collection **plus an explicit `replace_tiers`**.
4. On success every settings mutation runs one shared invalidation: `editable`, `list` and
   `standings`.
5. On 409 `edit_conflict` the screen says so and offers **Reload**.

Two rules here are load-bearing:

- **`replace_tiers` must be explicit.** The backend deletes omitted tiers only when told to, so a
  partial save cannot destroy a tier it simply did not send.
- **A 409 is not retried.** Retrying would be exactly the silent overwrite the concurrency model
  exists to prevent (`components/contest-settings.tsx:8`).

## 4. Server state and caching

Keys are `['contests', <surface>, <input>]`, except access, which is the shared shell entry.

| Hook | Key | staleTime | Notes |
|---|---|---|---|
| `useContestAccess` | `['wbreporting', 'my-access']` (shared) | 5 min, `retry: false` | a `select` over `useWbReportingAccess` ([platform §4](../platform/ARCHITECTURE.md#4-server-state-and-caching)); the guard blocks on it |
| `useContests` / `usePrefetchContests` | `[…, 'list']` | 60 s | the selector; one `contestListOptions` for both |
| `usePersonSearch` / `useFindPeople` | `[…, 'people', term]` | 60 s | the page's person search; `enabled` on a non-empty term; the lookup on Apply reads the same entry |
| `useStandings` / `usePrefetchOtherStandings` | `[…, 'standings', query]` | **30 s** | the whole query is the key; one `standingsOptions` for both |
| `useProof` | `[…, 'proof', input]` | default | `enabled` on open |
| `useAgentProfile` | `[…, 'profile', input]` | default, `retry: false` | `enabled` on open; on `/contests` also for the applied person, for Upline / Leader |
| `useFlyer` | `[…, 'flyer', contestId]` | **10 min** | under the server's 15-minute URL lifetime |
| `useEditorOptions` | `[…, 'editor-options']` | 5 min | host facts |
| `useEditableContests` | `[…, 'editable']` | default | carries the revisions |

Three of those numbers encode a reason:

- **Standings 30 s** — standings move only when the pipeline rebuilds, at most daily. A short window
  avoids refetching the whole page on every tier-toggle round trip.
- **Flyer 10 min** — deliberately under the signed URL's 15-minute lifetime, so a dialog reopened
  later re-signs rather than rendering a dead link.
- **`retry: false`** on access and profile — a denial is an answer, not a transient failure.

A prefetched standings entry is fresh for the same 30 s. A switch made later still renders the cached
page at once and refreshes it in the background ("Updating…").

All seven settings mutations share one invalidation covering `editable`, `list` **and** `standings`,
because a rename or a hide must reach the reader surfaces too.

## 5. Local and URL state

| State | Owner | Lives in |
|---|---|---|
| Selected contest | `useContestBoard` | `useState` |
| Applied filters | `useContestBoard` | `useState` |
| **Draft** filters | `ContestFilters` / `ContestFilterBar` | `useState` — never sent until Apply |
| Typed person text, the bar's error | `ContestFilterBar` | `useState` |
| Selected tiers, sort tier, direction | `useContestBoard` | `useState` |
| Cursor / accumulated rows | `useContestBoard` | `useState` |
| Open dialog + its target | `useContestBoard` | `useState` |
| Filters modal open | `ContestsCard` | `useState` |
| Contest and tier drafts, `pending_delete` | `ContestSettings` | `useState` |

Nothing is in the query string. Neither surface is deep-linkable to a filter state.

## 6. Permissions and gating

| Capability | Read via | Gates |
|---|---|---|
| `can_view_contests` (`homev2:read`) | `useContestAccess`, a selector over the shared access query | `/contests`, the card, the menu entry |
| `can_manage` (`wbreporting:manage`) | same payload | `/admin/contest-settings` and every write |

`can_view_contests` rides the **same `homev2:read` grant** as Home v2 and Leaderboards, because the
contest card lives on the page that gate already opens. Configuring a contest is a different job for
a different person, so it takes `wbreporting:manage` — the gate that already owns every other
reporting configuration model.

The backend enforces both independently on every endpoint. Hiding a control decides what is offered,
never what is permitted.

## 7. Integration points

- **`wbreporting`** — 13 endpoints ([API.md](API.md)).
- **`home-v2`** — mounts the card in place of a `CanvaVideoCard` placeholder. `/home` is untouched.
- **[leaderboards](../leaderboards/)** — same prefix and the same `my-access` payload, read from
  one shared cache entry (`@shared/wbreporting-access`) through each module's own selector. Nothing
  else is shared.
- **`shared/components/ui/modal`** — all four dialogs, because it portals to `document.body`.
- **`shared/components/user-autocomplete-dropdown`** — the card modal's person filter. The page's bar
  has its own search box (`contest-filter-bar.tsx`): the shared component renders its input in a
  portal outside any form, so Enter cannot apply and the box cannot be focused from outside.
- **`accounts/users/`** — the page's person search (`searchPeople`), the same query the shared
  component sends: coded users, ten at a time.

## 8. Invariants and failure modes

| Invariant | Enforced by | Breaks as |
|---|---|---|
| `progress: null` is never rendered as `0` | the type is `number \| null`; the cell returns `''` | a zero read as a real score |
| An ineligible cell is **blank**, never "Restricted" | server sends `progress: null` and empty `metrics` | a tier that is not for you reading as a punishment |
| A draft filter never reaches the server | `ContestFilters` owns local state | a refetch per keystroke |
| A prefetched key equals the key a switch produces | both built by `buildStandingsQuery`; `useContestBoard.switchContest` resets tiers and sort tier only | a switch that silently goes back to the network |
| An empty person search selects nobody | `ContestFilterBar` resolves only non-empty text | dtez's bug: Personal with an empty box shows the first person in the list |
| A person-based view is never sent without a person from the page | `ContestFilterBar` refuses it | the backend roots it at the viewer, under a summary saying nobody is selected |
| No dates are sent for proof | `fetchProof` builds only three params | a client able to show a number the cell never claimed |
| A save sends every revision | contest + per-tier `revision` | a silent overwrite of someone else's edit |
| `replace_tiers` is explicit | the payload flag | a partial save deleting tiers it never sent |
| A 409 reloads, never retries | the settings screen | the overwrite the revisions exist to prevent |
| Only `.wb-ct-scroll` scrolls, on `/home-v2` | three CSS rules | internal scrolling becoming page growth. `/contests` has no bounded host, so there the page scrolls, as on dtez |
| On `/contests`, nothing between the tier strip and the app shell's scroller is a scroll container | `.wb-ct--page` and `.wb-ct--page .wb-ct-scroll` are `overflow: visible` (parity phase 19) | the phone's tier strip no longer sticking: `position: sticky` sticks to the nearest scroll container, even one that never scrolls |
| A hidden identity field is absent, not blank | the backend omits `level` and `leader_name` when hidden; `ContestResults` shows a part only when present | "No level" or "Leader: -" shown for everyone when an admin hides the field |
| Dialogs portal out of the card | shared `Modal` | overlays clipped by `overflow: hidden` |
| Escape and a backdrop click close only the top dialog | the shared `Modal`'s open stack; the four contest dialogs pass `dismissible` | a profile over a proof closing both, or a form modal lost to a stray key (the card's Filters modal is not `dismissible`) |
| The proof's SQL never reaches a reader | the backend omits `sql` / `sql_params` without `wbreporting:manage` (tested both ways in `mlm_platform`); the dialog shows `{ }` only when the key exists | dtez's leak: its proof endpoint returns its SQL to anyone |
| The proof's source total is the pill's number | computed server-side over all rows by the metric's own rule; the dialog never sums a page | a truncated page's sum contradicting the grid |
| `TR`/`TP`/`TE` are never threshold inputs | not rendered; backend rejects them | a result component used as a requirement |

**The containment contract** (`contests.css:1-29`) is the one most easily broken by a well-meaning
edit, and it fails *silently*. The host owns the card's height — on `/home-v2` it arrives from a
wrapper of `height: clamp(480px, 70vh, 760px)` that clips (`home-v2-page.tsx`). Three rules make that
work and **all three are required**:

1. the feature root takes `height: 100%` and `overflow: hidden`;
2. `min-height: 0` appears on **every** flex ancestor between the root and the scroll owner — a flex
   item's default `min-height: auto` refuses to shrink below its content, which is exactly how a
   "scrollable" panel stretches its parent instead;
3. only `.wb-ct-scroll` scrolls, and it owns both axes.

There is deliberately no `vh` unit anywhere and no fixed pixel height. Adding another `flex: 1`
child, or dropping a `min-height: 0`, turns internal scrolling into page growth with no error.

**`/contests` sets rules 1 and 3 aside** (parity phase 19). Its host has no bounded height (measured
in phase 18), so `.wb-ct` clipping and `.wb-ct-scroll` scrolling did nothing there except make both
scroll containers, which stopped anything sticking to the page. The page scopes both to `overflow:
visible` under `.wb-ct--page`; the grid scrolls sideways inside `.wb-ct-results`, and on a phone the
tier strip sticks to the top of the app shell's scrolling area. The card's rules are unchanged.

**The threshold that can produce a wrong prize.** `BR`, `BP` and `LIC` count one hop of Leader with
no base-shop boundary and read materially lower than the Production Tracker for the same agent. Both
the reader's standings and the manager's `TierEditor` label this (decision C5), and the editor is the
one that matters — it is the moment somebody types `BR >= 50`. Removing that label is the single
highest-consequence change available in this module.
