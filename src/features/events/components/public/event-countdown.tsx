/**
 * Countdown to an event's start, shown on the landing page when
 * `show_countdown` is enabled — inside the hero (`EventCountdown`), or for
 * themes with `countdown: 'band'` as its own band under it (`CountdownBand`).
 *
 * Renders nothing once the target has passed (a "-3 days" counter is worse than
 * no counter), and nothing without a start date.
 */

import { useEffect, useMemo, useState } from 'react';

import { cn } from '@core/utils';

import { DISPLAY_FONT_CLASS } from '../../themes/registry';
import { parseDate } from '../../utils/public-dates';
import { Eyebrow } from './public-event-shell';

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** Milliseconds per unit, largest first, for the breakdown below. */
const MS = {
  day: 86_400_000,
  hour: 3_600_000,
  minute: 60_000,
  second: 1000,
} as const;

function breakdown(msLeft: number): Remaining {
  return {
    days: Math.floor(msLeft / MS.day),
    hours: Math.floor((msLeft % MS.day) / MS.hour),
    minutes: Math.floor((msLeft % MS.hour) / MS.minute),
    seconds: Math.floor((msLeft % MS.minute) / MS.second),
  };
}

/** `dark` sits on hero media; `light` on a white page (split hero). */
type CountdownTone = 'dark' | 'light';

/**
 * Time left until `beginAt`, ticking every second; `null` without a start
 * date or once it has passed (a "-3 days" counter is worse than none).
 */
function useCountdown(beginAt: string | null): Remaining | null {
  // A timestamp, not a Date: `parseDate` returns a fresh object each render,
  // which would re-fire the interval effect on every parent re-render.
  const targetMs = useMemo(
    () => parseDate(beginAt)?.getTime() ?? null,
    [beginAt],
  );
  const [msLeft, setMsLeft] = useState(() =>
    targetMs === null ? 0 : targetMs - Date.now(),
  );

  useEffect(() => {
    if (targetMs === null) return;
    // Recompute from the target each tick rather than decrementing, so the
    // countdown stays accurate if the tab is backgrounded and timers coalesce.
    const tick = () => setMsLeft(targetMs - Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [targetMs]);

  if (targetMs === null || msLeft <= 0) return null;
  return breakdown(msLeft);
}

export function EventCountdown({
  beginAt,
  tone = 'dark',
}: {
  beginAt: string | null;
  tone?: CountdownTone;
}) {
  const remaining = useCountdown(beginAt);
  if (!remaining) return null;

  const { days, hours, minutes, seconds } = remaining;

  return (
    <div
      className="flex flex-wrap gap-3"
      aria-label="Time until the event starts"
    >
      <CountdownUnit
        value={days}
        label={days === 1 ? 'Day' : 'Days'}
        tone={tone}
      />
      <CountdownUnit value={hours} label="Hours" tone={tone} />
      <CountdownUnit value={minutes} label="Minutes" tone={tone} />
      <CountdownUnit value={seconds} label="Seconds" tone={tone} />
    </div>
  );
}

function CountdownUnit({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: CountdownTone;
}) {
  return (
    <div
      className={cn(
        'min-w-[72px] rounded-xl border px-3 py-2 text-center',
        tone === 'dark'
          ? 'border-white/20 bg-black/30 backdrop-blur'
          : 'border-slate-200 bg-slate-50',
      )}
    >
      <div
        className="text-2xl font-bold tabular-nums"
        style={{ color: 'var(--event-brand)' }}
      >
        {String(value).padStart(2, '0')}
      </div>
      <div
        className={cn(
          'text-[11px] uppercase tracking-wide',
          tone === 'dark' ? 'text-white/70' : 'text-slate-500',
        )}
      >
        {label}
      </div>
    </div>
  );
}

/**
 * Full-width countdown band under the hero: an eyebrow over four boxed tiles
 * with accent-gradient digits. Renders nothing (band included) once the start
 * has passed. Styled from the token-theme CSS variables.
 */
export function CountdownBand({
  beginAt,
  label = 'Doors open in',
}: {
  beginAt: string | null;
  label?: string;
}) {
  const remaining = useCountdown(beginAt);
  if (!remaining) return null;

  const { days, hours, minutes, seconds } = remaining;
  const units: Array<[number, string, boolean]> = [
    [days, days === 1 ? 'Day' : 'Days', false],
    [hours, 'Hours', true],
    [minutes, 'Minutes', true],
    [seconds, 'Seconds', true],
  ];

  return (
    <section className="bg-[var(--event-page,#000)] px-4 pb-4 pt-10 text-center sm:pt-12">
      <Eyebrow>{label}</Eyebrow>
      <div
        className="mt-5 flex justify-center gap-2.5 sm:gap-4"
        role="timer"
        aria-label="Time until the event starts"
      >
        {units.map(([value, unit, pad]) => (
          <div
            key={unit}
            className="w-[4.5rem] rounded-md border border-[color:var(--event-hairline)] bg-[var(--event-surface,#111)] px-2 pb-2.5 pt-3 shadow-[inset_0_1px_0_0_var(--event-hairline-strong),0_18px_40px_-24px_var(--event-brand-glow)] sm:w-24 sm:pt-4"
          >
            <div
              className={cn(
                'bg-clip-text text-4xl font-black leading-none text-transparent tabular-nums sm:text-5xl',
                DISPLAY_FONT_CLASS,
              )}
              style={{
                backgroundImage:
                  'linear-gradient(180deg, var(--event-brand-light) 0%, var(--event-brand) 55%, var(--event-brand-deep) 100%)',
              }}
            >
              {pad ? String(value).padStart(2, '0') : value}
            </div>
            <div className="mt-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-[color:var(--event-muted,rgba(255,255,255,0.6))] sm:text-[10px]">
              {unit}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
