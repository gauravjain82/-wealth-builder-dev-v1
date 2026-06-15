import { useEffect, useState } from 'react';
import { Button, Input, Modal, Select } from '@/shared/components';
import type { Prospect } from '../services/prospect-service';

interface CallLogModalProps {
  prospect: Prospect | null;
  saving: boolean;
  hideRestrictedActions?: boolean;
  hideAddAgencyCode?: boolean;
  onClose: () => void;
  onSave: (outcome: string, note: string) => Promise<void>;
  onInvite: (prospect: Prospect) => void;
  onAddAgencyCode: (prospect: Prospect) => Promise<void>;
  onRequestTrainer: (prospect: Prospect) => Promise<void>;
  onAddAppointment: (prospect: Prospect) => Promise<void>;
  onAddProduction: (prospect: Prospect) => Promise<void>;
}

export function CallLogModal({
  prospect,
  saving,
  hideRestrictedActions = false,
  hideAddAgencyCode = false,
  onClose,
  onSave,
  onInvite,
  onAddAgencyCode,
  onRequestTrainer,
  onAddAppointment,
  onAddProduction,
}: CallLogModalProps) {
  const [outcome, setOutcome] = useState('Left Message');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!prospect) return;
    setOutcome('Left Message');
    setNote('');
  }, [prospect]);

  if (!prospect) return null;

  const callOutcomes = ['Left Message', 'Connected', 'No Answer', 'Wrong Number', 'Follow-up Scheduled'];

  return (
    <Modal
      open={Boolean(prospect)}
      onClose={onClose}
      title={`Call Logs: ${prospect.full_name || prospect.email}`}
      contentClassName="max-w-[760px] p-5"
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
          <Select
            className="h-10 min-w-[160px] rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-white/20 dark:bg-white/5 dark:text-white"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
          >
            {callOutcomes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Input
            type="text"
            className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-500 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder:text-white/50"
            placeholder="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            type="button"
            onClick={() => onSave(outcome, note)}
            disabled={saving}
            className="h-10"
          >
            {saving ? 'SAVING...' : 'SAVE'}
          </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
            {!hideRestrictedActions && (
              <Button
                type="button"
                onClick={() => onInvite(prospect)}
                disabled={saving}
                variant="outline"
                className="rounded-lg border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold tracking-wide text-amber-700 hover:bg-amber-100 dark:border-[#b59a0a] dark:bg-[#3b3524] dark:text-[#ffdd45] dark:hover:bg-[#4a422b]"
              >
                INVITE
              </Button>
            )}
            <Button
              type="button"
              onClick={() => onRequestTrainer(prospect)}
              variant="outline"
              className="rounded-lg border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold tracking-wide text-amber-700 hover:bg-amber-100 dark:border-[#b59a0a] dark:bg-[#3b3524] dark:text-[#ffdd45] dark:hover:bg-[#4a422b]"
            >
              REQUEST TRAINER
            </Button>
            <Button
              type="button"
              onClick={() => onAddAppointment(prospect)}
              variant="outline"
              className="rounded-lg border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold tracking-wide text-amber-700 hover:bg-amber-100 dark:border-[#b59a0a] dark:bg-[#3b3524] dark:text-[#ffdd45] dark:hover:bg-[#4a422b]"
            >
              ADD APPOINTMENT
            </Button>
            {!hideRestrictedActions && (
              <Button
                type="button"
                onClick={() => onAddProduction(prospect)}
                variant="outline"
                className="rounded-lg border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold tracking-wide text-amber-700 hover:bg-amber-100 dark:border-[#b59a0a] dark:bg-[#3b3524] dark:text-[#ffdd45] dark:hover:bg-[#4a422b]"
              >
                ADD PRODUCTION
              </Button>
            )}
            {!hideRestrictedActions && !hideAddAgencyCode && (
              <Button
                type="button"
                onClick={() => onAddAgencyCode(prospect)}
                variant="outline"
                className="rounded-lg border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold tracking-wide text-amber-700 hover:bg-amber-100 dark:border-[#b59a0a] dark:bg-[#3b3524] dark:text-[#ffdd45] dark:hover:bg-[#4a422b]"
              >
                ADD AGENCY CODE
              </Button>
            )}
        </div>

        <Button type="button" variant="outline" onClick={onClose}>
          CLOSE
        </Button>
      </div>
    </Modal>
  );
}
