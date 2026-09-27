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
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Layering

Platform layering ([platform §1](../platform/ARCHITECTURE.md#1-layering)), one file per layer, and
deliberately shaped after `leaderboards` rather than diverging from it — same auth header, same
`{code, detail}` handling, same guarded JSON parse for a proxy that returns HTML
(`services/contests-service.ts:9`).

| Layer | File | Owns |
|---|---|---|
| Types | `types/index.ts` (322) | the wire contract, mirroring `wbreporting/serializers_contests.py` |
| Service | `services/contests-service.ts` (303) | 13 endpoints, `ContestError`, `standingsParams` |
| Hooks | `hooks/use-contests.ts` (194) | 8 queries, 7 mutations, one shared invalidation |
| Components | `components/` (8) | card, standings, cell, tier selector, filters, dialogs, settings, tier editor |
| Pages | `pages/` (2) | thin wrappers — 28 and 17 lines |

Both pages are almost empty on purpose: `/contests` renders the *same* `ContestsCard` the home page
embeds, given a taller box. An expanded placement may show more, but it must not use different
qualification rules, so there is one implementation and no second code path.

## 2. Component map

```
/home-v2 ─── ContestsCard ──┐
                            │   (identical component, different box)
/contests ── ContestsPage ──┘
              └── ContestsCard
                   ├── TierSelector        overview cards = tier toggles
                   ├── ContestFilters      DRAFT state; Apply commits
                   ├── ContestStandings    the only scrolling element
                   │    └── ContestCell    a percentage, pills, or a blank
                   └── 4 dialogs via shared Modal (portals to document.body)
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

## 3. Primary flows

### 3.1 Reading standings

1. `useContests()` lists readable contests for the selector.
2. The card composes a `StandingsQuery` — contest, applied filters, selected tiers, sort tier,
   direction, cursor.
3. `useStandings(query)` puts **the whole query** in the key and fetches, forwarding the signal.
4. The response carries `tiers`, `rows` of `evaluations`, the applied `filters`, `total_rows`,
   `next_cursor`, `near_percent` and display switches. The client renders; it aggregates nothing.

### 3.2 Filtering — draft until Apply

`ContestFilters` owns local draft state and calls `onApply` only when the button is pressed
(`components/contest-filters.tsx:4`). Picking a person from the autocomplete changes the draft, not
the standings. Without this, every keystroke in the person picker would refetch a whole standings
page.

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

Keys are `['contests', <surface>, <input>]`.

| Hook | Key | staleTime | Notes |
|---|---|---|---|
| `useContestAccess` | `[…, 'my-access']` | 5 min, `retry: false` | the guard blocks on it |
| `useContests` | `[…, 'list']` | 60 s | the selector |
| `useStandings` | `[…, 'standings', query]` | **30 s** | the whole query is the key |
| `useProof` | `[…, 'proof', input]` | default | `enabled` on open |
| `useAgentProfile` | `[…, 'profile', input]` | default, `retry: false` | `enabled` on open |
| `useFlyer` | `[…, 'flyer', contestId]` | **10 min** | under the server's 15-minute URL lifetime |
| `useEditorOptions` | `[…, 'editor-options']` | 5 min | host facts |
| `useEditableContests` | `[…, 'editable']` | default | carries the revisions |

Three of those numbers encode a reason:

- **Standings 30 s** — standings move only when the pipeline rebuilds, at most daily. A short window
  avoids refetching the whole page on every tier-toggle round trip.
- **Flyer 10 min** — deliberately under the signed URL's 15-minute lifetime, so a dialog reopened
  later re-signs rather than rendering a dead link.
- **`retry: false`** on access and profile — a denial is an answer, not a transient failure.

All seven settings mutations share one invalidation covering `editable`, `list` **and** `standings`,
because a rename or a hide must reach the reader surfaces too.

## 5. Local and URL state

| State | Owner | Lives in |
|---|---|---|
| Selected contest | `ContestsCard` | `useState` |
| Applied filters | `ContestsCard` | `useState` |
| **Draft** filters | `ContestFilters` | `useState` — never sent until Apply |
| Selected tiers, sort tier, direction | `ContestsCard` | `useState` |
| Cursor / accumulated rows | `ContestsCard` | `useState` |
| Open dialog + its target | `ContestsCard` | `useState` |
| Contest and tier drafts, `pending_delete` | `ContestSettings` | `useState` |

Nothing is in the query string. Neither surface is deep-linkable to a filter state.

## 6. Permissions and gating

| Capability | Read via | Gates |
|---|---|---|
| `can_view_contests` (`homev2:read`) | `useContestAccess` | `/contests`, the card, the menu entry |
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
- **[leaderboards](../leaderboards/)** — same prefix, same `my-access` payload, separate hooks and
  separate cache. The two modules do not share state.
- **`shared/components/ui/modal`** — all four dialogs, because it portals to `document.body`.
- **`shared/components/user-autocomplete-dropdown`** — the person filter.

## 8. Invariants and failure modes

| Invariant | Enforced by | Breaks as |
|---|---|---|
| `progress: null` is never rendered as `0` | the type is `number \| null`; the cell returns `''` | a zero read as a real score |
| An ineligible cell is **blank**, never "Restricted" | server sends `progress: null` and empty `metrics` | a tier that is not for you reading as a punishment |
| A draft filter never reaches the server | `ContestFilters` owns local state | a refetch per keystroke |
| No dates are sent for proof | `fetchProof` builds only three params | a client able to show a number the cell never claimed |
| A save sends every revision | contest + per-tier `revision` | a silent overwrite of someone else's edit |
| `replace_tiers` is explicit | the payload flag | a partial save deleting tiers it never sent |
| A 409 reloads, never retries | the settings screen | the overwrite the revisions exist to prevent |
| Only `.wb-ct-scroll` scrolls | three CSS rules | internal scrolling becoming page growth |
| Dialogs portal out of the card | shared `Modal` | overlays clipped by `overflow: hidden` |
| `TR`/`TP`/`TE` are never threshold inputs | not rendered; backend rejects them | a result component used as a requirement |

**The containment contract** (`contests.css:1-29`) is the one most easily broken by a well-meaning
edit, and it fails *silently*. The host owns the card's height — on `/home-v2` it arrives from a
sibling card's `aspect-ratio: 3 / 2` through grid `align-items: stretch`. Three rules make that work
and **all three are required**:

1. the feature root takes `height: 100%` and `overflow: hidden`;
2. `min-height: 0` appears on **every** flex ancestor between the root and the scroll owner — a flex
   item's default `min-height: auto` refuses to shrink below its content, which is exactly how a
   "scrollable" panel stretches its parent instead;
3. only `.wb-ct-scroll` scrolls, and it owns both axes.

There is deliberately no `vh` unit anywhere and no fixed pixel height. Adding another `flex: 1`
child, or dropping a `min-height: 0`, turns internal scrolling into page growth with no error.

**The threshold that can produce a wrong prize.** `BR`, `BP` and `LIC` count one hop of Leader with
no base-shop boundary and read materially lower than the Production Tracker for the same agent. Both
the reader's standings and the manager's `TierEditor` label this (decision C5), and the editor is the
one that matters — it is the moment somebody types `BR >= 50`. Removing that label is the single
highest-consequence change available in this module.
