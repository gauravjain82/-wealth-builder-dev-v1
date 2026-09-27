# Training Center — API

| | |
|---|---|
| **Module** | `training-center` |
| **Source** | `src/features/training-center/services/training-center-service.ts` |
| **Routes** | `/training-center` |
| **Backend module** | `content` → `mlm_platform/docs/content/API.md` |
| **API prefix** | `/api/content/training-center/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Endpoints **consumed**, not exposed.

## 1. Conventions

Uses the shared helpers from `src/shared/services/content-page-service.ts`, like the other content readers.

## 2. Endpoints consumed

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/content/training-center/` | sections, role-filtered server-side |
| GET | `/api/content/training-center/items/` | the items, with XP |
| GET · POST | `/api/content/training-center/progress/` | **per-user progress** |

The progress endpoint is what distinguishes this module. Compare [licensing](../licensing/API.md#2-endpoints-consumed),
where an equivalent endpoint exists and **is not called**, leaving progress in `localStorage` and invisible
to a leader. Here it is wired up, so progress follows the user across devices and can be reported on.

The admin counterpart is `/api/content/admin/training-center`, consumed by [admin](../admin/).

## 3. Payload types

`types.ts` for the reader shapes, plus the shared cross-content types (`ContentOpenable`,
`ContentItemEndpoints`, `ContentViewerTarget`).

## 4. Query parameters

Handled by the page over the fetched set.

## 5. Error codes and handling

No typed errors. Two client-side behaviours worth knowing, both in `utils/media.ts`:

| Helper | Decides |
|---|---|
| `isVideoHref(href)` | whether an item is a video — by matching YouTube, `youtu.be`, Vimeo, Google Drive/Docs, `.mp4`, or a `/preview` path |
| `shouldUseIframe(href)` | whether to embed rather than link out |

These are **URL-pattern heuristics**, not server metadata. A video on a host not in that list renders as a
plain link instead of a player — the practical consequence of inferring a media type from a string.

## 6. Backend ownership

`content` owns sections, items, XP values, **role filtering**, and **progress**. The client renders,
records progress, and guesses how to display a URL.
