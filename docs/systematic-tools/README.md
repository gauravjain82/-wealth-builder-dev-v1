# Systematic Tools — Overview

| | |
|---|---|
| **Module** | `systematic-tools` |
| **Source** | `src/features/systematic-tools/` |
| **Routes** | `/systematic-tools` |
| **Backend module** | **none** |
| **API prefix** | **none** |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Doc tier** | **Lite** — `README.md` + [UI.md](UI.md) |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Purpose

The "10 Systematic Tools" — a library of slides, PDFs and videos organised into gated sections, plus two
flyer generators and a PDF annotator.

At **2,948 lines it is the largest module with no backend at all.** Its content and its access rules are both
in the source, and progress and admin edits go to `localStorage`. That makes it the most substantial
client-only surface in the app.

## 2. Scope

**In scope** — the tool menu with plan gating, a secure slide player, a fullscreen viewer, a PDF annotator,
and two flyer modals (business shower, custom).

**Out of scope** — nothing is fetched, so nothing is out of scope for a backend reason. Content management is
not available: the menu is a constant.

## 3. At a glance

| | |
|---|---|
| Routes | 1 |
| Pages | 1 |
| Components | 5 |
| Services | 0 |
| Endpoints consumed | **0** |
| LOC (ts/tsx) | 2,948 |
| Lint errors | **2 of the repo's 7** |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Tool** | One of the ten sections. |
| **Gate index** | A section's position in the access order — a plan unlocks up to a given index. |
| **Access map** | `Record<Plan, number[]>` — which sections each plan may open. |
| **Secure slide player** | The viewer for slide content. |
| **Flyer** | A generated document — business shower or custom. |

## 5. Dependencies

**Upstream** — `@core/constants/roles` (`roleToPlan`), `@core/types` (`Plan`), `jspdf` and `react-pdf` for
the annotator and flyers.

**Downstream** — `src/router/index.tsx`, one route.

**Backend** — none.

## 6. Document map

Lite tier: this file plus [UI.md](UI.md), which carries the gating model, the localStorage admin mode, and
the lint problem.

## 7. Where to start reading

1. `pages/ten-systematic-tools-page.tsx:37` — `normalizePlanFromRole`, then the access map at `:165`. The
   gating is the module's real logic.
2. `components/pdf-annotator/index.tsx` — the most complex component, and home to one lint error.
