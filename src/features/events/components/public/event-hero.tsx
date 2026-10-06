/**
 * Landing-page hero: banner (or looping background video), event name,
 * date/venue, countdown, and the primary "get tickets" call to action.
 *
 * The layout follows the active theme (`theme.hero`):
 * - `card`      — contained card with the media on top (Classic);
 * - `immersive` — full-bleed, near-full-height media behind the copy, under a
 *                 transparent header (Bold Dark);
 * - `split`     — copy beside the media on a white page (Minimal Light).
 * All three share the media, actions, countdown and sales notice below.
 *
 * Media precedence: an uploaded *video* in "Video background" plays muted on
 * loop (with a sound toggle) using the event banner as its poster; otherwise
 * the event banner image is shown. The organizer's promo link
 * (`event_video_url`) opens in a lightbox via "Watch Video".
 *
 * The CTA's label and enabled state come from the server-computed
 * `sales_state`, so the button never invites a click that checkout would
 * reject (sold out, window closed, no tier configured).
 */

import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Volume2, VolumeX } from 'lucide-react';

import { cn } from '@core/utils';

import { DISPLAY_FONT_CLASS } from '../../themes/registry';
import { useEventTheme } from '../../themes/theme-context';
import { formatEventRange } from '../../utils/public-dates';
import { formatPrice } from '../../utils/public-pricing';
import {
  isVideoFileUrl,
  resolveVideo,
  type VideoSource,
} from '../../utils/public-video';
import type { PublicEvent } from '../../types/public';
import { EventCountdown } from './event-countdown';
import { VideoModal } from './video-modal';

/** CTA label per sales reason; `OPEN` is handled separately (it shows a price). */
const CLOSED_CTA_LABEL: Record<string, string> = {
  NOT_STARTED: 'Sales Not Open Yet',
  ENDED: 'Sales Closed',
  SOLD_OUT: 'Sold Out',
  NO_TIER: 'Tickets Unavailable',
};

/** Whether hero copy sits on dark media or on a light page. */
type Tone = 'dark' | 'light';

interface HeroLayoutProps {
  event: PublicEvent;
  dateLine: string;
  venueLine: string;
  onPlay: (() => void) | null;
}

export function EventHero({ event }: { event: PublicEvent }) {
  const theme = useEventTheme();
  const [playing, setPlaying] = useState<VideoSource | null>(null);
  const promo = resolveVideo(event.event_video_url, true);

  const props: HeroLayoutProps = {
    event,
    dateLine: formatEventRange(event.begin_at, event.end_at, event.timezone),
    venueLine: [event.venue_name, event.location_name]
      .filter(Boolean)
      .join(' · '),
    onPlay: promo ? () => setPlaying(promo) : null,
  };

  return (
    <>
      {theme.hero === 'immersive' ? (
        <ImmersiveHero {...props} />
      ) : theme.hero === 'split' ? (
        <SplitHero {...props} />
      ) : (
        <CardHero {...props} />
      )}
      <VideoModal
        source={playing}
        title={`${event.name} video`}
        onClose={() => setPlaying(null)}
      />
    </>
  );
}

/** Classic: a contained card, media on top, copy on a dark panel. */
function CardHero({ event, dateLine, venueLine, onPlay }: HeroLayoutProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-8">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 text-white shadow-sm dark:border-white/10">
        <div className="relative">
          <HeroMedia event={event} className="h-48 sm:h-64 md:h-80" />
        </div>

        <div className="p-6 sm:p-8">
          <h1 className="text-3xl font-bold sm:text-4xl">{event.name}</h1>
          <p className="mt-2 text-sm text-white/80">{dateLine}</p>
          {venueLine ? (
            <p className="text-sm text-white/70">{venueLine}</p>
          ) : null}
          <HeroBody event={event} onPlay={onPlay} tone="dark" />
        </div>
      </section>
    </div>
  );
}

