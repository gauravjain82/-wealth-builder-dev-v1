# Licensing — Overview

| | |
|---|---|
| **Module** | `licensing` |
| **Source** | `src/features/licensing/` |
| **Routes** | `/licensing/track`, `/licensing/documents`, `/licensing/crash-course`, `/licensing/chapter/:chapterId` |
| **Backend module** | `accounts` — **but see §2** |
| **API prefix** | `/api/accounts/` — **not currently called** |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> **This module talks to no backend.** Three service files exist and **none of them is imported anywhere
> in `src/`**. Content is hard-coded in the page components and progress lives in `localStorage`. Read
> [ARCHITECTURE.md §1](ARCHITECTURE.md#1-layering) before assuming otherwise.

## 1. Purpose

Licensing takes an agent from unlicensed to licensed. It is a study surface: chapters of video, a crash
course, and the documents needed to sit an exam.

Its defining property is that it is **entirely client-side**. The curriculum is a TypeScript constant, and
a learner's progress is a `localStorage` key. That makes it the simplest module in the app to reason about
and the one with the most surprising consequences: progress is **per browser**, not per person.

## 2. Scope

**In scope**
- **Track My License** — fourteen chapters of video with per-chapter progress.
- **Crash Course** — a course with modules and videos, plus per-video progress and notes.
- **Chapter course** — one chapter's player, notes and progress.
- **Licensing Documents** — three document cards.

**Explicitly out of scope — and not currently anywhere**
- **Server-side progress.** `/api/accounts/licensing-progress/` and `/api/accounts/course-progress/`
  exist, and `licensing-documents/` too, but **nothing calls them**.
- **Admin-managed content.** The curriculum is in the source. A content change is a release.
- **The licensing *tracker*.** [team](../team/)'s Licensing Tracker is how a leader watches someone's
  progress — and it reads server data, so it does **not** see the progress this module stores locally.

## 3. At a glance

| | |
|---|---|
| Routes | 4 |
| Pages | 4 |
| Services | 3 — **all dead code** |
| Components | 0 |
| Endpoints consumed | **0** |
| `localStorage` keys | 3 |
| LOC (ts/tsx) | 1,405 |
| Doc tier | Full |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Chapter** | One of fourteen study units in Track My License (`ch1`…`ch14`). |
| **Module** | A grouping in the Crash Course, containing videos. |
| **Progress** | Which videos a learner has watched. **Held in `localStorage`.** |
| **Notes** | A learner's own notes on a chapter. Also `localStorage`. |
| **Licensing document** | One of three reference documents. |

## 5. Dependencies

**Upstream** — `src/shared/components/ui/` only.

**Downstream** — `src/router/index.tsx`, four routes.

**Backend** — **none in practice.** The three services are unused.

**Related but separate** — [team](../team/)'s Licensing Tracker reads server-side licensing data. The two
do not share state, so a leader's view and a learner's view come from different places.

## 6. Document map

| Document | Read it when |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | First. Explains the dead services and the `localStorage` model. |
| [UI.md](UI.md) | Changing a page or the curriculum. |
| [API.md](API.md) | Short — the endpoints that exist and are not used. |
| [OPERATIONS.md](OPERATIONS.md) | "My progress disappeared." |
| [PHASES.md](PHASES.md) | Before wiring the services up. |

## 7. Where to start reading

1. `track-my-license/pages/track-my-license-page.tsx:5` — `STORAGE_KEY`, then `VIDEO_LIST` at `:9` and
   `buildChapters()` at `:66`. The whole model is in the first seventy lines.
2. `crash-course/pages/chapter-course-page.tsx:5` — the two storage keys, for progress and notes.
3. `crash-course/pages/crash-course-page.tsx:39` — `COURSE` and `MODULES`, the hard-coded curriculum.
4. Any of the three `services/` files — to see what was built and never connected.
