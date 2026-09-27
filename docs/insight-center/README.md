# Insight Center — Overview

| | |
|---|---|
| **Module** | `insight-center` |
| **Source** | `src/features/insight-center/` |
| **Routes** | `/insight-center`, `/public-insight-center` |
| **Backend module** | **none** |
| **API prefix** | **none** |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Doc tier** | **Lite** — `README.md` + [UI.md](UI.md) |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Purpose

Insight Center is the introduction to the business: an intro video, a heading, and two calls to action
pointing at the business and education paths. It is a marketing surface, not a data one.

**It consumes no endpoints.** Every piece of content is in the component tree, which is why the same page
can be served publicly with no session.

## 2. Scope

**In scope** — the intro video, the CTAs, the page shell, and an **easter egg** (a logo that reveals a
hidden video).

**Out of scope** — everything else. It reads nothing and writes nothing.

## 3. At a glance

| | |
|---|---|
| Routes | 2 — one authenticated, one **public** |
| Pages | 1, serving both |
| Components | 5 |
| Services | 0 |
| Endpoints consumed | **0** |
| LOC (ts/tsx) | 279 |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Easter egg** | A hidden video revealed by interacting with the logo. |
| **Public variant** | `/public-insight-center`, the same page reachable without a session. |

## 5. Dependencies

**Upstream** — none beyond React. Each component carries its own CSS.

**Downstream** — `src/router/index.tsx`, two routes.

**Backend** — none.

## 6. Document map

Lite tier: this file plus [UI.md](UI.md). There is no `API.md` because the module makes no requests, and no
`PHASES.md` because there is no recorded decision history — `git log` is the only record.

## 7. Where to start reading

`pages/public-insight-center.tsx` — the whole module. One page, rendering five components, serving both
routes.
