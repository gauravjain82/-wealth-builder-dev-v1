# Contests — Phase History

| | |
|---|---|
| **Module** | `contests` |
| **Source** | `src/features/contests/` |
| **Routes** | `/contests`, `/admin/contest-settings`, embedded card |
| **Backend module** | `wbreporting` |
| **API prefix** | `/api/wbreporting/` |
| **Status** | Gated |
| **Doc version** | 1.0 |
| **Verified against** | commit `8880009` — 2026-09-29 (§1, §2 Phase 18, §3 C10/C20/C25/C26 re-read for parity phase 18; §2 Phase 17, §3 C7/C9/C15–C19 and §5 `08eea2c`; the rest `04cbcf3`) |

> Phase numbering and the `C` decision prefix come from `mlm_platform/WB_CONTESTS_PROGRESS.md`
> (phases 0–9, decisions C1–C13) and **must not be renumbered** — the same number means the same
> thing in both repos. Phases 0–5 are backend; the frontend is phases 6 and 8.
>
> Decisions below were locked with the user on 2026-09-25 and each has been **re-verified against the
> code** for this document. Where the code is the authority, it is cited.

## 1. Timeline

4 commits in this repo, 2026-09-25 to 2026-09-26.

| Phase | Date | Status | Shipped |
|---|---|---|---|
| 0–5 | 2026-09 | Shipped (backend) | Analysis, schema, the progress formula, pure services, standings, read APIs, settings writes |
| **6** | 2026-09-25 | **Shipped** | **Frontend: the card, standings, the cell, tier selector, draft filters, four dialogs, the standalone route** |
| 7 | 2026-09-25 | Shipped | Runbook §9 and handoff feedback |
| **8** | 2026-09-25 | **Shipped** | **The settings screen — closed the gap recorded after Phase 7** |
| 9 | 2026-09-26 | Shipped | Existing-contest data import; migrations applied |
| — | 2026-09-26 | Shipped | Tier layout and overflow refinements in CSS |
| 10 | 2026-09-29 | Shipped | Latency check, `npm run perf:contests` (`OPERATIONS.md` §4) |
| **11** | 2026-09-29 | **Shipped** | **Standings speed (backend): coded-only scopes (C22); `uncoded_member_count` removed from the response and the card** |
| **12** | 2026-09-29 | **Shipped** | **Standings speed (frontend): one shared `my-access` query; contest list alongside the access check; other contests prefetched (C24, C25)** |
| **17** | 2026-09-29 | On `feature/wb-contests-parity` | **dtez's scoring (C15–C20): whole-number %, best-% default order, cards over the whole contest, default view All; the editor accepts `C`/`BE`, hides "No level"** |
| **18** | 2026-09-29 | On `feature/wb-contests-parity` | **`/contests` in dtez's layout: title and status line, contests as buttons, an always-visible filter bar with Upline / Leader and "N leaders identified", the contest title row; no banners above the grid; dtez's contest order (C26)** |

**Migrations `0001`–`0003` are applied.** The feature is deployed and gated only by the absence of a
`homev2:read` grant.

## 2. Phases

### Phase 6 — the frontend surfaces (2026-09-25)

**Goal.** Build the reader's board against the Phase 4 read APIs.

**What shipped.** `types/`, `services/`, `hooks/`, and six components: the card, the standings body,
the cell, the tier selector, the draft filters and the four dialogs. `/contests` added as the optional
standalone route behind `ContestsRoute`, with a menu entry beside Home v2 and Leaderboards. The
`CanvaVideoCard` placeholder on `/home-v2` was replaced; `/home` untouched.

**Decisions.** C7, C10, C11.

**What the build learned that the plan had not anticipated** — three findings, all now load-bearing:

- **The host's card size turned out to be an aspect ratio, not a pixel value.** The slot is a
  two-column grid; the Recognition card beside it sets the row height through
  `.carousel-card__image-container { aspect-ratio: 3 / 2 }`, and grid `align-items: stretch` hands that
  height to the contest card. No viewport unit and no magic number — which is why the containment
  contract in `contests.css:1-29` exists and why all three of its rules are required.
- **Narrow versus wide is a *container* query, not a viewport breakpoint.** The card can be narrow on
  a wide screen (two columns) and wide on a narrow one.
- **All four overlays go through the shared `Modal`**, which already portals to `document.body`, so
  the card's `overflow: hidden` cannot clip them.

### Phase 8 — the settings screen (2026-09-25)

**Goal.** Close the gap Phase 7 recorded: the settings endpoints existed with no surface over them.

