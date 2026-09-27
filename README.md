# Wealth Builder — frontend

The Wealth Builder web app: a Vite + React + TypeScript single-page application over the
Django REST backend in `mlm_platform`.

## Tech stack

| | |
|---|---|
| Build | Vite 5, TypeScript 5.5 |
| UI | React 18, Tailwind CSS, Radix primitives |
| Server state | TanStack Query v5 |
| UI state | Zustand (two slices: theme, toasts) |
| Routing | React Router v6, lazy-loaded per route |
| Backend | Django REST — `fetch` + `Authorization: Token` |
| Payments | Stripe Elements |
| Hosting | Firebase Hosting |

Firebase is the **deploy target**, not the backend. Identity is a DRF token from
`/api/accounts/login/`, and Firestore is used only for the home carousel and a video config.

## Getting started

```bash
npm install
cp .env.example .env     # then add VITE_API_BASE_URL — see below
npm run dev              # http://localhost:3000
```

| Script | Does |
|---|---|
| `npm run dev` | Vite dev server on :3000 |
| `npm run type-check` | `tsc --noEmit` — the project's main safety net |
| `npm run lint` | ESLint, `--max-warnings 0` |
| `npm run build` | type-check, then build to `build/` |
| `npm run preview` | serve the built output |

**`.env.example` is incomplete.** It omits `VITE_API_BASE_URL` and
`VITE_FRONTEND_BASE_URL`. Without the first, every request silently goes to
`http://localhost:8000`. The full environment contract is in
[`docs/platform/OPERATIONS.md`](docs/platform/OPERATIONS.md#1-environment-and-configuration).

## Layout

```
src/
├── router/          route table (98 entries) and 12 guards
├── shared/          layouts, shared UI components, shared services
├── features/        28 feature modules — the application
├── infrastructure/  React Query client; residual Firebase
├── store/           Zustand slices (theme, toasts)
├── core/            constants, global types, utils
├── config/          menu definition
└── hooks/           cross-cutting hooks (theme, menu)
```

Each feature module follows the same internal shape, and the layering is a rule, not a
suggestion — a component never calls `fetch`:

```
features/<module>/
├── pages/        route components
├── components/   feature components
├── hooks/        React Query wrappers — query keys, cache policy
├── services/     fetch, URL building, auth headers, typed errors
└── types/        wire types
```

## Documentation

**Start at [`docs/README.md`](docs/README.md)** — the index of every module.

| If you want to | Read |
|---|---|
| Understand the shell before touching anything | [`docs/platform/`](docs/platform/) |
| See what a complete module doc looks like | [`docs/leaderboards/`](docs/leaderboards/) |
| Document a module | [`docs/DOCUMENTATION_STANDARD.md`](docs/DOCUMENTATION_STANDARD.md), then copy [`docs/_standard/`](docs/_standard/) |
| Work on the backend | `mlm_platform/docs/` — same standard, same shape |

Docs live at `docs/<module>/`, where `<module>` is the feature directory name exactly. Six
files per documented module: `README`, `ARCHITECTURE`, `UI`, `API`, `OPERATIONS`, `PHASES`.

The repository root holds only this file and `CLAUDE.md`. Superseded documents are in
[`docs/_archive/`](docs/_archive/), each with a banner naming its replacement and what it got
wrong — do not cite them.

## Things worth knowing before you start

- **Rollouts are backend grants, not deploys.** Gated features are gated by a per-user
  capability the client asks about at runtime (`homev2:read`, `gms:author`, …). There are no
  client-side feature flags, and a frontend deploy cannot turn a gated feature on.
- **Some branches must deploy with the backend.** `feature/wb-leaderboards`,
  `feature/wb-contests`, `feature/wb-gms`, `feature/wb-reporting-pipeline` and
  `feature/bpm-v2` each have a counterpart in `mlm_platform`. Merging one side alone produces
  a page that renders and then fails every request.
- **A route guard is not authorization.** The backend re-checks every request independently.
- **There is no test suite.** `npm run type-check` plus the backend's own tests are the
  current safety net. See
  [`docs/platform/OPERATIONS.md`](docs/platform/OPERATIONS.md#4-tests-and-checks).
