import { useState } from 'react';
import { CalendarClock, CalendarPlus, CalendarX2, Check, ClipboardPen, Copy, History, ListRestart, MapPin, Pencil, UserRound, XCircle } from 'lucide-react';
import { Button, Modal } from '@shared/components/ui';
import { formatAppointmentTime } from '../services/matchup-service';
import { canReschedule } from './reschedule-appointment-modal';
import type { AppointmentDetail, AppointmentStatus } from '../types';

interface AppointmentDetailsModalProps {
  appointment: AppointmentDetail | null;
  onClose: () => void;
  onEdit?: (appointment: AppointmentDetail) => void;
  onReschedule?: (appointment: AppointmentDetail) => void;
  onEditResult?: (appointment: AppointmentDetail) => void;
  onChangeStatus?: (appointment: AppointmentDetail) => void;
  onReaddToCalendar?: (appointment: AppointmentDetail) => void;
  onCancel?: (appointment: AppointmentDetail) => void;
}

/** Finished appointments: nothing left to cancel or put back on a calendar. */
const CLOSED_STATUSES: AppointmentStatus[] = ['DONE', 'CANCELLED', 'NOT_INTERESTED'];

const STATUS_CHANGE_SOURCE: Record<string, string> = {
  APP: '',
  MANUAL: 'Changed by hand',
  REPAIR: 'Data repair',
};

function value(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value).replace(/_/g, ' ');
}

