import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button, Input, Modal, Select, Textarea } from '@shared/components/ui';
import { UserAutocompleteDropdown, type UserAutocompleteOption } from '@shared/components/user-autocomplete-dropdown';
import { browserTimezone, localDateTimeValue } from '../services/matchup-service';
import { fetchProspectDetails, updateProspectDetails } from '@/features/team/prospect/services/prospect-service';
import type { Prospect } from '@/features/team/prospect/services/prospect-service';
import { createTrackerNote } from '@/features/team/services/tracker-notes-service';
import type {
  AppointmentDetail,
  AppointmentListItem,
  AppointmentType,
  CreateAppointmentPayload,
  LocationType,
} from '../types';

type AppointmentFormAppointment = AppointmentListItem | AppointmentDetail;

const browserSupportedTimezones = (): string[] => {
  const intl = Intl as typeof Intl & {
    supportedValuesOf?: (key: 'timeZone') => string[];
  };

  try {
    return intl.supportedValuesOf?.('timeZone') ?? [];
  } catch {
    return [];
  }
};

const SUPPORTED_TIMEZONES = browserSupportedTimezones();

const PROFILE_FLAGS = [
  ['age25Plus', '25+ Y.O'],
  ['homeowner', 'Homeowner'],
  ['solidCareer', 'Solid Career Background'],
  ['income75kPlus', '$75k+ Income'],
  ['dissatisfied', 'Dissatisfied'],
  ['entrepreneurial', 'Entrepreneurial'],
  ['spanishPreferred', 'Spanish Speaking Preferred'],
  ['married', 'Married'],
  ['dependentKids', 'Dependent Kids'],
] as const;

const PROFILE_LANGUAGES = [
  'English', 'Spanish', 'French', 'Arabic', 'Armenian', 'Bengali', 'Farsi', 'German', 'Hindi',
  'Italian', 'Japanese', 'Korean', 'Mandarin', 'Portuguese', 'Punjabi', 'Russian', 'Thai',
  'Vietnamese', 'Yiddish', 'Other',
];

interface AppointmentFormModalProps {
  open: boolean;
  appointment?: AppointmentFormAppointment | null;
  initialValues?: Partial<FormState> | null;
  appointmentTypes: AppointmentType[];
  saving?: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateAppointmentPayload, id?: number) => Promise<void>;
  onAddProspect?: (searchedName: string) => void;
  addedContact?: Prospect | null;
}

interface FormState {
  kind: 'REQUEST_TRAINER' | 'PERSONAL';
  start_at: string;
  timezone: string;
  duration_minutes: number;
  types: number[];
  location_type: LocationType;
  url: string;
  url_nickname: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  contact: number | null;
  contactLabel: string;
  contact_phone: string;
  contact_spouse_name: string;
  contact_profile_flags: Record<string, boolean | string>;
  trainee: number | null;
  traineeLabel: string;
  trainee_phone: string;
  notes: string;
}

const defaultForm = (): FormState => ({
  kind: 'REQUEST_TRAINER',
  start_at: localDateTimeValue(new Date(Date.now() + 60 * 60 * 1000)),
  timezone: browserTimezone(),
  duration_minutes: 60,
  types: [],
  location_type: 'VIRTUAL',
  url: '',
  url_nickname: 'Zoom',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  country: 'USA',
  contact: null,
  contactLabel: '',
  contact_phone: '',
  contact_spouse_name: '',
  contact_profile_flags: {},
  trainee: localStorage.getItem('wb.userId') ? Number(localStorage.getItem('wb.userId')) : null,
  traineeLabel: localStorage.getItem('wb.name') || '',
  trainee_phone: '',
  notes: '',
});

function traineeFromProspect(prospect: Prospect): Pick<FormState, 'trainee' | 'traineeLabel'> | null {
  if (!prospect.recruited_by) return null;

  return {
    trainee: prospect.recruited_by,
    traineeLabel: prospect.recruited_by_name || `User #${prospect.recruited_by}`,
  };
}

