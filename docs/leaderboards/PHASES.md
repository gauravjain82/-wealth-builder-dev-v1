# Leaderboards — Phase History

| | |
|---|---|
| **Module** | `leaderboards` |
| **Source** | `src/features/leaderboards/` |
| **Routes** | `/leaderboards` + embedded card |
| **Backend module** | `wbreporting` |
| **API prefix** | `/api/wbreporting/` |
| **Status** | Merged-not-deployed |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Phase numbering is taken from `mlm_platform/WB_LEADERBOARDS_PROGRESS.md` and **must not be
> renumbered** — the same phase number means the same thing in both repos. Phases 0–4 are
> backend-only and are listed for continuity; their detail belongs to
> `mlm_platform/docs/wbreporting/PHASES.md`.
>
> Decisions use the `L` prefix from the source document. L1–L12 were locked with the user on
> 2026-09-25. L13–L14 are assigned by this document for choices the code makes that the
> source recorded without an ID.

## 1. Timeline

| Phase | Date | Status | Shipped |
|---|---|---|---|
| 0 | 2026-09 | Shipped (backend) | Analysis, host discovery, decisions L1–L12 |
| 1 | 2026-09 | Merged, not deployed | Schema and seeds |
| 2 | 2026-09 | Merged, not deployed | Pure services — scope walk, ranking, ratios |
| 3 | 2026-09 | Merged, not deployed | Aggregation and milestone cohorts |
| 4 | 2026-09 | Merged, not deployed | Read APIs |
| **5–7** | 2026-09 | **Merged, not deployed** | **Frontend: types, service, hooks, eight components, the page** |
| **8** | 2026-09-26 | **Merged, not deployed** | **Milestone metrics become rankable; the two-row tab split** |
| **9** | 2026-09-26 | **Merged, not deployed** | **Full Report personal list** |

Bold phases are the ones with frontend content. Everything is on `main` in this repo; nothing
is live.

## 2. Phases

### Phases 5–7 — the frontend surfaces

**Goal.** Build every surface the source contract specifies, against the Phase 4 APIs.

**What shipped.**
- `types/index.ts` — the wire contract, written first and shaping everything else.
- `services/leaderboards-service.ts` — eight endpoints, `LeaderboardError`,
  `selectionParams`.
- `hooks/use-leaderboards.ts` — ten hooks, the selection-in-key cache policy, broad
  invalidation on every mutation.
- Eight components: the compact card, the expanded panel, the shared ranking list, the proof
  dialog, the Full Report, the speedometer, the settings form, and pure formatters.
- `pages/leaderboards-page.tsx` — board / report / settings, with query-string entry.
- `src/router/leaderboards-route.tsx` — one guard for both `/leaderboards` and `/home-v2`.
- `src/features/home-v2/` — the new home page, **composed from** `VideoHero`, both
  `CanvaVideoCard` slots and `PerformanceTable` imported from `features/home` rather than
  forked, plus this module's card.
- Menu entries injected via `config/menu.ts` and `hooks/use-role-based-menu.ts`.
- `leaderboards.css` — the 4/2/1 grid, the container-query card, and the print block, all
  under `wb-lb-`.

**Decisions.** L7, L10 (a new route behind a new permission, `/home` untouched); L13.

**Divergence from plan.** The Settings surface implements four of the source contract's eight
sections. See §4.

### Phase 8 — milestone metrics become rankable (2026-09-26)

**Goal.** Make `rr` / `rc` / `rbe` first-class ranked metrics rather than client-side tabs.

**What shipped (frontend).** The board's metric tabs split into two rows: the four additive
metrics on the first, the milestones on the second. `MILESTONE_KEYS`
(`leaderboard-panel.tsx:42`) is a **layout** set, not a metric list — the server returns
milestones inside `general_metrics` and the client renders what it is given.

**What this fixed.** The client previously had `rr`/`rc`/`rbe` tabs calling
`/leaderboards/?metric=…`, which the endpoint rejected with `metric_not_supported` because
`RANKABLE_METRICS` was the four General columns plus the four ratios. The backend made
milestones rankable and started returning them in `general_metrics`; the client stopped
hard-coding them.

**Decisions.** L5 (milestones report unavailable rather than zero before stamping coverage).

**Divergence from plan.** The handover's outstanding item 6 — "drop the hard-coded
`MILESTONE_METRICS` list in favour of the server's `general_metrics`" — **is done.** The set
that remains serves a different purpose, and the comment at
`leaderboard-panel.tsx:38` says so. Do not "fix" it again.

### Phase 9 — Full Report personal list (2026-09-26)

**Goal.** Ship the fourth element of each Full Report column.

**What shipped (frontend).** The personal list under each metric column, rendered only when
the backend includes it and it is non-empty (`full-report.tsx:131`). Rows carry the agency
code, which is already the `agent_id` the detail endpoint takes, so a row opens its own proof
view with no extra lookup.

**Untruncated and unpadded**, deliberately: the five fixed slots exist to align the four
columns and belong to the SMD/MD panels only. The personal list is the whole scope, which
positive-only keeps to "who produced this month".

**Decisions.** L14.

**Divergence from plan.** None. The frontend had built the panel in Phases 5–7 and was
rendering an empty list; Phase 9 was the backend supplying `personal`.

## 3. Decision log

L1–L12 are summarised from `WB_LEADERBOARDS_PROGRESS.md`; full text and consequences are in
`mlm_platform/docs/integrations/wb-leaderboards/IMPACT_ANALYSIS.md` §7. Only the ones with
frontend consequences are expanded.

