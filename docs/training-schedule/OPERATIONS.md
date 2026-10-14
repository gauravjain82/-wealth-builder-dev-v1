# Training Schedule — Operations

| | |
|---|---|
| **Module** | `training-schedule` |
| **Source** | `src/features/training-schedule/` |
| **Routes** | `/training-schedule`, `/training-schedule/attend/:token` |
| **Backend module** | `training_schedule` → `mlm_platform/docs/training_schedule/` |
| **API prefix** | `/api/training-schedule/` |
| **Status** | Merged-not-deployed |
| **Doc version** | 2.0 |
| **Verified against** | commit `7b487dc` plus the uncommitted rebuild on `feature/training-schedule` — 2026-10-14 |

## 1. Environment and configuration

`VITE_API_BASE_URL` only. The attendance link is built from `window.location.origin`, so it always
points at whichever deployment the host copied it from.

## 2. Build and run

Nothing module-specific. `npm run type-check` and `npm run build` pass with this module; it adds no
lint errors and no warnings (the rebuild removed the old page's one `react-hooks/exhaustive-deps`
warning).

## 3. Feature flags and rollout

There is no flag and no capability gate on the page. Once deployed, every signed-in user has the
schedule; hosting follows the member's **level** automatically.

Two things are configured on the backend, not here:

- **Administrators** need `training_schedule:manage`, granted in the access console after
  `seed_training_schedule_permissions` has created the catalogue entry. Django superusers have it
  implicitly.
- **The rules** — hosting level, the two delete policies, the attendance window — are edited by an
  administrator in *Settings* on the page.

## 4. Tests and checks

No test runner in this repo. The wire types in `types/index.ts` are the contract check; behaviour is
tested in `mlm_platform` (`training_schedule/tests/`, 66 tests). The UI has been type-checked, linted
and built. **It has not been exercised in a browser against a running backend.**

## 5. Deployment

Coupled: `feature/training-schedule` here and in `mlm_platform`. Order:

1. Backend: deploy, then `migrate training_schedule` (new tables only), then
   `seed_training_schedule_permissions`.
2. Grant `training_schedule:manage` to the administrators.
3. Frontend: deploy.

Deploying the frontend first yields a page that renders and fails every request. Deploying it at all
**replaces the browser-only schedule**: events members typed into the old page stay in their browser's
`localStorage` but are no longer shown.

## 6. Troubleshooting

| Symptom | Cause |
|---|---|
| A host sees no *New training* button | `my-access` says `can_host: false` — their level ranks below the hosting level, or no level with code `SMD` exists and none is chosen in *Settings* |
| An SMD does not see their upline's training | By design: an SMD is their own BaseShop. They inherit it |
| A member sees a training twice | They should not — a date is listed once however many hosts carry it; check `via` |
| The link says attendance isn't open during the call | The window is `opens_minutes_before` / `closes_minutes_after` around the date; check *Settings* and the training's time zone |
| An inheritor's count is lower than the owner's | By design: an inheritor sees attendees from their own BaseShop |
| A newly granted administrator sees no *Settings* | `authz` caches permission checks for a few minutes, and `my-access` is stale for 5 more |
| Someone shows as Stopped who came | Their attendance was at a training not on their schedule (another host's, not inherited by their SMD) or one that does not count; the member detail shows these as "beyond their own schedule" |
| Everyone shows as New | Members joined recently, or few trainings that count have ended; *New until* in Settings |
| A member is judged against the wrong trainings | Metrics use the member's **current** BaseShop for the whole history; a recent move between SMDs shows that way |
| After login the member lands on `/home`, not the attendance page | Login was opened in a new tab, which drops the router state that carries the return location |
