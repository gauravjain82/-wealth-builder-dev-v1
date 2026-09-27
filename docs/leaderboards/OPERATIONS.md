# Leaderboards — Operations

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

> **Not live.** Two `wbreporting` migrations are unapplied and nobody holds `homev2:read`.
> §5 has the deploy sequence, and it is not a frontend-only deploy.

## 1. Environment and configuration

No module-specific variables. It uses `VITE_API_BASE_URL` like every other module
([platform OPERATIONS §1](../platform/OPERATIONS.md#1-environment-and-configuration)).

Everything configurable is **backend state**, not client config — which is the point of the
Settings surface:

| Setting | Where | Effect |
|---|---|---|
| Goals | `/leaderboard-settings/` | the Full Report's gauge denominators |
| `show_net_base` | `/leaderboard-display-settings/` | whether Net Base appears in `visible_scopes` at all |
| `milestone_measurement_mode` | same | `new_recruit_cohort` or `milestones_completed` |
| The 7×3 masking matrix | same | which proof fields reach which viewer |
| Named date ranges | `/date-ranges/` | label, order, visibility of each range choice |
| `WB_MILESTONE_TIMESTAMPS_SINCE` | backend env | the date before which milestone periods report unavailable |

## 2. Build and run

Standard ([platform OPERATIONS §2](../platform/OPERATIONS.md#2-build-and-run)). Two
module-specific notes:

- The module emits **two lazy chunks** — the page and the Home v2 card path. A successful
  `npm run build` that does not produce both means a lazy import was inlined.
- `leaderboards.css` is imported by the page component, not globally
  (`pages/leaderboards-page.tsx:22`), so its 940 lines load only on this route.

Local development against a backend that lacks the migrations will show the guard's loader
and then redirect to `/home`, because `/my-access/` will not answer. That is
indistinguishable from a denial in the UI.

## 3. Feature flags and rollout

No client-side flag. Two backend capabilities:

| Capability | Grants | Effect when absent |
|---|---|---|
| `homev2:read` | `/leaderboards`, `/home-v2`, and both menu entries | the route redirects to `/home`; no menu entry appears |
| `wbreporting:manage` | the Settings tab, and every `PATCH` | the tab is not offered; a `PATCH` would 403 |

Granted per user in the backend access console. **No plan and no role grants either one**
(decisions L7, L10). Rolling out is therefore an access-console action, not a release: a grant
takes effect on the user's next page load, and revoking it removes the feature the same way.

`show_net_base` is a third, finer gate: the Net Base scope is fully built but stays off
server-side (decision L3), so it can be switched on without a release.

## 4. Tests and checks

**No automated tests.** There is no test runner in this repo
([platform OPERATIONS §4](../platform/OPERATIONS.md#4-tests-and-checks)). The backend side
of this feature is well covered — `wbreporting` was at 526 green tests at the end of Phase 9,
plus 20 added in Phase 8 across `tracker` and `wbreporting` — so the contract is verified on
the server, not here.

What was actually verified for this module, and what to repeat after a change:

1. `npm run type-check` — clean. The wire types are the real contract check; a renamed
   backend field surfaces here and nowhere else.
2. `npm run lint` — **reports nothing in this module.** The repo's 7 errors and 117
   warnings are all in `systematic-tools` and `team`, so for leaderboards the useful check is
   that the module contributes none of them ([platform OPERATIONS §2](../platform/OPERATIONS.md#2-build-and-run)).
3. `npm run build` — succeeds and emits both lazy chunks.
4. `git diff main -- src/features/home/pages/home-page.tsx` — **must be empty.** `/home` is
   deliberately untouched by this work (decision L7); this check is how that stays true.
5. Manual: each of the seven states in [UI.md §3](UI.md#3-states), the draft/apply behaviour,
   and a print preview of the Full Report at all three widths.

## 5. Deployment

**This module cannot ship alone.** `feature/wb-leaderboards` exists in both repos and they
must merge and deploy together, exactly like BPM v2. Merging the frontend alone produces a
route that renders and then fails every request.

The sequence, from the backend handover — steps 1–3 are backend actions and **none of them
should be run unprompted**:

1. Apply the migrations: `wbreporting/0001_initial` (still unapplied from the pipeline
   package) and `wbreporting/0002`. `tracker/0050` was applied 2026-09-25.
2. Seed: `seed_homev2_permissions`, `seed_wbreporting_date_ranges`, and
   `seed_wbreporting_metric_definitions --overwrite` — the `--overwrite` is required because
   the wording of `npr`, `lr`, `rr` and `rc` changed and the seed preserves edits by default.
3. Clean the pre-fix milestone stamps, **then** set the date, in that order:
   `reset_first_milestone_stamps --before <day after deploy>` as a dry run, then `--apply`,
   then set `WB_MILESTONE_TIMESTAMPS_SINCE=<day after deploy>`. Use the day *after* the
   deploy, never the deploy day: a part-day of coverage reported as a full one understates
   the period.
4. Deploy this frontend (`npm run build`, `firebase deploy --only hosting`).
5. Grant `homev2:read` to the named rollout group in the access console.

Rollback is the reverse of step 5 alone: revoking the grant hides the feature without a
deploy. That is the main operational benefit of gating this way.

**Expected after go-live:** every period reports `source: daily_fallback` until the pipeline's
monthly schedule is switched on (decision L8). This is correct behaviour, not a defect, and
the UI states it in words rather than hiding it.

## 6. Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| `/leaderboards` redirects to `/home` | no `homev2:read`, **or** `/my-access/` is failing | the `/api/wbreporting/my-access/` response. A 500 and a denial look identical in the UI |
| No menu entry, but the URL works | `use-role-based-menu.ts` did not get `can_view_leaderboards` | the same response; the menu and the guard read one query |
| Settings tab missing for a manager | `can_manage` false | the same payload — one endpoint reports both flags |
| Every period says "daily fallback" | the pipeline's monthly schedule is off | expected (L8). Not a frontend issue |
| A milestone tab shows "no data" for a past period | period precedes `WB_MILESTONE_TIMESTAMPS_SINCE` | expected (L5). The all-time basis carries the real count; a zero here would be a lie |
| `metric_not_supported` on a milestone tab | backend predates Phase 8 | branch mismatch between the repos |
| Net Base scope missing | `show_net_base` is false server-side | expected (L3) — flip the setting, no release needed |
| A gauge and its personal list disagree | net-negative members are dropped from the list, counted in the gauge | deliberate (L14). The list is not a reconciliation of the gauge |
| Gauge and its panels disagree for a closed month | the panels ignore the resolved source | the latent backend issue in [ARCHITECTURE.md §8](ARCHITECTURE.md#8-invariants-and-failure-modes). Will only appear once monthly snapshots are on |
| A filter change shows the old numbers briefly | the selection left the query key, or `signal` is no longer forwarded | the hook's `queryKey` against `use-leaderboards.ts:31` |
| Print loses the four columns or the zone colours | the print block or `print-color-adjust` was edited | `leaderboards.css:766`, `:810` |
| Proof rows show `—` everywhere | the masking matrix, or the viewer's relationship | `/leaderboard-display-settings/`. The client does no masking, so this is always server state |
