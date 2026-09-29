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
| **Verified against** | commit `83119fc` + phase 20 working tree — 2026-09-29 (§1, §2 Phase 20, §3 C29–C30 for parity phase 20; §2 Phase 19 and §5 re-measured after the deploy `2d8cbd8`; §1, §3 C28 `66fba39`; §2 Phase 18, §3 C10/C20/C25/C26 `8880009`; §2 Phase 17, §3 C7/C9/C15–C19 `08eea2c`; the rest `04cbcf3`) |

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
| **17** | 2026-09-29 | Deployed 2026-09-29 (PR #14) | **dtez's scoring (C15–C20): whole-number %, best-% default order, cards over the whole contest, default view All; the editor accepts `C`/`BE`, hides "No level"** |
| **18** | 2026-09-29 | Deployed 2026-09-29 (PR #14) | **`/contests` in dtez's layout: title and status line, contests as buttons, an always-visible filter bar with Upline / Leader and "N leaders identified", the contest title row; no banners above the grid; dtez's contest order (C26)** |
| **19** | 2026-09-29 | Deployed 2026-09-29 (PR #14) | **`/contests`' tier cards, grid, cells and pills in dtez's look: goals line, hints, one grid that stacks per agent on a phone, a sticky tier strip, dtez's palette; Home v2 unchanged (C28)** |
| **20** | 2026-09-29 | Code done; awaits the coupled backend deploy | **The four dialogs in dtez's look: proof with a source total and dtez's three table shapes (points per policy, C29), profile over proof, profile grid and path diagrams, rewritten help, "Flyer" title, an admin-only `{ }` SQL panel; Escape and backdrop close the top dialog (C30)** |

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

**Decisions.** C26; C27, the Net label, is open (`PARITY_PLAN.md`, Open decisions).

### Phase 19 — tier cards, grid, cells, pills and phone layout (2026-09-29)

**Goal.** `/contests`' grid reads like dtez's; the Home v2 card stays as it was (C28). The brief is
`mlm_platform/docs/integrations/wb-contests/PHASE_19_KICKOFF.md`.

**What shipped.**
- `TierCards` (`components/tier-cards.tsx`): name; "N qualified · N close · N in running"; period;
  the goals line, dtez's `tierSummary` ("BR 30 · BP 120,000", "· Non-License"); "Reward: …"; the
  hint ("Tap to show this tier" / "Tap to add" / "Selected · tap to remove"). dtez's auto-fit grid;
  on a narrow board a sideways strip that sticks to the top of the page.
- `ContestResults` (`components/contest-results.tsx`): dtez's one grid, `240px repeat(n,
  minmax(260px, 1fr))`, reflowing to one card per agent on a narrow board. Header: name ↓/↑,
  "N qualified · N close", period. Agent: name, "code · level", "Leader: X · Best N%". Cell:
  "Tier: Qualified · 100%" / "Tier: Almost qualified · 89%" / "Tier: 59%", tinted whole; blank
  when ineligible, with its screen-reader text. Pills "BR 15 / 30", green when met and yellow at the
  near threshold, per metric; the C5 tooltip and the greyed sourceless pill (C15) kept.
- `StandingsRegion` takes a `variant`; the page passes `page`. `contest-format.ts` holds the
  formatting, the pill tooltip and the tier toggle both placements use.
- dtez's palette as custom properties on the page's host (`.wb-ct-host--page`), which paints its own
  background, so the page no longer depends on the app theme's.
- On the page only, `.wb-ct` and `.wb-ct-scroll` are `overflow: visible`: both were scroll
  containers that never scrolled, which stops `position: sticky` (ARCHITECTURE.md §8).
- Backend fields, coupled (`mlm_platform` `8deb2cd`, `caa7579`): `leader_name` on rows, `non_license`
  on tiers, and `level` / `leader_name` absent when hidden, so "No level" and "Leader: -" never
  stand in for a hidden field.
- `perf:contests` waits for `.wb-ct-results` too.

**Measured** (after the deploy, 2026-09-29; merged in frontend PR #14 and backend PR #68). Driven
against the deployed API with production builds of `main` and of `8880009`; screenshots of dtez and
ours are in `Codes/wb-contests-parity-shots/phase-19/`.
- The page matches dtez's layout at 1440 × 900 and 390 × 844: tier cards with goals and hints,
  `240px repeat(4, 260px)` grid, tinted cells, per-metric pills; on a phone one card per agent and
  the tier strip sticking under the app header while the grid scrolls. `85ARG` in Base lists 30.
- `/home-v2`'s card: pixel-identical at 1440; at 390, 302 pixels of background gradient in its bottom
  11 px differ, with the DOM, boxes and computed styles of every element identical (C28 holds).
- `perf:contests`, median of 5 with a 10 s dwell: first standings 2.87 s before, 3.01 s after, with
  the same 9 calls and one `wbreporting/my-access`; a switch sends no standings request.
- `type-check` and `build` pass; `lint` is 7 errors / 117 warnings, as on `main`. Backend
  `test wbreporting`: 632 OK (627 + 5).
- `wb_contest_standings_parity --contest 14 --contest 15 --contest 18` on production, after the
  deploy: **14/14 match** dtez's formula (Italy 594 rows, Los Cabos 570, Private Reception 289).

**What the build learned.**
- A hidden `level` was `""` on the wire, the same as a person with no level. dtez labels the latter
  "No level", so the page could not tell them apart until the backend omitted the hidden one.
- dtez's header row does not stick vertically either: its `.standings` is `overflow: auto`, which
  makes it the sticky header's scroll container. Ours matches.
- dtez's pill tones are per metric and are **not** gated by `show_near_qualifiers`; the cell's
  "Almost qualified" is.
- **At 1440 the grid is 14 px wider than the board** (1,280 against 1,266, sidebar collapsed), so it
  scrolls sideways with the scrollbar at the bottom of the rows; with the sidebar expanded, ~200 px
  more. dtez's minimums fit its page, which has no sidebar. Left as dtez's rule; for Phase 21.

**Decisions.** C28.

### Phase 20 — proof, profile, help and flyer dialogs (2026-09-29)

**Goal.** The four dialogs read like dtez's and every click in the plan's Appendix C behaves as
listed. The brief is `mlm_platform/docs/integrations/wb-contests/PHASE_20_KICKOFF.md`.

**What shipped.**
- `components/contest-dialogs.tsx`, rewritten from dtez's `proof`, `detailTable`, `openProfile`,
  `pathMarkup` and `openFlyer` ([UI.md §2.6](UI.md#26-dialogs--componentscontest-dialogstsx)).
  Proof: "*Agent* · BR" over the period; the C5 note; "BR source total: **N**", "· first 1,000
  records shown", "Client and policy detail: …"; cards, goal, formula; the server's columns in one of
  three shapes; names that open the profile on top; `{ }` and the developer panel when the response
  has `sql`. Profile: dtez's seven-field grid and both paths as node diagrams. Help: dtez's text
  rewritten for our page. Flyer: "*Contest* Flyer", the new-tab link kept.
- `BoardDialogs` no longer closes the proof when a name in it is clicked.
- **The shared `Modal`** (`src/shared/components/ui/modal/index.tsx`, used by five files): always
  `role="dialog"`, `aria-modal`, `aria-labelledby`, focus moved in and returned, Tab kept inside the
  top dialog; new optional `subtitle`, `headerActions`, `titleClassName`; and `dismissible` (off by
  default) for Escape and backdrop, answered by the top dialog only (C30). Only the four contest
  dialogs pass it. See `docs/platform/`.
- `contests.css`: the dialogs carry dtez's palette on `.wb-ct-modal` (they portal outside both hosts).
- Types: `ProofResponse.source_total`, `truncated`, `detail_visibility`, `sql`, `sql_params`;
  `level` optional on `ProfileResponse` and `ProfilePathNode`; `ProofTarget.periodLabel`.
- Backend, coupled (`mlm_platform`, `feature/wb-contests-parity`): every proof built in dtez's shapes
  from the metric's own queryset, points per policy (C29), the new fields, the SQL for
  `wbreporting:manage` only, `level` absent from the profile when hidden, and the proof and profile
  reading only the chains they need (`reader_nodes`) instead of the viewer's whole closure.

**Measured** (2026-09-29, production builds against the **deployed** API, before the backend deploy;
shots in `Codes/wb-contests-parity-shots/phase-20/`).
- dtez's dialogs, and ours before and after, at 1440 × 900 and 390 × 844.
- Escape, backdrop and × each close the proof, profile and help (before: × only). The card's Filters
  modal and the training schedule's meeting dialog, which are not `dismissible`, still ignore Escape
  and backdrop and close on ×; both now take focus on open.
- Proof and profile on the deployed backend, which still loads the viewer's whole closure: proof
  7.6–10.1 s, profile 7.1–8.2 s (Kash, Connor Watts, Lakeicia Denson; BR, BP, LIC). The after
  numbers wait on the backend deploy.
- `/home-v2`'s card: the DOM, every element's box and every computed style identical before and
  after at both widths (6,707 elements). `cmp` of the element shots differs, because production
  numbers moved between runs and the background gradient renders unevenly; the screenshots look the
  same.
- `perf:contests`, median of 5, `--dwell 10`: first standings 2.92 s (phase 19: 2.87 → 3.01 s),
  switch 0.08 s, 9 calls, one `wbreporting/my-access`.
- `type-check` and `build` pass; `lint` 7 errors / 117 warnings, as on `main`. Backend
  `test wbreporting`: 644 OK (632 + 12).

**What the build learned.**
- **dtez changed its recruits table after the brief was written.** `pr` / `tr` / `br` are now
  Date · Agent · Agent Code · Recruited By · Recruited By Code; only licences, events and pins use
  Date · Event · Person · Credited Through · Reference.
- dtez's public proof API returned no licence, event or pin rows for any account tried, so those
  rows' Event and Reference wording is ours ("Licence approved" / "Agent approval date", "Registered
  for next big event" / "Associate tracker", "Mission Pin" / what dated it).
- The profile's **path nodes** also carried `level` when hidden; they now omit it too.

**Decisions.** C29, C30.

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
| **C10** | `scope=all` resolves through `authz.get_scope`; `net` is shown and **its label must not say "Net Base"** | The contest `net` filter keeps the selected person plus direct reports. Package 2's Net Base is a different rule, and reusing the name would be read as that rule. Labelled **"Direct reports only"**. **Open question, C27 (parity phase 18):** dtez labels the box "Net" and its summary "View: Super Team Net". Does parity of the label outrank this decision? Until answered, both placements keep "Direct reports only" | `components/contest-filters.tsx:9`, `components/contest-filter-bar.tsx`; `mlm_platform/docs/integrations/wb-contests/PHASE_18_KICKOFF.md` §4 |
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
| **C28** | **The Home v2 card keeps its own grid**; dtez's tier cards, grid, cells, pills and palette are on `/contests` only. Taken 2026-09-29 (parity phase 19), the brief's option (a), chosen by the user | The card lives in a `clamp(480px, 70vh, 760px)` slot and the plan says it "stays compact"; dtez's cell (a heading line, a tinted block, 260 px columns) is bigger. So the page's grid is separate components (`TierCards`, `ContestResults`) selected by `StandingsRegion`'s `variant`, and the card's `TierSelector`, `ContestStandings` and `ContestCell` are unchanged | `mlm_platform/docs/integrations/wb-contests/PHASE_19_KICKOFF.md` §4; `components/contest-board-parts.tsx` |
| **C29** | **The points proof is one row per policy**, dtez's grain: Policy, Client, First / Last Date, First / Second / Other Advances, Chargebacks / Reversals, Net Points. Chosen by the user 2026-09-29 (parity phase 20), over keeping our per-entry (`pp`) and per-agent (`bp`) rows and only restyling | Parity with dtez's proof, and one shape for both points metrics. A backend change (the proof builders) and a coupled response change. A policy with points from several agents is masked by the most restrictive of their relationships | `mlm_platform/docs/integrations/wb-contests/PHASE_20_KICKOFF.md` §4; `mlm_platform` `wbreporting/services/contests/proof.py` `_policy_rows` |
| **C30** | **Escape and a backdrop click are opt-in on the shared `Modal`** (`dismissible`), not its new default. Taken 2026-09-29 (parity phase 20) | The brief's trap 1: five files use `Modal`, among them a form (the training schedule's meeting dialog) and the card's draft filters, where a stray key or click would discard input. The contest dialogs opt in; the dialog semantics and focus handling apply to all | `mlm_platform/docs/integrations/wb-contests/PHASE_20_KICKOFF.md` §6.1; `src/shared/components/ui/modal/index.tsx` |

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
7. **Verify the sticky-column table and the page's grid with a screen reader.** The blank-cell
   accessible text was designed carefully; the scroll regions around it have not been checked.
8. **The page's grid overflows a 1440 px screen by 14 px** with the sidebar collapsed (more when
   expanded), because dtez's column minimums assume no sidebar. Decide whether to keep them.
