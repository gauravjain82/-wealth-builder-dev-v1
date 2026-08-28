import { useState } from 'react';
import {
  Button,
  Form,
  FormActions,
  FormRow,
  FormRowGroup,
  Input,
  Label,
  Textarea,
  UserAutocompleteDropdown,
} from '@shared/components';
import { useToastStore } from '@/store';
import { bpmService } from '../services/bpm-service';
import type { BPMOccurrence } from '../types';

interface AddGuestFormProps {
  occurrence: BPMOccurrence | null;
  onAdded: () => void;
}

interface GuestForm {
  guest_name: string;
  phone: string;
  email: string;
  inviterId: number | null;
  inviterLabel: string;
  country: string;
  state: string;
  notes: string;
}

function defaultForm(): GuestForm {
  const storedId = localStorage.getItem('wb.userId');
  return {
    guest_name: '',
    phone: '',
    email: '',
    inviterId: storedId ? Number(storedId) : null,
    inviterLabel: localStorage.getItem('wb.name') || '',
    country: 'USA',
    state: '',
    notes: '',
  };
}

export function AddGuestForm({ occurrence, onAdded }: AddGuestFormProps) {
  const addToast = useToastStore((state) => state.addToast);
  const [form, setForm] = useState<GuestForm>(defaultForm);
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof GuestForm>(key: K, value: GuestForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!occurrence) {
      addToast({ type: 'error', message: 'Select a BPM and date first.' });
      return;
    }
    if (!form.guest_name.trim()) {
      addToast({ type: 'error', message: 'Guest name is required.' });
      return;
    }
    setSaving(true);
    try {
      await bpmService.addGuest(occurrence.id, {
        guest_name: form.guest_name,
        phone: form.phone,
        email: form.email,
        inviter: form.inviterId,
        country: form.country,
        state: form.state,
        notes: form.notes,
      });
      addToast({ type: 'success', message: 'Guest added.' });
      setForm(defaultForm());
      onAdded();
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to add guest' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <FormRowGroup>
        <FormRow>
          <Label>Guest Name *</Label>
          <Input variant="surface" value={form.guest_name} onChange={(e) => update('guest_name', e.target.value)} />
        </FormRow>
        <FormRow>
          <Label>Phone</Label>
          <Input variant="surface" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </FormRow>
      </FormRowGroup>
      <FormRowGroup>
        <FormRow>
          <Label>Email</Label>
          <Input type="email" variant="surface" value={form.email} onChange={(e) => update('email', e.target.value)} />
        </FormRow>
        <FormRow>
          <Label>Inviter</Label>
          <UserAutocompleteDropdown
            selectedId={form.inviterId}
            selectedLabel={form.inviterLabel}
            placeholder="Select inviter"
            fetchFromApi
            onSelect={(option) =>
              setForm((prev) => ({ ...prev, inviterId: option.id, inviterLabel: option.label }))
            }
          />
        </FormRow>
      </FormRowGroup>
      <FormRowGroup>
        <FormRow>
          <Label>Country</Label>
          <Input variant="surface" value={form.country} onChange={(e) => update('country', e.target.value)} />
        </FormRow>
        <FormRow>
          <Label>State</Label>
          <Input variant="surface" value={form.state} onChange={(e) => update('state', e.target.value)} />
        </FormRow>
      </FormRowGroup>
      <FormRow>
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={3} />
      </FormRow>
      <FormActions>
        <Button type="submit" disabled={saving || !occurrence}>
          {saving ? 'Adding…' : 'Add Guest'}
        </Button>
      </FormActions>
    </Form>
  );
}
