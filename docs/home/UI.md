# Home — UI

| | |
|---|---|
| **Module** | `home` |
| **Source** | `src/features/home/` |
| **Routes** | `/home` |
| **Backend module** | `content`, `tracker` |
| **API prefix** | `/api/content/`, `/api/tracker/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-28 |

## 1. Routes and entry points

| Route | Guard | Component |
|---|---|---|
| `/home` | `ProtectedRoute` only | `HomePage` |

`/home` is also the app's **universal landing target**: `RootRedirect`, `PublicRoute` and every capability
guard's denial path all send users here ([auth UI §1](../auth/UI.md#1-routes-and-entry-points)). That makes
it the one page that must always render for any authenticated user.

`/dashboard` is a `<Navigate to="/home" replace />` stub kept so old links resolve.

**Component reuse:** `/home-v2` imports `VideoHero`, both `CanvaVideoCard` slots and `PerformanceTable`
from this module.

## 2. Screens and components

| Component | Shows | Source |
|---|---|---|
| `VideoHero` | the hero video and its copy | `/api/content/home-page/` |
| `CarouselCard` | an image strip — contest or recognition | content + `use-carousel-images` |
| `LeaderboardCard` | top SMD/MD by metric | `/api/tracker/policies/top_base_team_leaders/` |
| `PerformanceTable` | the viewer's own figures | `/api/tracker/trackers/associate/` |
| `WelcomeVideosHomeCard` | new agents only (`!isPaid`): a link to `/welcome-videos` | none — static; owned by [welcome-videos](../welcome-videos/) |

Each component has its own CSS file beside it (`video-hero.css`, `carousel-card.css`,
`leaderboard-card.css`, `performance-table.css`) — a per-component convention this module uses and most
others do not.

### `VideoHero` renders two different elements

The `hero_trailer` slot can hold either a media file or a player page, and they cannot share an element:

| `media_type` | Element | Example href |
|---|---|---|
| `video` | `<video src>` | the Firebase Storage `IMG_7934.MP4` default |
| `embed` | `<iframe src>` | `https://player.vimeo.com/video/…`, YouTube, Canva |

`<video src>` pointed at a Vimeo or YouTube *player page* renders an empty box — the element has no media to
decode. `VideoHero` picks the element from the optional `mediaType` prop, falling back to sniffing the URL
(known player hosts, or any path without an `.mp4`/`.webm`/`.mov`/`.m4v`/`.ogv` extension). `/home-v2` passes
the CMS `media_type`; `/home` relies on the sniff, because `home-page.tsx` is under the release freeze in §4.

Embeds get `autoplay`, `loop`, `playsinline` and a mute parameter appended, preserving existing query params
such as Vimeo's `h=` privacy hash. The `src` is built once from the *initial* mute state — re-deriving it on
each toggle would reload the player and restart the video — so later toggles go through Vimeo's `postMessage`
API. The mute button is hidden for non-Vimeo embeds (Canva), which expose no audio API.

### The home leaderboard is not the Leaderboards feature

`HomeLeaderboardMetric` is `recruits | points | licenses | big_event` and `HomeLeaderboardLevel` is
`SMD | MD`, read from **`tracker`**. The [leaderboards](../leaderboards/) module reads `wbreporting` and has
eleven metrics, five scopes and proof rows. They are different surfaces with different numbers, and they can
legitimately disagree — which is precisely why `/home-v2` was built beside `/home` rather than replacing it
(decision L7: replacing `/home` waits on a QA comparison of the two cards' numbers).

## 3. States

| State | What the user sees |
|---|---|
| Loading | per-component loading |
| No content configured | the section is absent rather than broken |
| Hero href is a player page | framed in an iframe; a `<video>` element here would render an empty box |
| Carousel images missing | the strip renders empty — images come from Firestore, not the content API |
| Leaderboard empty | no rows |
| No tracker record | an empty performance table |

## 4. Interaction rules

- **Do not modify `pages/home-page.tsx` casually.** It is deliberately untouched, and
  `git diff main -- src/features/home/pages/home-page.tsx` is a release check for the leaderboards work.
- **Do not fork these components for another page.** `home-v2` composes them so the two pages cannot
  drift.
- **`/home` must always render.** Every guard's denial path lands here.

## 5. Responsive and print behaviour

Four per-component stylesheets plus Tailwind. No print styles.

## 6. Accessibility

Standard elements; the hero is a video with controls, or a titled iframe when the slot holds an embed. No systematic pass.

## 7. Styling and theming

Per-component CSS beside each component. Carousel **images** come from Firestore via
`use-carousel-images.ts` — one of only two remaining Firestore readers in the app
([platform ARCHITECTURE §7](../platform/ARCHITECTURE.md#7-integration-points)) — while the surrounding
content comes from `/api/content/home-page/`. Two sources for one visual element, which is why an empty
carousel is not necessarily a content-API problem.
