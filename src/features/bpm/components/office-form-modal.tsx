import { useState } from 'react';
import { Button, Form, FormActions, FormRow, FormRowGroup, Input, Label, Modal, Select } from '@shared/components';
import { useToastStore } from '@/store';
import { bpmService } from '../services/bpm-service';
import type { Office, OfficeType } from '../types';

interface OfficeFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (office: Office) => void;
}

interface OfficeForm {
  name: string;
  office_type: OfficeType;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  latitude: string;
  longitude: string;
}

const emptyForm: OfficeForm = {
  name: '',
  office_type: 'PERMANENT',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  country: 'USA',
  latitude: '',
  longitude: '',
};

export function OfficeFormModal({ open, onClose, onCreated }: OfficeFormModalProps) {
  const addToast = useToastStore((state) => state.addToast);
  const [form, setForm] = useState<OfficeForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof OfficeForm>(key: K, value: OfficeForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!form.city.trim() || !form.state.trim()) {
      addToast({ type: 'error', message: 'City and state are required.' });
      return;
    }
    setSaving(true);
    try {
      const office = await bpmService.createOffice({
        name: form.name,
        office_type: form.office_type,
        address: form.address,
        city: form.city,
        state: form.state,
        zip_code: form.zip_code,
        country: form.country,
        latitude: form.latitude || null,
        longitude: form.longitude || null,
      });
      addToast({ type: 'success', message: 'Office added.' });
      onCreated(office);
      setForm(emptyForm);
      onClose();
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to add office' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Add Office" onClose={onClose} contentClassName="max-w-[640px]">
      <Form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <FormRowGroup>
          <FormRow>
            <Label>Office name</Label>
            <Input variant="surface" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Downtown office" />
          </FormRow>
          <FormRow>
            <Label>Type</Label>
            <Select variant="surface" value={form.office_type} onChange={(e) => update('office_type', e.target.value as OfficeType)}>
              <option value="PERMANENT">Permanent office</option>
              <option value="TEMPORARY">Temporary</option>
            </Select>
          </FormRow>
        </FormRowGroup>
        <FormRow>
          <Label>Address</Label>
          <Input variant="surface" value={form.address} onChange={(e) => update('address', e.target.value)} />
        </FormRow>
        <FormRowGroup columns={3}>
          <FormRow>
            <Label>City *</Label>
            <Input variant="surface" value={form.city} onChange={(e) => update('city', e.target.value)} />
          </FormRow>
          <FormRow>
            <Label>State *</Label>
            <Input variant="surface" value={form.state} onChange={(e) => update('state', e.target.value)} />
          </FormRow>
          <FormRow>
            <Label>ZIP</Label>
            <Input variant="surface" value={form.zip_code} onChange={(e) => update('zip_code', e.target.value)} />
          </FormRow>
        </FormRowGroup>
        <FormRowGroup columns={3}>
          <FormRow>
            <Label>Country</Label>
            <Input variant="surface" value={form.country} onChange={(e) => update('country', e.target.value)} />
          </FormRow>
          <FormRow>
            <Label>Latitude</Label>
            <Input variant="surface" value={form.latitude} onChange={(e) => update('latitude', e.target.value)} placeholder="32.7767" />
          </FormRow>
          <FormRow>
            <Label>Longitude</Label>
            <Input variant="surface" value={form.longitude} onChange={(e) => update('longitude', e.target.value)} placeholder="-96.7970" />
          </FormRow>
        </FormRowGroup>
        <FormActions>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Add Office'}
          </Button>
        </FormActions>
      </Form>
    </Modal>
  );
}
