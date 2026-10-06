/**
 * Content sections added with the Champion theme: the tagline (hook lines,
 * word strip, CTA row), stats tiles, and the scrolling photo marquee.
 *
 * Like the other content sections they render through the themed primitives
 * and CSS variables, so they work in every theme, and render nothing when
 * their content is empty.
 */

import { useEffect, useState } from 'react';

import { cn } from '@core/utils';

import { DISPLAY_FONT_CLASS } from '../../themes/registry';
import type {
  MarqueeContent,
  MarqueeItem,
  StatItem,
  StatsContent,
  TaglineContent,
} from '../../types/landing';
import type { PublicEvent } from '../../types/public';
import { PublicCard, PublicSection } from './public-event-shell';
import { OutlineLink, TicketCta } from './ticket-cta';

const MUTED = 'text-slate-600 dark:text-white/70';

/** True unless the visitor asked the OS for reduced motion. */
function useMotionAllowed(): boolean {
  const query = '(prefers-reduced-motion: no-preference)';
  const [allowed, setAllowed] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.(query)?.matches,
  );
  useEffect(() => {
    const mql = window.matchMedia?.(query);
    if (!mql) return;
    const onChange = () => setAllowed(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return Boolean(allowed);
}

/** Index that advances every `ms` while motion is allowed; static at 0 otherwise. */
function useCyclingIndex(count: number, ms: number): number {
  const motion = useMotionAllowed();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!motion || count < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), ms);
    return () => window.clearInterval(id);
  }, [motion, count, ms]);
  return count > 0 ? index % count : 0;
}

// --- Tagline -----------------------------------------------------------------------

export function TaglineSection({
  content,
  title,
  event,
}: {
  content: TaglineContent;
  title?: string;
  event: PublicEvent;
}) {
  const lines = (content.lines ?? []).filter((l) => l.trim());
  const words = (content.words ?? []).filter((w) => w.trim());
  const links = (content.links ?? []).filter((l) => l.label && l.url);
  const active = useCyclingIndex(words.length, 1800);

  if (lines.length === 0 && words.length === 0) return null;

  return (
    <PublicSection title={title || undefined}>
      <div className="text-center">
        {lines.length > 0 ? (
          <div className="space-y-1.5">
            {lines.map((line, index) => {
              const accent =
                content.highlight_last && index === lines.length - 1;
              return (
                <p
                  key={index}
                  className="text-lg font-extrabold leading-snug sm:text-2xl"
                  style={accent ? { color: 'var(--event-brand)' } : undefined}
                >
                  {line}
                </p>
              );
            })}
          </div>
        ) : null}

        {words.length > 0 ? (
          <div
            className={cn(
              'mt-10 flex flex-wrap items-baseline justify-center gap-x-5 gap-y-2 text-3xl font-extrabold uppercase sm:gap-x-7 sm:text-4xl lg:text-5xl',
              DISPLAY_FONT_CLASS,
            )}
            aria-label={words.join(', ')}
          >
            {words.map((word, index) => {
              const on = index === active;
              return (
                <span
                  key={index}
                  aria-hidden="true"
                  className={cn(
                    'transition-[color,text-shadow] duration-700',
                    !on && 'text-slate-300 dark:text-white/25',
                  )}
                  style={
                    on
                      ? {
                          color: 'var(--event-brand)',
                          textShadow:
                            '0 0 24px color-mix(in srgb, var(--event-brand) 45%, transparent)',
                        }
                      : undefined
                  }
                >
                  {word}
                </span>
              );
            })}
          </div>
        ) : null}

        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <TicketCta event={event} label={content.button_label?.trim() || undefined} />
          {links.map((link, index) => (
            <OutlineLink key={index} href={link.url}>
              {link.label}
            </OutlineLink>
          ))}
        </div>
      </div>
    </PublicSection>
  );
}

// --- Stats -------------------------------------------------------------------------

const STAT_COLS: Record<number, string> = {
  1: 'sm:grid-cols-1 max-w-sm',
  2: 'sm:grid-cols-2 max-w-2xl',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
};

