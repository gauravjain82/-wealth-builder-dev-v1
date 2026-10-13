import { ConfirmationDialog } from '@/shared/components';
import { useToastStore } from '@/store';

import { useDeletePreview, useDeleteTraining } from '../hooks/use-training-schedule';
import type { DeletePreview, TrainingTarget } from '../types';
import { Notice, mutedText } from './fields';

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

function blockedCopy(preview: DeletePreview): string {
  return preview.blocked_reason === 'delete_blocked_inherited'
    ? 'Other hosts have inherited this training, so it can’t be deleted until they remove it from their schedule.'
    : 'Completed trainings are kept on record, so there is nothing here you can delete.';
}

/** Spells out exactly what goes: dates, attendance, and whose BaseShops lose it. */
function PreviewBody({ preview }: { preview: DeletePreview }) {
  if (!preview.can_delete) {
    return (
      <div className="space-y-3">
        <Notice tone="warning">{blockedCopy(preview)}</Notice>
        {preview.inheritors.length ? <InheritorList preview={preview} /> : null}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-800 dark:text-white/90">
        <strong>{plural(preview.occurrence_count, 'date')}</strong> of “{preview.title}” will be deleted
        {preview.occurrence_count > 1
          ? ` — ${preview.upcoming_count} upcoming and ${preview.completed_count} already completed.`
          : '.'}
      </p>
      {preview.attendance_count > 0 ? (
        <Notice tone="danger">
          This also deletes <strong>{plural(preview.attendance_count, 'attendance record')}</strong> taken at{' '}
          {preview.occurrence_count === 1 ? 'this training' : 'these trainings'}.
        </Notice>
      ) : null}
      {preview.inheritors.length ? (
        <Notice tone="warning">
          <InheritorList preview={preview} />
        </Notice>
      ) : null}
      {preview.kept_completed_count > 0 ? (
        <p className={mutedText}>
          {plural(preview.kept_completed_count, 'completed date')} and{' '}
          {preview.kept_completed_count === 1 ? 'its' : 'their'} attendance will be kept on record.
        </p>
      ) : null}
      <p className={mutedText}>This can’t be undone from here.</p>
    </div>
  );
}

function InheritorList({ preview }: { preview: DeletePreview }) {
  return (
    <div>
      <p>
        {preview.can_delete ? 'It will also disappear for ' : 'Inherited by '}
        <strong>{plural(preview.inheritors.length, 'host')}</strong> who inherited it
        {preview.can_delete ? ', and for their BaseShops:' : ':'}
      </p>
      <ul className="mt-1 list-disc pl-5">
        {preview.inheritors.map((host) => (
          <li key={host.id}>{host.name}</li>
        ))}
      </ul>
    </div>
  );
}

interface DeleteTrainingDialogProps {
  /** The series or single date to delete; null closes the dialog. */
  target: TrainingTarget | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteTrainingDialog({ target, onClose, onDeleted }: DeleteTrainingDialogProps) {
  const preview = useDeletePreview(target);
  const remove = useDeleteTraining();
  const addToast = useToastStore((state) => state.addToast);
  if (!target) return null;

  const data = preview.data;
  const single = target.occurrenceId !== undefined;

  const confirm = async () => {
    if (!data) return;
    try {
      await remove.mutateAsync({ target, expectedCount: data.occurrence_count });
      addToast({
        type: 'success',
        message: `${plural(data.occurrence_count, 'training date')} deleted.`,
      });
      onDeleted();
    } catch (failure) {
      addToast({
        type: 'error',
        message: failure instanceof Error ? failure.message : 'Could not delete the training.',
      });
      // The schedule moved under the dialog; show the host the current picture.
      void preview.refetch();
    }
  };

  return (
    <ConfirmationDialog
      open
      title={single ? 'Delete this date?' : 'Delete the whole series?'}
      message={
        preview.isLoading
          ? 'Checking what would be deleted…'
          : preview.isError
            ? 'Could not check what would be deleted. Close this and try again.'
            : ''
      }
      confirmText={data?.can_delete ? `Delete ${plural(data.occurrence_count, 'date')}` : 'Delete'}
      loading={remove.isPending}
      confirmDisabled={!data?.can_delete || preview.isFetching}
      onConfirm={confirm}
      onClose={onClose}
    >
      {data ? <PreviewBody preview={data} /> : null}
    </ConfirmationDialog>
  );
}
