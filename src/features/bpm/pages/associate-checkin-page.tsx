import { useCallback, useEffect, useState } from 'react';
import { LoadingState, UserAutocompleteDropdown } from '@shared/components';
import { useToastStore } from '@/store';
import { BPMCard, BPMPageShell } from '../components/bpm-page-shell';
import { BPMOccurrencePicker } from '../components/bpm-occurrence-picker';
import { bpmService, formatOccurrenceTime } from '../services/bpm-service';
import type { AssociateCheckIn, BPMOccurrence } from '../types';

export default function AssociateCheckinPage() {
  const addToast = useToastStore((state) => state.addToast);
  const [occurrence, setOccurrence] = useState<BPMOccurrence | null>(null);
  const [records, setRecords] = useState<AssociateCheckIn[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (occurrenceId: number) => {
      setLoading(true);
      try {
        setRecords(await bpmService.associateCheckins(occurrenceId));
      } catch (error) {
        addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load check-ins' });
      } finally {
        setLoading(false);
      }
    },
    [addToast],
  );

  useEffect(() => {
    if (occurrence) void load(occurrence.id);
    else setRecords([]);
  }, [occurrence, load]);

  const checkIn = async (userId: number) => {
    if (!occurrence) return;
    setBusy(true);
    try {
      await bpmService.checkInAssociate(occurrence.id, userId);
      addToast({ type: 'success', message: 'Associate checked in.' });
      await load(occurrence.id);
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Check-in failed' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <BPMPageShell title="Associate Check-In" description="Record associate/member attendance at a BPM.">
      <BPMCard className="mb-4">
        <BPMOccurrencePicker value={occurrence} onChange={setOccurrence} />
      </BPMCard>
      <BPMCard className="mb-4">
        <label className="mb-2 block text-xs font-semibold text-slate-700 dark:text-white/80">
          Check in an associate
        </label>
        <UserAutocompleteDropdown
          selectedId={null}
          selectedLabel=""
          placeholder={occurrence ? 'Search associate' : 'Select a BPM first'}
          fetchFromApi
          disabled={!occurrence || busy}
          buttonText="CHECK IN"
          onSelect={(option) => void checkIn(option.id)}
        />
      </BPMCard>
      <BPMCard>
        {loading ? (
          <LoadingState />
        ) : records.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
            No associates checked in yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/10">
            {records.map((record) => (
              <li key={record.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-900 dark:text-white">{record.user_name || `User #${record.user}`}</span>
                <span className="text-xs text-slate-500 dark:text-white/60">
                  {formatOccurrenceTime(record.checked_in_at, { weekday: undefined })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </BPMCard>
    </BPMPageShell>
  );
}
