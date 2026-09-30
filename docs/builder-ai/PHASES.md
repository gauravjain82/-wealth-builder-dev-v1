# Builder AI — Phase History

| | |
|---|---|
| **Module** | `builder-ai` |
| **Source** | `src/features/builder-ai/` |
| **Routes** | 7 + 1 public |
| **Backend module** | `builderai` |
| **API prefix** | `/api/builderai/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Phase numbering comes from `mlm_platform/BUILDERAI_PROGRESS.md` (P1 core screens → P2
> reporting/bulletin → P3 AI advice) and **must not be renumbered**. The `B` decision prefix is
> assigned by this document; the plan recorded its decisions without IDs.
>
> **This module's predecessor was deleted wholesale.** Commit `2026-09-07` is
> *"Remove builder-ai feature for from-scratch rewrite"*, and everything here post-dates it. The
> reasoning for the first version survives only in the plan file — which is exactly the failure
> mode the [documentation standard](../DOCUMENTATION_STANDARD.md#10-keeping-documentation-true)
> exists to prevent.

## 1. Timeline

21 commits, 2026-09-06 to 2026-09-10 — a four-day build, then eight commits of goal corrections.

| Phase | Date | Status | Shipped |
|---|---|---|---|
| ~pre | 2026-09-06 → 09-07 | **Abandoned** | A first version, with a program editor and configurable metrics. Deleted 2026-09-07 |
| 1 | 2026-09-08 | Shipped | Core screens: Home, Company, Baseshop, roster; menu and routing |
| 2 | 2026-09-08 → 09-09 | Shipped | Reporting (daily line chart) and Bulletin |
| — | 2026-09-08 | Shipped | **Company redefined** as direct SMD legs, plus two goal fixes |
| — | 2026-09-09 | Shipped | Invitations: seats, inbox/outbox, six actions |
| — | 2026-09-09 → 09-10 | Shipped | UI polish, member photos, access-control refinement |
| 3 | — | **Not built** | AI advice |

## 2. Phases

### ~pre — the abandoned first version (2026-09-06 → 2026-09-07)

**What was built.** A `BuilderProgram` model with a currency field, a `ProgramEditorModal`
refactored into an inline `ProgramEditorPanel`, configurable metric options, and goal and
invitation-rule management.

**What happened.** Removed on 2026-09-07 for a from-scratch rewrite. The commit message gives no
reason and no design document was kept in this repo.

**Why it is recorded here.** So that nobody rediscovers it. If a configurable-program surface is
proposed again, this was tried and dropped within two days, and the plan file is the only place
that might say why.

### Phase 1 — core screens (2026-09-08)

**What shipped.** Home with four metric cards and a size bar; Company and Baseshop pages;
`RosterList` with per-row progress; `SegmentToggle`; the menu entries and routing; the
`BuilderAiRoute` guard on `can_view`.

**Decisions.** B1, B2, B3.

### Phase 2 — reporting and bulletin (2026-09-08 → 2026-09-09)

**What shipped.** A daily line chart with tooltips via `recharts`, and a searchable, sortable
bulletin ranking by metric.

**Divergence.** Both were left on the **whole-downline** definition of company and did not follow
the Company page's redefinition the same week. That divergence is deliberate and still in place.

### Company redefined, and two goal bugs (2026-09-08)

The most consequential change in the module's history, and the reason
[ARCHITECTURE.md §3.2](ARCHITECTURE.md#32-the-company-scope) exists.

**The redefinition (user request).** Company view stopped listing the whole builder downline. It
now lists the viewer's **directly-sponsored company owners** — `recruited_by = viewer` and level
rank ≥ `owner_min_level`, i.e. SMD and up — each row rolled up over that owner's whole downline.

**Card goal fix, the same day.** Company **cards** measure the whole company:
`goal = (builders in the company) × individual target`, scaled by months. They must **not** use
the owner-leg count — that made the goal far too small, e.g. 19 SMDs × 5 = 95 against a company
of hundreds of builders. Only the roster **rows** are the direct SMD legs, and the owner-leg count
drives nothing but the "N in scope" subtitle.

**Per-owner row goal fix, the same day.** Each SMD row's goal became
`(builders in that SMD's downline) × individual target`, scaled by months. A leg with zero
builders falls back to one plan to avoid dividing by zero. Same principle as the card, one level
down.

**Decisions.** B4, B5.

**Frontend impact: none.** The payload shape was kept identical, so no client change was needed.
The note at the time said the labels were "cosmetic only if desired" — they were never changed,
which is why the Company page still says "N builders in scope" over owner rows.

### Invitations (2026-09-09)

**What shipped.** `useBuilderSeats`, inbox and outbox lists, and six mutations — send, accept,
decline, cancel, self-add, remove — each invalidating the whole invitation key tree.

**Note.** Invitations govern **seats**, not enrolment. Enrolment remains the Associate Tracker
toggle (B2).

### Phase 3 — AI advice (not built)

Planned as the third phase. Nothing was built. The module's name comes from this phase.

## 3. Decision log

| ID | Decision | Rationale | Source |
|---|---|---|---|
| B1 | Reuse `tracker`'s builder engine; do not duplicate it | Targets, `builder_results_score` and the whole-downline metric definition already existed in `tracker/services/builder_results.py`. A second implementation would be a second set of numbers to reconcile | `BUILDERAI_PROGRESS.md` "Key decisions" |
| B2 | ~~Enrolment is the Associate Tracker **Builder** toggle only~~ | **Superseded by B9.** As originally built, `is_key_player` was the sole builder signal and `BuilderMembership` only recorded inviter/self-add and backed the seat cap. A backfill grandfathered existing key players at any level with no cap | " |
| B3 | Materialised aggregates power the dashboards | The live path took **8–10 seconds**. `BuilderMonthlyAggregate` holds month rows and any date range is a sum of months | " |
| B4 | Company view means directly-sponsored company owners, not the whole builder downline | User request. A leader wants to see their SMD legs as units, each rolled up, rather than a flat list of every builder beneath them | `BUILDERAI_PROGRESS.md` "Company view = direct SMD legs" |
| B5 | Card goals count the whole company; row goals count that leg | The two questions are different. Using the owner-leg count for a card made the goal an order of magnitude too small; using the company count for a row would make every leg look identical | " (both "goal fix" notes, 2026-09-08) |
| B6 | Reporting and Bulletin keep the whole-downline definition | They answer trend and ranking questions over builders, where an owner row has no meaning — a chart of 19 owners is not a chart of production | `BUILDERAI_PROGRESS.md`; `analytics.py` unchanged |
| B7 | Owner rows reuse the builder row payload shape | It let B4 ship with no frontend change. Cost: the UI cannot distinguish the two, so an owner row carries an inapplicable `is_built: false` and the page's "builders" label | `builder-ai-service.ts:26` |
| B8 | The Company path aggregates live, bypassing materialisation | SMDs are not builders, so they have no aggregate rows to read. Acceptable at a small direct-SMD count | `BUILDERAI_PROGRESS.md` perf note |
| **B9 supersedes B2** | An active `BuilderMembership` is the **sole** definition of a builder; `AssociateTracker.is_key_player` reverts to a pure tracker / org-chart flag that enrols nobody | The client wanted the two concepts fully separate. Welding them meant one checkbox on a tracker silently changed who appeared on another module's dashboards, and every builder read path filtered on a field owned by a different domain. **No backfill** — when the source of truth flipped, anyone who was only `is_key_player` stopped being a builder and gets there through an invitation | `~/.claude/plans/encapsulated-snuggling-rocket.md`; verified in `builderai/services/memberships.py`, `builderai/services/scope.py:121`, and `builderai/tests/test_invitations.py::test_is_key_player_flag_does_not_make_a_builder` |
| **B10** | **Builder AI and Team → Builders are separate products** (2026-09-30). The tracker results leaderboard, which is Team → Builders' and not this module's, now ranks `is_key_player` rather than `BuilderMembership`. Nothing here changes: the Bulletin, roster and dashboards still use `builder_ids_within` | B9 separated the concepts inside Builder AI but left the tracker leaderboard reading `BuilderMembership`, so that leaderboard followed this module's enrolment. With it moved to key players the separation holds in both directions. Shared: the metric definition (`builder_month_metrics`). Not shared: the builder pool, the score, `BuilderMonthlyCompletion`, the leaderboard | User decision, 2026-09-30; team T9; backend builderai B13 |

## 4. Deliberately not built

- **AI advice.** Phase 3. The module is named for a feature that does not exist.
- **A backfill from `is_key_player`.** B9 started fresh deliberately: anyone who was only
  `is_key_player` with no active membership simply stopped being a builder and has to arrive
  through an invitation.
- **A configurable program editor.** Built in the abandoned pre-phase and deleted. Targets are
  fixed in `tracker`.
- **A duplicate builder engine.** B1.
- **Materialisation of the company path.** B8 — do it if a top owner's legs grow.
- **Owner-aware labelling.** B7's cost was accepted as cosmetic and never paid down.
- **A client-side seat check.** The cap is enforced server-side only.
- **A text alternative to the Reporting chart.** Nothing was built alongside `recharts`.

## 5. Outstanding

1. **Fix the Company page's labels.** "N builders in scope" over owner rows, and a *Built* badge
   that cannot apply to them. Flagged as cosmetic in 2026-09-08 and still the most misleading
   thing in the module — a reader cannot tell from the screen that a row is an owner.
2. **Debounce the bulletin search.** `search` is in the query key with no debounce, so every
   keystroke is a cache entry and a request.
3. **Give Reporting a text equivalent.** The chart is the only representation of that data.
4. **Decide whether Phase 3 is real.** The module is called Builder **AI** and contains no AI.
   Either build the advice layer or rename the module; the current state sets an expectation the
   product does not meet.
5. **Move the types out of the service.** `builder-ai-service.ts` holds 130 lines of types before
   its first fetcher. Every other module has a `types/` directory or a `types.ts`.
6. **Materialise the company path** if direct-SMD counts grow. B8 named this as the trigger.