/** Bold Dark: full-bleed media behind oversized display type. */
function ImmersiveHero({
  event,
  dateLine,
  venueLine,
  onPlay,
}: HeroLayoutProps) {
  return (
    <section className="relative isolate flex min-h-[min(88svh,56rem)] items-end overflow-hidden bg-black text-white">
      {hasHeroMedia(event) ? (
        <HeroMedia
          event={event}
          className="absolute inset-0 -z-20 h-full"
          soundButtonClass="bottom-6 right-4 z-20 sm:right-8"
        />
      ) : (
        // No media: an accent glow keeps the hero from reading as empty.
        <div
          className="absolute inset-0 -z-20 opacity-40"
          style={{
            background:
              'radial-gradient(60% 55% at 50% 0%, var(--event-brand) 0%, transparent 70%)',
          }}
          aria-hidden="true"
        />
      )}
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0a0a0b] via-black/55 to-black/30"
        aria-hidden="true"
      />

      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-32 sm:pb-20">
        <p
          className="text-xs font-bold uppercase tracking-[0.18em] sm:text-sm"
          style={{ color: 'var(--event-brand)' }}
        >
          {dateLine}
        </p>
        <h1
          className={cn(
            'mt-4 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl',
            DISPLAY_FONT_CLASS,
          )}
        >
          {event.name}
        </h1>
        {venueLine ? (
          <p className="mt-4 text-base text-white/75 sm:text-lg">{venueLine}</p>
        ) : null}
        <HeroBody event={event} onPlay={onPlay} tone="dark" />
      </div>
    </section>
  );
}

