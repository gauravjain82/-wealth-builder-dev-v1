import { useEffect, useMemo, useState } from 'react';
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
} from '@shared/components';
import { useToastStore } from '@/store';
import { bpmService, browserTimezone, DAY_OF_WEEK_OPTIONS, supportedTimezones } from '../services/bpm-service';
import type { BPMEmailTemplate, BPMEventDetail, BPMFormat, BPMEventPayload, EventType, UserRef } from '../types';
import { OfficePicker } from './office-picker';
import { MultiUserSelect, type SelectedUser } from './multi-user-select';

interface BPMFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** When provided, the modal edits this BPM instead of creating a new one. */
  event?: BPMEventDetail | null;
}

const toSelectedUsers = (refs: UserRef[]): SelectedUser[] =>
  refs.map((ref) => ({ id: ref.id, label: ref.name || `User #${ref.id}` }));

interface FormState {
  name: string;
  event_type: EventType;
  bpm_format: BPMFormat;
  office: number | null;
  webinar_url: string;
  webinar_url_nickname: string;
  timezone: string;
  start_time: string;
  duration_minutes: number;
  event_date: string;
  day_of_week: number;
  recurrence_start: string;
  recurrence_end: string;
  email_template: number | null;
  hide_from_baseshop: boolean;
}

const defaultForm = (): FormState => ({
  name: '',
  event_type: 'RECURRING',
  bpm_format: 'WEB_AND_IN_PERSON',
  office: null,
  webinar_url: '',
  webinar_url_nickname: 'Zoom',
  timezone: browserTimezone(),
  start_time: '19:00',
  duration_minutes: 90,
  event_date: '',
  day_of_week: 1,
  recurrence_start: '',
  recurrence_end: '',
  email_template: null,
  hide_from_baseshop: false,
});

