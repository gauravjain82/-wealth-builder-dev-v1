# Documentation Plan — all 28 modules

> **Living document.** Read it before starting a batch; update the scoreboard and the learnings
> when you finish one. It is the frontend counterpart to
> `mlm_platform/DOCS_STANDARDISATION_PROGRESS.md`.

## Goal

One six-file doc set per module under `docs/<module>/`, in the format
[`DOCUMENTATION_STANDARD.md`](DOCUMENTATION_STANDARD.md) defines, **written against the current
implementation** — and carrying, in each module's `PHASES.md` §3, the decisions that explain why the
code does what it does rather than the obvious thing.

Baseline commit: `7e3b7f1` (2026-09-27).

## 1. Scoreboard

**Complete.** All 28 feature modules are documented, plus the shell.

| Tier | Total | Done | Remaining |
|---|---|---|---|
| Full (six files) | 14 | **14** | 0 |
| Lite (`README` + one) | 11 | **11** | 0 |
| Indexed (a row in the index) | 3 | **3** | 0 |
| `platform` (the shell) | 1 | **1** | 0 |

**Dangling citations in `src/`: 0.** All 28 folded in and repointed.

What remains is **upkeep, not coverage**:

- keep each module's `Verified against` commit honest — the staleness check is one `git log`;
- copy [`_standard/`](_standard/) into `docs/<module>/` when a new feature directory appears, before its
  first feature commit lands;
