import { useEffect, useState } from 'react';
import { Plan } from '@/core/types';
import {
  Button,
  DatePicker,
  Form,
  FormActions,
  FormRow,
  FormRowGroup,
  Input,
  Label,
  Modal,
  Select,
  UserAutocompleteDropdown,
} from '@/shared/components';
import { useToastStore } from '@/store';
import type { Level, Prospect } from '../services/prospect-service';
import { fetchLevels } from '../services/prospect-service';
import { defaultAddAgentForm, type AddAgentFormData } from '../types';

const US_STATES = [
  'AB', 'AK', 'AL', 'AR', 'AZ', 'BC', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'IA', 'ID', 'IL',
  'IN', 'KS', 'KY', 'LA', 'MA', 'MB', 'MD', 'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NB', 'NC', 'ND',
  'NE', 'NH', 'NJ', 'NL', 'NM', 'NS', 'NT', 'NU', 'NV', 'NY', 'OH', 'OK', 'ON', 'OR', 'PA', 'PE',
  'QC', 'RI', 'SC', 'SD', 'SK', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY', 'YT',
];

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
  const [levels, setLevels] = useState<Level[]>([]);
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    fetchLevels()
      .then(setLevels)
      .catch(() => {/* silently ignore — dropdown will remain empty */});
  }, []);

  useEffect(() => {
    if (!prospect) return;
    setForm((prev) => ({
      ...prev,
      agencyCode: prospect.agency_code || '',
      firstName: prospect.first_name || prospect.full_name?.split(' ')[0] || '',
      lastName: prospect.last_name || prospect.full_name?.split(' ').slice(1).join(' ') || '',
      dateOfBirth: prospect.profile?.birthday?.split('T')[0] || '',
      state: prospect.profile?.state || '',
      homeAddress: prospect.profile?.home_address || '',
      homeAddress2: prospect.profile?.home_address2 || '',
      homeCity: prospect.profile?.home_city || '',
      homeZip: prospect.profile?.home_zip || '',
      phone: prospect.phone || '',
      email: prospect.email || '',
      recruiter: prospect.recruited_by_name || '',
      recruiterId: prospect.recruited_by,
      leader: prospect.leader_name || '',
      leaderId: prospect.leader,
      level: prospect.level?.id ?? null,
    }));
  }, [prospect]);

  if (!prospect) return null;

  const updateField = <K extends keyof AddAgentFormData>(key: K, value: AddAgentFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.agencyCode.trim()) {
      addToast({ type: 'warning', message: 'Agency Code is required.' });
      return;
    }
    if (!form.state.trim()) {
      addToast({ type: 'warning', message: 'State Located is required.' });
      return;
    }
    if (!form.homeAddress.trim()) {
      addToast({ type: 'warning', message: 'Address is required.' });
      return;
    }
    if (!form.homeAddress2.trim()) {
      addToast({ type: 'warning', message: 'Address 2 is required.' });
      return;
    }
    if (!form.homeCity.trim()) {
      addToast({ type: 'warning', message: 'City is required.' });
      return;
    }
    if (!form.homeZip.trim()) {
      addToast({ type: 'warning', message: 'Zip is required.' });
      return;
    }
    if (!form.dateOfBirth.trim()) {
      addToast({ type: 'warning', message: 'Date of Birth is required.' });
      return;
    }
    await onSubmit(form);
  };

  const poloSizes = [
    '', 'Male XS', 'Male S', 'Male M', 'Male L', 'Male XL', 'Male 2XL', 'Male 3XL',
    'Female XS', 'Female S', 'Female M', 'Female L', 'Female XL', 'Female 2XL', 'Female 3XL',
  ];

  return (
    <Modal
      open={Boolean(prospect)}
      onClose={onClose}
      title="Add Agent"
      contentClassName="max-w-[760px] flex flex-col max-h-[90vh]"
    >
      <Form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid gap-4">
          <FormRowGroup>
            <FormRow>
              <Label variant="form">AMA Date*</Label>
              <DatePicker value={form.amaDate} onChange={(value) => updateField('amaDate', value)} />
            </FormRow>
            <FormRow>
              <Label variant="form">Date of Birth*</Label>
              <DatePicker
                value={form.dateOfBirth}
                onChange={(value) => updateField('dateOfBirth', value)}
                monthDayOnly
              />
            </FormRow>
          </FormRowGroup>

          <FormRowGroup>
            <FormRow>
              <Label variant="form">State Located*</Label>
              <Select value={form.state} onChange={(e) => updateField('state', e.target.value)}>
                <option value="">Select State</option>
                {US_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </Select>
            </FormRow>
            <FormRow>
              <Label variant="form">Zip*</Label>
              <Input
                variant="surface"
                value={form.homeZip}
                onChange={(e) => updateField('homeZip', e.target.value)}
                placeholder="Zip code"
              />
            </FormRow>
          </FormRowGroup>

          <FormRowGroup>
            <FormRow>
              <Label variant="form">Address*</Label>
              <Input
                variant="surface"
                value={form.homeAddress}
                onChange={(e) => updateField('homeAddress', e.target.value)}
                placeholder="Street address"
              />
            </FormRow>
            <FormRow>
              <Label variant="form">Address 2*</Label>
              <Input
                variant="surface"
                value={form.homeAddress2}
                onChange={(e) => updateField('homeAddress2', e.target.value)}
                placeholder="Apartment, suite, unit"
              />
            </FormRow>
          </FormRowGroup>

          <FormRow>
            <Label variant="form">City*</Label>
            <Input
              variant="surface"
              value={form.homeCity}
              onChange={(e) => updateField('homeCity', e.target.value)}
              placeholder="City"
            />
          </FormRow>

          <FormRowGroup>
            <FormRow>
              <Label variant="form">Agency Code*</Label>
              <Input variant="surface" value={form.agencyCode} onChange={(e) => updateField('agencyCode', e.target.value)} placeholder="Enter agency code" />
            </FormRow>
          </FormRowGroup>

          <FormRowGroup>
            <FormRow>
              <Label variant="form">First Name*</Label>
              <Input variant="surface" value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} />
            </FormRow>
            <FormRow>
              <Label variant="form">Last Name*</Label>
              <Input variant="surface" value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} />
            </FormRow>
          </FormRowGroup>

          <FormRowGroup>
            <FormRow>
              <Label variant="form">Phone*</Label>
              <Input variant="surface" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
            </FormRow>
            <FormRow>
              <Label variant="form">E-mail*</Label>
              <Input variant="surface" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
            </FormRow>
          </FormRowGroup>

          <FormRow>
            <Label variant="form">Poloshirt Size</Label>
            <Select value={form.poloSize} onChange={(e) => updateField('poloSize', e.target.value)}>
              {poloSizes.map((size) => (
                <option key={size || 'blank'} value={size}>{size || 'Select Size'}</option>
              ))}
            </Select>
          </FormRow>

          <FormRowGroup>
            <FormRow>
              <Label variant="form">Spouse Full Name</Label>
              <Input variant="surface" value={form.spouseName} onChange={(e) => updateField('spouseName', e.target.value)} placeholder="Spouse name" />
            </FormRow>
            <FormRow>
              <Label variant="form">Spouse Phone</Label>
              <Input variant="surface" value={form.spousePhone} onChange={(e) => updateField('spousePhone', e.target.value)} placeholder="(555) 555-5555" />
            </FormRow>
          </FormRowGroup>

          <FormRow>
            <Label variant="form">Spouse Poloshirt Size</Label>
            <Select value={form.spousePoloSize} onChange={(e) => updateField('spousePoloSize', e.target.value)}>
              {poloSizes.map((size) => (
                <option key={`sp-${size || 'blank'}`} value={size}>{size || 'Select Size'}</option>
              ))}
            </Select>
          </FormRow>

          <FormRowGroup>
            <FormRow>
              <Label variant="form">Recruiter*</Label>
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
            </FormRow>
            <FormRow>
              <Label variant="form">Leader/Trainer*</Label>
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
            </FormRow>
          </FormRowGroup>

          <FormRowGroup>
            <FormRow>
              <Label variant="form">Level*</Label>
              <Select
                value={form.level ?? ''}
                onChange={(e) => updateField('level', e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Select Level</option>
                {levels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    {lvl.name}
                  </option>
                ))}
              </Select>
            </FormRow>
            <FormRow>
              <Label variant="form">Plan*</Label>
              <Select value={form.plan} onChange={(e) => updateField('plan', e.target.value)}>
                {Object.values(Plan).map((plan) => (
                  <option key={plan} value={plan}>{plan}</option>
                ))}
              </Select>
            </FormRow>
          </FormRowGroup>

          </div>
        </div>

        <div className="mt-4 flex-shrink-0 border-t border-white/10 pt-4">
          <FormActions>
            <Button type="button" variant="outline" onClick={onClose}>CANCEL</Button>
            <Button type="submit" disabled={saving}>{saving ? 'SUBMITTING...' : 'SUBMIT'}</Button>
          </FormActions>
        </div>
      </Form>
    </Modal>
  );
}
