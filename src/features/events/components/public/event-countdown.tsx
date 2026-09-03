/**
 * Countdown to an event's start, shown on the landing page when
 * `show_countdown` is enabled.
 *
 * Renders nothing once the target has passed (a "-3 days" counter is worse than
 * no counter), and nothing without a start date.
 */

import { useEffect, useMemo, useState } from 'react';

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

export function EventCountdown({ beginAt }: { beginAt: string | null }) {
  // A timestamp, not a Date: `parseDate` returns a fresh object each render,
  // which would re-fire the interval effect on every parent re-render.
  const targetMs = useMemo(() => parseDate(beginAt)?.getTime() ?? null, [beginAt]);
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
    <div className="flex flex-wrap gap-3" aria-label="Time until the event starts">
      <CountdownUnit value={days} label={days === 1 ? 'Day' : 'Days'} />
      <CountdownUnit value={hours} label="Hours" />
      <CountdownUnit value={minutes} label="Minutes" />
      <CountdownUnit value={seconds} label="Seconds" />
    </div>
  );
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-[72px] rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-center backdrop-blur">
      <div
        className="text-2xl font-bold tabular-nums"
        style={{ color: 'var(--event-brand)' }}
      >
        {String(value).padStart(2, '0')}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-white/70">{label}</div>
    </div>
  );
}