- update a module's doc in the same commit as the change, per
  [the standard §10](DOCUMENTATION_STANDARD.md#10-keeping-documentation-true).

### The backend has moved too

`mlm_platform/docs/` now holds **14 completed app doc sets** (its batches A–D): `accounts`, `ai`,
`audit`, `authz`, `helpdesk`, `misalignments`, `network`, `notifications`, `payments`, `platform`,
`promotion`, `telegram_bot`, `tracker`, and `matchup` (5 of 6 — no `PHASES.md` yet).

Still to come there: `bpm`, `calendarsync`, `events`, `content`, `builderai`, `wbreporting`, `gms`.

**This matters for sequencing.** A frontend `API.md` links its backend app's `API.md` as the
authority, and a backend `PHASES.md` is the best single source of decisions. Where the backend set
already exists, the frontend module is cheaper and more accurate to write. Where it does not, expect
to read the app's source or its plan file instead.

## 2. Decision sources — the inventory

This is the part that cannot be reconstructed later. Below is every place in either repo that records
**why** something was built one way rather than another, mapped to the frontend module it explains.

### 2.1 Plan files — `~/.claude/plans/` (35 files)

Named randomly, so the mapping is the only way to find them. **These are outside both repos and
outside version control.** They are the richest source of "we chose X over Y" and the most likely to
be lost.

| Plan file | Explains | Module |
|---|---|---|
| `memoized-tinkering-lerdorf.md` (60 KB) | Big Event Registration & Management Platform | **events** |
| `harmonic-questing-blanket.md` (94 KB) | Builder Program — backend plan for the *abandoned* first version | builder-ai (history) |
| `tranquil-orbiting-dewdrop.md` | Build BuilderAI — the from-scratch rewrite | builder-ai |
| `binary-tinkering-matsumoto.md` | **Why** the Builder app was removed for a rewrite | builder-ai (the gap named in its PHASES ~pre) |
| `generic-prancing-falcon.md` | BuilderAI Invitations — backend | builder-ai |
| `jazzy-drifting-toucan.md` | Builder AI — Goals Editor page | builder-ai |
| `enchanted-dancing-crab.md` | Clickable company owners → drill into their company page | builder-ai |
| `encapsulated-snuggling-rocket.md` | **Decouple Builder enrolment from `is_key_player`** | builder-ai **B9**, team |
| `dynamic-swimming-candle.md` | Two-Way, Multi-Calendar Google Sync — backend | calendar-sync |
| `tidy-zooming-ocean.md` | The same, **frontend** integration | calendar-sync |
| `playful-juggling-turing.md` | Fix: selected calendar ignored, site edits not reflected | calendar-sync |
| `melodic-nibbling-ripple.md` | Imported Google events on the personal calendar | calendar-sync (Phase 11), matchup |
| `wondrous-floating-dream.md` | BPM Multi-Location Support | bpm |
| `fuzzy-booping-axolotl.md` | BPM Guest Follow-up (questionnaire) | bpm |
| `toasty-orbiting-mist.md` | The same, **frontend** | bpm |
| `unified-roaming-teapot.md` | BPM "Select all SMDs" one-click attach | bpm |
| `nested-zooming-crane.md` | BPM event data recovery from a temp snapshot | bpm |
| `appointment-type-change.md` | Change an appointment's type (PERSONAL ↔ REQUEST_TRAINER) | **matchup** |
| `concurrent-orbiting-wren.md` | Fix Matchup reschedule workflow | **matchup** |
| `transient-juggling-cake.md` | Production Tracker — cards gross/net + date-range-only semantics | team (T6) |
| `harmonic-tickling-quill.md` | Production Tracker — fix date-filter ambiguity | team |
| `dazzling-hatching-ritchie.md` | Advance-date-change ledger corruption + clear-advance | team |
| `synthetic-dreaming-bird.md` | Sync Associate-Tracker points with the Production Tracker | team |
| `frolicking-coalescing-prism.md` | Mission Ring Proof visibility in the 10-day AMA window | team (T5) |
| `abstract-plotting-kite.md` | Leader & Policy Misalignments diagnostic reports | admin |
| `playful-prancing-micali.md` | Level-based permission grants | admin (AD-level) |
| `silly-giggling-acorn.md` | Product Management UI (CompanyProduct CRUD + audit) | admin |
| `silly-giggling-acorn-agent-*.md` | Access-console permission gating — investigation findings | admin |
| `product-type-field.md` | `product_type` on CompanyProduct (Life Insurance / Annuity) | admin |
| `nested-dancing-mitten.md` | Email-based recruiter referrals beside the code-based flow | auth, admin |
| `majestic-coalescing-star.md` | Subscription self-service via Stripe Billing Portal | **settings** |
| `woolly-imagining-lampson.md` | "Update Credit Card" via Stripe Customer Portal | **settings** |
| `cosmic-bubbling-goblet.md` | Phone-number editing + SMS onboarding with delivery tracking | **settings** |
| `imperative-questing-fern.md` | Zero-downtime deploys for the Docker-Compose stack | platform (ops) — backend-side |
| `whimsical-orbiting-crab.md` | TalentMesh V1 | **not this project** — ignore |

### 2.2 Backend root progress files

Phase numbering in these is **authoritative** and must be carried across unchanged.

| File | Module | Notes |
|---|---|---|
| `BPM_V2_PLAN.md` (152 KB) | bpm | Phases 0–8 + post-8, decisions **D1–D12**. Already mined |
| `EVENTS_BUILD_PROGRESS.md` + `EVENTS_CONTEXT.md` (56 KB) | **events** | Phases 0–5 |
| `WB_LEADERBOARDS_PROGRESS.md` | leaderboards | P0–9, decisions **L1–L12**. Already mined |
| `WB_CONTESTS_PROGRESS.md` (31 KB) | **contests** | P0–9, decision prefix `C` |
| `WB_GMS_PROGRESS.md` | **gms** | Phases 0–10, decision prefix `G` |
| `WB_REPORTING_PIPELINE_PROGRESS.md` | admin/wb-pipeline | P0–8, decisions `D1–D7` |
| `BUILDERAI_PROGRESS.md` | builder-ai | Phases 1–2 + company view. Already mined |
| `CALENDAR_SYNC_PROGRESS.md` | calendar-sync | Phases 1–10. Already mined |
| `DOCUMENTATION.md` (44 KB, 2026-09-02) | — | Covers 7 of 21 apps and predates most current code. **Historical — re-verify anything taken from it** |

### 2.3 Vendor delivery packages — `mlm_platform/temporary/wb_*/`

Four packages, each with `UI_CONTRACT`, `API_CONTRACT`, `DATA_CONTRACT`, `APPLICATION_CONTRACT`,
`AGENTS`, `CHANGE_MANIFEST`, `VERIFICATION`, `HOST_DISCOVERY_CHECKLIST`:

| Package | Module | Extra |
|---|---|---|
| `wb_leaderboards/` | leaderboards | folded in ✅ |
| `wb_contests/` | **contests** | — |
| `wb_gms_delivery/` | **gms** | plus `OWNER_DECISIONS.md`, `WORKFLOW_COMPATIBILITY_CONTRACT.md`, 4 `sops/`, 4 `workflows/` |
| `wb_backend_data_pipeline/` | admin/wb-pipeline | — |

**`temporary/` is gitignored.** These packages are not committed anywhere. Folding their content
into `docs/<module>/` is the only thing that preserves them.

### 2.4 Integration analyses — `mlm_platform/docs/integrations/`

| File | Module |
|---|---|
| `wb-leaderboards/IMPACT_ANALYSIS.md` | leaderboards — decisions L1–L12 in full |
| `wb-contests/IMPACT_ANALYSIS.md` | **contests** |
| `wb-gms/IMPACT_ANALYSIS.md` + `PACKAGE_4_KICKOFF.md` | **gms** |
| `wb-reporting-pipeline/IMPACT_ANALYSIS.md`, `RUNBOOK.md`, `HANDOFF_FEEDBACK.md`, `PACKAGE_2_KICKOFF.md` | admin/wb-pipeline |

### 2.5 Per-app API notes in the backend

| File | Frontend module |
|---|---|
| `content/FILE_VAULT_API.md` | **file-vault** (Lite) |
| `content/TRAINING_CENTER_API.md` | **training-center** (Lite) |
| `tracker/PRODUCTION_TRACKER_V2_API.md`, `TRACKER_SYNC_RULES.md`, `ONBOARDING_VIDEOS_API.md`, `ui_field.md` | team |
| `promotion/promotion-frontend-api.md` (30 KB) | **promotion** |
| `payments/ROLE_TRANSITION_MASTER_GUIDE.md`, `DB_ENTRY_FLOW_REFERENCE.md`, `ROLE_TRANSITION_CONFIGURATION_HELPER.md`, `DEVOPS_RUNBOOK.md` | **settings** (billing) |
| `helpdesk/HELPDESK.md` | **helpdesk** (Lite) |
| `mlm_guides_package/MATCHUP_API.md` (17 KB) | **matchup** |
| `mlm_guides_package/MLM_API_Guide_For_Frontend_And_Business.md` | several — a frontend-oriented overview |
| `docs/builder_implementation_flow.md`, `docs/current_month_team_points_trace.md` | builder-ai, team |

### 2.6 The code itself

Do not overlook it. `bpm`, `leaderboards`, `contests` and `gms` carry unusually good explanatory
comments naming the decision behind a choice — the `leaderboards` set was written largely from them.
`git log -- src/features/<module>` supplies the timeline for the modules with no plan.

### 2.7 Modules with no decision source at all

`education`, `insight-center`, `legal`, `showcase`, `training-schedule`, `systematic-tools`,
`terminated-users`, `home`, `reports`, `home-v2`. For these, `PHASES.md` is reconstructed from
`git log` and marked `~`, and §3 may legitimately read *"none recorded"*.

## 3. The process, per module

Repeat this for each module. Steps 2 and 6 are the ones that have caught real errors.

1. **Read the code first.** `find src/features/<m> -type f`, then the types, the service, the hooks,
   the pages. Measure LOC and count routes, endpoints and components for §3 of `README.md`.
2. **Collect the sources** from §2 above. Read the plan file and the progress file **before**
   writing, and note where the plan and the code disagree.
3. **Check the backend.** If `mlm_platform/docs/<app>/` exists, read its `README` and `PHASES`; its
   decision log is usually the cheapest route to the "why". If it does not, read the app's source.
4. **Copy `_standard/` into `docs/<module>/`** and fill it in, keeping the numbered headings.
5. **Ground every claim** as `src/features/<m>/<file>.tsx:123`. Where a number appears, cite the
   line that sets it.
6. **Verify every decision against the code before writing it down.** A plan records intent, and a
   later plan can silently reverse an earlier one. Write the decision only when the code agrees;
   where they differ, document the code and record the divergence.
7. **Fold in the contracts and repoint the comments.** If the module's code cites `UI_CONTRACT.md`
   or a plan file, absorb the content and change the comment to the real in-repo path plus section.
8. **Set the front matter**, including `Verified against: commit <sha> — <date>`.
9. **Update [`README.md`](README.md)**: link the module, set its status, tick its Docs column, and
   correct the row if the code disagreed with it (this happened for `calendar-sync`, whose route
   belongs to `matchup`).
10. **Run the checks**: the link check below, `npm run type-check`, and `npm run lint` to confirm you
    added no errors.
11. **Update this file's scoreboard and learnings.**

### Checks

```bash
# every internal doc link resolves
python3 - <<'PY'
import re, pathlib
bad = []
for f in list(pathlib.Path('.').glob('docs/**/*.md')) + [pathlib.Path('README.md'), pathlib.Path('CLAUDE.md')]:
    for m in re.finditer(r'\[([^\]]+)\]\(([^)]+)\)', f.read_text()):
        t = m.group(2).split('#')[0]
        if t and not t.startswith(('http', 'mailto')) and not (f.parent / t).resolve().exists():
            bad.append(f"{f}: {m.group(0)}")
print(f"broken: {len(bad)}"); [print(' ', b) for b in bad]
PY

# doc directory names must equal feature directory names
python3 -c "
import pathlib
d={p.name for p in pathlib.Path('docs').iterdir() if p.is_dir() and not p.name.startswith('_')}
f={p.name for p in pathlib.Path('src/features').iterdir() if p.is_dir()}
print('orphans:', sorted(d-f-{'platform'}) or 'none')"

# dangling citations left in code
grep -rn "UI_CONTRACT.md\|APPLICATION_CONTRACT.md\|DATA_CONTRACT.md\|API_CONTRACT.md\|AGENTS\.md\|OWNER_DECISIONS.md\|BPM_V2_PLAN.md\|WB_GMS_PROGRESS.md" src | wc -l
```

## 4. Batches

Sequenced so the least recoverable material is written first and the cheapest work last.

| # | Batch | Modules | Tier | Why here | Status |
|---|---|---|---|---|---|
| A | Standard, templates, index, shell | — | — | Everything depends on it | ✅ done |
| B | Reference module | `leaderboards` | Full | The shape to copy | ✅ done |
| B2 | Homeless root docs | `auth`, `calendar-sync` | Full | Each had a root doc with nowhere to go | ✅ done |
| C | The large domains | `bpm`, `team`, `admin`, `builder-ai` | Full | Most lines, most risk | ✅ done |
| D | Vendor-package modules | `contests`, `gms` | Full | Their contracts lived in a gitignored `temporary/` directory; now folded into `docs/` | ✅ done |
| **E** | **The remaining large domains** | `events`, `matchup` | Full | **Next.** 11,366 and 4,563 lines. `events` has a 60 KB plan and two progress files; `matchup` has four plan files and a 17 KB API guide | ⬜ |
| **F** | **Money and identity-adjacent** | `settings`, `licensing`, `promotion` | Full | `settings` touches four backend apps and Stripe, with three plan files and four payments guides | ⬜ |
| **G** | **Content consumers** | `home`, `file-vault`, `training-center`, `insight-center`, `education` | Lite | All read `/api/content/`. Write them together so one reading of the content API serves five | ⬜ |
| **H** | **The small remainder** | `ai`, `helpdesk`, `terminated-users`, `legal`, `systematic-tools`, `training-schedule` | Lite | Small and independent | ⬜ |

### What batch D turned up

Writing `contests` and `gms` from the code first — with the old documents used only to lift durable
decisions — produced three corrections the source material would not have given:

- **`contests` is `Gated`, not `Merged-not-deployed`.** Migrations `0001`–`0003` are applied and it
  shipped 2026-09-26. Only the `homev2:read` grant is missing. An earlier handover note claiming "four
  pending" migrations was stale, and the progress file itself says to verify with `showmigrations`
  rather than from any document.
- **`gms` enforces its privacy boundary with compile-time assertions**, in
  `services/gms-adapter.contract.ts`. Nothing in the contract documents describes this; it exists
  because the repo has no test runner and `tsc` was the enforcement available. It is the app's only
  automated invariant check.
- **The containment contract** in `contests.css:1-29` was *discovered during the build*, not planned:
  the host's card size turned out to be an aspect ratio inherited through a grid, not a pixel value.
  Three CSS rules keep it working and removing any one fails silently.

All three now live in the module docs. None was in the vendor package.

### A note on E

Both `events` and `matchup` have backend doc sets **pending** (`mlm_platform` batch E). `matchup`
has 5 of 6 files already. If the backend batch lands first, both frontend modules get materially
cheaper — worth checking before starting, and worth coordinating if the backend work is active.

## 5. Effort

Measured against the eight already written.

| Tier | Research | Writing | Total per module |
|---|---|---|---|
| Full, large (>8,000 LOC) | heavy | ~900–1,100 doc lines | a long session |
| Full, medium (1,500–5,000) | moderate | ~700–800 doc lines | half a session |
| Lite | light | ~250–350 doc lines | ~an hour |

| Batch | Modules | Rough size |
|---|---|---|
| D | 2 Full (medium) | 1 session |
| E | 2 Full (1 large, 1 medium) | 1–2 sessions |
| F | 3 Full (medium) | 1–2 sessions |
| G | 5 Lite | 1 session |
| H | 6 Lite | 1 session |

Five to seven working sessions to finish all 28. Batches G and H are much cheaper than their module
count suggests, because a Lite set is two files and the content consumers share one API.

## 6. Rules that came out of doing the first eight

Each of these cost something to learn.

1. **Verify a decision against the code before recording it.** A plan file states intent, and a
   later plan can reverse an earlier one without either saying so. `encapsulated-snuggling-rocket.md`
   decoupled builder enrolment from `is_key_player`; `BUILDERAI_PROGRESS.md` still describes the old
   arrangement, and the first version of `docs/builder-ai/` repeated it. The fix is decision **B9
   supersedes B2** — and the check that would have caught it is one grep of the backend service.
2. **Never renumber a phase or recycle a decision ID.** Numbers are shared with the backend repo.
   Supersede with a new ID and say what it supersedes.
3. **Stale is worse than absent.** Three root documents described a Firebase architecture this app
   does not have, and would have produced confidently wrong code. When a doc goes wrong, archive it
   with a banner naming what it got wrong.
4. **Check the module's own metadata.** Two index rows were wrong: `calendar-sync` has no route
   (`/calendar` belongs to `matchup`), and `team` owns `/onboarding-game`. Reading the router beats
   trusting the table.
5. **Read code comments as a primary source.** `bpm`, `leaderboards`, `contests` and `gms` explain
   their own decisions in file headers. Also distrust them: three comments in `bpm/types.ts` still
   describe shipped features as unbuilt.
6. **Record what a module does *not* do.** `PHASES.md` §4 is the section no codebase has and the one
   that stops an agent "fixing" a deliberate choice.
7. **Count before claiming.** Lint attribution, LOC and endpoint counts were all wrong on a first
   pass. Every number in a doc should come from a command.
8. **Fold, then repoint.** A code comment citing a document outside the repo is a dead end. Absorb
   the content and cite the real path and section.

## 7. Definition of done

The work is complete when:

- Every directory in `src/features/` is either `docs/<module>/` or an Indexed row in
  [`README.md`](README.md), with a stated reason.
- Every Full module has all six files with correct front matter and a `Verified against` commit.
- Every Lite module has `README.md` plus its substance file, and says in §6 which file it omits.
- The three checks in §3 pass: zero broken links, zero orphan doc directories, **zero** dangling
  citations in `src/`.
- Every module's `PHASES.md` §3 either lists cited decisions or states that none are recorded.
- The vendor packages' content lives in `docs/`, so losing `mlm_platform/temporary/` loses nothing.
- This file's scoreboard matches reality.

## 8. Learnings log

Append as batches complete.

- **2026-09-27, batches A–C.** The backend already had this standard; adopting it rather than
  inventing one was the single best decision. Five of six filenames match, so a reader learns the
  shape once. `DATA_MODEL`→`UI` and API-as-consumed are the only deviations.
- **2026-09-27.** The four largest modules were written before the eighteen smallest, and that was
  right: `team`, `bpm`, `admin` and `builder-ai` are 70% of the code and effectively all of the risk.
- **2026-09-27.** `~/.claude/plans/` is the most valuable and least safe source in the inventory —
  35 files, outside both repos, outside version control, with names that reveal nothing. §2.1 is the
  only index that exists. Consider committing the relevant ones.
- **2026-09-27, batch D.** Code-first was the right order and changed the output. Reading the
  implementation before the plan files caught a wrong status (`contests` is deployed), surfaced an
  invariant no document mentioned (the compile-time boundary assertions), and recorded a layout contract
  that was learned during the build rather than specified. The old documents were still essential — the
  `C1`–`C13`, `G1`–`G12` and 24 owner decisions are not recoverable from source — but they are
  supporting material, not the spine.
- **2026-09-27.** With batch D done, `mlm_platform/temporary/` is no longer a single point of failure:
  every contract fact those four gitignored packages held that the frontend depends on now lives in
  `docs/`, and all 28 code citations point at real in-repo paths.
- **2026-09-28, batches E–H.** Finishing the long tail found more than expected, because the small modules
  are where things quietly rot: three **dead service files** in `licensing` (progress is `localStorage`, so it
  is per-browser and invisible to a leader), an **18 KB byte-identical duplicate stylesheet** in `education`
  that nothing imports, **quiz answers shipped to the client** in `promotion`, and `systematic-tools` gating
  content entirely on client-side session data. None of it was in any plan file; all of it came from reading
  the code.
- **2026-09-28.** The Lite tier earned its place. Eleven modules at two files each took roughly as long as one
  Full module, and the two files carry everything that matters — for `insight-center`, `legal` and
  `training-schedule` there genuinely is no architecture to describe, and pretending otherwise would have
  produced four empty sections each.
