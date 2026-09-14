import { CalendarPlus, Info, Trash2, UserPlus } from 'lucide-react';
import { Button, Modal } from '@shared/components/ui';
import { formatAppointmentTime } from '../services/matchup-service';
import type { AppointmentKind, CalendarAppointment } from '../types';

interface ImportedEventModalProps {
  /** The imported event (a busy block) being triaged, or null when closed. */
  item: CalendarAppointment | null;
  saving?: boolean;
  onClose: () => void;
  /** Convert this imported event into an appointment of the given kind. */
  onConvert: (item: CalendarAppointment, kind: AppointmentKind) => void;
  /** Dismiss (delete) this imported event. */
  onDismiss: (item: CalendarAppointment) => void;
}

/**
 * Triage modal for an imported (external Google) event. Lets the user convert it
 * into a Personal or Request-Trainer appointment (reusing the appointment form,
 * which prefills from this event) or dismiss it. Converting adopts the existing
 * Google event on the backend, so no duplicate is created.
 */
export function ImportedEventModal({
  item,
  saving,
  onClose,
  onConvert,
  onDismiss,
}: ImportedEventModalProps) {
  if (!item) return null;

  const when = formatAppointmentTime(item.start_at, {
    timeZoneName: 'short',
  });

  return (
    <Modal open title={item.title || 'Imported event'} onClose={onClose} contentClassName="matchup-modal-content">
      <div className="matchup-imported-modal">
        <p className="matchup-import-badge">
          Imported{item.calendar_summary ? ` · ${item.calendar_summary}` : ''}
        </p>
        <dl className="matchup-imported-meta">
          <div>
            <dt>When</dt>
            <dd>{when}{item.all_day ? ' (all day)' : ''}</dd>
          </div>
          {item.location ? (
            <div>
              <dt>Location</dt>
              <dd>{item.location}</dd>
            </div>
          ) : null}
          {item.description ? (
            <div>
              <dt>Details</dt>
              <dd className="matchup-imported-description">{item.description}</dd>
            </div>
          ) : null}
        </dl>

        <div className="matchup-imported-note" role="note">
          <Info size={15} aria-hidden="true" />
          <div>
            <p>
              <strong>Converting keeps your existing Google event</strong> — it becomes an appointment
              here and no duplicate is created on Google.
            </p>
            <p>
              If this event was <strong>shared with you by someone else</strong> (you're an invitee, not
              the organizer), converting may not be able to update the copy on Google, and later edits
              here might not sync back to it.
            </p>
          </div>
        </div>

        <div className="matchup-imported-actions">
          <Button onClick={() => onConvert(item, 'PERSONAL')} disabled={saving}>
            <CalendarPlus size={16} /> Convert to Personal
          </Button>
          <Button variant="outline" onClick={() => onConvert(item, 'REQUEST_TRAINER')} disabled={saving}>
            <UserPlus size={16} /> Convert to Request Trainer
          </Button>
        </div>
        <div className="matchup-imported-actions matchup-imported-actions-secondary">
          <Button variant="ghost" onClick={() => onDismiss(item)} disabled={saving}>
            <Trash2 size={16} /> Dismiss
          </Button>
        </div>
      </div>
    </Modal>
  );
}
