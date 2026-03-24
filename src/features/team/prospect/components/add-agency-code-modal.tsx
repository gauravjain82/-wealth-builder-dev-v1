import { useEffect, useState } from 'react';
import { Plan } from '@/core/types';
import { LEVEL_OPTIONS, LevelCode } from '@/core/constants/levels';
import { UserAutocompleteDropdown } from '@/shared/components';
import type { Prospect } from '../../services/prospect-service';
import { defaultAddAgentForm, type AddAgentFormData } from '../types';

interface AddAgencyCodeModalProps {
  prospect: Prospect | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (form: AddAgentFormData) => Promise<void>;
}

export function AddAgencyCodeModal({
  prospect,
  saving,
  onClose,
  onSubmit,
}: AddAgencyCodeModalProps) {
  const [form, setForm] = useState<AddAgentFormData>(defaultAddAgentForm);

  useEffect(() => {
    if (!prospect) return;
    setForm((prev) => ({
      ...prev,
      agencyCode: prospect.agency_code || '',
      firstName: prospect.first_name || prospect.full_name?.split(' ')[0] || '',
      lastName: prospect.last_name || prospect.full_name?.split(' ').slice(1).join(' ') || '',
      phone: prospect.phone || '',
      email: prospect.email || '',
      recruiter: prospect.recruited_by_name || '',
      recruiterId: prospect.recruited_by,
      leader: prospect.leader_name || '',
      leaderId: prospect.leader,
    }));
  }, [prospect]);

  if (!prospect) return null;

  const updateField = <K extends keyof AddAgentFormData>(key: K, value: AddAgentFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.agencyCode.trim()) {
      window.alert('Agency Code is required');
      return;
    }
    await onSubmit(form);
  };

  const poloSizes = [
    '', 'Male XS', 'Male S', 'Male M', 'Male L', 'Male XL', 'Male 2XL', 'Male 3XL',
    'Female XS', 'Female S', 'Female M', 'Female L', 'Female XL', 'Female 2XL', 'Female 3XL',
  ];

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-[860px] rounded-2xl border border-white/15 bg-[#1e2431] p-6 text-white shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
          <h3 className="text-xl font-semibold">Add Agent</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-lg border border-white/20 bg-white/5 text-xl leading-none hover:bg-white/10"
            aria-label="Close"
          >
            x
          </button>
        </div>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">AMA Date*</label>
              <input className="h-11 w-full rounded-lg border border-white/20 bg-white/5 px-3" type="date" value={form.amaDate} onChange={(e) => updateField('amaDate', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Agency Code*</label>
              <input className="h-11 w-full rounded-lg border border-white/20 bg-white/5 px-3" value={form.agencyCode} onChange={(e) => updateField('agencyCode', e.target.value)} placeholder="Enter agency code" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">First Name*</label>
              <input className="h-11 w-full rounded-lg border border-white/20 bg-white/5 px-3" value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Last Name*</label>
              <input className="h-11 w-full rounded-lg border border-white/20 bg-white/5 px-3" value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">Phone*</label>
              <input className="h-11 w-full rounded-lg border border-white/20 bg-white/5 px-3" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">E-mail*</label>
              <input className="h-11 w-full rounded-lg border border-white/20 bg-white/5 px-3" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Poloshirt Size</label>
            <select className="h-11 w-full rounded-lg border border-white/20 bg-white/5 px-3" value={form.poloSize} onChange={(e) => updateField('poloSize', e.target.value)}>
              {poloSizes.map((size) => (
                <option key={size || 'blank'} value={size}>{size || 'Select Size'}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">Spouse Full Name</label>
              <input className="h-11 w-full rounded-lg border border-white/20 bg-white/5 px-3" value={form.spouseName} onChange={(e) => updateField('spouseName', e.target.value)} placeholder="Spouse name" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Spouse Phone</label>
              <input className="h-11 w-full rounded-lg border border-white/20 bg-white/5 px-3" value={form.spousePhone} onChange={(e) => updateField('spousePhone', e.target.value)} placeholder="(555) 555-5555" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Spouse Poloshirt Size</label>
            <select className="h-11 w-full rounded-lg border border-white/20 bg-white/5 px-3" value={form.spousePoloSize} onChange={(e) => updateField('spousePoloSize', e.target.value)}>
              {poloSizes.map((size) => (
                <option key={`sp-${size || 'blank'}`} value={size}>{size || 'Select Size'}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">Recruiter*</label>
              <UserAutocompleteDropdown
                selectedId={form.recruiterId}
                selectedLabel={form.recruiter}
                placeholder="Select recruiter..."
                disabled={saving}
                fetchFromApi
                onSelect={(option) => {
                  updateField('recruiterId', option.id);
                  updateField('recruiter', option.label);
                }}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Leader/Trainer*</label>
              <UserAutocompleteDropdown
                selectedId={form.leaderId}
                selectedLabel={form.leader}
                placeholder="Select leader..."
                disabled={saving}
                fetchFromApi
                // roleFilter={['LEADER', 'BROKER', 'SENIOR_BROKER']}
                onSelect={(option) => {
                  updateField('leaderId', option.id);
                  updateField('leader', option.label);
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">Level*</label>
              <select className="h-11 w-full rounded-lg border border-white/20 bg-white/5 px-3" value={form.level} onChange={(e) => updateField('level', e.target.value as LevelCode)}>
                {LEVEL_OPTIONS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Plan*</label>
              <select className="h-11 w-full rounded-lg border border-white/20 bg-white/5 px-3" value={form.plan} onChange={(e) => updateField('plan', e.target.value)}>
                {Object.values(Plan).map((plan) => (
                  <option key={plan} value={plan}>{plan}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-white/30 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">CANCEL</button>
            <button type="button" onClick={handleSubmit} disabled={saving} className="rounded-lg border border-[#b59a0a] bg-[#8f7a08] px-4 py-2 text-sm font-semibold text-[#ffea6b] hover:bg-[#a0880a] disabled:opacity-60">{saving ? 'SUBMITTING...' : 'SUBMIT'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
