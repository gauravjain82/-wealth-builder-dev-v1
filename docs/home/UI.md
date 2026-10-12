# Home — UI

| | |
|---|---|
| **Module** | `home` |
| **Source** | `src/features/home/` |
| **Routes** | `/home` |
| **Backend module** | `content`, `tracker`; `wbreporting` and Code of Honor through the embedded sections |
| **API prefix** | `/api/content/`, `/api/tracker/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `2fc8882` plus the L16 change — 2026-10-12 |

## 1. Routes and entry points

| Route | Guard | Component |
|---|---|---|
| `/home` | `ProtectedRoute` only | `HomePage` |

`/home` is also the app's **universal landing target**: `RootRedirect`, `PublicRoute` and every capability
guard's denial path all send users here ([auth UI §1](../auth/UI.md#1-routes-and-entry-points)). That makes
it the one page that must always render for any authenticated user.

`/dashboard` and `/home-v2` are `<Navigate to="/home" replace />` stubs kept so old links resolve.

## 2. Screens and components

Top to bottom:

| Component | Who | Shows | Source |
|---|---|---|---|
| `VideoHero` | everyone | the hero video and its copy | `/api/content/home-page/` |
| learning card, `WelcomeVideosHomeCard`, onboarding card | new agents (`!isPaid`) | links to `/learn/*`, `/welcome-videos`, `/onboarding-game` | none — static; the middle one is owned by [welcome-videos](../welcome-videos/) |
| `CanvaVideoCard` × 2 | everyone | "Event & Contests" and "Recognition" embeds | `/api/content/home-page/` |
| `LeaderboardPanel` | paid | the full leaderboard panel; Full Report opens `/leaderboards?view=report` | [leaderboards](../leaderboards/) — `wbreporting`, `homev2:read` |
| `ContestShowcase` | paid | the featured contest; "View all" opens `/contests` | [contests](../contests/) — `wbreporting`, `homev2:read` |
| `CodeOfHonorCard` | paid | the Code of Honor wall; renders nothing for a non-member | `src/features/code-of-honor/` |
| `PerformanceTable` | paid | the viewer's own figures | `/api/tracker/trackers/associate/` |

`isPaid` is the plan derived from `user.roles[0]`; no role means a new agent. The paid sections
are **unmounted** for a new agent, not hidden, so none of their requests are sent.

Each component has its own CSS file beside it (`video-hero.css`, `carousel-card.css`,
`performance-table.css`) — a per-component convention this module uses and most
others do not.

### `VideoHero` renders two different elements

The `hero_trailer` slot can hold either a media file or a player page, and they cannot share an element:

| `media_type` | Element | Example href |
|---|---|---|
| `video` | `<video src>` | the Firebase Storage `IMG_7934.MP4` default |
| `embed` | `<iframe src>` | `https://player.vimeo.com/video/…`, YouTube, Canva |

`<video src>` pointed at a Vimeo or YouTube *player page* renders an empty box — the element has no media to
decode. `VideoHero` picks the element from the optional `mediaType` prop, falling back to sniffing the URL
(known player hosts, or any path without an `.mp4`/`.webm`/`.mov`/`.m4v`/`.ogv` extension). The page passes the CMS
`media_type`; the sniff covers the fallback URL and any slot without one.

Embeds get `autoplay`, `loop`, `playsinline` and a mute parameter appended, preserving existing query params
such as Vimeo's `h=` privacy hash. The `src` is built once from the *initial* mute state — re-deriving it on
each toggle would reload the player and restart the video — so later toggles go through Vimeo's `postMessage`
API. The mute button is hidden for non-Vimeo embeds (Canva), which expose no audio API.

### The leaderboard and contest sections are gated server-side, not here

`/home` has no guard and reads no capability. `LeaderboardPanel` and `ContestShowcase` call
`wbreporting` endpoints the backend answers only for `homev2:read` (or `wbreporting:manage`), so
for a paid user without the grant each section renders its own error state. Showing the sections
to everyone is deliberate (decision L16): the rollout is a grant of `homev2:read` to every level
in the access console, and the page does not change when it lands.

The original page's `LeaderboardCard` read `tracker` (`top_base_team_leaders`) and was deleted
with it. Its numbers and the panel's come from different tables and could disagree; there is now
one leaderboard on the page.

## 3. States

| State | What the user sees |
|---|---|
| Loading | per-component loading |
| No content configured | the section is absent rather than broken |
| Hero href is a player page | framed in an iframe; a `<video>` element here would render an empty box |
| Carousel images missing | the strip renders empty — images come from Firestore, not the content API |
| Paid user without `homev2:read`, or `wbreporting` not deployed | the leaderboard panel shows the backend's permission message; the contest showcase reads "Unavailable" |
| New agent | onboarding cards; no leaderboard, contests, Code of Honor or performance table |
| Leaderboard empty | no rows |
| No tracker record | an empty performance table |

## 4. Interaction rules

- **`/home` must always render.** Every guard's denial path lands here, so the page takes no
  guard, and an embedded section that fails must fail inside its own card.
- **Do not add a client-side `homev2:read` check to hide a section** without revisiting L16.
- **Embedded sections are imported from their module's `index.ts`**, never from its internals.

## 5. Responsive and print behaviour

Three per-component stylesheets plus Tailwind; the embedded sections bring their own prefixed CSS. No print styles.

## 6. Accessibility

Standard elements; the hero is a video with controls, or a titled iframe when the slot holds an embed. No systematic pass.

## 7. Styling and theming

Per-component CSS beside each component. Carousel **images** come from Firestore via
`use-carousel-images.ts` — one of only two remaining Firestore readers in the app
([platform ARCHITECTURE §7](../platform/ARCHITECTURE.md#7-integration-points)) — while the surrounding
content comes from `/api/content/home-page/`. Two sources for one visual element, which is why an empty
carousel is not necessarily a content-API problem.
