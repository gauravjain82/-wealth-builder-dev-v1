# Legal — Overview

| | |
|---|---|
| **Module** | `legal` |
| **Source** | `src/features/legal/` |
| **Routes** | `/privacy-policy`, `/terms-and-conditions` — **both public** |
| **Backend module** | **none** |
| **API prefix** | **none** |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Doc tier** | **Lite** — `README.md` + [UI.md](UI.md) |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Purpose

The privacy policy and terms of service, plus a public marketing home page. All static, all reachable without
a session.

**These pages exist for a specific external reason:** they must render without login to satisfy **Google's
OAuth branding review**, which the app needs for its Calendar integration
([calendar-sync](../calendar-sync/)). The router says so at `src/router/index.tsx:163`.

## 2. Scope

**In scope** — the privacy policy, the terms, a shared shell, and a public home page describing the product.

**Out of scope** — everything dynamic. No requests, no state.

## 3. At a glance

| | |
|---|---|
| Routes | 2 public (plus `PublicHomePage`, exported for reuse) |
| Pages | 3 |
| Components | 1 — `LegalPageShell` |
| Services | 0 |
| Endpoints consumed | **0** |
| LOC (ts/tsx) | 490 |

## 4. Domain vocabulary

*Not applicable — there is no domain here.*

## 5. Dependencies

**Upstream** — Tailwind only.

**Downstream** — `src/router/index.tsx`. The login screen links to both legal pages, added for the same
OAuth review.

**Backend** — none.

## 6. Document map

Lite tier: this file plus [UI.md](UI.md). No `API.md` — nothing is fetched.

## 7. Where to start reading

`components/legal-page-shell.tsx` — then either page. The content is the point; the code is a wrapper.
