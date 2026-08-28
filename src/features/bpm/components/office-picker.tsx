import { useCallback, useEffect, useState } from 'react';
import { Button, Select } from '@shared/components';
import { useToastStore } from '@/store';
import { bpmService } from '../services/bpm-service';
import type { Office } from '../types';
import { OfficeFormModal } from './office-form-modal';

interface OfficePickerProps {
  value: number | null;
  onChange: (officeId: number | null) => void;
}

export function OfficePicker({ value, onChange }: OfficePickerProps) {
  const addToast = useToastStore((state) => state.addToast);
  const [offices, setOffices] = useState<Office[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await bpmService.offices();
      setOffices(data.results);
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load offices' });
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex items-center gap-2">
      <Select
        variant="surface"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
      >
        <option value="">Select an office</option>
        {offices.map((office) => (
          <option key={office.id} value={office.id}>
            {[office.name, office.city, office.state].filter(Boolean).join(' · ')}
          </option>
        ))}
      </Select>
      <Button type="button" variant="secondary" size="sm" onClick={() => setModalOpen(true)}>
        Add
      </Button>
      <OfficeFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(office) => {
          setOffices((prev) => [office, ...prev]);
          onChange(office.id);
        }}
      />
    </div>
  );
}
