import { useState } from 'react';
import { Check, Clock, Globe, Repeat, User, Users, Video } from 'lucide-react';

import { Button, ConfirmationDialog, Modal } from '@/shared/components';
import { useToastStore } from '@/store';

import { useInheritTraining } from '../hooks/use-training-schedule';
import type { ScheduleOccurrence, TrainingTarget } from '../types';
import { differsFromViewer, formatDay, formatTimeRange, viewerTimezone, zoneAbbreviation } from '../utils/time';
import { AttendanceLink } from './attendance-modal';
import { Notice, mutedText } from './fields';

const REPEAT_LABEL: Record<ScheduleOccurrence['recurrence'], string> = {
  none: 'One-time training',
  daily: 'Repeats daily',
  weekly: 'Repeats weekly',
  biweekly: 'Repeats every 2 weeks',
  monthly: 'Repeats monthly',
};

/** Why this date is on the viewer's schedule. */
function reachCopy(occurrence: ScheduleOccurrence): string {
  const names = occurrence.via.map((host) => host.name).join(' and ');
  switch (occurrence.relation) {
    case 'own':
      return 'Your training — everyone in your BaseShop sees it.';
    case 'inherited':
      return occurrence.my_inheritance === 'all'
        ? `You inherited this series from ${occurrence.owner.name}. Your BaseShop sees every date.`
        : `You inherited this date from ${occurrence.owner.name}. Your BaseShop sees it.`;
    case 'baseshop':
      return names === occurrence.owner.name
        ? `Shared with your BaseShop by ${names}.`
        : `Hosted by ${occurrence.owner.name}; shared with your BaseShop by ${names}.`;
    default:
      return 'You see this as an administrator. It is not on your own schedule.';
  }
}

interface OccurrenceModalProps {
  occurrence: ScheduleOccurrence | null;
  onClose: () => void;
  onEdit: (occurrence: ScheduleOccurrence) => void;
  onDelete: (target: TrainingTarget) => void;
  onShowAttendance: (occurrence: ScheduleOccurrence) => void;
}

