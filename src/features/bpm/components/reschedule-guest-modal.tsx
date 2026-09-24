import { useEffect, useState } from 'react';
import { Button, Form, FormActions, FormRow, Label, Modal } from '@shared/components';
import { useToastStore } from '@/store';
import { bpmService } from '../services/bpm-service';
import type { BPMGuest, BPMOccurrence } from '../types';
import { BPMOccurrenceSelect } from './bpm-occurrence-picker';

interface RescheduleGuestModalProps {
  open: boolean;
  guest: BPMGuest | null;
  onClose: () => void;
  /** Receives the updated source row so the list can mark it without a refetch. */
  onRescheduled: (source: BPMGuest) => void;
}

/**
 * "Add Guest to Another Event" — move a guest forward to a different BPM date.
 *
 * Deliberately not the same thing as {@link TransferGuestModal}: a transfer
 * corrects a guest who was put on the wrong date and moves the row, whereas a
 * reschedule keeps the original invite visible (coloured as rescheduled) and
 * adds a second entry on the new date. Same picker, different outcome — hence
 * the separate modal rather than a flag on the transfer one.
 */
export function RescheduleGuestModal({
  open,
  guest,
  onClose,
  onRescheduled,
}: RescheduleGuestModalProps) {
  const addToast = useToastStore((state) => state.addToast);
  const [destination, setDestination] = useState<BPMOccurrence | null>(null);
  const [saving, setSaving] = useState(false);

  // Clear the destination each time the modal opens so a previous guest's
  // choice can never be applied to the next one.
  useEffect(() => {
    if (open) setDestination(null);
  }, [open]);

  const submit = async () => {
    if (!guest || !destination) {
      addToast({ type: 'error', message: 'Pick the BPM and date to move them to.' });
      return;
    }
    setSaving(true);
    try {
      const { guest: source } = await bpmService.rescheduleGuest(guest.occurrence, {
        guest_id: guest.id,
        to_occurrence_id: destination.id,
      });
      addToast({ type: 'success', message: 'Guest rescheduled.' });
      onRescheduled(source);
      onClose();
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to reschedule guest',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Add Guest to Another Event"
      onClose={onClose}
      contentClassName="max-w-[640px]"
    >
      <Form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <p className="text-sm text-slate-600 dark:text-white/70">
          Add <strong>{guest?.prospect_detail?.name || 'this guest'}</strong> to another
          BPM date. They stay on this one, marked as rescheduled.
        </p>
        <FormRow>
          <Label>BPM and date *</Label>
          {/* Standalone picker: choosing a destination here must not move the
              sticky selection the user is working from on the page behind. */}
          <BPMOccurrenceSelect
            value={destination}
            onChange={setDestination}
            excludeOccurrenceId={guest?.occurrence}
          />
        </FormRow>
        <FormActions>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !destination}>
            {saving ? 'Adding…' : 'Add Guest'}
          </Button>
        </FormActions>
      </Form>
    </Modal>
  );
}
