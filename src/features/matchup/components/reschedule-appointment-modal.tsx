import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CalendarClock } from 'lucide-react';
import { Button, Input, Modal, Select, Textarea } from '@shared/components/ui';
import { browserTimezone, formatAppointmentTime, localDateTimeValue } from '../services/matchup-service';
import type { AppointmentListItem, AppointmentStatus } from '../types';

/**
 * Statuses the backend accepts for a reschedule transition
 * (`ALLOWED_TRANSITIONS["reschedule"]` in matchup/services/workflow.py). DONE,
 * CANCELLED, DECLINED and NOT_INTERESTED are terminal and cannot be rescheduled.
 */
const RESCHEDULABLE_STATUSES: AppointmentStatus[] = ['REQUESTED', 'ASSIGNED', 'ACCEPTED', 'RESCHEDULED'];

/** Whether an appointment in this status can be rescheduled. */
export function canReschedule(status: AppointmentStatus): boolean {
  return RESCHEDULABLE_STATUSES.includes(status);
}

/**
 * The minimal appointment shape this modal needs. `AppointmentListItem`,
 * `AppointmentDetail`, and `DayAppointmentItem` all satisfy it, so every entry
 * point (follow-up flow, details modal, day/list views) can reuse the modal.
 */
export type ReschedulableAppointment = Pick<
  AppointmentListItem,
  'id' | 'start_at' | 'duration_minutes' | 'timezone' | 'contact_name' | 'trainee_name'
>;

export interface ReschedulePayload {
  start_at: string;
  duration_minutes: number;
  timezone: string;
  reason?: string;
}

interface RescheduleAppointmentModalProps {
  open: boolean;
  appointment: ReschedulableAppointment | null;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (payload: ReschedulePayload, id: number) => Promise<void>;
}

/** IANA zones the browser knows about, for the timezone picker. */
function browserSupportedTimezones(): string[] {
  const intl = Intl as typeof Intl & {
    supportedValuesOf?: (key: 'timeZone') => string[];
  };

  try {
    return intl.supportedValuesOf?.('timeZone') ?? [];
  } catch {
    return [];
  }
}

const SUPPORTED_TIMEZONES = browserSupportedTimezones();

/**
 * Dedicated reschedule flow. Unlike the generic edit form it only touches the
 * schedule (date/time, duration, timezone) and posts to the backend's dedicated
 * reschedule endpoint — so the appointment moves in place with an audit record,
 * a RESCHEDULED status, a notification, and an in-place Google Calendar update,
 * never a cancel + recreate.
 */
export function RescheduleAppointmentModal({
  open,
  appointment,
  saving = false,
  onClose,
  onSubmit,
}: RescheduleAppointmentModalProps) {
  const [startAt, setStartAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [timezone, setTimezone] = useState(browserTimezone());
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !appointment) return;
    setStartAt(localDateTimeValue(new Date(appointment.start_at)));
    setDurationMinutes(appointment.duration_minutes || 60);
    setTimezone(appointment.timezone || browserTimezone());
    setReason('');
    setError(null);
  }, [open, appointment]);

  const timezoneOptions = useMemo(() => {
    const currentTimezone = browserTimezone();
    return Array.from(new Set([currentTimezone, timezone, ...SUPPORTED_TIMEZONES])).filter(Boolean);
  }, [timezone]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!appointment) return;
    if (!startAt) {
      setError('Pick a new date and time.');
      return;
    }
    if (!durationMinutes || durationMinutes < 1) {
      setError('Duration must be at least 1 minute.');
      return;
    }
    setError(null);
    await onSubmit(
      {
        start_at: startAt,
        duration_minutes: durationMinutes,
        timezone,
        reason: reason.trim() || undefined,
      },
      appointment.id,
    );
  };

  const heading = appointment?.contact_name || appointment?.trainee_name || (appointment ? `Appointment #${appointment.id}` : '');

  return (
    <Modal open={open} title="Reschedule Appointment" onClose={onClose} contentClassName="matchup-modal-content">
      <form className="matchup-form" onSubmit={(event) => void submit(event)}>
        {error ? <div className="matchup-form-error">{error}</div> : null}

        {appointment ? (
          <div className="matchup-assign-summary">
            <strong>{heading}</strong>
            <span>
              <CalendarClock size={14} /> Currently {formatAppointmentTime(appointment.start_at)} · {appointment.timezone}
            </span>
          </div>
        ) : null}

        <div className="matchup-form-grid">
          <label>
            <span>New date &amp; time</span>
            <Input type="datetime-local" variant="surface" value={startAt} onChange={(event) => setStartAt(event.target.value)} />
          </label>
          <label>
            <span>Timezone</span>
            <Select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span>Duration (minutes)</span>
            <Input type="number" min={1} variant="surface" value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} />
          </label>
        </div>

        <label>
          <span>Reason (optional)</span>
          <Textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why is this appointment being rescheduled?" />
        </label>

        <div className="matchup-form-actions">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !appointment}>
            {saving ? 'Rescheduling…' : 'Reschedule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