export function OccurrenceModal({ occurrence, onClose, onEdit, onDelete, onShowAttendance }: OccurrenceModalProps) {
  const [withdrawing, setWithdrawing] = useState<TrainingTarget | null>(null);
  const inherit = useInheritTraining();
  const addToast = useToastStore((state) => state.addToast);
  if (!occurrence) return null;

  const otherZone = differsFromViewer(occurrence.timezone, occurrence.start_at);
  const isSeries = occurrence.series_count > 1;

  const withdraw = async () => {
    if (!withdrawing) return;
    try {
      await inherit.mutateAsync({ target: withdrawing, inherit: false });
      addToast({ type: 'success', message: 'Removed from your BaseShop’s schedule.' });
      setWithdrawing(null);
      onClose();
    } catch (failure) {
      addToast({ type: 'error', message: failure instanceof Error ? failure.message : 'Could not remove it.' });
    }
  };

  return (
    <>
      <Modal open title={occurrence.title} onClose={onClose} contentClassName="max-w-[600px]" dismissible>
        <div className="space-y-4 overflow-y-auto pr-1">
          <div className="space-y-2 text-sm text-slate-800 dark:text-white/90">
            <p className="flex items-start gap-2">
              <Clock size={16} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                <span className="font-semibold">
                  {formatDay(occurrence.start_at)} · {formatTimeRange(occurrence.start_at, occurrence.end_at)}
                </span>{' '}
                <span className="text-slate-500 dark:text-white/50">
                  your time ({zoneAbbreviation(viewerTimezone(), occurrence.start_at)})
                </span>
              </span>
            </p>
            {otherZone ? (
              <Notice tone="warning">
                <span className="flex items-start gap-2">
                  <Globe size={16} className="mt-0.5 shrink-0" aria-hidden />
                  <span>
                    This training is scheduled in a different time zone:{' '}
                    <strong>
                      {formatDay(occurrence.start_at, occurrence.timezone)} ·{' '}
                      {formatTimeRange(occurrence.start_at, occurrence.end_at, occurrence.timezone)}{' '}
                      {zoneAbbreviation(occurrence.timezone, occurrence.start_at)}
                    </strong>{' '}
                    ({occurrence.timezone}). The time above is already converted to yours.
                  </span>
                </span>
              </Notice>
            ) : null}
            <p className="flex items-center gap-2">
              <User size={16} className="shrink-0" aria-hidden />
              Hosted by {occurrence.owner.name}
            </p>
            <p className="flex items-center gap-2">
              <Repeat size={16} className="shrink-0" aria-hidden />
              {REPEAT_LABEL[occurrence.recurrence]}
              {isSeries ? ` · ${occurrence.series_count} dates in the series` : ''}
            </p>
            {occurrence.attended ? (
              <p className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-300">
                <Check size={16} className="shrink-0" aria-hidden />
                You attended this training
              </p>
            ) : null}
          </div>

          {occurrence.description ? (
            <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-white/80">{occurrence.description}</p>
          ) : null}

          {occurrence.meeting_url ? (
            <a
              href={occurrence.meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <Video size={16} aria-hidden />
              Join meeting
            </a>
          ) : null}

          <p className={mutedText}>{reachCopy(occurrence)}</p>

          {occurrence.inheritors ? (
            <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {occurrence.inheritors.length
                  ? `Inherited by ${occurrence.inheritors.length} other host${occurrence.inheritors.length === 1 ? '' : 's'}`
                  : 'No other host has inherited this date'}
              </p>
              {occurrence.inheritors.length ? (
                <p className={`mt-1 ${mutedText}`}>
                  {occurrence.inheritors.map((host) => host.name).join(', ')} — their BaseShops see it too, and
                  deleting it removes it for them.
                </p>
              ) : null}
            </div>
          ) : null}

          {occurrence.can_view_attendance ? (
            <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-white/10">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                  <Users size={16} aria-hidden />
                  {occurrence.attendance_count ?? 0} attended
                </p>
                <Button type="button" variant="outline" onClick={() => onShowAttendance(occurrence)}>
                  View live attendance
                </Button>
              </div>
              {occurrence.attendance_token ? <AttendanceLink token={occurrence.attendance_token} /> : null}
            </div>
          ) : null}

          {occurrence.can_manage ? (
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
              <Button type="button" variant="outline" onClick={() => onEdit(occurrence)}>
                Edit
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => onDelete({ trainingId: occurrence.training_id, occurrenceId: occurrence.id })}
              >
                Delete this date
              </Button>
              {isSeries ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => onDelete({ trainingId: occurrence.training_id })}
                >
                  Delete series
                </Button>
              ) : null}
            </div>
          ) : null}

          {occurrence.my_inheritance ? (
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
              <Button
                type="button"
                variant="outline"
                onClick={() => setWithdrawing({ trainingId: occurrence.training_id, occurrenceId: occurrence.id })}
              >
                Remove this date from my BaseShop
              </Button>
              {occurrence.my_inheritance === 'all' ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWithdrawing({ trainingId: occurrence.training_id })}
                >
                  Stop inheriting the series
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </Modal>

      <ConfirmationDialog
        open={withdrawing !== null}
        title={withdrawing?.occurrenceId === undefined ? 'Stop inheriting this series?' : 'Remove this date?'}
        message={`Your BaseShop will no longer see ${
          withdrawing?.occurrenceId === undefined ? 'any date of this training' : 'this date'
        }. ${occurrence.owner.name}’s training itself is not affected, and you can inherit it again later.`}
        confirmText="Remove"
        loading={inherit.isPending}
        onConfirm={withdraw}
        onClose={() => setWithdrawing(null)}
      />
    </>
  );
}
