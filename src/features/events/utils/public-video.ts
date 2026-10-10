/**
 * Helpers for organizer-supplied video URLs on the public event pages.
 *
 * Organizers paste whatever link they have (YouTube watch/share/shorts links,
 * Vimeo pages, or a direct .mp4), so the landing page classifies the URL once
 * and renders the matching player: an iframe embed or a native `<video>`.
 */

/** A playable source resolved from an arbitrary video URL. */
export type VideoSource =
  { kind: 'embed'; src: string } | { kind: 'file'; src: string };

const VIDEO_FILE_EXT = /\.(mp4|webm|ogg|ogv|mov|m4v)$/i;

/** True when the URL's path ends in a browser-playable video extension. */
export function isVideoFileUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return VIDEO_FILE_EXT.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

/** Extract a YouTube video id from watch, youtu.be, embed, and shorts links. */
function youTubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\.|^m\./, '');
  if (host === 'youtu.be') return url.pathname.slice(1) || null;
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') return url.searchParams.get('v');
    const match = url.pathname.match(/^\/(embed|shorts|live)\/([^/?]+)/);
    return match ? match[2] : null;
  }
  return null;
}

/** A Vimeo video reference: its numeric id plus the privacy hash, if any. */
type VimeoRef = { id: string; hash: string | null };

/**
 * Extract the Vimeo id and privacy hash from vimeo.com and player.vimeo.com
 * links.
 *
 * Unlisted videos only play when their hash travels with the id. Vimeo hands
 * it out either as `?h=<hash>` (player/embed links) or as a path segment after
 * the id (`vimeo.com/<id>/<hash>` share links), so both shapes are read.
 */
function vimeoRef(url: URL): VimeoRef | null {
  const host = url.hostname.toLowerCase();
  if (host !== 'vimeo.com' && !host.endsWith('.vimeo.com')) return null;
  const match = url.pathname.match(/(\d{6,})(?:\/([0-9a-f]{6,}))?(?:\/|$)/i);
  if (!match) return null;
  const queryHash = url.searchParams.get('h');
  const hash = queryHash && /^[0-9a-f]+$/i.test(queryHash) ? queryHash : null;
  return { id: match[1], hash: hash ?? match[2] ?? null };
}

/**
 * Resolve a pasted URL into something we can play, or `null` when it is not a
 * recognised video link (we never iframe arbitrary third-party pages).
 *
 * @param raw - The organizer's URL.
 * @param autoplay - Ask embeds to start playing immediately (used by modals).
 */
export function resolveVideo(
  raw: string | null | undefined,
  autoplay = false,
): VideoSource | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const yt = youTubeId(url);
  if (yt) {
    const params = new URLSearchParams({
      rel: '0',
      autoplay: autoplay ? '1' : '0',
    });
    return {
      kind: 'embed',
      src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt)}?${params}`,
    };
  }

  const vimeo = vimeoRef(url);
  if (vimeo) {
    const params = new URLSearchParams({ autoplay: autoplay ? '1' : '0' });
    if (vimeo.hash) params.set('h', vimeo.hash);
    return {
      kind: 'embed',
      src: `https://player.vimeo.com/video/${vimeo.id}?${params}`,
    };
  }

  if (isVideoFileUrl(raw)) return { kind: 'file', src: raw };
  return null;
}
