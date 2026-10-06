# Admin — Operations

| | |
|---|---|
| **Module** | `admin` |
| **Source** | `src/features/admin/` |
| **Routes** | 12 under `/admin/*` |
| **Backend module** | six apps |
| **API prefix** | six |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Environment and configuration

No module-specific `VITE_` variables. Only `VITE_API_BASE_URL`
([platform OPERATIONS §1](../platform/OPERATIONS.md#1-environment-and-configuration)).

**This module *is* the configuration surface for much of the app.** What is set here:

| Configured here | Affects |
|---|---|
| User and level permissions | every gated feature in the app — `homev2:read`, `gms:author`, `products:read`, `wbreporting:*`, the BPM capabilities |
| Functions and assignments | job assignment, independent of permissions |
| Content sections and items, with role access | what `home`, `file-vault` and `training-center` display |
| Product and company catalog | `tracker` reporting |
| Agency-code assignments | every reporting table a user appears in |

## 2. Build and run

Standard ([platform OPERATIONS §2](../platform/OPERATIONS.md#2-build-and-run)). Eleven lazy
chunks, one per page.

To work on any screen here you need a backend **and** the relevant grant on your own account —
there is no dev bypass. For the six `AdminRoute` screens you need `isAdmin` on your profile,
which means signing in after the flag is set; for the four capability-guarded screens you need
the grant, which takes effect on the next page load.

## 3. Feature flags and rollout

No client-side flags. Five gating mechanisms across twelve routes:

| Gate | Routes | Granted by | Takes effect |
|---|---|---|---|
| `AdminRoute` (`isAdmin`) | functions, user-permissions, level-permissions, file-vault, training-center, home-content, promotion | the profile | **next sign-in** — the flag is cached at login |
| `products:read` | products | this module's user-permissions screen | next page load |
| `wbreporting:read` / `:manage` | reporting-pipeline | " | next page load |
| misalignments grant | both data-integrity screens | " | next page load |
| **none** | invite-agents, mission-ring-proof | — | the route always renders |

The bootstrapping problem is worth stating: **the screens that grant capabilities are themselves
behind `isAdmin`.** A brand-new environment needs an admin user created server-side before any
capability can be granted through the UI.

## 4. Tests and checks

No frontend tests ([platform OPERATIONS §4](../platform/OPERATIONS.md#4-tests-and-checks)).
`npm run lint` reports nothing in this module.

Because this module writes configuration other modules read, the checks that matter are
cross-module:

1. **Grant and revoke a capability** on a test user, then confirm the target feature appears and
   disappears on their next page load. `homev2:read` is the clearest one to test with.
2. **Content round-trip** — create a section and an item in File Vault admin, upload a file, then
   open the reader-facing `/file-vault` as a user whose role should and should not see it.
3. **Staged upload** — create an item *with* a file in one action and confirm the file arrives.
   This is the path that silently loses files if the staging is broken.
4. **Reorder** — drag a section, reload, confirm the order persisted.
5. **Role access on both levels** — hide a section but not its item, and the reverse; confirm the
   reader-facing page agrees.
6. **Pipeline** — submit a recalculation twice quickly and confirm the second returns the running
   state rather than starting a second run.
7. **Level permissions** — grant at a level, confirm it applies to a user at that level who has
   no direct grant.

## 5. Deployment

Ships with any frontend deploy. No coupled branch — every backend app this module uses is in
production.

Two ordering hazards:

- **A content schema change is a two-repo change.** The admin form is schema-driven, so adding a
  field means the backend accepting it *and* the reader-facing page rendering it. Deploying the
  admin side alone lets an operator enter data nothing displays.
- **Revoking a capability takes effect immediately; granting `isAdmin` does not.** Plan support
  expectations accordingly.

## 6. Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| A screen opens, then every action 403s | the gate and the permission disagree — typically stale `isAdmin`, or one of the two unguarded routes | sign out and back in; or confirm the grant. See [ARCHITECTURE.md §6](ARCHITECTURE.md#6-permissions-and-gating) |
| A newly granted admin cannot see the admin screens | `isAdmin` is cached at login | sign out and back in. The fix belongs in `auth` |
| `/admin/promotion` opens but shows an error, or saves fail with "No permission promotion:manage" | the route checks the cached `isAdmin` flag; the API checks `promotion:manage`, seeded only to the ADMIN / SUPER_ADMIN / SUPERADMIN roles | grant `promotion:manage` on the user-permissions screen. On a backend without migration `promotion/0002` the grant does not exist yet |
| `/admin/invite-agents` opens for a non-admin | it has **no client guard** | expected. The API refuses them; the screen is simply not hidden |
| A granted capability does nothing | the feature reads a different permission than the one granted | the feature's `my-access` response, not the grant list |
| An uploaded file is missing from an item | the upload happens after create; it failed or was never staged | `uploadItemFile` needs an item id — see [UI.md §4](UI.md#4-interaction-rules) |
| A content item is invisible to a user | role access on the **section** or the **item** | both are set separately; neither implies the other |
| Section order keeps reverting | a reorder sent a partial id list | `reorderSections` takes the full ordered list |
| Cannot reorder without a mouse | `@dnd-kit` keyboard sensors are not configured | a known gap — [UI.md §6](UI.md#6-accessibility) |
| A permission cannot be deleted | the backend refuses one in use | expected; there is no client-side dependency check |
| Pipeline recalculation "does nothing" | a run is already holding the shared lock | the run list — a repeat returns the running state |
| The misalignments list is empty | there are no misalignments | that is the good outcome |
| A product has no company | companies are managed inline in the product form | the company combobox |
| Levels list is empty on Level Permissions | it loads via **`team`'s** prospect service | a `team` refactor can break this screen — see [ARCHITECTURE.md §8](ARCHITECTURE.md#8-invariants-and-failure-modes) |
| A user contributes nothing to reporting | no agency code | invite-agents assigns it; a member without one is counted in `uncoded_member_count` |
