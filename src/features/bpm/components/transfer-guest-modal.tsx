import { useState } from 'react';
import { Button, Form, FormActions, FormRow, Label, Modal, Textarea } from '@shared/components';
import { useToastStore } from '@/store';
import { bpmService } from '../services/bpm-service';
import type { BPMGuest, BPMOccurrence } from '../types';
import { BPMOccurrencePicker } from './bpm-occurrence-picker';

interface TransferGuestModalProps {
  open: boolean;
  guest: BPMGuest | null;
  onClose: () => void;
  onTransferred: () => void;
}

export function TransferGuestModal({ open, guest, onClose, onTransferred }: TransferGuestModalProps) {
  const addToast = useToastStore((state) => state.addToast);
  const [destination, setDestination] = useState<BPMOccurrence | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!guest || !destination) {
      addToast({ type: 'error', message: 'Pick a destination BPM date.' });
      return;
    }
    setSaving(true);
    try {
      await bpmService.transferGuest(guest.occurrence, {
        guest_id: guest.id,
        to_occurrence_id: destination.id,
        reason,
      });
      addToast({ type: 'success', message: 'Guest transferred.' });
      setDestination(null);
      setReason('');
      onTransferred();
      onClose();
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to transfer guest' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Transfer guest" onClose={onClose} contentClassName="max-w-[640px]">
      <Form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <p className="text-sm text-slate-600 dark:text-white/70">
          Move <strong>{guest?.prospect_detail?.name || 'this guest'}</strong> to another BPM occurrence.
        </p>
        <FormRow>
          <Label>Destination BPM</Label>
          <BPMOccurrencePicker
            value={destination}
            onChange={setDestination}
            excludeOccurrenceId={guest?.occurrence}
          />
        </FormRow>
        <FormRow>
          <Label>Reason (optional)</Label>
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} />
        </FormRow>
        <FormActions>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Transferring…' : 'Transfer'}
          </Button>
        </FormActions>
      </Form>
    </Modal>
  );
}
