# Welcome Videos — Overview

| | |
|---|---|
| **Module** | `welcome-videos` |
| **Source** | `src/features/welcome-videos/` |
| **Routes** | `/welcome-videos`, `/welcome-videos/:videoKey` |
| **Backend module** | `notifications` → `mlm_platform/docs/notifications/` |
| **API prefix** | `/api/notifications/` |
| **Status** | Not yet merged — branch `feature/wb-welcome-videos`, coupled to `mlm_platform` |
| **Doc version** | 1.0 |
| **Doc tier** | **Lite** — `README.md` + [UI.md](UI.md) |
| **Verified against** | branch `feature/wb-welcome-videos` off `e91e5a5` — 2026-10-01 |

## 1. Purpose

When an agent's agency code is added, the backend's New Agent onboarding drip sends them eight
videos from top leaders by SMS and Telegram, one every two days. Until this module, those videos
existed only in the messages: nobody could find them again on the website, and an SMD who wanted
to show one to an agent had to dig out an old text.

This module is the library of those eight videos. Every role sees all of them, in send order,
and can play each in-page, copy its link, or share it from a phone. The list comes from the same
backend catalogue the drip sends from, so the website and the messages cannot disagree.

## 2. Scope

**In scope** — the library page, the per-video deep link, the sidebar entry for every role, a
shortcut card in the new-agent block of `/home`, and a share dialog embedded where leaders add
agency codes and work prospects.

**Out of scope**
- **Sending.** The drip schedule, channels and delivery log live in the backend `notifications`
  app. Nothing here triggers a message.
- **Watch tracking.** Links are Vimeo links; views are not recorded (backend decision N20).
- **Editing the videos.** The catalogue is code (backend decision N6). Change
  `mlm_platform/notifications/services/onboarding_drip/catalog.py` and both the messages and this
  page follow.
- [training-center](../training-center/) and the onboarding game in [team](../team/) have their
  own, separate video lists.

## 3. At a glance

| | |
|---|---|
| Routes | 2 (one page) |
| Pages | 1 |
| Components | 4 |
| Services | 1 |
| Endpoints consumed | **1** |
| LOC (ts/tsx) | ~483 |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Drip** | The backend's New Agent onboarding campaign: eight messages, each with one video. |
| **Video key** | `video_1` … `video_8`; the catalogue identifier and the deep-link segment. |

## 5. API

| Method | Path | Used by |
|---|---|---|
| GET | `/api/notifications/onboarding-drip/videos/` | `fetchWelcomeVideos` → `useWelcomeVideos` |

Response: `{count, results: [{key, sequence, title, speaker, description, video_url}]}`. Any
authenticated user; no capability gate. `speaker` is `""` for videos 1–4. Wire types:
`types/index.ts`. Query key `['welcome-videos', 'list']`, `staleTime` one hour — the list changes
only with a backend deploy.

## 6. Dependencies

**Upstream** — `@/store` (toasts), `@/shared/components` (loading and error states, `Card`).

**Downstream** — `src/router/index.tsx` (two routes), `src/config/menu.ts` (`WELCOME_VIDEOS`, in
every plan), `src/features/home/pages/home-page.tsx` (`WelcomeVideosHomeCard`), and
`ShareWelcomeVideosModal` in the prospect tracker, its list modal and matchup — see
[UI.md §1](UI.md#1-routes-and-entry-points).

## 7. Decisions

Recorded in the backend log, `mlm_platform/docs/notifications/PHASES.md` §3:

- **N19** — every authenticated user sees all eight at once; the website does not follow the drip
  pacing. Leaders show the videos to agents and share them when needed.
- **N20** — the shared link is the Vimeo link, which works for an agent who is not signed in.

## 8. Where to start reading

`pages/welcome-videos-page.tsx`, then `utils/vimeo.ts` for how an unlisted link becomes an embed.
