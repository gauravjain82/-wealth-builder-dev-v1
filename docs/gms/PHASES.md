# GMS — Phase History

| | |
|---|---|
| **Module** | `gms` |
| **Source** | `src/features/gms/` |
| **Routes** | `/admin/guidance` + `HelpAction` |
| **Backend module** | `gms` |
| **API prefix** | `/api/gms/` |
| **Status** | Merged-not-deployed |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Phase numbering and the `G` decision prefix come from `mlm_platform/WB_GMS_PROGRESS.md` (phases 0–10)
> and **must not be renumbered**. Two of the twelve `G` decisions were taken **against** the
> recommendation and one **beyond** it; those three are the ones a later reader is most likely to
> mistake for accidents.
>
> This module also inherits **24 owner decisions** approved before the build
> (`temporary/wb_gms_delivery/OWNER_DECISIONS.md`). The ones with frontend consequences are folded into
> §3 as `OD` entries so they survive the loss of that gitignored package.

## 1. Timeline

One commit in this repo — the frontend arrived as a single package.

| Phase | Date | Status | Shipped |
|---|---|---|---|
| 0–9 | 2026-09 | Merged, not deployed | Backend: app, models, adapter boundary, walkthrough runtime, content lifecycle, imports, permissions |
| **10** | 2026-09-26 | **Merged, not deployed** | **Frontend: Help drawer, walkthrough overlay, start panel, content blocks, guidance admin, BPM's stable targets, the build-time manifest** |

Six migrations unapplied; no `gms:*` granted.

## 2. Phases

### Phase 10 — the frontend (2026-09-26)

**Goal.** A Help surface, a walkthrough runtime, and an adapter a host tool can call without learning
anything about GMS.

**What shipped.**
- `services/gms-adapter.ts` — `emit`, `gmsTarget`, attach/detach, and the module-level active target.
- **`services/gms-adapter.contract.ts`** — four compile-time assertions that the boundary has not
  widened. No runtime code.
- `services/gms-service.ts` — 14 endpoints.
- Five components: `HelpAction` (with its error boundary), `HelpDrawer`, `WalkthroughStartPanel`,
  `WalkthroughOverlay`, `ContentBlocks`.
- `pages/guidance-admin-page.tsx` — library, review queue, lifecycle actions.
- `src/features/bpm/gms-targets.ts` — 7 targets, declared in the tool.
- `vite-plugin-gms-manifest.ts` — emits the manifest at build time from the same module the components
  import.
- `gms.css` — scoped under `wb-gms-`, following `contests.css`'s containment contract.

**Decisions discharged here.** G3 (client half), G6, G9, G11, G12, plus most of the owner decisions in
§3.

