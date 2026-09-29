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
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

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

## 3. Decision log

Summarised from `WB_CONTESTS_PROGRESS.md` §Decisions; full text in
`mlm_platform/docs/integrations/wb-contests/IMPACT_ANALYSIS.md` §7. Frontend consequences expanded.

| ID | Decision | Rationale | Source |
|---|---|---|---|
| C1 | Non-License reads `LicensingTracker.is_licensed` via `NOT EXISTS` | Consequence: `slic` counts `agent_approval_date`, a **different column**, so the two can disagree inside one contest. Accepted rather than reconciled, and a backend test asserts they can — so it is not a client bug to fix | `WB_CONTESTS_PROGRESS.md` |
| C2 / C3 / C4 | Keep the five stored statuses and derive three for readers; implement `monthly` on both enums; keep `tr`/`tp`/`te` as columns but **reject them on write** | Readers need three words, operators need five states. `TR`/`TP`/`TE` are result components, so allowing them as thresholds would let a contest require its own output | `types/index.ts:18`; `components/tier-editor.tsx:13` |
| **C5** | Ship all eleven thresholds, and **label `BR`/`BP`/`LIC` as required scope** | They are single-hop `leader_id` measures with no base-shop boundary and read materially lower than the Production Tracker. Labelling is required *on both surfaces*; the editor is the one that matters. **This is the decision that can produce a wrong prize decision if dropped** | `components/tier-editor.tsx:4`; `TierRequirement.single_hop_team` |
| C6 | `mr`/`mp` computed at read time, gated on `WB_MILESTONE_TIMESTAMPS_SINCE` | `DailyResult.mr`/`.mp` stay NULL and the daily calculator is untouched, so the milestone metrics cost nothing when unavailable | `WB_CONTESTS_PROGRESS.md` |
| **C7** | **Never `qualified` while any requirement is unmeasurable.** Show progress over the measurable subset with an explicit count of what could not be measured | Declaring someone qualified on partial data is a prize promise made on a guess. Showing partial progress plus the gap is honest and still useful | `TierEvaluation.partially_measurable`, `.unmeasured` |
| **C8** | **Taken against the recommendation.** An integer `revision` column, not a round-tripped `updated_at` | Cost: a fourth migration and a save hook on both models. In exchange it matches the client's `types.ts`, which already carried `revision`, and an integer is unambiguous where a timestamp's precision is not | `types/index.ts:262`; `services/contests-service.ts:180` |
| C9 | `accounts.Level` is the single source of truth, **and levels the data contract names but this host lacks are created there** rather than special-cased in contest code | One level table, no contest-specific level logic. `NON` is the one synthetic value (`level_id IS NULL`) — "no level assigned", not a real row | `LevelOption.synthetic`; `EditorOptions.levels` |
| **C10** | `scope=all` resolves through `authz.get_scope`; `net` is shown and **its label must not say "Net Base"** | The contest `net` filter keeps the selected person plus direct reports. Package 2's Net Base is a different rule, and reusing the name would be read as that rule. Labelled **"Direct reports only"** | `components/contest-filters.tsx:9` |
| C11 | `homev2:read` for reads, `wbreporting:manage` for writes | The card lives on the page `homev2:read` already opens, so a separate read permission would be granted to exactly the same people. Configuring is a different job | `router/contests-route.tsx:10` |
| C12 | Inactive people are included | The same accepted divergence as leaderboards' L1 — fidelity to the delivered spec | `StandingRow.is_active` is carried, not filtered |
| C13 | 50 / 200 page sizes; `considered` contests are settings-only | A considered contest is a draft; readers should not see a promise that has not been made | `WB_CONTESTS_PROGRESS.md` |

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
> `mlm_platform/docs/integrations/wb-contests/PARITY_PLAN.md`, with open decisions C14–C23.
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
6. **Verify the sticky-column table with a screen reader.** The blank-cell accessible text was designed
   carefully; the two-axis scroll region around it has not been checked.
