import type { MemberMetrics, MemberStatus } from '../../types';
import { STATUS_META } from '../../utils/metrics';
import { formatDay } from '../../utils/time';

export function StatusChip({ status }: { status: MemberStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${meta.chip}`}
    >
      <Icon size={12} aria-hidden />
      {meta.label}
    </span>
  );
}

/** The last few expected dates as dots: filled = came, hollow = missed. Shape, not colour, carries it. */
export function AttendanceDots({ recent, size = 10 }: { recent: MemberMetrics['recent']; size?: number }) {
  if (!recent.length) return <span className="text-xs text-slate-400 dark:text-white/40">—</span>;
  const came = recent.filter((d) => d.attended).length;
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={`Came to ${came} of the last ${recent.length}`}>
      {recent.map((date) => (
        <span
          key={date.occurrence_id}
          title={`${formatDay(date.start_at)} · ${date.title} — ${date.attended ? 'came' : 'missed'}`}
          className={`inline-block rounded-full ${
            date.attended
              ? 'bg-emerald-600 dark:bg-emerald-400'
              : 'border-2 border-slate-300 bg-transparent dark:border-white/30'
          }`}
          style={{ width: size, height: size }}
        />
      ))}
    </span>
  );
}
