import { Modal } from '@/shared/components';

import { useOccurrenceMetrics } from '../../hooks/use-training-schedule';
import type { OccurrencePerson } from '../../types';
import { formatDay, formatTime } from '../../utils/time';
import { Notice, mutedText } from '../fields';
import { StatusChip } from './status';

function PersonList({
  people,
  empty,
  onSelect,
  showTime,
}: {
  people: OccurrencePerson[];
  empty: string;
  onSelect: (userId: number) => void;
  showTime?: boolean;
}) {
  if (!people.length) return <p className={mutedText}>{empty}</p>;
  return (
    <ul className="divide-y divide-slate-100 dark:divide-white/5">
      {people.map((person) => (
        <li key={person.user_id}>
          <button
            type="button"
            onClick={() => onSelect(person.user_id)}
            className="flex w-full items-center justify-between gap-2 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/5"
          >
            <span className="min-w-0 truncate text-slate-900 dark:text-white">
              {person.name}
              {person.level ? <span className="ml-1.5 text-xs text-slate-500 dark:text-white/50">{person.level}</span> : null}
            </span>
            {showTime && person.attended_at ? (
              <span className="shrink-0 text-xs text-slate-500 dark:text-white/50">{formatTime(person.attended_at)}</span>
            ) : (
              <StatusChip status={person.status} />
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

interface OccurrenceDetailModalProps {
  hostId: number | null;
  occurrenceId: number | null;
  onClose: () => void;
  onSelectMember: (userId: number) => void;
}

/** One training date: who came, and — what the live list cannot show — who was expected and did not. */
export function OccurrenceDetailModal({ hostId, occurrenceId, onClose, onSelectMember }: OccurrenceDetailModalProps) {
  const detail = useOccurrenceMetrics(hostId, occurrenceId);
  if (occurrenceId === null) return null;
  const data = detail.data;

  return (
    <Modal
      open
      title={data ? data.title : 'Training'}
      subtitle={
        data
          ? `${formatDay(data.start_at)} · ${formatTime(data.start_at)} · ${data.attended} of ${data.expected} came${
              data.rate === null ? '' : ` (${data.rate}%)`
            }`
          : undefined
      }
      onClose={onClose}
      contentClassName="max-w-[720px]"
      dismissible
    >
      <div className="overflow-y-auto pr-1">
        {detail.isLoading ? <p className={mutedText}>Loading…</p> : null}
        {detail.isError ? <Notice tone="danger">{detail.error.message}</Notice> : null}
        {data ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <section>
              <h3 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">
                Missed ({data.missed_people.length})
              </h3>
              <PersonList people={data.missed_people} empty="Everyone expected came." onSelect={onSelectMember} />
            </section>
            <section>
              <h3 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">
                Came ({data.attended_people.length})
              </h3>
              <PersonList people={data.attended_people} empty="Nobody came." onSelect={onSelectMember} showTime />
            </section>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
