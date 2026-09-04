import { useCallback, useEffect, useState } from 'react';
import { Button, LoadingState } from '@shared/components';
import { useToastStore } from '@/store';
import { matchupService } from '@/features/matchup/services/matchup-service';
import type { AppointmentType } from '@/features/matchup/types';
import { BPMCard, BPMPageShell } from '../components/bpm-page-shell';
import { BPMOccurrencePicker } from '../components/bpm-occurrence-picker';
import { GuestList } from '../components/guest-list';
import { TransferGuestModal } from '../components/transfer-guest-modal';
import { FollowUpGuestModal } from '../components/follow-up-guest-modal';
import { InterestOptionsAdminModal } from '../components/interest-options-admin-modal';
import { bpmService } from '../services/bpm-service';
import { mergeGuest } from '../components/guest-notes';
import type { BPMCapabilities, BPMGuest, BPMInterestOption, BPMOccurrence, GuestOutcomeField } from '../types';

export default function ViewInvitesPage() {
  const addToast = useToastStore((state) => state.addToast);
  const [occurrence, setOccurrence] = useState<BPMOccurrence | null>(null);
  const [guests, setGuests] = useState<BPMGuest[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyGuestId, setBusyGuestId] = useState<number | null>(null);
  const [transferTarget, setTransferTarget] = useState<BPMGuest | null>(null);
  const [followUpTarget, setFollowUpTarget] = useState<BPMGuest | null>(null);
  const [manageOptionsOpen, setManageOptionsOpen] = useState(false);

  const [interestOptions, setInterestOptions] = useState<BPMInterestOption[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [capabilities, setCapabilities] = useState<BPMCapabilities | null>(null);

  const loadInterestOptions = useCallback(async () => {
    try {
      setInterestOptions(await bpmService.interestOptions({ ordering: 'sort_order' }));
    } catch {
      // Non-fatal: the follow-up form simply shows no options.
    }
  }, []);

  useEffect(() => {
    void loadInterestOptions();
    matchupService.appointmentTypes().then(setAppointmentTypes).catch(() => setAppointmentTypes([]));
    bpmService.capabilities().then(setCapabilities).catch(() => setCapabilities(null));
  }, [loadInterestOptions]);

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

  const patchGuest = (updated: BPMGuest) => setGuests((prev) => mergeGuest(prev, updated));

  const handleOutcome = async (guest: BPMGuest, field: GuestOutcomeField, value: boolean) => {
    const snapshot = guest;
    setGuests((prev) => mergeGuest(prev, { ...guest, [field]: value }));
    try {
      const updated = await bpmService.setGuestFlags(guest.occurrence, { guest_id: guest.id, [field]: value });
      patchGuest(updated);
    } catch (error) {
      patchGuest(snapshot);
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to update outcome' });
    }
  };

  const handleRemove = async (guest: BPMGuest) => {
    setBusyGuestId(guest.id);
    try {
      await bpmService.removeGuest(guest.occurrence, guest.id);
      setGuests((prev) => prev.filter((row) => row.id !== guest.id));
      addToast({ type: 'success', message: 'Guest removed.' });
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Action failed' });
    } finally {
      setBusyGuestId(null);
    }
  };

  const handleFollowUpSaved = (updated: BPMGuest) => patchGuest(updated);

  return (
    <BPMPageShell
      title="View Invites"
      description="Guests invited to a BPM. Track follow-up outcomes, transfer, or remove."
      actions={
        capabilities?.can_manage_templates ? (
          <Button variant="outline" onClick={() => setManageOptionsOpen(true)}>
            Manage interest options
          </Button>
        ) : null
      }
    >
      <BPMCard className="mb-4">
        <BPMOccurrencePicker value={occurrence} onChange={setOccurrence} />
      </BPMCard>
      <BPMCard>
        {loading ? (
          <LoadingState />
        ) : (
          <GuestList
            guests={guests}
            busyGuestId={busyGuestId}
            onGuestUpdated={patchGuest}
            onSetOutcome={handleOutcome}
            onFollowUp={(guest) => setFollowUpTarget(guest)}
            onTransfer={(guest) => setTransferTarget(guest)}
            onRemove={handleRemove}
          />
        )}
      </BPMCard>
      <TransferGuestModal
        open={Boolean(transferTarget)}
        guest={transferTarget}
        onClose={() => setTransferTarget(null)}
        onTransferred={() => {
          if (transferTarget) {
            setGuests((prev) => prev.filter((guest) => guest.id !== transferTarget.id));
          }
        }}
      />
      <FollowUpGuestModal
        open={Boolean(followUpTarget)}
        guest={followUpTarget}
        interestOptions={interestOptions}
        appointmentTypes={appointmentTypes}
        onClose={() => setFollowUpTarget(null)}
        onSaved={handleFollowUpSaved}
      />
      <InterestOptionsAdminModal
        open={manageOptionsOpen}
        options={interestOptions}
        onClose={() => setManageOptionsOpen(false)}
        onChanged={loadInterestOptions}
      />
    </BPMPageShell>
  );
}
