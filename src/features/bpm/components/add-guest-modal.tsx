import { useEffect, useState } from 'react';
import { Modal } from '@shared/components';
import { formatOccurrenceTime } from '../services/bpm-service';
import type { BPMOccurrence } from '../types';
import { AddGuestForm } from './add-guest-form';
import { BPMOccurrencePicker } from './bpm-occurrence-picker';

interface AddGuestModalProps {
  open: boolean;
  /** When set, the guest is added to this occurrence and the picker is hidden. */
  presetOccurrence?: BPMOccurrence | null;
  onClose: () => void;
  onAdded: () => void;
}

export function AddGuestModal({ open, presetOccurrence, onClose, onAdded }: AddGuestModalProps) {
  const [picked, setPicked] = useState<BPMOccurrence | null>(null);

  // Reset the picker each time the modal opens so a stale selection can't leak
  // between sessions; a preset occurrence wins when provided.
  useEffect(() => {
    if (open) setPicked(presetOccurrence ?? null);
  }, [open, presetOccurrence]);

  const occurrence = presetOccurrence ?? picked;

  return (
    <Modal open={open} title="Add Guest" onClose={onClose} contentClassName="max-w-2xl max-h-[90vh] overflow-y-auto">
      {presetOccurrence ? (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
          <span className="font-medium text-slate-900 dark:text-white">{presetOccurrence.event_name}</span>
          <span className="text-slate-500 dark:text-white/60"> · {formatOccurrenceTime(presetOccurrence.start_at)}</span>
        </div>
      ) : (
        <div className="mb-4">
          <BPMOccurrencePicker value={picked} onChange={setPicked} />
        </div>
      )}
      <AddGuestForm
        occurrence={occurrence}
        onAdded={() => {
          onAdded();
          onClose();
        }}
      />
    </Modal>
  );
}
