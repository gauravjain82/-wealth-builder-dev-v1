import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, LoadingState } from '@shared/components';
import { useToastStore } from '@/store';
import { AppointmentFormModal } from '@/features/matchup/components/appointment-form-modal';
import { matchupService } from '@/features/matchup/services/matchup-service';
import type { AppointmentType } from '@/features/matchup/types';
import { AddGuestModal } from '../components/add-guest-modal';
import { BPMCard, BPMPageShell } from '../components/bpm-page-shell';
import { BPMOccurrencePicker } from '../components/bpm-occurrence-picker';
import { useBpmSelection } from '../context/bpm-selection-context';
import { GuestList } from '../components/guest-list';
import { RescheduleGuestModal } from '../components/reschedule-guest-modal';
import { SendEventModal } from '../components/send-event-modal';
import { GuestMessageHistoryModal } from '../components/guest-message-history';
import { TransferGuestModal } from '../components/transfer-guest-modal';
import { bpmService, findStepOneTypeId, formatOccurrenceTime } from '../services/bpm-service';
import { mergeGuest } from '../components/guest-notes';
import type { BPMGuest, GuestOutcomeField } from '../types';

export default function ViewInvitesPage() {
  const addToast = useToastStore((state) => state.addToast);
  // Sticky: the BPM/date chosen here follows the user to the other sub-tools.
  const { occurrence } = useBpmSelection();
  const [guests, setGuests] = useState<BPMGuest[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyGuestId, setBusyGuestId] = useState<number | null>(null);
  const [transferTarget, setTransferTarget] = useState<BPMGuest | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<BPMGuest | null>(null);
  // Who the sender has ticked to message. Ids, not guest objects, so a reload
  // of the list does not strand a selection against stale rows.
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sendOpen, setSendOpen] = useState(false);
  const [historyGuest, setHistoryGuest] = useState<BPMGuest | null>(null);
  const [appointmentTarget, setAppointmentTarget] = useState<BPMGuest | null>(null);
  const [savingAppointment, setSavingAppointment] = useState(false);
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

  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);

  useEffect(() => {
    matchupService.appointmentTypes().then(setAppointmentTypes).catch(() => setAppointmentTypes([]));
  }, []);

  const stepOneTypeId = useMemo(() => findStepOneTypeId(appointmentTypes), [appointmentTypes]);

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

  /** Optimistic toggle shared by the outcome checkboxes and Confirmed. */
  const setFlag = async (guest: BPMGuest, field: GuestOutcomeField | 'confirmed', value: boolean) => {
    const snapshot = guest;
    setGuests((prev) => mergeGuest(prev, { ...guest, [field]: value }));
    try {
      const updated = await bpmService.setGuestFlags(guest.occurrence, { guest_id: guest.id, [field]: value });
      patchGuest(updated);
    } catch (error) {
      patchGuest(snapshot);
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to update guest' });
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

  /**
   * Book the 1-on-1 through Match Up, then link it to the guest.
   *
   * The appointment is always created by the Match Up endpoint — BPM never grows
   * a second way to make one — so this is two calls, and a failure to link is
   * reported without discarding the appointment that was created.
   */
  const bookAppointment = async (payload: Parameters<typeof matchupService.createAppointment>[0]) => {
    const guest = appointmentTarget;
    if (!guest) return;
    setSavingAppointment(true);
    try {
      const created = await matchupService.createAppointment(payload);
      const updated = await bpmService.rescheduleGuestToAppointment(guest.occurrence, {
        guest_id: guest.id,
        appointment_id: created.id,
      });
      patchGuest(updated);
      setAppointmentTarget(null);
      addToast({ type: 'success', message: 'Appointment booked and linked.' });
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to book appointment' });
    } finally {
      setSavingAppointment(false);
    }
  };

  const appointmentInitialValues = useMemo(() => {
    if (!appointmentTarget) return null;
    const source = occurrence
      ? `Rescheduled from ${occurrence.event_name} · ${formatOccurrenceTime(occurrence.start_at)}`
      : 'Rescheduled from a BPM';
    return {
      kind: 'REQUEST_TRAINER' as const,
      contact: appointmentTarget.prospect,
      contactLabel: appointmentTarget.prospect_detail?.name ?? '',
      trainee: appointmentTarget.inviter,
      traineeLabel: appointmentTarget.inviter_name ?? '',
      types: stepOneTypeId ? [stepOneTypeId] : [],
      notes: source,
    };
  }, [appointmentTarget, occurrence, stepOneTypeId]);

  const toggleSelected = useCallback((guest: BPMGuest, value: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (value) next.add(guest.id);
      else next.delete(guest.id);
      return next;
    });
  }, []);

  /** Select-all covers the rows on screen, which is what the filters above mean. */
  const toggleSelectAll = useCallback(
    (value: boolean) => {
      setSelectedIds(value ? new Set(guests.map((guest) => guest.id)) : new Set());
    },
    [guests],
  );

  // Kept in sync with the loaded list: a guest transferred or removed elsewhere
  // must not stay silently ticked and then be messaged.
  const selectedGuests = useMemo(
    () => guests.filter((guest) => selectedIds.has(guest.id)),
    [guests, selectedIds],
  );

  /**
   * Who the send button targets.
   *
   * **Ticking nothing means everyone shown**, so chasing a whole list is one
   * click rather than select-all-then-send. Ticking narrows it. Either way the
   * modal lists exactly who is about to be written to, with what each of them has
   * already had, so "one click" opens a confirmation rather than sending.
   *
   * The server still requires explicit ids — there is no "send to everyone on
   * this date" shorthand it could be asked for by mistake.
   */
  const sendTargets = selectedGuests.length > 0 ? selectedGuests : guests;

  return (
    <BPMPageShell
      title="Guest Invites"
      description="Guests invited to a BPM. Confirm attendance, track follow-up outcomes, or move a guest to another event."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {sendTargets.length > 0 ? (
            <Button variant="outline" onClick={() => setSendOpen(true)}>
              {selectedGuests.length > 0
                ? `Send event to ${selectedGuests.length} selected`
                : `Send event to all ${sendTargets.length}`}
            </Button>
          ) : null}
          <Button disabled={!occurrence} onClick={() => setAddGuestOpen(true)}>
            + Add Guest
          </Button>
        </div>
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
            onSetConfirmed={(guest, value) => setFlag(guest, 'confirmed', value)}
            selectedIds={selectedIds}
            onToggleSelected={toggleSelected}
            onToggleSelectAll={toggleSelectAll}
            onOpenMessageHistory={setHistoryGuest}
            onSetOutcome={(guest, field, value) => setFlag(guest, field, value)}
            onReschedule={(guest) => setRescheduleTarget(guest)}
            onBookAppointment={(guest) => setAppointmentTarget(guest)}
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
      <SendEventModal
        open={sendOpen}
        occurrenceId={occurrence?.id ?? null}
        guests={sendTargets}
        onClose={() => setSendOpen(false)}
        onSent={() => {
          // Reload so the contact badges reflect what was just sent — the next
          // person looking at this list is who the history exists for.
          if (occurrence) void load(occurrence.id);
          setSelectedIds(new Set());
        }}
      />
      <GuestMessageHistoryModal
        open={Boolean(historyGuest)}
        occurrenceId={occurrence?.id ?? null}
        guest={historyGuest}
        onClose={() => setHistoryGuest(null)}
      />
      <RescheduleGuestModal
        open={Boolean(rescheduleTarget)}
        guest={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onRescheduled={(source) => patchGuest(source)}
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
      <AppointmentFormModal
        open={Boolean(appointmentTarget)}
        title="Reschedule to Appointment"
        initialValues={appointmentInitialValues}
        appointmentTypes={appointmentTypes}
        saving={savingAppointment}
        onClose={() => setAppointmentTarget(null)}
        onSubmit={bookAppointment}
      />
    </BPMPageShell>
  );
}