export function BPMFormModal({ open, onClose, onSaved, event }: BPMFormModalProps) {
  const addToast = useToastStore((state) => state.addToast);
  const isEditing = Boolean(event);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [smds, setSmds] = useState<SelectedUser[]>([]);
  const [trainers, setTrainers] = useState<SelectedUser[]>([]);
  const [checkinUsers, setCheckinUsers] = useState<SelectedUser[]>([]);
  const [templates, setTemplates] = useState<BPMEmailTemplate[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (event) {
      setForm({
        name: event.name,
        event_type: event.event_type,
        bpm_format: event.bpm_format,
        office: event.office,
        webinar_url: event.webinar_url,
        webinar_url_nickname: event.webinar_url_nickname || 'Zoom',
        timezone: event.timezone,
        start_time: (event.start_time || '19:00').slice(0, 5),
        duration_minutes: event.duration_minutes,
        event_date: event.event_date || '',
        day_of_week: event.day_of_week ?? 1,
        recurrence_start: event.recurrence_start || '',
        recurrence_end: event.recurrence_end || '',
        email_template: event.email_template,
        hide_from_baseshop: event.hide_from_baseshop,
      });
      setSmds(toSelectedUsers(event.participating_smds_detail));
      setTrainers(toSelectedUsers(event.trainers_detail));
      setCheckinUsers(toSelectedUsers(event.checkin_permitted_users_detail));
    } else {
      setForm(defaultForm());
      setSmds([]);
      setTrainers([]);
      setCheckinUsers([]);
    }
    bpmService
      .emailTemplates()
      .then((data) => setTemplates(data.results))
      .catch(() => setTemplates([]));
  }, [open, event]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const requiresOffice = form.bpm_format === 'IN_PERSON' || form.bpm_format === 'WEB_AND_IN_PERSON';
  const requiresWebinar = form.bpm_format === 'WEBINAR' || form.bpm_format === 'WEB_AND_IN_PERSON';

  const timezoneOptions = useMemo(
    () => Array.from(new Set([browserTimezone(), form.timezone, ...supportedTimezones()])).filter(Boolean),
    [form.timezone],
  );

  const submit = async () => {
    if (!form.name.trim()) {
      addToast({ type: 'error', message: 'BPM name is required.' });
      return;
    }
    if (requiresOffice && !form.office) {
      addToast({ type: 'error', message: 'Select an office for in-person BPMs.' });
      return;
    }
    if (requiresWebinar && !form.webinar_url.trim()) {
      addToast({ type: 'error', message: 'A webinar URL is required for webinar BPMs.' });
      return;
    }
    if (form.event_type === 'ONE_TIME' && !form.event_date) {
      addToast({ type: 'error', message: 'Pick a date for a one-time BPM.' });
      return;
    }

    const payload: BPMEventPayload = {
      name: form.name,
      event_type: form.event_type,
      bpm_format: form.bpm_format,
      office: requiresOffice ? form.office : null,
      webinar_url: requiresWebinar ? form.webinar_url : '',
      webinar_url_nickname: requiresWebinar ? form.webinar_url_nickname : '',
      timezone: form.timezone,
      start_time: form.start_time,
      duration_minutes: form.duration_minutes,
      participating_smds: smds.map((user) => user.id),
      trainers: trainers.map((user) => user.id),
      checkin_permitted_users: checkinUsers.map((user) => user.id),
      email_template: form.email_template,
      hide_from_baseshop: form.hide_from_baseshop,
    };
    if (form.event_type === 'ONE_TIME') {
      payload.event_date = form.event_date;
    } else {
      payload.day_of_week = form.day_of_week;
      payload.recurrence_start = form.recurrence_start || null;
      payload.recurrence_end = form.recurrence_end || null;
    }

    setSaving(true);
    try {
      if (event) {
        await bpmService.updateEvent(event.id, payload);
        addToast({ type: 'success', message: 'BPM updated.' });
      } else {
        await bpmService.createEvent(payload);
        addToast({ type: 'success', message: 'BPM created.' });
      }
      onSaved();
      onClose();
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : `Failed to ${isEditing ? 'update' : 'create'} BPM`,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={isEditing ? 'Edit BPM' : 'Create BPM'} onClose={onClose} contentClassName="max-h-[90vh] overflow-y-auto">
      <Form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <FormRow>
          <Label>Name of BPM *</Label>
          <Input variant="surface" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Tuesday Night BPM" />
        </FormRow>

        <FormRowGroup>
          <FormRow>
            <Label>Event type</Label>
            <Select variant="surface" value={form.event_type} onChange={(e) => update('event_type', e.target.value as EventType)}>
              <option value="ONE_TIME">One-time</option>
              <option value="RECURRING">Recurring</option>
            </Select>
          </FormRow>
          <FormRow>
            <Label>BPM type</Label>
            <Select variant="surface" value={form.bpm_format} onChange={(e) => update('bpm_format', e.target.value as BPMFormat)}>
              <option value="IN_PERSON">In person only</option>
              <option value="WEBINAR">Webinar only</option>
              <option value="WEB_AND_IN_PERSON">Web &amp; in person</option>
            </Select>
          </FormRow>
        </FormRowGroup>

        {requiresOffice ? (
          <FormRow>
            <Label>Office *</Label>
            <OfficePicker value={form.office} onChange={(officeId) => update('office', officeId)} />
          </FormRow>
        ) : null}

        {requiresWebinar ? (
          <FormRowGroup>
            <FormRow>
              <Label>Webinar URL *</Label>
              <Input variant="surface" value={form.webinar_url} onChange={(e) => update('webinar_url', e.target.value)} placeholder="https://zoom.us/j/…" />
            </FormRow>
            <FormRow>
              <Label>URL label</Label>
              <Input variant="surface" value={form.webinar_url_nickname} onChange={(e) => update('webinar_url_nickname', e.target.value)} />
            </FormRow>
          </FormRowGroup>
        ) : null}

        <FormRowGroup columns={3}>
          <FormRow>
            <Label>Timezone</Label>
            <Select variant="surface" value={form.timezone} onChange={(e) => update('timezone', e.target.value)}>
              {timezoneOptions.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </Select>
          </FormRow>
          <FormRow>
            <Label>Time</Label>
            <Input type="time" variant="surface" value={form.start_time} onChange={(e) => update('start_time', e.target.value)} />
          </FormRow>
          <FormRow>
            <Label>Duration (min)</Label>
            <Input type="number" min={1} variant="surface" value={form.duration_minutes} onChange={(e) => update('duration_minutes', Number(e.target.value))} />
          </FormRow>
        </FormRowGroup>

        {form.event_type === 'ONE_TIME' ? (
          <FormRow>
            <Label>Date *</Label>
            <DatePicker value={form.event_date} onChange={(value) => update('event_date', value)} />
          </FormRow>
        ) : (
          <FormRowGroup columns={3}>
            <FormRow>
              <Label>Day of week</Label>
              <Select variant="surface" value={form.day_of_week} onChange={(e) => update('day_of_week', Number(e.target.value))}>
                {DAY_OF_WEEK_OPTIONS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </Select>
            </FormRow>
            <FormRow>
              <Label>Starts</Label>
              <DatePicker value={form.recurrence_start} onChange={(value) => update('recurrence_start', value)} clearable />
            </FormRow>
            <FormRow>
              <Label>Ends (optional)</Label>
              <DatePicker value={form.recurrence_end} onChange={(value) => update('recurrence_end', value)} clearable />
            </FormRow>
          </FormRowGroup>
        )}

        <FormRow>
          <Label>Participating SMDs</Label>
          <MultiUserSelect selected={smds} onChange={setSmds} placeholder="Search SMDs" />
        </FormRow>
        <FormRowGroup>
          <FormRow>
            <Label>Trainers (optional)</Label>
            <MultiUserSelect selected={trainers} onChange={setTrainers} placeholder="Search trainers" />
          </FormRow>
          <FormRow>
            <Label>Check-in permissions</Label>
            <MultiUserSelect selected={checkinUsers} onChange={setCheckinUsers} placeholder="Who can check people in" />
          </FormRow>
        </FormRowGroup>

        <FormRowGroup>
          <FormRow>
            <Label>Email template</Label>
            <Select
              variant="surface"
              value={form.email_template ?? ''}
              onChange={(e) => update('email_template', e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">None</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </Select>
          </FormRow>
          <FormRow>
            <Label>Visibility</Label>
            <label className="flex h-8 items-center gap-2 text-sm text-slate-700 dark:text-white/80">
              <Checkbox
                checked={form.hide_from_baseshop}
                onChange={(e) => update('hide_from_baseshop', e.target.checked)}
              />
              Hide from my baseshop
            </label>
          </FormRow>
        </FormRowGroup>

        <FormActions>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEditing ? 'Save BPM' : 'Create BPM'}
          </Button>
        </FormActions>
      </Form>
    </Modal>
  );
}
