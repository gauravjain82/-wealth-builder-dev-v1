import { useState, type ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Minus, Search } from 'lucide-react';

import { useAttendanceMetrics, useHosts } from '../../hooks/use-training-schedule';
import type { MemberStatus, MetricsPeriod, PersonRef } from '../../types';
import { formatDay } from '../../utils/time';
import { Notice, fieldClass, mutedText } from '../fields';
import { MemberDetailModal } from './member-detail-modal';
import { MemberTable } from './member-table';
import { OccurrenceDetailModal } from './occurrence-detail-modal';
import { StatusChip } from './status';
import { NEEDS_ATTENTION, statusReason } from '../../utils/metrics';
import { TrainingTrendChart } from './training-trend-chart';

const PERIODS: MetricsPeriod[] = [4, 8, 12];
const ATTENTION_PREVIEW = 6;

function Tile({
  label,
  value,
  detail,
  tone = 'neutral',
  onClick,
}: {
  label: string;
  value: string;
  detail?: ReactNode;
  tone?: 'neutral' | 'danger' | 'warning';
  onClick?: () => void;
}) {
  const accent = {
    neutral: 'border-slate-200 dark:border-white/10',
    danger: 'border-red-300 dark:border-red-400/40',
    warning: 'border-amber-300 dark:border-amber-300/40',
  }[tone];
  const body = (
    <>
      <p className="text-xs font-medium text-slate-500 dark:text-white/50">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</p>
      {detail ? <div className="mt-1 text-xs text-slate-600 dark:text-white/60">{detail}</div> : null}
    </>
  );
  const classes = `rounded-xl border-2 bg-white p-4 text-left dark:bg-white/[0.03] ${accent}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${classes} transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}>
      {body}
    </button>
  ) : (
    <div className={classes}>{body}</div>
  );
}

function Trend({ rate, previous, weeks }: { rate: number | null; previous: number | null; weeks: number }) {
  if (rate === null || previous === null) return <span>No earlier period to compare</span>;
  const delta = rate - previous;
  const Icon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon size={13} aria-hidden />
      {delta === 0 ? 'Same as' : `${Math.abs(delta)} pts ${delta > 0 ? 'up on' : 'down on'}`} the previous {weeks} weeks
    </span>
  );
}

/** Admins pick whose BaseShop to look at. */
function HostPicker({ host, onPick }: { host: PersonRef | null; onPick: (host: PersonRef) => void }) {
  const [query, setQuery] = useState('');
  const hosts = useHosts(query, query.trim().length >= 2);
  return (
    <div className="relative w-full max-w-sm">
      <Search size={14} className="absolute left-3 top-3 text-slate-400" aria-hidden />
      <input
        className={`${fieldClass} pl-8`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={host ? `Viewing ${host.name} — search another SMD…` : 'Search an SMD to see their BaseShop…'}
        aria-label="Choose an SMD"
      />
      {query.trim().length >= 2 && hosts.data ? (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-white/15 dark:bg-[#1e2431]">
          {hosts.data.length === 0 ? <li className={`px-3 py-2 ${mutedText}`}>No SMD matches.</li> : null}
          {hosts.data.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-white/5"
                onClick={() => {
                  onPick({ id: option.id, name: option.name });
                  setQuery('');
                }}
              >
                {option.name}
                {option.level ? <span className="ml-1.5 text-xs text-slate-500 dark:text-white/50">{option.level}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

interface AttendanceDashboardProps {
  canHost: boolean;
  isAdmin: boolean;
}

/**
 * The Attendance tab: how the BaseShop is doing, who needs attention and why,
 * then the detail on demand — a date's no-shows, a member's whole history.
 */
export function AttendanceDashboard({ canHost, isAdmin }: AttendanceDashboardProps) {
  const [weeks, setWeeks] = useState<MetricsPeriod>(4);
  const [pickedHost, setPickedHost] = useState<PersonRef | null>(null);
  const [filter, setFilter] = useState<MemberStatus | 'all'>('all');
  const [showAllAttention, setShowAllAttention] = useState(false);
  const [memberId, setMemberId] = useState<number | null>(null);
  const [occurrenceId, setOccurrenceId] = useState<number | null>(null);

  // A host sees their own BaseShop unless an admin among them picks another; an admin who is not a host must pick.
  const hostId = pickedHost?.id ?? null;
  const enabled = canHost || hostId !== null;
  const metrics = useAttendanceMetrics(hostId, weeks, enabled);
  const data = metrics.data;

  const attention = data ? data.members.filter((m) => NEEDS_ATTENTION.includes(m.status)) : [];
  const shownAttention = showAllAttention ? attention : attention.slice(0, ATTENTION_PREVIEW);
  const filterTo = (status: MemberStatus | 'all') => {
    setFilter(status);
    document.getElementById('wb-ts-members')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {data ? `${data.host.name}’s BaseShop` : 'Attendance'}
          </h2>
          {data ? (
            <p className={mutedText}>
              {data.summary.member_count} people · judged on their last {data.rules.window} trainings
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin ? <HostPicker host={data?.host ?? pickedHost} onPick={setPickedHost} /> : null}
          <div className="inline-flex rounded-lg border border-slate-300 p-0.5 dark:border-white/20" role="group" aria-label="Period">
            {PERIODS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={weeks === value}
                onClick={() => setWeeks(value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  weeks === value
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/10'
                }`}
              >
                {value} weeks
              </button>
            ))}
          </div>
        </div>
      </div>

      {!enabled ? <Notice tone="info">Search for an SMD above to see their BaseShop’s attendance.</Notice> : null}
      {metrics.isLoading ? <p className={mutedText}>Loading attendance…</p> : null}
      {metrics.isError ? (
        <Notice tone="danger">
          Could not load attendance: {metrics.error.message}{' '}
          <button type="button" className="font-medium underline" onClick={() => void metrics.refetch()}>
            Try again
          </button>
        </Notice>
      ) : null}

      {data ? (
        data.summary.member_count === 0 ? (
          <Notice tone="info">There is nobody in this BaseShop to track yet.</Notice>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tile
                label={`Attendance, last ${weeks} weeks`}
                value={data.summary.rate === null ? '—' : `${data.summary.rate}%`}
                detail={<Trend rate={data.summary.rate} previous={data.summary.previous_rate} weeks={weeks} />}
              />
              <Tile
                label="Last training"
                value={data.summary.latest ? `${data.summary.latest.attended} / ${data.summary.latest.expected}` : '—'}
                detail={
                  data.summary.latest
                    ? `${data.summary.latest.title} · ${formatDay(data.summary.latest.start_at)}`
                    : 'No trainings held yet'
                }
                onClick={data.summary.latest ? () => setOccurrenceId(data.summary.latest!.occurrence_id) : undefined}
              />
              <Tile
                label="Stopped or never came"
                value={String(data.summary.status_counts.stopped + data.summary.status_counts.never)}
                detail={`Missed ${data.rules.stopped_after_misses}+ in a row, or none at all`}
                tone={data.summary.status_counts.stopped + data.summary.status_counts.never ? 'danger' : 'neutral'}
                onClick={() => filterTo(data.summary.status_counts.stopped ? 'stopped' : 'never')}
              />
              <Tile
                label="Slipping"
                value={String(data.summary.status_counts.slipping)}
                detail={`Missed ${data.rules.slipping_after_misses} in a row, or under ${data.rules.slipping_below_rate}%`}
                tone={data.summary.status_counts.slipping ? 'warning' : 'neutral'}
                onClick={() => filterTo('slipping')}
              />
            </div>

            <section className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
              <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 dark:border-white/10 dark:text-white">
                Needs attention ({attention.length})
              </h2>
              {attention.length === 0 ? (
                <p className="flex items-center gap-2 px-4 py-4 text-sm text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 size={16} aria-hidden />
                  Everyone is on track.
                </p>
              ) : (
                <>
                  <ul className="divide-y divide-slate-100 dark:divide-white/5">
                    {shownAttention.map((member) => (
                      <li key={member.user_id}>
                        <button
                          type="button"
                          onClick={() => setMemberId(member.user_id)}
                          className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-white/5"
                        >
                          <span className="w-40 truncate font-medium text-slate-900 dark:text-white">{member.name}</span>
                          <StatusChip status={member.status} />
                          <span className="min-w-0 flex-1 text-sm text-slate-600 dark:text-white/70">
                            {statusReason(member, data.rules.slipping_after_misses)}
                          </span>
                          <span className="text-slate-400 dark:text-white/40" aria-hidden>
                            ›
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {attention.length > ATTENTION_PREVIEW ? (
                    <button
                      type="button"
                      className="w-full border-t border-slate-100 px-4 py-2 text-sm font-medium text-primary hover:underline dark:border-white/5"
                      onClick={() => setShowAllAttention((value) => !value)}
                    >
                      {showAllAttention ? 'Show fewer' : `Show all ${attention.length}`}
                    </button>
                  ) : null}
                </>
              )}
            </section>

            <TrainingTrendChart series={data.summary.series} onSelect={setOccurrenceId} />

            <div id="wb-ts-members" className="scroll-mt-4">
              <MemberTable
                members={data.members}
                counts={data.summary.status_counts}
                filter={filter}
                onFilter={setFilter}
                onSelect={setMemberId}
                window={data.rules.window}
              />
            </div>
          </>
        )
      ) : null}

      <MemberDetailModal hostId={hostId} memberId={memberId} onClose={() => setMemberId(null)} />
      <OccurrenceDetailModal
        hostId={hostId}
        occurrenceId={occurrenceId}
        onClose={() => setOccurrenceId(null)}
        onSelectMember={(userId) => {
          setOccurrenceId(null);
          setMemberId(userId);
        }}
      />
    </div>
  );
}
