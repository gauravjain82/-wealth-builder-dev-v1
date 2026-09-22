import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  ConfirmationDialog,
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
import {
  bpmService,
  browserTimezone,
  DAY_OF_WEEK_OPTIONS,
  formatOccurrenceTime,
  supportedTimezones,
} from '../services/bpm-service';
import type {
  BPMEmailTemplate,
  BPMEventDetail,
  BPMEventPayload,
  BPMOccurrence,
  EventType,
  OccurrenceStatus,
  UserRef,
} from '../types';
import { MultiUserSelect, type SelectedUser } from './multi-user-select';
import {
  LocationsEditor,
  locationsToDrafts,
  newLocationDraft,
  type LocationDraft,
} from './locations-editor';

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
  timezone: string;
  start_time: string;
  duration_minutes: number;
  event_date: string;
  day_of_week: number;
  recurrence_start: string;
  recurrence_end: string;
  email_template: number | null;
}

const defaultForm = (): FormState => ({
  name: '',
  event_type: 'RECURRING',
  timezone: browserTimezone(),
  start_time: '19:00',
  duration_minutes: 90,
  event_date: '',
  day_of_week: 1,
  recurrence_start: '',
  recurrence_end: '',
  email_template: null,
});

export function BPMFormModal({ open, onClose, onSaved, event }: BPMFormModalProps) {
  const addToast = useToastStore((state) => state.addToast);
  const isEditing = Boolean(event);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [locations, setLocations] = useState<LocationDraft[]>([newLocationDraft()]);
  const [smds, setSmds] = useState<SelectedUser[]>([]);
  const [trainers, setTrainers] = useState<SelectedUser[]>([]);
  const [templates, setTemplates] = useState<BPMEmailTemplate[]>([]);
  const [occurrences, setOccurrences] = useState<BPMOccurrence[]>([]);
  const [statusBusyId, setStatusBusyId] = useState<number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BPMOccurrence | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingSmds, setLoadingSmds] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (event) {
      setForm({
        name: event.name,
        event_type: event.event_type,
        timezone: event.timezone,
        start_time: (event.start_time || '19:00').slice(0, 5),
        duration_minutes: event.duration_minutes,
        event_date: event.event_date || '',
        day_of_week: event.day_of_week ?? 1,
        recurrence_start: event.recurrence_start || '',
        recurrence_end: event.recurrence_end || '',
        email_template: event.email_template,
      });
      const drafts = locationsToDrafts(event.locations || []);
      setLocations(drafts.length ? drafts : [newLocationDraft()]);
      setSmds(toSelectedUsers(event.participating_smds_detail));
      setTrainers(toSelectedUsers(event.trainers_detail));
      setOccurrences(
        [...(event.occurrences || [])].sort(
          (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
        ),
      );
    } else {
      setForm(defaultForm());
      setLocations([newLocationDraft()]);
      setSmds([]);
      setTrainers([]);
      setOccurrences([]);
    }
    bpmService
      .emailTemplates()
      .then((data) => setTemplates(data.results))
      .catch(() => setTemplates([]));
  }, [open, event]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const selectAllSmds = async () => {
    setLoadingSmds(true);
    try {
      const roster = await bpmService.smdRoster();
      setSmds(roster.map((ref) => ({ id: ref.id, label: ref.name || `User #${ref.id}` })));
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to load SMDs',
      });
    } finally {
      setLoadingSmds(false);
    }
  };

  const timezoneOptions = useMemo(
    () => Array.from(new Set([browserTimezone(), form.timezone, ...supportedTimezones()])).filter(Boolean),
    [form.timezone],
  );

  const submit = async () => {
    if (!form.name.trim()) {
      addToast({ type: 'error', message: 'BPM name is required.' });
      return;
    }
    if (locations.length === 0) {
      addToast({ type: 'error', message: 'Add at least one location.' });
      return;
    }
    for (const location of locations) {
      if (location.kind === 'IN_PERSON' && !location.office) {
        addToast({ type: 'error', message: 'Select an office for every in-person location.' });
        return;
      }
      if (location.kind === 'ONLINE' && !location.webinar_url.trim()) {
        addToast({ type: 'error', message: 'A join URL is required for every online location.' });
        return;
      }
    }
    if (form.event_type === 'ONE_TIME' && !form.event_date) {
      addToast({ type: 'error', message: 'Pick a date for a one-time BPM.' });
      return;
    }

    const payload: BPMEventPayload = {
      name: form.name,
      event_type: form.event_type,
      locations: locations.map((location) => ({
        id: location.id,
        kind: location.kind,
        office: location.kind === 'IN_PERSON' ? location.office : null,
        webinar_url: location.kind === 'ONLINE' ? location.webinar_url : '',
        webinar_url_nickname: location.kind === 'ONLINE' ? location.webinar_url_nickname : '',
        timezone: location.timezone.trim(),
        checkin_permitted_users: location.checkinUsers.map((user) => user.id),
        is_active: true,
      })),
      timezone: form.timezone,
      start_time: form.start_time,
      duration_minutes: form.duration_minutes,
      participating_smds: smds.map((user) => user.id),
      trainers: trainers.map((user) => user.id),
      email_template: form.email_template,
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

  const applyStatus = async (occurrence: BPMOccurrence, status: OccurrenceStatus) => {
    setStatusBusyId(occurrence.id);
    try {
      const updated =
        status === 'SCHEDULED'
          ? await bpmService.rescheduleOccurrence(occurrence.id)
          : status === 'COMPLETED'
            ? await bpmService.completeOccurrence(occurrence.id)
            : await bpmService.cancelOccurrence(occurrence.id);
      setOccurrences((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      onSaved();
      addToast({ type: 'success', message: 'Status updated.' });
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to update status' });
    } finally {
      setStatusBusyId(null);
    }
  };

  // Cancelling removes the occurrence from everyone's calendar, so confirm it;
  // restoring (→ SCHEDULED) and completing apply immediately.
  const onStatusSelect = (occurrence: BPMOccurrence, status: OccurrenceStatus) => {
    if (status === occurrence.status) return;
    if (status === 'CANCELLED') {
      setCancelTarget(occurrence);
      return;
    }
    void applyStatus(occurrence, status);
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    const target = cancelTarget;
    setCancelTarget(null);
    await applyStatus(target, 'CANCELLED');
  };

  return (
    <>
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

        <FormRow>
          <Label>Event type</Label>
          <Select variant="surface" value={form.event_type} onChange={(e) => update('event_type', e.target.value as EventType)}>
            <option value="ONE_TIME">One-time</option>
            <option value="RECURRING">Recurring</option>
          </Select>
        </FormRow>

        <LocationsEditor locations={locations} onChange={setLocations} />

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
          <div className="flex items-center justify-between gap-2">
            <Label>Participating SMDs</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void selectAllSmds()} disabled={loadingSmds}>
                {loadingSmds ? 'Loading…' : 'Select all SMDs'}
              </Button>
              {smds.length > 0 ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setSmds([])} disabled={loadingSmds}>
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
          <MultiUserSelect selected={smds} onChange={setSmds} placeholder="Search SMDs" />
        </FormRow>
        <FormRow>
          <Label>Trainers (optional)</Label>
          <MultiUserSelect selected={trainers} onChange={setTrainers} placeholder="Search trainers" />
        </FormRow>

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
        </FormRowGroup>

        {isEditing && occurrences.length > 0 ? (
          <FormRow>
            <Label>Occurrences — change status / restore cancelled</Label>
            <div className="grid max-h-64 gap-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-white/10">
              {occurrences.map((occurrence) => (
                <div key={occurrence.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm text-slate-800 dark:text-white/90">
                      {formatOccurrenceTime(occurrence.start_at)} ({occurrence.timezone})
                    </div>
                    {occurrence.location_detail ? (
                      <div className="text-xs text-slate-500 dark:text-white/60">
                        {occurrence.location_detail.label}
                      </div>
                    ) : null}
                  </div>
                  <Select
                    variant="surface"
                    value={occurrence.status}
                    disabled={statusBusyId === occurrence.id}
                    onChange={(e) => onStatusSelect(occurrence, e.target.value as OccurrenceStatus)}
                  >
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="COMPLETED">Completed</option>
                  </Select>
                </div>
              ))}
            </div>
          </FormRow>
        ) : null}

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

    <ConfirmationDialog
      open={Boolean(cancelTarget)}
      title="Cancel this BPM occurrence?"
      message={`This cancels "${cancelTarget?.event_name ?? 'this occurrence'}" on ${
        cancelTarget ? formatOccurrenceTime(cancelTarget.start_at) : ''
      } for everyone and removes it from all participants' calendars. You can restore it later.`}
      confirmText="Cancel occurrence"
      cancelText="Keep it"
      loading={statusBusyId === cancelTarget?.id}
      onConfirm={confirmCancel}
      onClose={() => setCancelTarget(null)}
    />
    </>
  );
}
