import { useCallback, useEffect, useState } from 'react';
import { LoadingState } from '@shared/components';
import { useToastStore } from '@/store';
import { BPMCard, BPMPageShell } from '../components/bpm-page-shell';
import { BPMOccurrencePicker } from '../components/bpm-occurrence-picker';
import { GuestList } from '../components/guest-list';
import { TransferGuestModal } from '../components/transfer-guest-modal';
import { bpmService } from '../services/bpm-service';
import type { BPMGuest, BPMOccurrence, GuestOutcomeField } from '../types';

export default function ViewInvitesPage() {
  const addToast = useToastStore((state) => state.addToast);
  const [occurrence, setOccurrence] = useState<BPMOccurrence | null>(null);
  const [guests, setGuests] = useState<BPMGuest[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transferTarget, setTransferTarget] = useState<BPMGuest | null>(null);

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

  const runMutation = async (message: string, action: () => Promise<void>) => {
    if (!occurrence) return;
    setBusy(true);
    try {
      await action();
      addToast({ type: 'success', message });
      await load(occurrence.id);
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Action failed' });
    } finally {
      setBusy(false);
    }
  };

  const handleOutcome = (guest: BPMGuest, field: GuestOutcomeField, value: boolean) =>
    runMutation('Outcome saved.', () =>
      bpmService.setGuestFlags(guest.occurrence, { guest_id: guest.id, [field]: value }).then(() => undefined),
    );

  const handleRemove = (guest: BPMGuest) =>
    runMutation('Guest removed.', () => bpmService.removeGuest(guest.occurrence, guest.id).then(() => undefined));

  return (
    <BPMPageShell title="View Invites" description="Guests invited to a BPM. Track follow-up outcomes, transfer, or remove.">
      <BPMCard className="mb-4">
        <BPMOccurrencePicker value={occurrence} onChange={setOccurrence} />
      </BPMCard>
      <BPMCard>
        {loading ? (
          <LoadingState />
        ) : (
          <GuestList
            guests={guests}
            busy={busy}
            onSetOutcome={handleOutcome}
            onTransfer={(guest) => setTransferTarget(guest)}
            onRemove={handleRemove}
          />
        )}
      </BPMCard>
      <TransferGuestModal
        open={Boolean(transferTarget)}
        guest={transferTarget}
        onClose={() => setTransferTarget(null)}
        onTransferred={() => occurrence && load(occurrence.id)}
      />
    </BPMPageShell>
  );
}