/** Minimal Light: copy beside the media, generous whitespace. */
function SplitHero({ event, dateLine, venueLine, onPlay }: HeroLayoutProps) {
  const withMedia = hasHeroMedia(event);
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-4 pt-12 sm:pt-20">
      <div
        className={cn(
          'grid items-center gap-10',
          withMedia && 'md:grid-cols-2 md:gap-14',
        )}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {dateLine}
          </p>
          <h1
            className={cn(
              'mt-4 text-4xl font-medium leading-tight text-slate-900 sm:text-5xl lg:text-6xl',
              DISPLAY_FONT_CLASS,
            )}
          >
            {event.name}
          </h1>
          {venueLine ? (
            <p className="mt-4 text-base text-slate-600">{venueLine}</p>
          ) : null}
          <HeroBody event={event} onPlay={onPlay} tone="light" />
        </div>
        {withMedia ? (
          <div className="relative">
            <HeroMedia event={event} className="aspect-[4/3] md:aspect-[4/5]" />
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Countdown, actions and sales notice — shared by every layout. */
function HeroBody({
  event,
  onPlay,
  tone,
}: {
  event: PublicEvent;
  onPlay: (() => void) | null;
  tone: Tone;
}) {
  return (
    <>
      {event.show_countdown ? (
        <div className="mt-8">
          <EventCountdown beginAt={event.begin_at} tone={tone} />
        </div>
      ) : null}
      <HeroActions event={event} onPlay={onPlay} tone={tone} />
      <SalesNotice event={event} tone={tone} />
    </>
  );
}

function HeroActions({
  event,
  onPlay,
  tone,
}: {
  event: PublicEvent;
  onPlay: (() => void) | null;
  tone: Tone;
}) {
  const { sales_state: sales, current_tier: tier } = event;
  const radius = { borderRadius: 'var(--event-btn-radius)' };
  const secondary = cn(
    'inline-flex items-center gap-2 border px-5 py-3 text-sm font-medium transition',
    tone === 'dark'
      ? 'border-white/30 text-white hover:bg-white/10'
      : 'border-slate-300 text-slate-800 hover:bg-slate-100',
  );

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      {sales.is_open ? (
        <Link
          to={`/event/${event.shortcut}/checkout`}
          style={{
            ...radius,
            backgroundColor: 'var(--event-brand)',
            color: 'var(--event-brand-contrast)',
          }}
          className="px-6 py-3 text-sm font-semibold shadow-lg transition hover:opacity-90 motion-safe:hover:-translate-y-px"
        >
          {tier
            ? `Get Tickets — ${formatPrice(tier.price, event.payment_currency)}`
            : 'Get Tickets'}
        </Link>
      ) : (
        <span
          style={radius}
          className={cn(
            'cursor-not-allowed px-6 py-3 text-sm font-semibold',
            tone === 'dark'
              ? 'bg-white/15 text-white/60'
              : 'bg-slate-100 text-slate-500',
          )}
          aria-disabled="true"
        >
          {CLOSED_CTA_LABEL[sales.reason] ?? 'Tickets Unavailable'}
        </span>
      )}

      {onPlay ? (
        <button
          type="button"
          onClick={onPlay}
          style={radius}
          className={secondary}
        >
          <Play className="h-4 w-4" />
          Watch Video
        </button>
      ) : null}

      {event.agenda_url ? (
        <a
          href={event.agenda_url}
          target="_blank"
          rel="noreferrer"
          style={radius}
          className={secondary}
        >
          View Agenda
        </a>
      ) : null}

      {event.flyer_url ? (
        <a
          href={event.flyer_url}
          target="_blank"
          rel="noreferrer"
          style={radius}
          className={secondary}
        >
          View Flyer
        </a>
      ) : null}

      <Link
        to={`/event/${event.shortcut}/transfer`}
        style={radius}
        className={secondary}
      >
        Manage My Tickets
      </Link>
    </div>
  );
}

/** True when the event has any hero image or background video. */
function hasHeroMedia(event: PublicEvent): boolean {
  return Boolean(event.event_banner_url || event.video_bg_banner_url);
}

/**
 * Banner image, or a muted looping background video with a sound toggle.
 *
 * @param className - Sizing for the media element (it is always full-width,
 *   object-cover).
 * @param soundButtonClass - Positioning override for the sound toggle.
 */
function HeroMedia({
  event,
  className,
  soundButtonClass = 'bottom-3 right-3',
}: {
  event: PublicEvent;
  className?: string;
  soundButtonClass?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const mediaClass = cn('w-full object-cover', className);

  if (isVideoFileUrl(event.video_bg_banner_url)) {
    const toggleSound = () => {
      const video = videoRef.current;
      if (!video) return;
      video.muted = !video.muted;
      if (!video.muted) void video.play().catch(() => undefined);
      setMuted(video.muted);
    };

    return (
      <>
        {/* Muted + playsInline is what lets mobile browsers autoplay. */}
        <video
          ref={videoRef}
          src={event.video_bg_banner_url ?? undefined}
          poster={event.event_banner_url ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          className={mediaClass}
        />
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={!muted}
          className={cn(
            'absolute inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-black/70',
            soundButtonClass,
          )}
        >
          {muted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
          {muted ? 'Tap for sound' : 'Sound on'}
        </button>
      </>
    );
  }

  // An image uploaded into "Video background" still beats an empty hero.
  const image = event.event_banner_url ?? event.video_bg_banner_url;
  return image ? (
    <img src={image} alt={`${event.name} banner`} className={mediaClass} />
  ) : null;
}

/** Scarcity / closure messaging under the CTA. */
function SalesNotice({ event, tone }: { event: PublicEvent; tone: Tone }) {
  const { sales_state: sales } = event;
  const textClass = cn(
    'mt-3 text-sm',
    tone === 'dark' ? 'text-amber-200' : 'text-amber-700',
  );

  if (!sales.is_open && sales.message) {
    return <p className={textClass}>{sales.message}</p>;
  }

  // Only nudge when the remaining count is genuinely low — showing "412 left"
  // is noise, and uncapped events report `null`.
  if (
    sales.is_open &&
    sales.tickets_remaining !== null &&
    sales.tickets_remaining <= 25
  ) {
    return (
      <p className={textClass}>
        Only {sales.tickets_remaining} ticket
        {sales.tickets_remaining === 1 ? '' : 's'} left.
      </p>
    );
  }

  return null;
}