**What the build had to invent.** The walkthrough overlay has no precedent in this repo — nothing else
spotlights a live control while the user operates it. The four rules in
[UI.md §2.4](UI.md#24-walkthrough-overlay--componentswalkthrough-overlaytsx) were all derived during this
phase, and the first (the spotlight must not block the control) is the one that makes the pattern work
at all.

## 3. Decision log

### Package decisions — `G`

| ID | Decision | Rationale | Source |
|---|---|---|---|
| G1 | A new `gms/` app; `content`'s models are reused as a **pattern**, never restructured | Guidance is not page content, and bending `content` to hold it would have coupled two lifecycles | `WB_GMS_PROGRESS.md` |
| G2 | Separate GMS completion/XP tables, but **one shared XP service owns the total** | Two sources of XP would eventually disagree about a user's total. GMS records completions; it does not own the number | " |
| **G3** | **An adapter emits exactly a five-field envelope — no payload channel** | A help feature must not be able to learn a guest's name, phone or email. Enforced by the *signature*: `emit(targetKey, signal)` has no third parameter, so a payload is unrepresentable rather than forbidden. The backend rejects unknown fields too, so **both halves must be dismantled** for a leak. Credible because BPM's own `onAdded: () => void` never sees the response carrying that data | `services/gms-adapter.ts:1`; `types/index.ts:21`; `gms-adapter.contract.ts` |
| **G4** | **Taken against the recommendation.** Protection is `is_protected` on the account, not the email scattered through logic | The bootstrap administrator resolves to one address initially, and spreading it through application code would make changing it a code change. The flag is host state | `WB_GMS_PROGRESS.md`; `OWNER_DECISIONS.md` |
| **G5** | **Taken beyond the recommendation.** Compatibility is checked on publish (blocking) **and** on registration | Checking only at publish leaves a walkthrough pointing at a control a later deploy removed. Re-registration therefore disables affected published walkthroughs and notifies their managers | `vite-plugin-gms-manifest.ts:20` |
| G6 | Imported SOPs arrive as **corrected drafts** with the corrections listed; `metric_note` text is resolved **server-side** from the service that owns it | A copy of the words drifts the moment somebody edits the original. Resolving at read time means Help says exactly what the tier editor says about `BR`/`BP`/`LIC`. And an approver must see the corrections, which is why the change note precedes the content | `components/content-blocks.tsx:9`; `pages/guidance-admin-page.tsx:12` |
| G7 | Drop three of the four proposed role tables; seed `gms:*` in `authz`; **no tool scoping** | One permission system, not a second one inside a help feature | `WB_GMS_PROGRESS.md` |
| G8 | The pilot drives the `/bpm/add-guest` **page**; `bpm.context.location` folds into the date target | Since BPM v2 a date *is* a location, so a separate location target would be a step with nothing distinct to do | `src/features/bpm/gms-targets.ts` |
| **G9** | **`data-gms-target` on existing elements only**; keys declared in a typed manifest **in the tool** | GMS adds no wrapper element to a host component — that is the line between "add a stable attribute" and "extend an existing component". Declaring keys in code makes deleting an instrumented component a `tsc` error rather than a walkthrough silently pointing at nothing | `services/gms-adapter.ts:126`; `src/features/bpm/gms-targets.ts:1` |
| G10 | Reuse `wbreporting.services.pipeline.execute_job` in place | No second job runner | `WB_GMS_PROGRESS.md` |
| G11 | **One published walkthrough; the rest ship as drafts.** The admin page is deliberately less than the full management interface asked for | Without an admin page the seeded SOPs could only be approved by hand with an API client. The library, review queue, change note, preview and lifecycle actions are the subset that gets content live; a structured editor and step builder are not | `pages/guidance-admin-page.tsx:1` |
| **G12** | `GMS_ENABLED`, an error boundary, and a **no-op adapter** | A help feature must never impair the tool it sits on. With GMS off, uninstalled or failing to load, `emit` returns immediately and `HelpAction` renders `null`, so a tool may call both unconditionally | `components/help-action.tsx:1`; `services/gms-adapter.ts:21` |

### Owner decisions with frontend consequences — `OD`

Approved before the build. Recorded here because `OWNER_DECISIONS.md` lives in a gitignored directory.

| ID | Decision |
|---|---|
| OD1 | Build GMS as a **host integration**, not a standalone application. |
| OD2 | **BPM is the first full tool pilot**; Add Guest is its first published walkthrough. Planned/unavailable BPM workflows remain drafts. |
| OD3 | Show only walkthroughs relevant to the **current tool and authorized action**. |
| OD4 | Help opens with Walk Me Through It choices, then reference/troubleshooting. **Nothing is automatically recommended or opened.** |
| OD5 | Walkthroughs use the **live** tool. Saved actions are real; warn users accordingly. |
| OD6 | **Hard prerequisites block starting; recommended preparation only informs.** Automatically verify every prerequisite the host can determine. |
| OD7 | An existing valid sticky BPM/date/location **satisfies** prerequisite progress. |
| OD8 | GMS may navigate within the current tool and its own modals — **not unrelated tools**. |
| OD9 | A satisfied step displays **Already complete** and offers Next or End. **Do not silently rush forward.** |
| OD10 | Additional optional form information **never blocks** step progression. |
| OD11 | **Warn before exit when unsaved tool data may be lost** (distinct from saved work, which stays saved). |
| OD12 | Persist per-user progress **across devices**; expire unfinished progress after **30 days**; allow restart at any time. |
| OD13 | Award **1 XP** for the first completion of each published walkthrough version. Repeats earn none; a substantially revised version may award 1 new XP. |
| OD14 | **Preview mode awards no XP or completion but remains live — saved test actions are real.** Encourage useful real entries rather than disposable records. |
| OD15 | One rating per user per walkthrough version, updatable; 1–5 stars plus an optional comment. Managers may view individual completion, XP, ratings and comments. |
| OD16 | **Validate every target before publication; automatically disable incompatible published walkthroughs and notify managers.** |
| OD17 | Initial analytics: starts, completions, early exits, common exit step, ratings/comments, XP. **Automated recommendations are deferred.** |
| OD18 | A host-configured **protected bootstrap administrator**. Do not scatter the email through application logic. That account may deliberately disable its own protected status; audit and confirm. |

## 4. Deliberately not built

- **A payload channel of any kind.** G3. There is no third parameter and no metadata field.
- **A structured content editor, step builder, permissions and feedback screens.** G11 — the admin page
  is the subset that gets imported content live.
- **Automated recommendations.** OD4 and OD17. The drawer lists; it never suggests.
- **Auto-advance on a satisfied step.** OD9.
- **Navigation to unrelated tools.** OD8.
- **A wrapper element around any host control.** G9.
- **HTML in content.** The block union is closed and carries none, so there is no sanitiser to
  misconfigure and no XSS surface.
- **A client-side copy of metric wording.** G6 — resolved server-side, so it cannot drift.
- **Tool scoping inside the permission model.** G7.
- **A second job runner.** G10.
- **More than one instrumented tool.** BPM only, by OD2.
- **An automated test that BPM works with GMS absent.** See §5 — the one gap the package could not
  close.

## 5. Outstanding

1. **Deploy, in order.** Six migrations, seed `gms:*`, deploy the frontend, **then** register the
   targets from that same build. Getting step order wrong disables walkthroughs that are actually fine —
   see [OPERATIONS.md §5](OPERATIONS.md#5-deployment).
2. **Grant `gms:read`** to a pilot group and `gms:author` to an approver. Until then the feature is
   invisible.
3. **Approve and publish Add Guest**, reading the change note first — it lists the corrections applied
   on import (G6).
4. **The one gap, stated rather than papered over: there is no automated test that BPM renders and
   submits with GMS absent** (G12). The property is structural — `emit` returns immediately when nothing
   is attached, and `HelpAction` returns `null` without the capability — but structural is not asserted.
   `gms-adapter.contract.ts:17` records it as the one piece of the plan this package could not deliver.
   It needs a frontend test runner, which is a toolchain decision beyond a help feature's scope; it is
   the strongest single argument for adding one.
5. **Instrument a second tool.** The adapter, the manifest pattern and the build plugin are all
   tool-agnostic; only BPM has a `gms-targets.ts`. The plugin's `TOOLS` array is where a second one is
   added.
6. **A non-visual equivalent for the spotlight.** A screen-reader user gets the instruction but not the
   "look here" cue. Inherent to the pattern rather than a markup oversight, and unsolved.
7. **Publish the remaining BPM walkthroughs** as they are validated. They ship as drafts by design
   (G11, OD2), so this is an operator action.
