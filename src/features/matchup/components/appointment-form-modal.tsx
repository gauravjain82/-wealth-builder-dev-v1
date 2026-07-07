import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button, Input, Modal, Select, Textarea } from '@shared/components/ui';
import { UserAutocompleteDropdown, type UserAutocompleteOption } from '@shared/components/user-autocomplete-dropdown';
import { browserTimezone, localDateTimeValue } from '../services/matchup-service';
import type {
  AppointmentDetail,
  AppointmentListItem,
  AppointmentType,
  CreateAppointmentPayload,
  LocationType,
} from '../types';

type AppointmentFormAppointment = AppointmentListItem | AppointmentDetail;

interface AppointmentFormModalProps {
  open: boolean;
  appointment?: AppointmentFormAppointment | null;
  initialValues?: Partial<FormState> | null;
  appointmentTypes: AppointmentType[];
  saving?: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateAppointmentPayload, id?: number) => Promise<void>;
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
  trainee: number | null;
  traineeLabel: string;
  trainee_phone: string;
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
  trainee: localStorage.getItem('wb.userId') ? Number(localStorage.getItem('wb.userId')) : null,
  traineeLabel: localStorage.getItem('wb.name') || '',
  trainee_phone: '',
});

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
}: AppointmentFormModalProps) {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(formFromAppointment(appointment, initialValues));
      setError(null);
    }
  }, [appointment, initialValues, open]);

  const selectedTypeText = useMemo(() => {
    if (!form.types.length) return 'Select at least one appointment type.';
    return appointmentTypes
      .filter((type) => form.types.includes(type.id))
      .map((type) => type.name)
      .join(', ');
  }, [appointmentTypes, form.types]);

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
    if (form.location_type === 'VIRTUAL' && !form.url.trim()) {
      setError('Virtual appointments require a URL.');
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
            <Input variant="surface" value={form.timezone} onChange={(event) => update('timezone', event.target.value)} />
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
                onSelect={(option) => handleUserSelect('contact', option)}
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

        <div className="matchup-form-actions">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Appointment'}</Button>
        </div>
      </form>
    </Modal>
  );
}
