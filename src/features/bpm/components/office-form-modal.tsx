import { useEffect, useState } from 'react';
import { Button, Form, FormActions, FormRow, FormRowGroup, Input, Label, LocationSelect, Modal, Select } from '@shared/components';
import { useToastStore } from '@/store';
import { bpmService } from '../services/bpm-service';
import type { Office, OfficeType } from '../types';

interface OfficeFormModalProps {
  open: boolean;
  /** When provided, the modal edits this office instead of creating a new one. */
  office?: Office | null;
  onClose: () => void;
  /** Called with the created or updated office after a successful save. */
  onSaved: (office: Office) => void;
}

interface OfficeForm {
  name: string;
  office_type: OfficeType;
  host_name: string;
  phone_number: string;
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
  host_name: '',
  phone_number: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  country: 'United States',
  latitude: '',
  longitude: '',
};

const toForm = (office: Office): OfficeForm => ({
  name: office.name ?? '',
  office_type: office.office_type,
  host_name: office.host_name ?? '',
  phone_number: office.phone_number ?? '',
  address: office.address ?? '',
  city: office.city ?? '',
  state: office.state ?? '',
  zip_code: office.zip_code ?? '',
  country: office.country || 'United States',
  latitude: office.latitude ?? '',
  longitude: office.longitude ?? '',
});

export function OfficeFormModal({ open, office, onClose, onSaved }: OfficeFormModalProps) {
  const addToast = useToastStore((state) => state.addToast);
  const isEdit = Boolean(office);
  const [form, setForm] = useState<OfficeForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(office ? toForm(office) : emptyForm);
  }, [open, office]);

  const update = <K extends keyof OfficeForm>(key: K, value: OfficeForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!form.country.trim() || !form.state.trim() || !form.city.trim()) {
      addToast({ type: 'error', message: 'Country, state, and city are required.' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        office_type: form.office_type,
        host_name: form.host_name,
        phone_number: form.phone_number,
        address: form.address,
        city: form.city,
        state: form.state,
        zip_code: form.zip_code,
        country: form.country,
        latitude: form.latitude || null,
        longitude: form.longitude || null,
      };
      const saved = office
        ? await bpmService.updateOffice(office.id, payload)
        : await bpmService.createOffice(payload);
      addToast({ type: 'success', message: isEdit ? 'Office updated.' : 'Office added.' });
      onSaved(saved);
      setForm(emptyForm);
      onClose();
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : `Failed to ${isEdit ? 'update' : 'add'} office`,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={isEdit ? 'Edit Office' : 'Add Office'} onClose={onClose} contentClassName="max-w-[640px]">
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
        <FormRowGroup>
          <FormRow>
            <Label>Host name</Label>
            <Input variant="surface" value={form.host_name} onChange={(e) => update('host_name', e.target.value)} placeholder="Jane Doe" />
          </FormRow>
          <FormRow>
            <Label>Phone number</Label>
            <Input variant="surface" type="tel" value={form.phone_number} onChange={(e) => update('phone_number', e.target.value)} placeholder="+1 555 123 4567" />
          </FormRow>
        </FormRowGroup>
        <FormRow>
          <Label>Address</Label>
          <Input variant="surface" value={form.address} onChange={(e) => update('address', e.target.value)} />
        </FormRow>
        <FormRowGroup columns={3}>
          <LocationSelect
            country={form.country}
            state={form.state}
            city={form.city}
            onChange={(next) => setForm((prev) => ({ ...prev, ...next }))}
            onCoordinates={(latitude, longitude) => setForm((prev) => ({ ...prev, latitude, longitude }))}
          />
        </FormRowGroup>
        <FormRowGroup columns={3}>
          <FormRow>
            <Label>ZIP</Label>
            <Input variant="surface" value={form.zip_code} onChange={(e) => update('zip_code', e.target.value)} />
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
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Office'}
          </Button>
        </FormActions>
      </Form>
    </Modal>
  );
}
