# Wealth Builder frontend — working notes

Vite + React 18 + TypeScript SPA over the Django REST backend in the sibling `mlm_platform`
repo. 28 feature modules under `src/features/`.

## Find the documentation before searching the code

Docs live at **`docs/<module>/`, where `<module>` is the feature directory name, exactly**.
Working in `src/features/calendar-sync/` → read `docs/calendar-sync/`. Construct the path;
do not grep for it.

| Need | File |
|---|---|
| Every module, its routes, its backend app, its doc tier | [`docs/README.md`](docs/README.md) |
| The shell: layering, auth, guards, caching, build | [`docs/platform/`](docs/platform/) |
| A worked example of a complete doc set | [`docs/leaderboards/`](docs/leaderboards/) |
| The doc contract, before writing any doc | [`docs/DOCUMENTATION_STANDARD.md`](docs/DOCUMENTATION_STANDARD.md) |
| What is left to document, and where the "why" for each module lives | [`docs/DOCUMENTATION_PLAN.md`](docs/DOCUMENTATION_PLAN.md) |

Six files per documented module, each answering one thing:
`README` (what and why) · `ARCHITECTURE` (how, and the invariants) · `UI` (routes, screens,
states) · `API` (endpoints consumed) · `OPERATIONS` (env, flags, deploy, troubleshooting) ·
`PHASES` (history, and the decision log).

**Read `PHASES.md` before changing a behaviour.** Its decision log records what was chosen
over what. Several things in this codebase look like bugs and are decisions — a milestone
metric that reports "no data" instead of `0`, a scope that is built but switched off, a
personal list that does not sum to the gauge above it.

**Check the front matter.** Every doc carries `Verified against: commit <sha>`. If
`git log -1 --format=%h -- src/features/<module>` is newer, treat the body as suspect and
verify against the source.

## Two facts the archived docs get wrong

`docs/_archive/` holds `ARCHITECTURE.md`, `QUICK_START.md` and `MIGRATION_GUIDE.md` from the
original design. **Do not cite them, and do not follow their patterns.**

1. **Data access is `fetch` against a REST API, not a repository over Firestore.** Each
   module's `services/` builds URLs against `VITE_API_BASE_URL` and sends
   `Authorization: Token <localStorage['wb.authToken']>`.
   `src/infrastructure/firebase/base-repository.ts` is imported by nothing — it looks like
   the intended pattern and is not.
2. **Identity is a DRF token from `/api/accounts/login/`, not Firebase Auth.** Firebase is
   the deploy target plus two residual Firestore reads.

## Conventions that matter

- **Layering is a rule.** Page/component → hook → service → API. A component never calls
  `fetch`; a hook never builds a URL. Verified: no `.tsx` in `src/features/` imports
  `firebase/firestore`.
- **Trailing slashes are required** on API paths. Django's `APPEND_SLASH` will otherwise
  redirect and drop the body of a POST.
- **Query keys carry the full selection**, and every `queryFn` forwards React Query's
  `signal` into `fetch`. Both are needed: the key makes a superseded response irrelevant,
  the signal actually cancels the request. `src/features/leaderboards/hooks/use-leaderboards.ts`
  is the reference.
- **Rollouts are backend grants.** Gated features read a per-user capability at runtime
  (`homev2:read`, `gms:author`, `products:read`, `wbreporting:manage`). There are no
  client-side feature flags, and a frontend deploy cannot turn a gated feature on.
- **A route guard decides rendering, never permission.** The backend re-checks every
  request. Removing a guard is a UX regression, not a privilege escalation.
- **Masking is server-side only.** A field the viewer may not see is *absent* from the
  response, not nulled. An absent key renders `—`, never `0`.
- **Module styles are prefixed and scoped** — `wb-lb-` for leaderboards. Do not add global
  theme rules from inside a module.
- **Cite docs by their real in-repo path.** Older comments referenced `UI_CONTRACT.md` and
  friends, which live in vendor packages in `mlm_platform/temporary/` and resolve nowhere
  here. `leaderboards` is cleaned up; `contests`, `gms`, `bpm` and `calendar-sync` still have
  dangling citations. When you fold one in, repoint the comment.

## Checks

```bash
npm run type-check   # the main safety net — there is no test suite
npm run lint         # currently FAILS on main: 7 errors, 117 warnings
npm run build        # type-checks first, outputs to build/
```

There is **no test runner** in this repo. The wire types in each module's `types/` are the
real contract check; backend behaviour is tested in `mlm_platform`. Do not claim a change is
verified on a green build alone — say what you actually ran.

`npm run lint` does not pass on `main`: 7 errors — 5 in [team](docs/team/), 2 in
`systematic-tools` — and 117 warnings, all predating current work. `type-check` and `build` do
pass. Judge your change by whether it adds to those counts, not by whether lint is green. Exact
lines: [docs/platform/OPERATIONS.md §2](docs/platform/OPERATIONS.md#2-build-and-run).

## Coupled branches

`feature/wb-leaderboards`, `feature/wb-contests`, `feature/wb-gms`,
`feature/wb-reporting-pipeline`, `feature/bpm-v2` and `feature/bpm-updates-oct` each have a counterpart branch in
`mlm_platform` and must merge and deploy together. Merging one side alone yields a page that
renders and then fails every request. `leaderboards`, `contests`, `gms` and `home-v2` are on
`main` but **not deployed** — their migrations are unapplied and nobody holds the grant.

## When you change code

Update the module's doc in the same commit — a route, an endpoint, a screen state, a query
key, a permission gate or an env var all belong in one of the six files. Update
`Verified against` when you re-read the code, and record a real decision in `PHASES.md` §3
with a stable ID and a cited source.
