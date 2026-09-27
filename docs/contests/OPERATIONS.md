# Contests — Operations

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

## 1. Environment and configuration

No module-specific `VITE_` variables. Everything configurable is **backend state or contest data**:

| Setting | Where | Effect |
|---|---|---|
| Contests, tiers, thresholds, eligibility, periods, rewards | the settings screen | the whole board |
| `near_percent` | served in `EditorOptions` | what counts as "near" |
| Flyer limits (`max_bytes`, `allowed_types`) | served in `EditorOptions` | upload validation |
| Eligibility levels | `accounts.Level` | the level checkboxes. Adding a level needs **no release** |
| `WB_MILESTONE_TIMESTAMPS_SINCE` | backend env | whether `mr`/`mp` can be measured at all |
| `homev2:read`, `wbreporting:manage` | access console | who reads, who configures |

The editor renders from `EditorOptions` rather than hard-coded lists, which is why a new level or a
changed flyer limit appears without a frontend deploy.

## 2. Build and run

Standard ([platform OPERATIONS §2](../platform/OPERATIONS.md#2-build-and-run)). Two lazy chunks — the
card path and the settings page. `contests.css` is imported by the components that need it, not
globally.

Locally you need `homev2:read` on your own account to see anything, and `wbreporting:manage` for the
settings screen. There is no dev bypass.

**Testing the card properly means testing it in its slot.** Its height comes from the host — on
`/home-v2` from a sibling card's `aspect-ratio: 3 / 2` via grid `align-items: stretch`. Checking it
only on `/contests`, where the box is tall, will not catch a containment regression.

## 3. Feature flags and rollout

No client-side flags. Two capabilities, both from one `my-access` payload:

| Capability | Grants | Without it |
|---|---|---|
| `can_view_contests` (`homev2:read`) | `/contests`, the card, the menu entry | `/contests` → `/home`; no menu entry |
| `can_manage` (`wbreporting:manage`) | `/admin/contest-settings` and all eight writes | settings URL → `/contests` |

`can_view_contests` rides the **same `homev2:read` grant** as Home v2 and Leaderboards (decision C11):
the contest card lives on the page that gate already opens, so a separate permission would have to be
granted to exactly the same people.

**A `considered` contest is settings-only** and never offered to readers — that is how a contest is
drafted before it is announced.

## 4. Tests and checks

No frontend tests ([platform OPERATIONS §4](../platform/OPERATIONS.md#4-tests-and-checks)). The
backend side is well covered, including a test asserting that `slic` and the Non-License rule *can*
disagree (C1).

Verified at the time of the work: `tsc --noEmit` clean, eslint clean, `npm run build` emits both lazy
chunks. `npm run lint` reports nothing in this module today.

Manual checks, ordered by what they protect:

1. **Containment, in the real slot.** Open `/home-v2` and confirm the card fills its grid row, that
   only the standings area scrolls, and that **the page itself does not grow**. Then narrow the window
   and confirm horizontal scrolling stays inside the card.
2. **A blank cell.** Find an ineligible cell — a licensed agent against a Non-License tier is the
   easy case — and confirm it is visually empty, says nothing like "Restricted", and still conveys its
   meaning to a screen reader.
3. **Never zero.** Confirm an unmeasurable requirement shows no number rather than `0%`.
4. **Draft filters.** Type in the person picker and confirm **no** request fires until Apply.
5. **The three-state tier gesture**, including toggling the last selected tier off to return to all.
6. **Proof.** Open a cell's proof and confirm the period came from the server — the request should
   carry no date parameters.
7. **Edit conflict.** Open the settings screen in two tabs, save in one, then save in the other.
   Expect a clear message and a **Reload**, never a silent overwrite.
8. **Tier deletion.** Mark a tier for deletion, save, and confirm it is gone — then confirm a save
   that omits `replace_tiers` does **not** delete anything.
9. **Flyer.** Upload, publish, view, then reopen the dialog after 15 minutes and confirm the URL is
   re-signed rather than dead.
10. **`BR`/`BP`/`LIC` labelling** is present in the tier editor. This is the one that can produce a
    wrong prize decision.

## 5. Deployment

**Already deployed.** The code shipped 2026-09-26 and migrations `wbreporting/0001`–`0003` are
applied. Verify with `showmigrations wbreporting` on the target environment rather than from any
document — an earlier handover note claiming "four pending" was stale.

What remains is operational, not a deploy:

1. **Grant `homev2:read`** to the contest rollout group in the access console. Until then no reader
   can reach the feature.
2. **Set `WB_MILESTONE_TIMESTAMPS_SINCE`** once `tracker/0050` is applied, or `mr`/`mp` report
   unavailable forever.
3. **Confirm with the business that `BR`, `BP` and `LIC` are understood as direct-report measures**
   *before* any contest is configured against them (C5).
4. **Confirm whether `CEO` and `EVC` levels are used.** If so they are added to `accounts.Level` with
   ranks above `SMD` — an operator action, not a code change (C9).

Rollback is revoking the grant. No deploy required.

## 6. Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| `/contests` redirects to `/home` | no `homev2:read`, or `my-access` failing | `/api/wbreporting/my-access/`. A 500 and a denial look identical |
| Settings URL bounces to `/contests` | no `wbreporting:manage` | the same payload's `can_manage` |
| No menu entry but the URL works | the menu reads the same access query | `use-role-based-menu.ts` |
| **The page grows instead of the card scrolling** | a `min-height: 0` was dropped, or a second `flex: 1` child added | `contests.css:1-29`. **This fails silently** |
| Overlays clipped | a dialog not using the shared `Modal` | the card sets `overflow: hidden`; dialogs must portal to `document.body` |
| A cell is blank | the agent is ineligible for that tier | expected, and deliberate. Do not add a label |
| A cell shows `0%` where it should be blank | `progress: null` was coalesced | `contest-cell.tsx` — `null` must return `''` |
| A tier never says qualified | a requirement is unmeasurable | expected (C7): never qualified while anything is unmeasurable |
| `mr`/`mp` always unavailable | `WB_MILESTONE_TIMESTAMPS_SINCE` unset | a deploy step, not a bug |
| `BE` or `C` cannot be required | no source in this deployment | expected; the input says why |
| Standings look lower than the Production Tracker | the tier uses `BR`, `BP` or `LIC` | expected (C5) — single-hop Leader, no base-shop boundary |
| `slic` disagrees with Non-License status | they read **different columns** | expected (C1). A backend test asserts it |
| A save 409s | somebody else saved first | reload. Never retry — that is the overwrite revisions prevent |
| "Hide" produces a 409 | a stale revision from an earlier read | every mutation re-reads the list; if not, the shared invalidation is broken |
| A tier vanished after a save | `replace_tiers` with an omitted tier | send the complete collection and mark removals `pending_delete` |
| Flyer upload fails with a parse error | a `Content-Type` header was set | let the browser set the multipart boundary |
| Flyer link dead | the signed URL expired | `staleTime` is 10 min against a ~15 min lifetime; reopening re-signs |
| A contest is invisible to readers | `contest_status = considered`, or hidden | considered contests are settings-only by design |
| A filter state cannot be shared | nothing is in the query string | a known limitation |
