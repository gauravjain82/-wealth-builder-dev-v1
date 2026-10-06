import { Lock } from 'lucide-react';
import {
  formatDayLabel,
  formatTimeRange,
  sessionPhase,
  type SessionPhase,
} from '../../utils/zoned-time';
import type { EventSession, SessionAttendanceRow } from '../../types/session';

interface SessionPickerProps {
  sessions: EventSession[];
  attendance: Record<number, SessionAttendanceRow>;
  day: string;
  days: string[];
  timeZone: string;
  selectedId: number | null;
  now: number;
  onDayChange: (day: string) => void;
  onSelect: (sessionId: number) => void;
}

const PHASE: Record<SessionPhase, { label: string; className: string }> = {
  live: {
    label: 'Live now',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
  },
  open: {
    label: 'Check-in open',
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200',
  },
  upcoming: {
    label: 'Upcoming',
    className: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/70',
  },
  ended: {
    label: 'Ended',
    className: 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-white/50',
  },
};

/**
 * Pick which session's door to run. One card per attendance-taking session on
 * the chosen day, each with where it stands right now and how full it is, so
 * a supervisor can glance across rooms before picking one.
 */
export function SessionPicker({
  sessions,
  attendance,
  day,
  days,
  timeZone,
  selectedId,
  now,
  onDayChange,
  onSelect,
}: SessionPickerProps) {
  const onDay = sessions.filter((s) => s.local_date === day);

  return (
    <div className="space-y-3">
      {days.length > 1 ? (
        <div role="tablist" aria-label="Days" className="flex gap-1 overflow-x-auto">
          {days.map((d) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={d === day}
              onClick={() => onDayChange(d)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                d === day
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/15'
              }`}
            >
              {formatDayLabel(d, 'short')}
            </button>
          ))}
        </div>
      ) : null}

      <div role="radiogroup" aria-label="Sessions" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {onDay.map((session) => {
          const phase = PHASE[sessionPhase(session, now)];
          const row = attendance[session.id];
          const pct = row?.expected ? Math.min(100, Math.round((row.arrived / row.expected) * 100)) : 0;
          const selected = session.id === selectedId;
          return (
            <button
              key={session.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(session.id)}
              className={`rounded-xl border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                selected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/25'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-slate-900 dark:text-white">
                  {session.access === 'RESTRICTED' ? (
                    <Lock size={13} className="mr-1 inline -translate-y-px text-amber-600" aria-label="Restricted" />
                  ) : null}
                  {session.title}
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${phase.className}`}>
                  {phase.label}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-white/50">
                {formatTimeRange(session.starts_at, session.ends_at, timeZone)}
                {session.room ? ` · ${session.room}` : ''}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={row?.expected ?? 0}
                  aria-valuenow={row?.arrived ?? 0}
                  aria-label={`${session.title} attendance`}
                >
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs tabular-nums text-slate-600 dark:text-white/70">
                  {row ? `${row.arrived}/${row.expected}` : '—'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
