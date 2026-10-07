import type { CheckinStats } from '../types/checkin';

interface CheckinProgressProps {
  stats: CheckinStats;
}

/**
 * The door's one progress line: "Arrived 2 / 1,403", a bar, and what is left.
 * Replaces four counter cards — "not yet arrived" is expected − arrived and
 * "unassigned" was already the first card's hint, so one strip says it all.
 */
export function CheckinProgress({ stats }: CheckinProgressProps) {
  const rate = stats.expected ? Math.round((stats.arrived / stats.expected) * 100) : 0;
  const width = stats.expected ? Math.min(100, (stats.arrived / stats.expected) * 100) : 0;
  const details = [
    `${stats.remaining.toLocaleString()} to come`,
    stats.unassigned ? `${stats.unassigned.toLocaleString()} unnamed` : '',
    stats.arrived_via_session ? `${stats.arrived_via_session.toLocaleString()} via a session scan` : '',
  ].filter(Boolean);

  return (
    <div className="rounded-lg border border-slate-200 px-4 py-3 dark:border-white/10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="text-sm text-slate-600 dark:text-white/70">
          Arrived{' '}
          <span className="text-2xl font-semibold text-slate-900 dark:text-white">
            {stats.arrived.toLocaleString()}
          </span>{' '}
          / {stats.expected.toLocaleString()}
          <span className="ml-2 text-slate-500 dark:text-white/50">{rate}%</span>
        </p>
        <p className="text-sm text-slate-500 dark:text-white/60">{details.join(' · ')}</p>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"
        role="progressbar"
        aria-label="Arrived"
        aria-valuemin={0}
        aria-valuemax={stats.expected}
        aria-valuenow={stats.arrived}
      >
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
