import { forwardRef, useEffect, useMemo, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Heading } from '@/shared/components/ui/typography';
import type { HomeMediaType } from '@/features/home/services/home-content-service';
import './video-hero.css';

interface VideoHeroProps {
  videoUrl: string;
  title: string;
  registerUrl: string;
  muted: boolean;
  onMuteToggle: () => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
  /**
   * The CMS `media_type` for the `hero_trailer` slot. `video` plays the URL in a
   * `<video>` element; `embed` (Vimeo, YouTube, Canva) loads it in an iframe —
   * those URLs are player *pages*, so `<video src>` has no media to decode.
   * Omitted (older callers) falls back to sniffing the URL.
   */
  mediaType?: HomeMediaType;
}

const DIRECT_VIDEO_EXTENSION = /\.(mp4|webm|ogg|ogv|mov|m4v)$/i;
const VIMEO_HOST = /(^|\.)vimeo\.com$/i;
const YOUTUBE_HOST = /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/i;

function parseUrl(url: string): URL | null {
  try {
    return new URL(url, window.location.origin);
  } catch {
    return null;
  }
}

/** True when the URL is a player page that must be framed rather than decoded. */
function isEmbedUrl(url: string): boolean {
  const parsed = parseUrl(url);
  if (!parsed) return false;
  if (VIMEO_HOST.test(parsed.hostname) || YOUTUBE_HOST.test(parsed.hostname)) return true;
  return !DIRECT_VIDEO_EXTENSION.test(parsed.pathname);
}

/**
 * Adds the autoplay parameters the hero has always implied. Vimeo and YouTube
 * both require `muted=1` alongside `autoplay=1` or the browser blocks playback;
 * existing params (Vimeo's `h=` privacy hash) are preserved.
 */
function toAutoplayEmbedUrl(url: string, muted: boolean): string {
  const parsed = parseUrl(url);
  if (!parsed) return url;

  if (VIMEO_HOST.test(parsed.hostname)) {
    parsed.searchParams.set('autoplay', '1');
    parsed.searchParams.set('loop', '1');
    parsed.searchParams.set('muted', muted ? '1' : '0');
    parsed.searchParams.set('playsinline', '1');
    return parsed.toString();
  }

  if (YOUTUBE_HOST.test(parsed.hostname)) {
    parsed.searchParams.set('autoplay', '1');
    parsed.searchParams.set('loop', '1');
    parsed.searchParams.set('mute', muted ? '1' : '0');
    parsed.searchParams.set('playsinline', '1');
    return parsed.toString();
  }

  return url;
}

export const VideoHero = forwardRef<HTMLElement, VideoHeroProps>(
  ({ videoUrl, title, registerUrl, muted, onMuteToggle, videoRef, mediaType }, ref) => {
    const isEmbed = mediaType ? mediaType === 'embed' : isEmbedUrl(videoUrl);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    /**
     * Mount the iframe with the *initial* mute state only. Re-deriving `src` on
     * every toggle would reload the player and restart the video, so later
     * toggles go through the player's postMessage API instead.
     */
    const initialMutedRef = useRef(muted);
    const embedSrc = useMemo(
      () => toAutoplayEmbedUrl(videoUrl, initialMutedRef.current),
      [videoUrl]
    );

    const isVimeo = useMemo(() => {
      const parsed = parseUrl(videoUrl);
      return parsed ? VIMEO_HOST.test(parsed.hostname) : false;
    }, [videoUrl]);

    useEffect(() => {
      if (!isEmbed || !isVimeo) return;
      const frame = iframeRef.current?.contentWindow;
      if (!frame) return;
      // Vimeo's player accepts these without the Player SDK loaded.
      frame.postMessage(
        JSON.stringify({ method: 'setMuted', value: muted }),
        'https://player.vimeo.com'
      );
      frame.postMessage(
        JSON.stringify({ method: 'setVolume', value: muted ? 0 : 1 }),
        'https://player.vimeo.com'
      );
    }, [isEmbed, isVimeo, muted]);

    return (
      <section ref={ref} className="video-hero">
        <div className="video-hero__inner">
          <div className="video-hero__wrap">
            <div className="video-hero__frame">
              {isEmbed ? (
                <iframe
                  ref={iframeRef}
                  className="video-hero__video"
                  src={embedSrc}
                  title={title}
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowFullScreen
                  frameBorder="0"
                />
              ) : (
                <video
                  ref={videoRef}
                  className="video-hero__video"
                  src={videoUrl}
                  muted={muted}
                  autoPlay
                  loop
                  playsInline
                  controls
                />
              )}
              {/* Non-Vimeo embeds (Canva) expose no audio API — the provider's
                  own controls are the only way to change volume there. */}
              {(!isEmbed || isVimeo) && (
                <button
                  className="video-hero__mute-toggle"
                  onClick={onMuteToggle}
                  aria-label={muted ? 'Unmute video' : 'Mute video'}
                >
                  {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
              )}
            </div>

            <div className="video-hero__cta-bar">
              <Heading as="h1" variant="h1" className="video-hero__title">
                {title}
              </Heading>
              <a
                className="video-hero__register-btn"
                href={registerUrl}
                target="_blank"
                rel="noreferrer"
              >
                Register
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }
);

VideoHero.displayName = 'VideoHero';
