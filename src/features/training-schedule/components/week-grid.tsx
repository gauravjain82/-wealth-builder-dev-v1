import { useMemo } from 'react';
import { Check, Globe, Repeat } from 'lucide-react';

import type { ScheduleOccurrence } from '../types';
import { addDays, differsFromViewer, formatTime, formatTimeRange, zoneAbbreviation } from '../utils/time';

const HOUR_PX = 56;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The grid shows 7 AM–11 PM, widened to fit anything outside it this week. */
function hourRange(occurrences: ScheduleOccurrence[]): [number, number] {
  let first = 7;
  let last = 23;
  for (const occurrence of occurrences) {
    const start = new Date(occurrence.start_at);
    const end = new Date(occurrence.end_at);
    const crossesMidnight = start.toDateString() !== end.toDateString();
    first = Math.min(first, crossesMidnight ? 0 : start.getHours());
    last = Math.max(last, crossesMidnight ? 24 : end.getHours() + (end.getMinutes() ? 1 : 0));
  }
  return [first, Math.min(last, 24)];
}

function hourLabel(hour: number): string {
  return new Date(2000, 0, 1, hour).toLocaleTimeString('en-US', { hour: 'numeric' });
}

interface WeekGridProps {
  weekStart: Date;
  occurrences: ScheduleOccurrence[];
  onSelect: (occurrence: ScheduleOccurrence) => void;
}

/** The week in the viewer's own zone; a training in another zone is flagged on its card. */
export function WeekGrid({ weekStart, occurrences, onSelect }: WeekGridProps) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const [firstHour, lastHour] = useMemo(() => hourRange(occurrences), [occurrences]);
  const hours = Array.from({ length: lastHour - firstHour }, (_, i) => firstHour + i);
  const today = new Date().toDateString();

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
      <div className="grid min-w-[860px] grid-cols-[64px_repeat(7,minmax(0,1fr))]">
        <div className="border-b border-slate-200 dark:border-white/10" />
        {days.map((day, index) => {
          const isToday = day.toDateString() === today;
          return (
            <div
              key={day.toISOString()}
              className="border-b border-l border-slate-200 px-2 py-2 text-center dark:border-white/10"
            >
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-white/50">
                {DAY_NAMES[index]}
              </div>
              <div
                className={`mx-auto mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  isToday ? 'bg-primary text-primary-foreground' : 'text-slate-900 dark:text-white'
                }`}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}

        <div>
          {hours.map((hour) => (
            <div
              key={hour}
              style={{ height: HOUR_PX }}
              className="pr-2 pt-1 text-right text-xs text-slate-500 dark:text-white/40"
            >
              {hourLabel(hour)}
            </div>
          ))}
        </div>
        {days.map((day) => {
          const dayStart = new Date(day).setHours(firstHour, 0, 0, 0);
          const dayEnd = new Date(day).setHours(0, 0, 0, 0) + lastHour * 3600000;
          const visible = occurrences.filter(
            (o) => new Date(o.start_at).getTime() < dayEnd && new Date(o.end_at).getTime() > dayStart
          );
          return (
            <div
              key={day.toISOString()}
              className="relative border-l border-slate-200 dark:border-white/10"
              style={{ height: hours.length * HOUR_PX }}
            >
              {hours.map((hour) => (
                <div
                  key={hour}
                  style={{ height: HOUR_PX }}
                  className="border-b border-slate-100 dark:border-white/5"
                />
              ))}
              {visible.map((occurrence) => {
                const start = Math.max(new Date(occurrence.start_at).getTime(), dayStart);
                const end = Math.min(new Date(occurrence.end_at).getTime(), dayEnd);
                const otherZone = differsFromViewer(occurrence.timezone, occurrence.start_at);
                return (
                  <button
                    key={occurrence.id}
                    type="button"
                    onClick={() => onSelect(occurrence)}
                    title={`${occurrence.title} · ${formatTimeRange(occurrence.start_at, occurrence.end_at)}`}
                    className="absolute inset-x-1 overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left text-xs text-slate-900 shadow-sm transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-white dark:hover:brightness-125"
                    style={{
                      top: ((start - dayStart) / 3600000) * HOUR_PX,
                      height: Math.max(((end - start) / 3600000) * HOUR_PX - 2, 28),
                      borderLeftColor: occurrence.color,
                      backgroundColor: `${occurrence.color}33`,
                    }}
                  >
                    <span className="flex items-center gap-1 font-semibold leading-tight">
                      {occurrence.attended ? (
                        <Check size={12} className="shrink-0 text-emerald-600 dark:text-emerald-300" aria-label="Attended" />
                      ) : null}
                      {occurrence.recurrence !== 'none' ? <Repeat size={11} className="shrink-0 opacity-70" aria-hidden /> : null}
                      <span className="truncate">{occurrence.title}</span>
                    </span>
                    <span className="block truncate opacity-80">{formatTime(occurrence.start_at)}</span>
                    {otherZone ? (
                      <span className="mt-0.5 inline-flex max-w-full items-center gap-1 rounded bg-amber-200 px-1 font-medium text-amber-900 dark:bg-amber-400/25 dark:text-amber-100">
                        <Globe size={10} className="shrink-0" aria-hidden />
                        <span className="truncate">
                          {formatTime(occurrence.start_at, occurrence.timezone)}{' '}
                          {zoneAbbreviation(occurrence.timezone, occurrence.start_at)}
                        </span>
                      </span>
                    ) : null}
                    {occurrence.relation !== 'own' ? (
                      <span className="block truncate opacity-70">{occurrence.owner.name}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
