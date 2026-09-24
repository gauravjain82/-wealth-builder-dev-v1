import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, LoadingState } from '@shared/components';
import { useToastStore } from '@/store';
import { matchupService } from '@/features/matchup/services/matchup-service';
import type { AppointmentType } from '@/features/matchup/types';
import { AddGuestModal } from '../components/add-guest-modal';
import { BPMCard, BPMPageShell } from '../components/bpm-page-shell';
import { BPMOccurrencePicker } from '../components/bpm-occurrence-picker';
import { useBpmSelection } from '../context/bpm-selection-context';
import { GuestList } from '../components/guest-list';
import { TransferGuestModal } from '../components/transfer-guest-modal';
import { FollowUpGuestModal } from '../components/follow-up-guest-modal';
import { InterestOptionsAdminModal } from '../components/interest-options-admin-modal';
import { bpmService } from '../services/bpm-service';
import { mergeGuest } from '../components/guest-notes';
import type { BPMCapabilities, BPMGuest, BPMInterestOption, GuestOutcomeField } from '../types';

export default function ViewInvitesPage() {
  const addToast = useToastStore((state) => state.addToast);
  // Sticky: the BPM/date chosen here follows the user to the other sub-tools.
  const { occurrence } = useBpmSelection();
  const [guests, setGuests] = useState<BPMGuest[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyGuestId, setBusyGuestId] = useState<number | null>(null);
  const [transferTarget, setTransferTarget] = useState<BPMGuest | null>(null);
  const [followUpTarget, setFollowUpTarget] = useState<BPMGuest | null>(null);
  const [manageOptionsOpen, setManageOptionsOpen] = useState(false);
  const [addGuestOpen, setAddGuestOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // The Overview / Schedule "Add Guest" action routes here with `&add=1` rather
  // than to a page of its own, so the guest is added in the context of the list
  // being worked from, with the BPM/date already chosen. Consume the flag so a
  // refresh does not reopen the modal.
  useEffect(() => {
    if (searchParams.get('add') !== '1') return;
    setAddGuestOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('add');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

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
      title="Guest Invites"
      description="Guests invited to a BPM. Track follow-up outcomes, transfer, or remove."
      actions={
        <>
          <Button disabled={!occurrence} onClick={() => setAddGuestOpen(true)}>
            + Add Guest
          </Button>
          {capabilities?.can_manage_templates ? (
            <Button variant="outline" onClick={() => setManageOptionsOpen(true)}>
              Manage interest options
            </Button>
          ) : null}
        </>
      }
    >
      <BPMCard className="mb-4">
        <BPMOccurrencePicker allowPast />
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
            followUpLabel="Blue card"
            editFollowUpLabel="Edit Blue card"
            followUpBadgeLabel="Blue card"
            onTransfer={(guest) => setTransferTarget(guest)}
            onRemove={handleRemove}
          />
        )}
      </BPMCard>
      <AddGuestModal
        open={addGuestOpen}
        presetOccurrence={occurrence}
        onClose={() => setAddGuestOpen(false)}
        onAdded={() => {
          if (occurrence) void load(occurrence.id);
        }}
      />
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
        heading="Blue card"
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