export function AppointmentDetailsModal({
  appointment,
  onClose,
  onEdit,
  onReschedule,
  onEditResult,
  onChangeStatus,
  onReaddToCalendar,
  onCancel,
}: AppointmentDetailsModalProps) {
  const [copied, setCopied] = useState(false);
  if (!appointment) return null;
  const types = appointment.types_detail || [];
  const contactName = appointment.contact_name || appointment.contact_detail?.name;
  const traineeName = appointment.trainee_name || appointment.trainee_detail?.name;
  const trainerName = appointment.assigned_to_name
    || appointment.assigned_to_detail?.name
    || appointment.assignments?.[appointment.assignments.length - 1]?.trainer_name;
  const location = appointment.location_type === 'VIRTUAL'
    ? appointment.url || appointment.url_nickname || 'Virtual'
    : [appointment.address, appointment.city, appointment.state, appointment.zip_code].filter(Boolean).join(', ');
  const isOpen = !CLOSED_STATUSES.includes(appointment.status);
  const deletedInGoogle = appointment.google_sync_status === 'DELETED_IN_GOOGLE';
  const copyVirtualLink = async () => {
    if (!appointment.url) return;
    await navigator.clipboard.writeText(appointment.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Modal open title="Appointment Details" onClose={onClose} contentClassName="matchup-modal-content matchup-details-modal">
      <div className="matchup-details-hero">
        <div className="matchup-details-people-focus">
          <h2><UserRound size={20} /> People involved</h2>
          <div className="matchup-details-people-row">
            <span><b>Contact</b>{value(contactName)}</span>
            <span><b>Trainee</b>{value(traineeName)}</span>
            <span><b>Trainer</b>{value(trainerName)}</span>
          </div>
          <div className="matchup-details-grid matchup-details-grid--compact">
            <section><CalendarClock size={16} /><div><small>Schedule</small><strong>{formatAppointmentTime(appointment.start_at)}</strong><span>{appointment.timezone} · {appointment.duration_minutes} minutes</span></div></section>
            <section><MapPin size={16} /><div><small>Location</small><strong>{value(appointment.location_type)}</strong>{appointment.location_type === 'VIRTUAL' && appointment.url ? <div className="matchup-details-link"><span title={appointment.url}>{appointment.url}</span><button type="button" onClick={() => void copyVirtualLink()} title="Copy meeting link" aria-label="Copy meeting link">{copied ? <Check size={14} /> : <Copy size={14} />}</button></div> : <span>{value(location)}</span>}</div></section>
            <section><History size={16} /><div><small>Appointment types</small><strong>{types.length ? types.map((type) => type.name).join(', ') : 'Personal'}</strong><span>Created by {value(appointment.created_by_name)}</span></div></section>
          </div>
        </div>
        <div className="matchup-details-hero-meta">
          <span className={`matchup-kind-badge ${appointment.kind === 'REQUEST_TRAINER' ? 'is-request-trainer' : 'is-personal'}`}>
            {appointment.kind === 'REQUEST_TRAINER' ? 'Request Trainer' : 'Personal'}
          </span>
          <strong>{value(appointment.status_label || appointment.status)}</strong>
          {deletedInGoogle ? (
            <span className="matchup-gcal-deleted-badge"><CalendarX2 size={12} /> Deleted in Google Calendar</span>
          ) : null}
          {onChangeStatus && appointment.can_change_status ? (
            <Button type="button" variant="outline" onClick={() => onChangeStatus(appointment)}>
              <ListRestart size={16} /> Change status
            </Button>
          ) : null}
          {onReschedule && canReschedule(appointment.status) ? (
            <Button type="button" variant="outline" onClick={() => onReschedule(appointment)}>
              <CalendarClock size={16} /> Reschedule
            </Button>
          ) : null}
          {onEdit ? (
            <Button type="button" onClick={() => onEdit(appointment)}>
              <Pencil size={16} /> Edit Appointment
            </Button>
          ) : null}
        </div>
      </div>

      {deletedInGoogle ? (
        <section className="matchup-details-section matchup-gcal-deleted-notice">
          <h3><CalendarX2 size={16} /> Removed from Google Calendar</h3>
          <p>
            The Google Calendar copy of this appointment was deleted
            {appointment.google_deleted_at ? ` on ${new Date(appointment.google_deleted_at).toLocaleString()}` : ''}.
            {' '}Its status has not changed.
            {isOpen ? ' If the meeting is off, cancel it here; otherwise add it back to the calendar.' : ''}
          </p>
          {isOpen && (onReaddToCalendar || onCancel) ? (
            <div className="matchup-gcal-deleted-actions">
              {onReaddToCalendar ? (
                <Button type="button" size="sm" onClick={() => onReaddToCalendar(appointment)}>
                  <CalendarPlus size={14} /> Add back to calendar
                </Button>
              ) : null}
              {onCancel ? (
                <Button type="button" size="sm" variant="outline" onClick={() => onCancel(appointment)}>
                  <XCircle size={14} /> Cancel appointment
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="matchup-details-section">
        <h3>Assignment history</h3>
        {appointment.assignments?.length ? appointment.assignments.map((entry) => (
          <article key={entry.id}><strong>{entry.trainer_name}</strong><span>{value(entry.status)} · {new Date(entry.created_at).toLocaleString()}</span>{entry.decline_reason ? <p>{entry.decline_reason}</p> : null}</article>
        )) : <p className="matchup-muted">No assignment history.</p>}
      </section>

      <section className="matchup-details-section">
        <h3>Reschedule history</h3>
        {appointment.reschedules?.length ? appointment.reschedules.map((entry) => (
          <article key={entry.id}><strong>{formatAppointmentTime(entry.previous_start_at)} → {formatAppointmentTime(entry.new_start_at)}</strong><span>{entry.new_timezone} · {entry.new_duration_minutes} minutes</span>{entry.reason ? <p>{entry.reason}</p> : null}</article>
        )) : <p className="matchup-muted">No reschedule history.</p>}
      </section>

      <section className="matchup-details-section">
        <h3>Status history</h3>
        {appointment.status_changes?.length ? appointment.status_changes.map((entry) => (
          <article key={entry.id}>
            <strong>{value(entry.from_status)} → {value(entry.to_status)}</strong>
            <span>
              {[STATUS_CHANGE_SOURCE[entry.source], entry.changed_by_name, new Date(entry.created_at).toLocaleString()].filter(Boolean).join(' · ')}
            </span>
            {entry.reason ? <p>{entry.reason}</p> : null}
          </article>
        )) : <p className="matchup-muted">No status changes recorded.</p>}
      </section>

      <section className="matchup-details-section">
        <div className="matchup-outcome-header">
          <h3>Outcome</h3>
          {appointment.result && onEditResult ? (
            <Button type="button" variant="outline" size="sm" onClick={() => onEditResult(appointment)}>
              <ClipboardPen size={14} /> Edit Result
            </Button>
          ) : null}
        </div>
        {appointment.result ? (
          <div className="matchup-result-grid">
            {Object.entries(appointment.result).filter(([key]) => !['submitted_by', 'last_edited_by', 'created_at', 'updated_at'].includes(key)).map(([key, resultValue]) => (
              <div key={key}><small>{key.replace(/_/g, ' ')}</small><strong>{value(resultValue)}</strong></div>
            ))}
          </div>
        ) : <p className="matchup-muted">No outcome recorded.</p>}
      </section>

      <footer className="matchup-details-audit">Created {appointment.created_at ? new Date(appointment.created_at).toLocaleString() : '—'} · Updated {appointment.updated_at ? new Date(appointment.updated_at).toLocaleString() : '—'}</footer>
    </Modal>
  );
}