function isAppointmentDetail(appointment: AppointmentFormAppointment): appointment is AppointmentDetail {
  return 'types_detail' in appointment;
}

function formFromAppointment(
  appointment: AppointmentFormAppointment | null | undefined,
  initialValues?: Partial<FormState> | null,
): FormState {
  const form = defaultForm();
  if (!appointment) return { ...form, ...initialValues };
  const types = isAppointmentDetail(appointment) ? appointment.types_detail : appointment.types;
  const contactDetail = isAppointmentDetail(appointment) ? appointment.contact_detail : null;
  const traineeDetail = isAppointmentDetail(appointment) ? appointment.trainee_detail : null;

  return {
    ...form,
    kind: appointment.kind,
    start_at: localDateTimeValue(new Date(appointment.start_at)),
    timezone: appointment.timezone || form.timezone,
    duration_minutes: appointment.duration_minutes || 60,
    types: types.map((type) => type.id),
    location_type: appointment.location_type,
    url: appointment.url || '',
    url_nickname: appointment.url_nickname || '',
    address: isAppointmentDetail(appointment) ? appointment.address || '' : '',
    city: appointment.city || '',
    state: appointment.state || '',
    zip_code: isAppointmentDetail(appointment) ? appointment.zip_code || '' : '',
    country: isAppointmentDetail(appointment) ? appointment.country || form.country : form.country,
    contact: appointment.contact || null,
    contactLabel: contactDetail?.name || appointment.contact_name || '',
    contact_phone: contactDetail?.phone || '',
    contact_spouse_name: contactDetail?.spouse_name || '',
    trainee: appointment.trainee || null,
    traineeLabel: traineeDetail?.name || appointment.trainee_name || '',
    trainee_phone: traineeDetail?.phone || '',
  };
}

