# Training Center — Overview

| | |
|---|---|
| **Module** | `training-center` |
| **Source** | `src/features/training-center/` |
| **Routes** | `/training-center` |
| **Backend module** | `content` |
| **API prefix** | `/api/content/training-center/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Doc tier** | **Lite** — `README.md` + [API.md](API.md) |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Purpose

Training Center is the training library: sections of modules an agent works through, with **XP** and
**tracked progress**. It is the one content reader with a server-side progress endpoint, which makes it the
counter-example to [licensing](../licensing/) — the same problem solved properly.

## 2. Scope

**Menu** — the sidebar's Training Center is a group straight after My Team: **Training** opens
`/training-center`, **Promotions** opens [promotion](../promotion/)'s dashboard (`src/config/menu.ts`
`TRAINING_CENTER_GROUP`).

**In scope** — the reader page, its sidebar, the module grid, the stats, and the player overlay.

**Out of scope** — content management ([admin](../admin/)'s `/admin/training-center`, via the shared
`ContentPageAdminShell`), and role access, applied server-side.

## 3. At a glance

| | |
|---|---|
| Routes | 1 |
| Components | 4 |
| Hooks | 1 |
| Services | 1 |
| Endpoints consumed | 3 — **including progress** |
| LOC (ts/tsx) | 792 |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Section** | A group of training modules. |
| **Item / module** | One trainable resource, worth **XP**. |
| **XP** | Points awarded per item. |
| **Progress** | Which items are done — **stored server-side**, per user. |

## 5. Dependencies

**Upstream** — `src/shared/services/content-page-service` for the HTTP helpers and the shared
document-opening logic.

**Backend** — `content`. `content/TRAINING_CENTER_API.md` in the backend repo describes this API.

## 6. Document map

Lite tier: this file plus [API.md](API.md), which carries the three endpoints and the media-type detection.

Content **administration** is in [admin](../admin/ARCHITECTURE.md#the-content-administration-engine).

## 7. Where to start reading

1. `services/training-center-service.ts` — three endpoints, **including progress**.
2. `utils/media.ts` — `isVideoHref` and `shouldUseIframe`, which decide how an item opens.
3. `components/training-player-overlay.tsx` — the player.
