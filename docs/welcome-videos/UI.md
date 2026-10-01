# Welcome Videos — UI

| | |
|---|---|
| **Module** | `welcome-videos` |
| **Source** | `src/features/welcome-videos/` |
| **Routes** | `/welcome-videos`, `/welcome-videos/:videoKey` |
| **Backend module** | `notifications` |
| **API prefix** | `/api/notifications/` |
| **Status** | Not yet merged |
| **Doc version** | 1.0 |
| **Verified against** | branch `feature/wb-welcome-videos` off `e91e5a5` — 2026-10-01 |

## 1. Routes and entry points

| Route | Guard | Component |
|---|---|---|
| `/welcome-videos` | `ProtectedRoute` only | `WelcomeVideosPage` |
| `/welcome-videos/:videoKey` | `ProtectedRoute` only | `WelcomeVideosPage`, player open on that video |

Entry points:
- **Sidebar** — "Welcome Videos" 🎬, directly after Onboarding Game, in every plan's menu.
- **`/home`** — `WelcomeVideosHomeCard`, in the new-agent-only block above "Start your onboarding
  process". Static; it makes no request.
- **`ShareWelcomeVideosModal`**, embedded where leaders work with agents:
  - after a successful agency-code assignment, in all three callers of `AddAgencyCodeModal` —
    `team/prospect/pages/prospect-tracker-page.tsx`, `team/prospect/components/prospect-tracker-list-modal.tsx`,
    `matchup/pages/matchup-page.tsx` — with `justActivated` copy saying the drip has started;
  - from the **SHARE WELCOME VIDEOS** button in `CallLogModal`, the prospect's action panel, in the
    two prospect-tracker callers (`onShareWelcomeVideos`; the button is hidden when the prop is
    omitted).

  Each video has Copy and, where supported, Share; **COPY ALL LINKS** copies the numbered set.
  It reuses the page's query, so the list loads once per session.

## 2. Screens

One page: a header with **Copy all links**, then a responsive grid of eight cards in send order.
Each card shows its number, title, speaker (when named) and the message text, with:

| Action | Does |
|---|---|
| **Play** | Navigates to `/welcome-videos/<key>`; the player overlay opens from the URL |
| **Copy link** | Copies the Vimeo link only |
| **Share** | `navigator.share` with title and link. Rendered only where the browser supports it (mostly phones) |

**Copy all links** copies a numbered list, `1. Title — Speaker\n<link>`, for sending the whole set
in one message.

## 3. States

| State | Renders |
|---|---|
| Loading | `LoadingState` |
| Error | `ErrorState` with Retry |
| Empty list | "No welcome videos are available right now." |
| Unknown `:videoKey` | The list, with no player open |
| Link not a Vimeo URL | Player shows "This video can't play here" with an Open-on-Vimeo link |

## 4. Interaction rules

- **The open player is URL state.** A shared `/welcome-videos/video_3` lands on that video; Back
  and Escape and the backdrop all close it by returning to `/welcome-videos`.
- **The embed needs the hash.** Drip links are unlisted (`vimeo.com/<id>/<hash>`); `vimeoEmbedUrl`
  turns them into `player.vimeo.com/video/<id>?h=<hash>`. Without `h` an unlisted video refuses to
  embed. The videos' Vimeo privacy settings must also allow embedding on this domain.
- **Clipboard falls back** to a hidden textarea and `execCommand('copy')` where the async
  clipboard is unavailable.

## 5. Responsive and print behaviour

The grid is `auto-fill` with a `min(100%, 20rem)` column, so it collapses to one column at phone
width without a media query. The player is 16:9 and fills the width up to 64rem.

## 6. Accessibility

The player is `role="dialog"` with `aria-modal` and a label; the close button has
`aria-label="Close"`. Focus is not trapped inside the player.

## 7. Styling and theming

`welcome-videos.css`, every rule under `wb-wv-`. Dark translucent cards and the yellow accent
match `/home`; no global rules. The home card uses the same Tailwind classes as its neighbours on
`/home`.