| ID | Decision | Rationale | Source |
|---|---|---|---|
| L1 | Port the vendor's hierarchy walk rather than reuse the host's | Fidelity to the delivered spec after the divergence was raised. Costs a fifth scope implementation server-side; no client consequence | `WB_LEADERBOARDS_PROGRESS.md` |
| L2 | Do not surface personal metrics over a lineage scope | Avoids the labelling problem those metrics would create; the client never offers them | " |
| L3 | Net Base is built, `show_net_base` stays false | Shipping the code without the exposure lets it be switched on without a release. The client renders `visible_scopes`, so it needs no change when it flips | " |
| L4 | Add `gross_points` + `chargeback_points` to the result models | Makes NPR consistent with the `pp` beside it. Will not equal the older `get_npr` | " |
| L5 | `rr` ships from recruit dates; `rc`/`rbe` report **unavailable**, never `0`, before stamping coverage | No backfill is possible — nothing dates the legacy flags, and the one plausible proxy covers 13.7% of rows, so it would invent a distribution rather than recover one. A zero would assert something false | " |
| L6 | Masking is the vendor rule verbatim, server-side, `hidden` fields omitted | A second implementation of a visibility rule is a second thing to get wrong. The client does **no** masking | " |
| L7 | A new `/home-v2` route behind a new `homev2:read`; `/home` untouched | Replacing the home page needed a QA comparison of the two cards' numbers first. Composing rather than forking means the shared components cannot drift | " |
| L8 | Current MTD from daily rows, closed months from the snapshot, `daily_fallback` otherwise | Correct source per period. Chosen over waiting for the monthly schedule, which is why every current answer is a fallback | " |
| L9 | Authenticated only — no anonymous surface | A public serializer is a different security problem; the contract permits it but nothing required it | " |
| L10 | Settings stay on `wbreporting:manage`, separate from `homev2:read` | Configuring a board and reading one are different jobs for different people | " |
| L11 | Month floor is January 2026, clamped to real data | The selector cannot offer a month that would come back empty | " |
| L12 | Full Report gauges follow the viewer's scope | Consistent with the panels beside them. What the goals are a target *for* is still unconfirmed with the business — see §5 | " |
| L13 | The query string is an entry point, not a binding | Seeding state from `?metric=` lets the home card expand onto the tab the reader was already looking at. Writing every change back would add history entries for a tab click; the cost is that a board state is not shareable by link | `pages/leaderboards-page.tsx:9`, assigned here |
| L14 | The personal list is positive-only, and is not a reconciliation of the gauge above it | "Positive Personal list" is what the contract asks for. A net-negative member is dropped from the list but still counted in the gauge, so visible rows can sum to less than the number above them | `WB_LEADERBOARDS_PROGRESS.md` Phase 9 "Known, deliberate", assigned here |

| L15 | The expanded board's title sits centred in the controls row; the date-range status, the help action, and each row's director title and member count are dropped; rows gain a profile photo | Asked for on 2026-10-07 to shorten the card: the title row is gone, and every row is one line. The range select already names the period, and the panel title already says SMD or MD. Photos come from the backend (`photo_url`, one query per response via `wbreporting/services/photos.py`) — the client has no other source for them | user request 2026-10-07; branch `feature/wb-contest-showcase` in both repos |

## 4. Deliberately not built

- **Replacing `/home` with Home v2.** Decision L7 puts that after a QA comparison of the two
  cards' numbers. `src/features/home/pages/home-page.tsx` is unmodified, and
  [OPERATIONS.md §4](OPERATIONS.md#4-tests-and-checks) has the `git diff` check that keeps it
  that way.
- **Four of the eight Settings sections.** The implemented four are goals, scopes and
  milestones, detail privacy, and date ranges. Absent:
  - **Settings managers** — superseded by the backend access console.
  - **Metric definitions editing** — definitions are read (the proof dialog shows them) but
    not edited here; they are seeded server-side.
  - **Recalculation controls and pipeline activity** — these live in
    `/admin/reporting-pipeline` (`features/admin/wb-pipeline`), behind `wbreporting:read`,
    because they operate the pipeline rather than configure the board.
- **A per-view milestone-mode control.** Contract-forbidden, and for a good reason: two
  readers comparing screens must be looking at the same measurement. It is shown in the
  header and changed only in Settings.
- **Client-side masking.** Decision L6.
- **Anonymous or public surfaces.** Decision L9.
- **Live contest standings.** A sibling package — `docs/contests/`.
- **Mission Pin / Ring (`mp` / `mr`) metrics.** Still deferred, though `tracker/0050` removed
  the blocker, so they become possible once stamped data accumulates.
- **`detail_timeout` in the client's error union.** Documented in the source contract but not
  typed; a timeout surfaces as a generic 503.

## 5. Outstanding

Frontend items only. The backend's list is in `WB_LEADERBOARDS_PROGRESS.md` §NEXT, and steps
1–3 of [OPERATIONS.md §5](OPERATIONS.md#5-deployment) are on it.

1. **Label an `all_time` board as such.** The highest-risk item. When a milestone period has
   no stamping coverage the backend answers on the all-time basis, and the client renders it
   under whatever range heading is selected. An all-time count under a "This Month" heading is
   the one remaining way this feature can actively mislead. The response carries
   `milestone_basis`; nothing reads it yet.
2. **Confirm what the Settings goals are a target for** (L12), and what "10% Evaluation"
   means (L5). Both are business questions, and both affect label text the client renders.
3. **Consider making board state shareable.** L13 chose not to sync the selection back to the
   URL. If people start sharing links to a filtered board, revisit it — the selection model is
   already serializable.
4. **Watch the closed-month source mismatch.** Documented in
   [ARCHITECTURE.md §8](ARCHITECTURE.md#8-invariants-and-failure-modes). It cannot appear until
   the monthly snapshot schedule is on, and it will be reported as a frontend bug when it does.
