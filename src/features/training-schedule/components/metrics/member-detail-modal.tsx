import { Modal } from '@/shared/components';

import { useMemberMetrics } from '../../hooks/use-training-schedule';
import { formatDay, formatTime } from '../../utils/time';
import { Notice, mutedText } from '../fields';
import { MemberRateChart } from './member-rate-chart';
import { StatusChip } from './status';
import { formatAgo, statusReason } from '../../utils/metrics';

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
      <p className="text-xs text-slate-500 dark:text-white/50">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
      {hint ? <p className="text-xs text-slate-500 dark:text-white/50">{hint}</p> : null}
    </div>
  );
}

interface MemberDetailModalProps {
  hostId: number | null;
  memberId: number | null;
  onClose: () => void;
}

/** One member's attendance: the numbers, every expected date, and their rate against the BaseShop. */
export function MemberDetailModal({ hostId, memberId, onClose }: MemberDetailModalProps) {
  const detail = useMemberMetrics(hostId, memberId);
  if (memberId === null) return null;
  const data = detail.data;

  return (
    <Modal
      open
      title={data ? data.name : 'Attendance'}
      subtitle={data?.level ?? undefined}
      headerActions={data ? <StatusChip status={data.status} /> : undefined}
      onClose={onClose}
      contentClassName="max-w-[760px]"
      dismissible
    >
      <div className="space-y-5 overflow-y-auto pr-1">
        {detail.isLoading ? <p className={mutedText}>Loading…</p> : null}
        {detail.isError ? <Notice tone="danger">{detail.error.message}</Notice> : null}
        {data ? (
          <>
            <p className="text-sm text-slate-800 dark:text-white/90">{statusReason(data, data.rules.slipping_after_misses)}</p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat
                label={`Last ${data.recent_expected || data.rules.window}`}
                value={data.rate === null ? '—' : `${data.rate}%`}
                hint={`${data.recent_attended} of ${data.recent_expected} came`}
              />
              <Stat label="Missed in a row" value={String(data.missed_in_row)} />
              <Stat
                label="Last came"
                value={data.last_attended_at ? formatDay(data.last_attended_at) : '—'}
                hint={data.last_attended_at ? formatAgo(data.last_attended_at) : 'Never'}
              />
              <Stat
                label="Trainings attended"
                value={String(data.total_attended)}
                hint={data.other_attended ? `${data.other_attended} beyond their own schedule` : 'All time'}
              />
            </div>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Every expected training</h3>
              {data.timeline.length === 0 ? (
                <p className={mutedText}>No trainings have been expected of them yet.</p>
              ) : (
                <ol className="flex flex-wrap gap-1.5" aria-label="Expected trainings, oldest first">
                  {data.timeline.map((point) => (
                    <li
                      key={point.occurrence_id}
                      title={`${formatDay(point.start_at)} · ${point.title} — ${
                        point.attended && point.attended_at ? `came at ${formatTime(point.attended_at)}` : 'missed'
                      }`}
                      className={`flex h-7 min-w-[52px] items-center justify-center rounded-md px-1.5 text-[11px] font-medium ${
                        point.attended
                          ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                          : 'border border-dashed border-slate-300 text-slate-500 dark:border-white/25 dark:text-white/50'
                      }`}
                    >
                      <span className="sr-only">{point.attended ? 'Came: ' : 'Missed: '}</span>
                      {formatDay(point.start_at).replace(/^\w+, /, '')}
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-2 text-xs text-slate-500 dark:text-white/50">
                Solid: came. Dashed: missed. Only trainings on their schedule that count toward attendance, since they
                joined.
              </p>
            </section>

            {data.timeline.length > 1 ? (
              <section>
                <h3 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">Attendance rate over time</h3>
                <MemberRateChart timeline={data.timeline} window={data.rules.window} />
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </Modal>
  );
}