**What shipped.** `contest-settings.tsx` and `tier-editor.tsx` — contest CRUD, tier editing with all
eleven thresholds, eligibility levels from the host table, period overrides, flyer upload / publish /
remove, hide and soft delete. All under optimistic concurrency.

**Decisions.** C5 (discharged *here*, for the manager), C8, C9.

**Why this phase mattered more than its size suggests.** Decision C5's `BR`/`BP`/`LIC` warning had
reached the agent reading standings but **not the manager typing `BR >= 50`** — which is the moment it
matters, because a contest threshold is a promise about a prize
(`components/tier-editor.tsx:4`).

### Phase 11 — standings speed (2026-09-29)

**Goal.** Standings under 300 ms server time. The work is in the backend
(`mlm_platform/docs/integrations/wb-contests/PARITY_PLAN.md`, Phase 11); every request used to load
the viewer's whole hierarchy, ~200,000 users, to score ~1,100 agents with results.

**What changed here.** `uncoded_member_count` left `StandingsResponse` (`types/index.ts`) and the
applied-filters line in `contests-card.tsx` lost its "N without an agent code" suffix. Nothing else in
the response changed. Coupled with the backend branch of the same name: this side alone still
renders, but the backend alone would leave the card reading an absent field.

**Decisions.** C22.

### Phase 12 — standings speed, frontend request path (2026-09-29)

**Goal.** Fewer requests, no waterfall, and a contest switch served from cache. The brief is
`mlm_platform/docs/integrations/wb-contests/PHASE_12_KICKOFF.md`.

**What was wrong, measured.** On a production build a `/contests` load sent
`/api/wbreporting/my-access/` three times — under `['wb-pipeline', …]`, `['leaderboards', …]` and
`['contests', …]` — and Chrome ran the three **one after another**, because it holds back an
identical in-flight GET until the first completes: 0.3 s, 0.6 s, 0.9 s against a stub, ~0.9 s of
the live critical path. Then the contest list, then standings: five round trips in series before
the first row. `users/me` was fetched **once**; the Phase 10 count of two was `StrictMode` on the
dev server.

**What shipped.**

