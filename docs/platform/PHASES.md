# Platform — Phase History

| | |
|---|---|
| **Module** | `platform` |
| **Source** | `src/router/`, `src/shared/`, `src/infrastructure/` |
| **Routes** | mounts all of them |
| **Backend module** | `accounts`, `authz` |
| **API prefix** | `/api/accounts/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Phases marked `~` are reconstructed from the commit history rather than taken from a
> written plan. See [the standard](../DOCUMENTATION_STANDARD.md#6-phase-conventions).
> The shell had no phased plan; these are boundaries visible in `git log`, not milestones
> anyone declared at the time.

## 1. Timeline

264 commits, 2026-03-24 to 2026-09-27.

| Phase | Date | Status | Shipped |
|---|---|---|---|
| ~0 | 2026-03-24 | Superseded | Vite + React + TS skeleton, planned around Firebase |
| ~1 | 2026-04 → 05 | Shipped | Django REST replaces Firebase as the data source; token auth; trackers |
| ~2 | 2026-05 → 06 | Shipped | Layout, plan/role menu, theme, shared component library |
| ~3 | 2026-07 → 08 | Shipped | Module count grows past twenty; per-module service layer settles |
| ~4 | 2026-09 | Shipped | Per-user capability guards — gating moves from plan to backend grant |
| ~5 | 2026-09 | Merged, not deployed | The gated 2026 packages land on `main` behind capabilities |

Commit volume by month: 1, 6, 46, 43, 20, 42, 106 — the September figure is the four gated
packages arriving at once.

## 2. Phases

### ~0 — Firebase-shaped skeleton (2026-03-24)

**Goal.** Stand up a modern replacement for the previous Wealth Builder app.

**What shipped.** Vite, React 18, TypeScript, Tailwind, React Router v6, TanStack Query,
Zustand — and an architecture designed around Firebase: `infrastructure/firebase/` with a
generic `BaseRepository`, Firestore `converters.ts` mapping `Timestamp` to `Date`, and a
documented repository-per-feature pattern.

**Decisions.** P1, P2.

**Divergence from plan.** Total, within weeks. The four root documents written in this phase
— `ARCHITECTURE.md`, `README.md`, `QUICK_START.md`, `MIGRATION_GUIDE.md` — describe this
design and were never updated. They are now in [`docs/_archive/`](../_archive/).

### ~1 — Django REST replaces Firebase (2026-04 → 2026-05)

**Goal.** Integrate the real backend.

**What shipped.** `POST /api/accounts/login/` returning a DRF token; the token in
`localStorage`; `fetch`-based services per feature; the tracker and prospect integrations
that set the pattern every later module copied.

**Decisions.** P3, P4.

**Divergence from plan.** The repository layer was not ported. Only `auth` has a
`repositories/` directory, and it is a thin `fetch` wrapper, not a Firestore repository.
`BaseRepository` was left in the tree unused.

### ~2 — The shell settles (2026-05 → 2026-06)

**Goal.** One frame for every page.

**What shipped.** `MainLayout` (header, sidebar, outlet, chat); `config/menu.ts` with
plan/role filtering; the theme as a class on `documentElement` driven by a Zustand slice;
`shared/components/ui/` as the component library; `ProtectedRoute`, `PublicRoute`,
`RootRedirect`, `AdminRoute`.

**Decisions.** P5.

### ~3 — Breadth (2026-07 → 2026-08)

**Goal.** Cover the product surface.

**What shipped.** Events, BPM, matchup, licensing, promotion, training, file vault,
helpdesk and the team trackers — past twenty feature modules. The layering in
[ARCHITECTURE.md §1](ARCHITECTURE.md#1-layering) held throughout: no component calls
`fetch`.

**Divergence from plan.** Each module re-declared `API_BASE_URL` and `getAuthHeaders`
instead of sharing one client. Uniform, and never unified.

### ~4 — Capability gating (2026-09)

**Goal.** Ship a feature to a named list of users without a release.

**What shipped.** Eight capability guards in `src/router/`, each calling a module
`my-access` endpoint; `use-role-based-menu.ts` extended to inject their menu entries from
the same responses.

**Decisions.** P6, P7.

**Why it mattered.** Plan and role could not express "these eleven people are trying the new
home page". Capabilities moved that decision to the backend access console, where it can be
changed without a deploy.

### ~5 — The gated packages (2026-09, not deployed)

**Goal.** Land four vendor-specified packages without exposing them.

**What shipped.** `leaderboards`, `contests`, `gms` and `home-v2` on `main`, each behind a
capability nobody has been granted. Their backend counterparts are on separate branches with
unapplied migrations.

**Status.** Merged, not deployed. See each module's `OPERATIONS.md` §5 for its coupling.

## 3. Decision log

| ID | Decision | Rationale | Source |
|---|---|---|---|
| P1 | Feature-first directories over layer-first | A module's page, hook, service and types change together; grouping by layer means four directories per change | `_archive/ARCHITECTURE.md` |
| P2 | TanStack Query for server state, Zustand for UI state only | Server state has its own problems — caching, staleness, cancellation — that a global store solves badly. Zustand holds two slices and nothing else | `infrastructure/query/provider.tsx`, `store/slices/` |
| P3 | Django REST API over Firebase as the data source | Firestore could not express the hierarchy, ranking and permission logic the domain needs; that logic belongs in one place, server-side | commit history 2026-04, and the 21 `/api/` prefixes today |
| P4 | DRF token in `localStorage`, read per service | Simplest thing that worked with the backend's existing auth. Cost: no expiry handling, no central 401 handler, 53 call sites read the key directly | `auth-repository.ts:307` |
| P5 | Theme as a class on `documentElement`, not a React context | CSS can then respond without a re-render, and a module stylesheet can theme itself | `hooks/use-theme.ts` |
| P6 | Rollout by backend capability, not plan, role or build flag | A named rollout list is not a role. Putting it in the backend makes granting it an access-console action rather than a release | `router/leaderboards-route.tsx:10` |
| P7 | Route guards decide rendering only; the backend re-checks every request | A guard the client controls cannot be authorization. Making that explicit stops anyone treating a hidden control as a protected one | `router/leaderboards-route.tsx:18` |

## 4. Deliberately not built

- **A shared HTTP client.** The duplication in
  [ARCHITECTURE.md §8](ARCHITECTURE.md#8-invariants-and-failure-modes) is known. It has not
  been unified because it is uniform: every service does the same thing the same way, so the
  cost is a mechanical future edit rather than inconsistent behaviour today.
- **A central 401 interceptor / forced logout.** Nothing catches an expired or revoked
  token globally. Each module surfaces its own failure. Recorded in §5, not defended.
- **A 404 page.** `*` redirects to `/`. A mistyped URL is treated as a navigation accident,
  not an error worth a screen.
- **Token refresh.** DRF tokens do not expire; there is nothing to refresh.
- **Social and self-service signup.** `authRepository.signUp` and `signInWithGoogle` exist
  as stubs (`auth-repository.ts:237`, `:241`). Accounts are created by the backend's invite
  flow, so neither was wired up.
- **Client-side feature flags.** Superseded by P6 — capabilities do the job, and a flag
  would need a deploy to change.
- **Firestore as a datastore.** `infrastructure/firebase/base-repository.ts` is imported by
  nothing. It is the last of the ~0 design. **Do not build on it** — it looks like the
  intended pattern and is not.
- **A test suite.** No runner is installed. `type-check` plus the backend's own tests are
  the current safety net; see [OPERATIONS.md §4](OPERATIONS.md#4-tests-and-checks).

## 5. Outstanding

Ordered by cost-to-benefit, cheapest first.

1. **Add `VITE_API_BASE_URL` and `VITE_FRONTEND_BASE_URL` to `.env.example`.** A fresh clone
   currently builds and silently points at localhost. One-line fix, saves every new
   contributor the same hour.
2. **Handle 401 centrally.** A revoked token leaves the user on a working shell with every
   panel failing. The fix is one place; the absence is felt everywhere.
3. **Adopt one HTTP client.** `shared/services/content-page-service.ts` already exports
   `API_BASE_URL` and `getAuthHeaders`; `home` imports them. Extend that, or replace it, and
   migrate module by module. Do not attempt it in one commit.
4. **Explain a denial.** A capability guard redirects to `/home` silently, so a user who
   followed a shared link cannot tell "not for you" from "broken". A message on the landing
   page would.
5. **Drop the Firebase remnant.** Move the two Firestore reads — the home carousel and the
   video config — to the backend, then delete `infrastructure/firebase/` and the
   `firebase-vendor` chunk with them.
6. **Get `npm run lint` to zero, then keep it there.** Seven errors and 117 warnings mean
   the `--max-warnings 0` setting is decorative: nobody can use lint as a gate, so new
   problems land unnoticed. The seven errors are small and localised
   ([OPERATIONS.md §2](OPERATIONS.md#2-build-and-run)); the warnings are the real work.
7. **Decide on tests.** Not "add tests" — decide what the automated check is. The wire types
   are doing that work today, and saying so explicitly is worth more than an empty runner.
