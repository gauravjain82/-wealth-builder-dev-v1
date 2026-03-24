import { useEffect, useState } from 'react';
import type { Prospect } from '../../services/prospect-service';

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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-[760px] rounded-2xl border border-white/15 bg-[#1e2431] p-5 text-white shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
          <h3 className="text-lg font-semibold">Call Logs: {prospect.full_name || prospect.email}</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-lg border border-white/20 bg-white/5 text-xl leading-none hover:bg-white/10"
            aria-label="Close"
          >
            x
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            className="h-10 min-w-[160px] rounded-lg border border-white/20 bg-white/5 px-3 text-sm"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
          >
            {callOutcomes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <input
            type="text"
            className="h-10 flex-1 rounded-lg border border-white/20 bg-white/5 px-3 text-sm"
            placeholder="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            type="button"
            onClick={() => onSave(outcome, note)}
            disabled={saving}
            className="h-10 rounded-lg border border-[#b59a0a] bg-[#8f7a08] px-4 text-sm font-semibold text-[#ffea6b] hover:bg-[#a0880a] disabled:opacity-60"
          >
            {saving ? 'SAVING...' : 'SAVE'}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {!hideRestrictedActions && (
              <button
                type="button"
                onClick={() => onInvite(prospect)}
                className="rounded-lg border border-[#b59a0a] bg-[#3b3524] px-3 py-2 text-xs font-semibold tracking-wide text-[#ffdd45] hover:bg-[#4a422b]"
              >
                INVITE
              </button>
            )}
            <button
              type="button"
              onClick={() => onRequestTrainer(prospect)}
              className="rounded-lg border border-[#b59a0a] bg-[#3b3524] px-3 py-2 text-xs font-semibold tracking-wide text-[#ffdd45] hover:bg-[#4a422b]"
            >
              REQUEST TRAINER
            </button>
            <button
              type="button"
              onClick={() => onAddAppointment(prospect)}
              className="rounded-lg border border-[#b59a0a] bg-[#3b3524] px-3 py-2 text-xs font-semibold tracking-wide text-[#ffdd45] hover:bg-[#4a422b]"
            >
              ADD APPOINTMENT
            </button>
            {!hideRestrictedActions && (
              <button
                type="button"
                onClick={() => onAddProduction(prospect)}
                className="rounded-lg border border-[#b59a0a] bg-[#3b3524] px-3 py-2 text-xs font-semibold tracking-wide text-[#ffdd45] hover:bg-[#4a422b]"
              >
                ADD PRODUCTION
              </button>
            )}
            {!hideRestrictedActions && !hideAddAgencyCode && (
              <button
                type="button"
                onClick={() => onAddAgencyCode(prospect)}
                className="rounded-lg border border-[#b59a0a] bg-[#3b3524] px-3 py-2 text-xs font-semibold tracking-wide text-[#ffdd45] hover:bg-[#4a422b]"
              >
                ADD AGENCY CODE
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/30 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
