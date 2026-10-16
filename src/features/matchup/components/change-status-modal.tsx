import { useEffect, useState, type FormEvent } from 'react';
import { Button, Modal, Select, Textarea } from '@shared/components/ui';
import { formatAppointmentTime } from '../services/matchup-service';
import type { AppointmentDetail, AppointmentStatus, MatchupStatusMeta } from '../types';

/**
 * Statuses that can be set by hand — mirrors `MANUAL_STATUS_TARGETS` in
 * matchup/models.py. REQUESTED and ASSIGNED stay with the assign workflow.
 */
const MANUAL_STATUS_TARGETS: AppointmentStatus[] = ['ACCEPTED', 'RESCHEDULED', 'DONE', 'NOT_INTERESTED', 'CANCELLED'];

interface ChangeStatusModalProps {
  appointment: AppointmentDetail | null;
  statuses: MatchupStatusMeta[];
  saving?: boolean;
  onClose: () => void;
  onSubmit: (appointmentId: number, status: AppointmentStatus, reason: string) => Promise<void>;
}

/**
 * Manual status correction for brokers (any appointment they can see) and
 * trainers (their own). A reason is required and the change is recorded in the
 * appointment's status history; no notifications are sent. DONE needs a filed
 * result — the backend rejects it otherwise and the error is shown here.
 */
export function ChangeStatusModal({ appointment, statuses, saving = false, onClose, onSubmit }: ChangeStatusModalProps) {
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus('');
    setReason('');
    setError(null);
  }, [appointment]);

  if (!appointment) return null;

  const label = (value: AppointmentStatus) => statuses.find((item) => item.value === value)?.label || value.replace(/_/g, ' ');
  const options = MANUAL_STATUS_TARGETS.filter((value) => value !== appointment.status);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!status) {
      setError('Pick the new status.');
      return;
    }
    if (!reason.trim()) {
      setError('Add a reason for the change.');
      return;
    }
    setError(null);
    try {
      await onSubmit(appointment.id, status, reason.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the status.');
    }
  };

  return (
    <Modal open title="Change Status" onClose={onClose} contentClassName="matchup-modal-content">
      <form className="matchup-form" onSubmit={(event) => void submit(event)}>
        {error ? <div className="matchup-form-error">{error}</div> : null}

        <div className="matchup-assign-summary">
          <strong>{appointment.contact_name || appointment.contact_detail?.name || `Appointment #${appointment.id}`}</strong>
          <span>{formatAppointmentTime(appointment.start_at)} · currently {appointment.status_label || label(appointment.status)}</span>
        </div>

        <label>
          <span>New status</span>
          <Select value={status} onChange={(event) => setStatus(event.target.value as AppointmentStatus)}>
            <option value="">Select status…</option>
            {options.map((value) => <option key={value} value={value}>{label(value)}</option>)}
          </Select>
        </label>

        <label>
          <span>Reason</span>
          <Textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why is the status being changed?" />
        </label>

        <div className="matchup-form-actions">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Change status'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
