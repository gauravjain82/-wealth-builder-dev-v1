import { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  DatePicker,
  Form,
  FormActions,
  FormRow,
  FormRowGroup,
  Input,
  Label,
  Modal,
  Select,
  Textarea,
  UserAutocompleteDropdown,
} from '@/shared/components';
import { useToastStore } from '@/store';
import { defaultAddProspectForm, type AddProspectFormData } from '../types';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS',
  'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY',
  'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV',
  'WI', 'WY',
];

const GENDERS = ['', 'Male', 'Female'];

const PROFILE_FLAGS: Array<{ key: keyof AddProspectFormData; label: string }> = [
  { key: 'age25Plus', label: '25+ Y.O' },
  { key: 'homeowner', label: 'Homeowner' },
  { key: 'solidCareer', label: 'Solid Career Background' },
  { key: 'income75kPlus', label: '$75k+ Income' },
  { key: 'dissatisfied', label: 'Dissatisfied' },
  { key: 'entrepreneurial', label: 'Entrepreneurial' },
  { key: 'spanishPreferred', label: 'Spanish Speaking Preferred' },
  { key: 'married', label: 'Married' },
  { key: 'dependentKids', label: 'Dependent Kids' },
];

interface AddProspectModalProps {
  open: boolean;
  saving: boolean;
  title?: string;
  submitLabel?: string;
  initialForm?: AddProspectFormData | null;
  onClose: () => void;
  onSubmit: (form: AddProspectFormData) => Promise<void>;
}

export function AddProspectModal({
  open,
  saving,
  title = 'Add Prospect',
  submitLabel = 'Save Prospect',
  initialForm,
  onClose,
  onSubmit,
}: AddProspectModalProps) {
  const [form, setForm] = useState<AddProspectFormData>(defaultAddProspectForm);
  const addToast = useToastStore((state) => state.addToast);

  const getDefaultRecruiter = () => {
    const rawUser = localStorage.getItem('authUser');
    const wbUserId = localStorage.getItem('wb.userId');

    let recruiterId: number | null = null;
    let recruiter = '';

    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        const parsedId = Number.parseInt(String(parsed?.id ?? ''), 10);
        if (Number.isFinite(parsedId)) recruiterId = parsedId;
        recruiter =
          parsed?.name ||
          parsed?.full_name ||
          `${parsed?.first_name || ''} ${parsed?.last_name || ''}`.trim() ||
          parsed?.email ||
          '';
      } catch {
        // Ignore malformed local storage and fallback to wb.userId.
      }
    }

    if (recruiterId == null && wbUserId) {
      const parsedId = Number.parseInt(String(wbUserId), 10);
      if (Number.isFinite(parsedId)) recruiterId = parsedId;
    }

    return { recruiter, recruiterId };
  };

  useEffect(() => {
    if (!open) {
      setForm(defaultAddProspectForm);
      return;
    }

    if (initialForm) {
      setForm(initialForm);
      return;
    }

    const defaultRecruiter = getDefaultRecruiter();
    setForm({
      ...defaultAddProspectForm,
      recruiter: defaultRecruiter.recruiter,
      recruiterId: defaultRecruiter.recruiterId,
    });
  }, [open, initialForm]);

  if (!open) return null;

  const updateField = <K extends keyof AddProspectFormData>(
    key: K,
    value: AddProspectFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      addToast({ type: 'warning', message: 'First name and last name are required.' });
      return;
    }

    if (!form.email.trim() && !form.phone.trim()) {
      addToast({ type: 'warning', message: 'Email or phone is required.' });
      return;
    }

    await onSubmit(form);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
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
              <Label variant="form">First Name*</Label>
              <Input
                variant="surface"
                value={form.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                placeholder="First name"
              />
            </FormRow>
            <FormRow>
              <Label variant="form">Last Name*</Label>
              <Input
                variant="surface"
                value={form.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                placeholder="Last name"
              />
            </FormRow>
          </FormRowGroup>

          <FormRowGroup>
            <FormRow>
              <Label variant="form">Email</Label>
              <Input
                type="email"
                variant="surface"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="email@example.com"
              />
            </FormRow>
            <FormRow>
              <Label variant="form">Phone</Label>
              <Input
                variant="surface"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="(555) 555-5555"
              />
            </FormRow>
            <FormRow>
              <Label variant="form">Gender</Label>
              <Select value={form.gender} onChange={(e) => updateField('gender', e.target.value)}>
                {GENDERS.map((gender) => (
                  <option key={gender || 'empty'} value={gender} className="text-black">
                    {gender || 'Select gender'}
                  </option>
                ))}
              </Select>
            </FormRow>
          </FormRowGroup>

          <FormRowGroup>
            <FormRow>
              <Label variant="form">State Located</Label>
              <Select value={form.state} onChange={(e) => updateField('state', e.target.value)}>
                <option value="" className="text-black">Select State</option>
                {US_STATES.map((state) => (
                  <option key={state} value={state} className="text-black">
                    {state}
                  </option>
                ))}
              </Select>
            </FormRow>
            <FormRow>
              <Label variant="form">Birthday</Label>
              <DatePicker
                value={form.birthday}
                onChange={(value) => updateField('birthday', value)}
              />
            </FormRow>
          </FormRowGroup>

          <FormRow>
            <Label variant="form" className="mb-2">Profile</Label>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {PROFILE_FLAGS.map((item) => (
                <label key={item.key} className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  <Checkbox
                    checked={Boolean(form[item.key])}
                    onChange={(e) => updateField(item.key, e.target.checked)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </FormRow>

          <FormRow>
            <Label variant="form">How do you know this person?</Label>
            <Input
              variant="surface"
              value={form.howKnown}
              onChange={(e) => updateField('howKnown', e.target.value)}
            />
          </FormRow>

          <FormRowGroup>
            <FormRow>
              <Label variant="form">Relationship (1-10)</Label>
              <Input
                type="number"
                min={1}
                max={10}
                variant="surface"
                value={form.relationship}
                onChange={(e) => updateField('relationship', e.target.value)}
              />
            </FormRow>
            <FormRow>
              <Label variant="form">Occupation</Label>
              <Input
                variant="surface"
                value={form.occupation}
                onChange={(e) => updateField('occupation', e.target.value)}
              />
            </FormRow>
          </FormRowGroup>

          <FormRow>
            <Label variant="form">What have you told this person about our company so far?</Label>
            <Textarea
              className="min-h-[92px]"
              value={form.whatTold}
              onChange={(e) => updateField('whatTold', e.target.value)}
            />
          </FormRow>

          <FormRowGroup>
            <FormRow>
              <Label variant="form">Recruiter</Label>
              <UserAutocompleteDropdown
                selectedId={form.recruiterId}
                selectedLabel={form.recruiter}
                placeholder="Select recruiter"
                fetchFromApi
                onSelect={(option) => {
                  updateField('recruiter', option.label);
                  updateField('recruiterId', option.id);
                }}
              />
            </FormRow>
            <FormRow>
              <Label variant="form">Leader</Label>
              <UserAutocompleteDropdown
                selectedId={form.leaderId}
                selectedLabel={form.leader}
                placeholder="Select leader"
                fetchFromApi
                onSelect={(option) => {
                  updateField('leader', option.label);
                  updateField('leaderId', option.id);
                }}
              />
            </FormRow>
          </FormRowGroup>

          </div>
        </div>

        <div className="mt-4 flex-shrink-0 border-t border-white/10 pt-4">
          <FormActions>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : submitLabel}
            </Button>
          </FormActions>
        </div>
      </Form>
    </Modal>
  );
}
