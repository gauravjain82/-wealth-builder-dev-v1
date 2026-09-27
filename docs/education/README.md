# Education — Overview

| | |
|---|---|
| **Module** | `education` |
| **Source** | `src/features/education/` |
| **Routes** | `/education`, `/learn/education`, `/learn/public-education`, `/learn/business`, `/learn/public-business` |
| **Backend module** | **none** |
| **API prefix** | **none** |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Doc tier** | **Lite** — `README.md` + [UI.md](UI.md) |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Purpose

Education is the learning-content marketing surface: video galleries and an FAQ, on the business and
education tracks, each available **both** to signed-in users and to the public.

Like [insight-center](../insight-center/), it **consumes no endpoints** — all content is in the components.
That is what lets the same pages serve public and authenticated routes.

## 2. Scope

**In scope** — the education and business pages, their public variants, video galleries, a video modal, and
an FAQ.

**Out of scope** — [training-center](../training-center/) (the real training library, with XP and progress)
and [licensing](../licensing/) (the licensing curriculum). This module is introductory content.

## 3. At a glance

| | |
|---|---|
| Routes | **5** — 2 authenticated, 3 public |
| Pages | 3 |
| Components | 6 |
| Services | 0 |
| Endpoints consumed | **0** |
| LOC (ts/tsx) | 520 |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Track** | Business or education — the two content paths. |
| **Public variant** | The same content without a session. |
| **Gallery row** | A horizontal strip of video cards. |

## 5. Dependencies

**Upstream** — none beyond React; each component carries its own CSS.

**Downstream** — `src/router/index.tsx`, five routes.

**Backend** — none.

## 6. Document map

Lite tier: this file plus [UI.md](UI.md). No `API.md` — nothing is fetched.

## 7. Where to start reading

1. `pages/education-page.tsx`, `public-education-page.tsx`, `public-business-page.tsx` — three pages over
   six shared components.
2. `components/gallery-row/` and `components/video-modal/` — the reusable pieces.