export function AppointmentFormModal({
  open,
  appointment,
  initialValues,
  appointmentTypes,
  saving = false,
  onClose,
  onSubmit,
  onAddProspect,
  addedContact,
}: AppointmentFormModalProps) {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const nextForm = formFromAppointment(appointment, initialValues);
      setForm(nextForm);
      setError(null);
      if (nextForm.contact) {
        void fetchProspectDetails(nextForm.contact)
          .then((contact) => {
            setForm((prev) => ({
              ...prev,
              contact_profile_flags: { ...(contact.profile?.flags || {}) },
            }));
          })
          .catch(() => undefined);
      }
    }
  }, [appointment, initialValues, open]);

  useEffect(() => {
    if (!open || !addedContact) return;
    const prospectTrainee = traineeFromProspect(addedContact);
    setForm((prev) => ({
      ...prev,
      contact: addedContact.id,
      contactLabel: addedContact.full_name || `${addedContact.first_name} ${addedContact.last_name}`.trim(),
      contact_phone: addedContact.phone || addedContact.profile?.phone || '',
      contact_profile_flags: { ...(addedContact.profile?.flags || {}) },
      ...(prospectTrainee || {}),
    }));
  }, [addedContact, open]);

  const selectedTypeText = useMemo(() => {
    if (!form.types.length) return 'Select at least one appointment type.';
    return appointmentTypes
      .filter((type) => form.types.includes(type.id))
      .map((type) => type.name)
      .join(', ');
  }, [appointmentTypes, form.types]);

  const timezoneOptions = useMemo(() => {
    const currentTimezone = browserTimezone();
    return Array.from(new Set([currentTimezone, form.timezone, ...SUPPORTED_TIMEZONES])).filter(Boolean);
  }, [form.timezone]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleType = (typeId: number) => {
    setForm((prev) => ({
      ...prev,
      types: prev.types.includes(typeId)
        ? prev.types.filter((id) => id !== typeId)
        : [...prev.types, typeId],
    }));
  };

  const handleUserSelect = (field: 'contact' | 'trainee', option: UserAutocompleteOption) => {
    setForm((prev) =>
      field === 'contact'
        ? { ...prev, contact: option.id, contactLabel: option.label }
        : { ...prev, trainee: option.id, traineeLabel: option.label },
    );

    if (field === 'contact') {
      void loadContactProfile(option.id);
    }
  };

  const loadContactProfile = async (contactId: number) => {
    try {
      const contact = await fetchProspectDetails(contactId);
      const prospectTrainee = traineeFromProspect(contact);
      setForm((prev) => {
        if (prev.contact !== contactId) return prev;
        return {
          ...prev,
          contact_profile_flags: { ...(contact.profile?.flags || {}) },
          ...(prospectTrainee || {}),
        };
      });
    } catch {
      setForm((prev) => prev.contact === contactId ? { ...prev, contact_profile_flags: {} } : prev);
    }
  };

  const updateContactProfileFlag = (key: string, value: boolean | string) => {
    setForm((prev) => ({
      ...prev,
      contact_profile_flags: { ...prev.contact_profile_flags, [key]: value },
    }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!form.types.length) {
      setError('Select at least one appointment type.');
      return;
    }
    if (form.kind === 'REQUEST_TRAINER' && (!form.contact || !form.trainee)) {
      setError('Request Trainer appointments require both a contact and a trainee.');
      return;
    }
    if (form.location_type === 'PHYSICAL' && (!form.address.trim() || !form.city.trim() || !form.state.trim())) {
      setError('Physical appointments require address, city, and state.');
      return;
    }

    const payload: CreateAppointmentPayload = {
      kind: form.kind,
      start_at: form.start_at,
      timezone: form.timezone,
      duration_minutes: form.duration_minutes,
      types: form.types,
      location_type: form.location_type,
      country: form.country,
      contact: form.kind === 'REQUEST_TRAINER' ? form.contact : null,
      trainee: form.kind === 'REQUEST_TRAINER' ? form.trainee : null,
    };

    if (form.location_type === 'VIRTUAL') {
      payload.url = form.url.trim();
      payload.url_nickname = form.url_nickname.trim();
    } else {
      payload.address = form.address.trim();
      payload.city = form.city.trim();
      payload.state = form.state.trim();
      payload.zip_code = form.zip_code.trim();
    }

    if (form.contact_phone.trim()) payload.contact_phone = form.contact_phone.trim();
    if (form.contact_spouse_name.trim()) payload.contact_spouse_name = form.contact_spouse_name.trim();
    if (form.trainee_phone.trim()) payload.trainee_phone = form.trainee_phone.trim();

    if (form.kind === 'REQUEST_TRAINER' && form.contact) {
      await updateProspectDetails(form.contact, {
        profile: { flags: form.contact_profile_flags },
      });
    }

    const noteUserId = form.contact || form.trainee;
    if (noteUserId && form.notes.trim()) {
      await createTrackerNote(noteUserId, form.notes, 'matchup');
    }

    await onSubmit(payload, appointment?.id);
  };

  return (
    <Modal open={open} title={appointment ? 'Edit Appointment' : 'New Appointment'} onClose={onClose} contentClassName="matchup-modal-content">
      <form className="matchup-form" onSubmit={(event) => void submit(event)}>
        {error ? <div className="matchup-form-error">{error}</div> : null}

        <div className="matchup-form-grid">
          <label>
            <span>Kind</span>
            <Select value={form.kind} onChange={(event) => update('kind', event.target.value as FormState['kind'])}>
              <option value="REQUEST_TRAINER">Request Trainer</option>
              <option value="PERSONAL">Personal</option>
            </Select>
          </label>
          <label>
            <span>Start</span>
            <Input type="datetime-local" variant="surface" value={form.start_at} onChange={(event) => update('start_at', event.target.value)} />
          </label>
          <label>
            <span>Timezone</span>
            <Select value={form.timezone} onChange={(event) => update('timezone', event.target.value)}>
              {timezoneOptions.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span>Duration</span>
            <Input type="number" min={1} variant="surface" value={form.duration_minutes} onChange={(event) => update('duration_minutes', Number(event.target.value))} />
          </label>
        </div>

        <fieldset className="matchup-fieldset">
          <legend>Types</legend>
          <p>{selectedTypeText}</p>
          <div className="matchup-checkbox-grid">
            {appointmentTypes.map((type) => (
              <label key={type.id} className="matchup-check">
                <input type="checkbox" checked={form.types.includes(type.id)} onChange={() => toggleType(type.id)} />
                <span>{type.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {form.kind === 'REQUEST_TRAINER' ? (
          <div className="matchup-form-grid">
            <label>
              <span>Contact</span>
              <UserAutocompleteDropdown
                selectedId={form.contact}
                selectedLabel={form.contactLabel}
                placeholder="Search contacts"
                fetchFromApi
                includeUncoded
                onSelect={(option) => handleUserSelect('contact', option)}
                onNoResultsAction={onAddProspect}
              />
            </label>
            <label>
              <span>Trainee</span>
              <UserAutocompleteDropdown
                selectedId={form.trainee}
                selectedLabel={form.traineeLabel}
                placeholder="Search trainees"
                fetchFromApi
                onSelect={(option) => handleUserSelect('trainee', option)}
              />
            </label>
            <label>
              <span>Contact Phone</span>
              <Input variant="surface" value={form.contact_phone} onChange={(event) => update('contact_phone', event.target.value)} />
            </label>
            <label>
              <span>Spouse Name</span>
              <Input variant="surface" value={form.contact_spouse_name} onChange={(event) => update('contact_spouse_name', event.target.value)} />
            </label>
            <fieldset className="matchup-fieldset matchup-form-wide">
              <legend>Contact Profile</legend>
              <div className="matchup-checkbox-grid">
                {PROFILE_FLAGS.map(([key, label]) => (
                  <label key={key} className="matchup-check">
                    <input
                      type="checkbox"
                      checked={Boolean(form.contact_profile_flags[key])}
                      onChange={(event) => updateContactProfileFlag(key, event.target.checked)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label>
              <span>Contact Language</span>
              <Select
                value={typeof form.contact_profile_flags.language === 'string' ? form.contact_profile_flags.language : ''}
                onChange={(event) => updateContactProfileFlag('language', event.target.value)}
              >
                <option value="">Select language</option>
                {PROFILE_LANGUAGES.map((language) => (
                  <option key={language} value={language}>{language}</option>
                ))}
              </Select>
            </label>
          </div>
        ) : null}

        <div className="matchup-form-grid">
          <label>
            <span>Location</span>
            <Select value={form.location_type} onChange={(event) => update('location_type', event.target.value as LocationType)}>
              <option value="VIRTUAL">Virtual</option>
              <option value="PHYSICAL">Physical</option>
            </Select>
          </label>
          {form.location_type === 'VIRTUAL' ? (
            <>
              <label>
                <span>URL</span>
                <Input variant="surface" value={form.url} onChange={(event) => update('url', event.target.value)} placeholder="https://zoom.us/j/..." />
              </label>
              <label>
                <span>URL Label</span>
                <Input variant="surface" value={form.url_nickname} onChange={(event) => update('url_nickname', event.target.value)} />
              </label>
            </>
          ) : (
            <>
              <label className="matchup-form-wide">
                <span>Address</span>
                <Textarea value={form.address} onChange={(event) => update('address', event.target.value)} rows={2} />
              </label>
              <label>
                <span>City</span>
                <Input variant="surface" value={form.city} onChange={(event) => update('city', event.target.value)} />
              </label>
              <label>
                <span>State</span>
                <Input variant="surface" value={form.state} onChange={(event) => update('state', event.target.value)} />
              </label>
              <label>
                <span>Zip</span>
                <Input variant="surface" value={form.zip_code} onChange={(event) => update('zip_code', event.target.value)} />
              </label>
            </>
          )}
        </div>

        <label>
          <span>Notes</span>
          <Textarea
            value={form.notes}
            onChange={(event) => update('notes', event.target.value)}
            rows={3}
            placeholder="Add an appointment note..."
          />
        </label>

        <div className="matchup-form-actions">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Appointment'}</Button>
        </div>
      </form>
    </Modal>
  );
}
