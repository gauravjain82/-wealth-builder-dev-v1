/**
 * Wire types for `GET /api/notifications/onboarding-drip/videos/`.
 *
 * The backend reads these from the fixed New Agent drip catalogue, so they are the
 * same eight videos SMS and Telegram send. See `docs/welcome-videos/API.md`.
 */

export interface WelcomeVideo {
  /** Stable identifier, `video_1` … `video_8`; also the deep-link segment. */
  key: string;
  /** Send order, 0-based. */
  sequence: number;
  title: string;
  /** Empty for videos without a named speaker. */
  speaker: string;
  /** The message text, without its "Title, Speaker" heading line. */
  description: string;
  /** Unlisted Vimeo link, e.g. `https://vimeo.com/<id>/<hash>`. This is what gets shared. */
  video_url: string;
}

export interface WelcomeVideosResponse {
  count: number;
  results: WelcomeVideo[];
}