- `src/shared/wbreporting-access/` — one query over `['wbreporting', 'my-access']`, full payload,
  5 min, `retry: false`. `usePipelineAccess`, `useLeaderboardAccess` and `useContestAccess` are
  selectors over it, same names and shapes ([platform ARCHITECTURE §4](../platform/ARCHITECTURE.md#4-server-state-and-caching)).
  Their three `fetch…Access` service functions were removed. `retry` for the pipeline and
  leaderboards guards went from the global 1 to `false` with it.
- `ContestsRoute` starts the contest list with the access check (`usePrefetchContests`), and
  `PrefetchContests` does the same for `/home-v2` outside `LeaderboardsRoute`.
- `buildStandingsQuery` composes every standings key; `usePrefetchOtherStandings` warms the key a
  switch produces for every other contest, two at a time, on `/contests` only
  ([ARCHITECTURE §3.1a](ARCHITECTURE.md#31a-switching-contest)).
- `perf:contests` gained `--dwell` ([OPERATIONS §4](OPERATIONS.md#4-tests-and-checks)).

**Result, live API (pre-Phase-11 backend), production build, median of 3.**

| | Before | After |
|---|---|---|
| First standings | 6.70 s | 5.74 s |
| Switch, no dwell | 3.98 s | 4.23 s — joins the prefetch still in flight |
| Switch, 10 s dwell | 4.03 s | **0.05 s** |
| API calls before first standings | 11 | 9 |
| `wbreporting/my-access` / `users/me` | 3 / 1 | 1 / 1 |
| Round trips in series to first standings | 5 | 2 |

The first-standings target (< 1 s) waits on the Phase 11 deploy: ~3.9 s of the 5.7 s is the old
backend's standings request.

**Decisions.** C24, C25.

### Phase 17 — dtez's scoring rules (2026-09-29)

Backend and frontend together, because the standings response changed
(`mlm_platform/docs/wbreporting/API.md` §3):
- **Columns and cards:** `tiers` now holds every visible tier with `selected`. The card shows
  only the selected tiers as columns, and every tier as a card with whole-contest counts. This
  fixes the Phase 12 finding that a second tier could not be added.
- **Scores:** percentages are whole numbers. The cell's "cannot be measured" and
  partially-measurable states are gone, and a sourceless requirement is a greyed `0/goal` pill.
- **Defaults:** the view is All, and with no sort tier the rows follow the server's best-%
  order.
- **Editor:** it accepts `C`/`BE` thresholds. Before this, it could not save the four contests
  that require `C`. It no longer offers "No level", and a new tier defaults to everyone.
- **Help text:** it says the same.

`type-check` and `build` pass, and `lint` is 7 errors / 117 warnings, as on `main`. The page
was not driven in a browser, because the backend change is not deployed. The backend proof is
`wb_contest_standings_parity`, 18/18 against dtez's formula.

### Phase 18 — the standalone page shell, contest selector and filter bar (2026-09-29)

**Goal.** `/contests` reads like dtez's `wb_contests.php`; the Home v2 card stays as it was. The
brief is `mlm_platform/docs/integrations/wb-contests/PHASE_18_KICKOFF.md`.

**What shipped.**
- `useContestBoard` (`hooks/use-contest-board.ts`) holds what `ContestsCard` held — contest,
  applied filters, tiers, sort, dialogs, the switch rule — and both placements read it. The shared
  standings region and dialogs are `contest-board-parts.tsx`.
- `ContestsBoard` renders the page: title, status line ("5 contests · N agents"), `?` Help;
  `ContestSelector`, the contests as buttons; `ContestFilterBar`; the contest title row with a
  flyer icon; the tier strip; the standings. No applied-filter line and no team-credit banner: the
  note (C5) is now the `BR`/`BP`/`LIC` pills' tooltip, on both placements, and the proof dialog's
  first line.
- The filter bar: its own person search (Enter applies; an empty box selects nobody), View with
  **SMD base** added, "Direct reports only", Leaders, Agents, Apply, Upline, Leader, and dtez's
  four-part summary line. A person-based view with no person is an inline error with the box
  focused.
- The summary's "N leaders identified" is a new backend field, `leader_count` on the standings
  response (`mlm_platform` `wbreporting`, coupled). It counts what dtez counts: the people somebody
  names as their leader, the Leaders/Agents split. 334 on production, as on dtez.
- The contest list comes in dtez's order (C26), so the page opens on Italy, as dtez does.
- `perf:contests` switches through the buttons when the page has them.

**Measured.** Screenshots of dtez and ours at 1440 × 900 and 390 × 844, Italy, default and with
Nohemi Garcia `85ARG` in Base: same rows, same order of controls. `/home-v2`'s card is
pixel-identical before and after at both widths. `perf:contests` on a production build against the
branch backend (read-only, production data), median of 5: first standings 9.10 s before, 8.86 s
after. Both send 9 calls before first standings, including one `wbreporting/my-access`, and a switch
after a 10 s dwell is 0.05–0.10 s and sends no standings request. The absolute times are the remote
database's, not production's. `type-check` and `build` pass, and `lint` is 7 errors / 117
warnings, as on `main`.

**What the build learned.**
- `/contests`' host has **no bounded height**, before and after: the app shell's main area scrolls,
  and `.wb-ct-scroll` is as tall as its content. So the page scrolls, as dtez's does, and the
  containment contract binds only the Home v2 card.
- The profile endpoint loads the viewer's whole hierarchy (`reader_people`), the cost Phase 11 took
  out of standings. Upline and Leader wait for it: ~50 s locally against production data. Recorded
  for parity phase 20, which owns the dialogs' backend.
- The shared `UserAutocompleteDropdown` cannot serve the bar: its input sits in a portal outside
  any form, so Enter cannot apply and the input cannot be focused from outside.

**Decisions.** C26; the Net label question under C10 is open.

## 3. Decision log

Summarised from `WB_CONTESTS_PROGRESS.md` §Decisions; full text in
`mlm_platform/docs/integrations/wb-contests/IMPACT_ANALYSIS.md` §7. Frontend consequences expanded.

| ID | Decision | Rationale | Source |
|---|---|---|---|
| C1 | Non-License reads `LicensingTracker.is_licensed` via `NOT EXISTS` | Consequence: `slic` counts `agent_approval_date`, a **different column**, so the two can disagree inside one contest. Accepted rather than reconciled, and a backend test asserts they can — so it is not a client bug to fix | `WB_CONTESTS_PROGRESS.md` |
| C2 / C3 / C4 | Keep the five stored statuses and derive three for readers; implement `monthly` on both enums; keep `tr`/`tp`/`te` as columns but **reject them on write** | Readers need three words, operators need five states. `TR`/`TP`/`TE` are result components, so allowing them as thresholds would let a contest require its own output | `types/index.ts:18`; `components/tier-editor.tsx:13` |
| **C5** | Ship all eleven thresholds, and **label `BR`/`BP`/`LIC` as required scope** | They are single-hop `leader_id` measures with no base-shop boundary and read materially lower than the Production Tracker. Labelling is required *on both surfaces*; the editor is the one that matters. **This is the decision that can produce a wrong prize decision if dropped** | `components/tier-editor.tsx:4`; `TierRequirement.single_hop_team` |
| C6 | `mr`/`mp` computed at read time, gated on `WB_MILESTONE_TIMESTAMPS_SINCE` | `DailyResult.mr`/`.mp` stay NULL and the daily calculator is untouched, so the milestone metrics cost nothing when unavailable | `WB_CONTESTS_PROGRESS.md` |
| **C7** | **Never `qualified` while any requirement is unmeasurable.** Show progress over the measurable subset with an explicit count of what could not be measured | Declaring someone qualified on partial data is a prize promise made on a guess. **Amended by C15** (2026-09-29): an unsourced requirement now counts as 0, as on dtez | `TierEvaluation.unmeasured` |
| **C8** | **Taken against the recommendation.** An integer `revision` column, not a round-tripped `updated_at` | Cost: a fourth migration and a save hook on both models. In exchange it matches the client's `types.ts`, which already carried `revision`, and an integer is unambiguous where a timestamp's precision is not | `types/index.ts:262`; `services/contests-service.ts:180` |
| C9 | `accounts.Level` is the single source of truth, **and levels the data contract names but this host lacks are created there** rather than special-cased in contest code | One level table, no contest-specific level logic. `NON` is the one synthetic value (`level_id IS NULL`). **Amended by C19** (2026-09-29): `NON` excludes nobody and is not offered | `EditorOptions.levels` |
| **C10** | `scope=all` resolves through `authz.get_scope`; `net` is shown and **its label must not say "Net Base"** | The contest `net` filter keeps the selected person plus direct reports. Package 2's Net Base is a different rule, and reusing the name would be read as that rule. Labelled **"Direct reports only"**. **Open question (parity phase 18):** dtez labels the box "Net" and its summary "View: Super Team Net". Does parity of the label outrank this decision? Until answered, both placements keep "Direct reports only" | `components/contest-filters.tsx:9`, `components/contest-filter-bar.tsx`; `mlm_platform/docs/integrations/wb-contests/PHASE_18_KICKOFF.md` §4 |
| C11 | `homev2:read` for reads, `wbreporting:manage` for writes | The card lives on the page `homev2:read` already opens, so a separate read permission would be granted to exactly the same people. Configuring is a different job | `router/contests-route.tsx:10` |
| C12 | Inactive people are included | The same accepted divergence as leaderboards' L1 — fidelity to the delivered spec | `StandingRow.is_active` is carried, not filtered |
| C13 | 50 / 200 page sizes; `considered` contests are settings-only | A considered contest is a draft; readers should not see a promise that has not been made | `WB_CONTESTS_PROGRESS.md` |
| **C15** | A requirement with no source counts as **0**, as on dtez. Approved 2026-09-29 | The tier averages lower and cannot qualify while it is required; the pill keeps its reason. The editor accepts `C`/`BE` | `mlm_platform/docs/integrations/wb-contests/PARITY_PLAN.md` (C15) |
| **C16** | With no tier chosen, order by **best %**, then name. Approved 2026-09-29 | dtez's default. No header shows an arrow then (`sort_tier: null`) | PARITY_PLAN (C16) |
| **C17** | List anyone with **activity** on a selected tier, eligible or not. Approved 2026-09-29 | dtez's rule; a row can be all blank cells | PARITY_PLAN (C17) |
| **C18** | **"In running" is everyone listed**, the same on every card; cards never narrow with a selection. Approved 2026-09-29 | dtez's `tierTotals`. `TierSummary.selected` tells columns from cards | PARITY_PLAN (C18) |
| **C19** | Level eligibility is **dtez's `tierAllowed`**. Approved 2026-09-29 | People with no level pass any restriction. The editor hides "No level" and stores exclusions (both decided 2026-09-29) | PARITY_PLAN (C19); `components/tier-editor.tsx` |
| **C20** | Default view **All** (permission-limited, C10 stays); **whole-number** percentages. Approved 2026-09-29 | dtez's initial state and `Math.round` | PARITY_PLAN (C20); `hooks/use-contest-board.ts` `DEFAULT_FILTERS` |
| **C22** | Scope walks load **only users with an agency code**, so an uncoded user in a recruiting chain ends the walk there. Approved 2026-09-29 | The dtez reference does the same, and an uncoded user can never have a result row (D2). Loading them cost ~200,000 rows per request. Consequence here: the "without an agent code" count is gone — it was the only thing that needed the full hierarchy | `mlm_platform/docs/integrations/wb-contests/PARITY_PLAN.md` (Open decisions, C22) |
| **C24** | The card prefetches the other contests' standings on **`/contests` only**, not on `/home-v2`. Taken 2026-09-29 (Phase 12) | `/home-v2` is the landing page for every gated user. Prefetching there costs one background standings request per other contest (four today, ~4 server queries each) on every home visit, paid mostly for switches nobody makes in the compact card. The contest list is still prefetched there, since the card always needs it | `components/contests-card.tsx` (`prefetchOtherContests`); `mlm_platform/docs/integrations/wb-contests/PHASE_12_KICKOFF.md` §6.3 |
| **C25** | **No remembered contest.** The default stays `contests[0]`; the last-viewed contest is not kept in `localStorage`. Taken 2026-09-29 (Phase 12) | Offered as optional by the brief, to take a returning viewer to one round trip. Not needed: access now runs alongside the list, so the path is already two round trips. And it would change which contest a reader lands on — a visible default that Phase 18's contest selector should own, not a speed phase | `mlm_platform/docs/integrations/wb-contests/PHASE_12_KICKOFF.md` §6.2. The default is now set by C26's order |
| **C26** | **The contests come in dtez's order**, and the first is shown: active first, then the earliest qualifying start, contests with none (rolling) last, then name. Taken 2026-09-29 (parity phase 18) | C25 left the default to this phase's selector. dtez lists Italy, Los Cabos, Ed Mylett, Private Reception, Executive Package and opens Italy; ours sorted active-then-name and opened Ed Mylett. One sort key in the list view, so the card and the page agree | `mlm_platform` `wbreporting/views_contests.py` `ContestListView`, `test_contests_come_in_dtez_order`; dtez's `list` response, 2026-09-29 |

## 4. Deliberately not built

- **Client-side aggregation of any kind.** The browser receives evaluations, never result rows
  (`types/index.ts:10`).
- **A client-chosen proof period.** No dates are sent; a browser-supplied window is not authoritative,
  and a client that could choose one could show a number the standings cell never claimed.
- **The word "Restricted" on an ineligible cell.** It reads as a punishment rather than "this tier is
  not for you". The cell is blank to the eye and explicit to a screen reader.
- **Client-side masking or eligibility.** Server-side only, as in leaderboards (L6).
- **`TR`/`TP`/`TE` as threshold inputs.** Result components, not requirements. Not rendered, and
  rejected on write.
- **Package 1's `contests/` CRUD for the editor.** No `revision`, so a save built from it could not
  satisfy the concurrency check.
- **Automatic retry on a save conflict.** Reload instead — retrying is the overwrite C8 exists to
  prevent.
- **Inferring a full tier replacement from the payload shape.** `replace_tiers` is explicit so a
  partial save cannot destroy a tier it did not send.
- **Print styles.** Unlike the Full Report, a contest board is not a handout.
- **Filter state in the URL.** No deep-linking to a filtered board.

## 5. Outstanding

Operational items first — the feature is built and deployed; what remains is mostly not code.

> **Planned: phases 10–21, dtez parity and speed.** Match the reference page at
> `dtez.com/wb_contests.php` in layout, metric definitions and scoring, and cut first
> standings from ~8 s to under 1 s. Tracked in the backend repo at
> `mlm_platform/docs/integrations/wb-contests/PARITY_PLAN.md`; decisions C14–C23 are approved,
> and phases 11–18 are on `feature/wb-contests-parity`.
> Every phase there lists the docs in both repos it must update in the same commit.

1. **Grant `homev2:read`** to the contest rollout group. Until then the feature is invisible, and this
   is the only thing between deployed and live.
2. **Confirm with the business that `BR`, `BP` and `LIC` are understood as direct-report measures**
   before any contest is configured against them (C5). The highest-consequence open item in this
   module: it can produce a wrong prize decision, and no amount of labelling substitutes for the
   conversation.
3. **Set `WB_MILESTONE_TIMESTAMPS_SINCE`** once `tracker/0050` is applied, or `mr`/`mp` report
   unavailable forever (C6).
4. **Confirm whether `CEO` and `EVC` levels are used**; if so add them to `accounts.Level` above `SMD`
   (C9). An operator action.
5. **Consider deep-linkable filter state.** The query model is fully serializable — `StandingsQuery`
   already *is* the cache key — so sharing a filtered board is a small change if anyone asks for it.
6. ~~**Tier multi-select cannot add a second tier**~~ — fixed by parity Phase 17 (C18): the response
   now carries every tier, flagged `selected`, so the selector always shows them all.
7. **Verify the sticky-column table with a screen reader.** The blank-cell accessible text was designed
   carefully; the two-axis scroll region around it has not been checked.
