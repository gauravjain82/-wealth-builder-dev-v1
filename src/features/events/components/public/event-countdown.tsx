/**
 * Countdown to an event's start, shown on the landing page when
 * `show_countdown` is enabled.
 *
 * Renders nothing once the target has passed (a "-3 days" counter is worse than
 * no counter), and nothing without a start date.
 */

import { useEffect, useMemo, useState } from 'react';

import { cn } from '@core/utils';

import { parseDate } from '../../utils/public-dates';

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

export function EventCountdown({
  beginAt,
  tone = 'dark',
}: {
  beginAt: string | null;
  tone?: CountdownTone;
}) {
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

  const { days, hours, minutes, seconds } = breakdown(msLeft);

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
