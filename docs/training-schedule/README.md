# Training Schedule — Overview

| | |
|---|---|
| **Module** | `training-schedule` |
| **Source** | `src/features/training-schedule/` |
| **Routes** | `/training-schedule` |
| **Backend module** | **none** |
| **API prefix** | **none** |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Doc tier** | **Lite** — `README.md` + [UI.md](UI.md) |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Purpose

A static schedule of recurring training sessions — what happens when, and how to join.

One page, 599 lines, no backend.

## 2. Scope

**In scope** — the schedule page.

**Out of scope** — [training-center](../training-center/) (the training library with XP and progress),
[matchup](../matchup/) (actual appointments), and [bpm](../bpm/) (meetings). This module lists a
timetable; it schedules nothing.

## 3. At a glance

| | |
|---|---|
| Routes | 1 |
| Pages | 1 |
| Components | 0 |
| Services | 0 |
| Endpoints consumed | **0** |
| LOC (ts/tsx) | 599 |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Session** | A recurring training slot in the timetable. |

## 5. Dependencies

**Upstream** — Tailwind, plus **a stylesheet that lives in another module**: see [UI.md §7](UI.md#7-styling-and-theming).

**Downstream** — `src/router/index.tsx`, one route.

**Backend** — none.

## 6. Document map

Lite tier: this file plus [UI.md](UI.md). No `API.md` — nothing is fetched.

## 7. Where to start reading

`pages/training-schedule-page.tsx` — the whole module.
