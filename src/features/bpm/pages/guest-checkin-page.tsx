import { useCallback, useEffect, useState } from 'react';
import { LoadingState } from '@shared/components';
import { useToastStore } from '@/store';
import { BPMCard, BPMPageShell } from '../components/bpm-page-shell';
import { BPMOccurrencePicker } from '../components/bpm-occurrence-picker';
import { GuestList } from '../components/guest-list';
import { bpmService } from '../services/bpm-service';
import type { BPMGuest, BPMOccurrence } from '../types';

export default function GuestCheckinPage() {
  const addToast = useToastStore((state) => state.addToast);
  const [occurrence, setOccurrence] = useState<BPMOccurrence | null>(null);
  const [guests, setGuests] = useState<BPMGuest[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (occurrenceId: number) => {
      setLoading(true);
      try {
        setGuests(await bpmService.guests(occurrenceId));
      } catch (error) {
        addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load guests' });
      } finally {
        setLoading(false);
      }
    },
    [addToast],
  );

  useEffect(() => {
    if (occurrence) void load(occurrence.id);
    else setGuests([]);
  }, [occurrence, load]);

  const toggleCheckIn = async (guest: BPMGuest) => {
    if (!occurrence) return;
    setBusy(true);
    try {
      if (guest.checked_in_at) {
        await bpmService.undoCheckInGuest(guest.occurrence, guest.id);
        addToast({ type: 'success', message: 'Check-in undone.' });
      } else {
        await bpmService.checkInGuest(guest.occurrence, guest.id);
        addToast({ type: 'success', message: `${guest.prospect_detail?.name || 'Guest'} checked in.` });
      }
      await load(occurrence.id);
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Check-in failed' });
    } finally {
      setBusy(false);
    }
  };

  const checkedInCount = guests.filter((guest) => guest.checked_in_at).length;

  return (
    <BPMPageShell
      title="Guest Check-In"
      description="Check guests in as they arrive at the BPM."
    >
      <BPMCard className="mb-4">
        <BPMOccurrencePicker value={occurrence} onChange={setOccurrence} />
      </BPMCard>
      <BPMCard>
        {occurrence ? (
          <p className="mb-3 text-sm text-slate-500 dark:text-white/60">
            {checkedInCount} of {guests.length} checked in
          </p>
        ) : null}
        {loading ? (
          <LoadingState />
        ) : (
          <GuestList guests={guests} busy={busy} onToggleCheckIn={toggleCheckIn} />
        )}
      </BPMCard>
    </BPMPageShell>
  );
}