/** The display value for a stat, or null when a live value is unavailable. */
function statValue(item: StatItem, event: PublicEvent): string | null {
  const fmt = (n: number | null | undefined) =>
    typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('en-US') : null;
  switch (item.source) {
    case 'tickets_remaining':
      // "0 seats left" reads like a glitch; say it plainly.
      if (event.sales_state.reason === 'SOLD_OUT') return 'Sold out';
      return fmt(event.sales_state.tickets_remaining);
    case 'tickets_sold':
      return fmt(event.tickets_sold);
    default:
      return item.value?.trim() ? item.value : null;
  }
}

export function StatsSection({
  content,
  title,
  event,
}: {
  content: StatsContent;
  title?: string;
  event: PublicEvent;
}) {
  const items = (content.items ?? [])
    .map((item) => ({ item, value: statValue(item, event) }))
    .filter((row): row is { item: StatItem; value: string } => row.value !== null);
  if (items.length === 0) return null;

  return (
    <PublicSection title={title || undefined}>
      <div
        className={cn(
          'mx-auto grid gap-4',
          STAT_COLS[Math.min(items.length, 4)],
        )}
      >
        {items.map(({ item, value }, index) => (
          <PublicCard key={index} className="text-center">
            <div
              className={cn(
                'text-4xl font-extrabold tabular-nums leading-none sm:text-5xl',
                DISPLAY_FONT_CLASS,
              )}
              style={{ color: 'var(--event-brand)' }}
            >
              {value}
            </div>
            {item.label ? (
              <div
                className={cn(
                  'mt-3 text-[11px] font-semibold uppercase tracking-[0.18em]',
                  MUTED,
                )}
              >
                {item.label}
              </div>
            ) : null}
          </PublicCard>
        ))}
      </div>
    </PublicSection>
  );
}

// --- Marquee -----------------------------------------------------------------------

/** Scoped keyframes (no global CSS); the name is prefixed to avoid clashes. */
const MARQUEE_KEYFRAMES =
  '@keyframes wb-ev-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}';

export function MarqueeSection({
  content,
  title,
}: {
  content: MarqueeContent;
  title?: string;
}) {
  const items = (content.items ?? []).filter((i) => i.photo_url || i.name);
  if (items.length === 0) return null;
  // ~4s per card keeps the pace steady whatever the count.
  const duration = `${Math.max(items.length * 4, 20)}s`;

  return (
    <PublicSection title={title || undefined}>
      {content.intro ? (
        <p
          className={cn(
            'mx-auto mb-6 max-w-3xl text-center text-base font-semibold',
            MUTED,
          )}
        >
          {content.intro}
        </p>
      ) : null}

      {/* Animated strip: two copies of the track, shifted by half. */}
      <div
        className="group overflow-hidden motion-reduce:hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
      >
        <style>{MARQUEE_KEYFRAMES}</style>
        <div
          className="flex w-max motion-safe:animate-[wb-ev-marquee_linear_infinite] group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]"
          style={{ animationDuration: duration }}
        >
          {[0, 1].map((copy) => (
            <div
              key={copy}
              className="flex shrink-0 gap-4 pr-4"
              aria-hidden={copy === 1 ? 'true' : undefined}
            >
              {items.map((item, index) => (
                <MarqueeCard key={index} item={item} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Reduced motion: the same cards as a static, wrapping grid. */}
      <div className="hidden flex-wrap justify-center gap-4 motion-reduce:flex">
        {items.map((item, index) => (
          <MarqueeCard key={index} item={item} />
        ))}
      </div>
    </PublicSection>
  );
}

function MarqueeCard({ item }: { item: MarqueeItem }) {
  return (
    <figure className="w-32 shrink-0 sm:w-40">
      <div
        className="aspect-[4/5] overflow-hidden bg-slate-200 dark:bg-white/5"
        style={{ borderRadius: 'min(var(--event-btn-radius), 0.5rem)' }}
      >
        {item.photo_url ? (
          <img
            src={item.photo_url}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div
            className={cn(
              'flex h-full w-full items-center justify-center text-3xl font-bold',
              DISPLAY_FONT_CLASS,
            )}
            style={{ color: 'var(--event-brand)' }}
            aria-hidden="true"
          >
            {initials(item.name)}
          </div>
        )}
      </div>
      {item.name ? (
        <figcaption className="mt-2 truncate text-center text-xs font-bold">
          {item.name}
        </figcaption>
      ) : null}
    </figure>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
