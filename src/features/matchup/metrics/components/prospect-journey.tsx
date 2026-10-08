import type { JourneyAppointment, ProspectJourney } from '../types';
import { OUTCOME_LABELS, formatDate } from './format';

interface ProspectJourneyProps {
  journey: ProspectJourney;
  onOpenAppointment: (appointment: JourneyAppointment) => void;
}

const FLAG_LABELS: Record<string, string> = {
  fna: 'FNA',
  ama: 'AMA',
  sale: 'Sale',
  second_appointment: '2nd appt booked',
  invited_to_bpm: 'Invited to BPM',
};

/** Every appointment this prospect had, oldest first — not cut at the window. */
export function ProspectJourneyView({ journey, onOpenAppointment }: ProspectJourneyProps) {
  return (
    <ol className="mm-journey">
      {journey.appointments.map((appointment) => (
        <li
          key={appointment.id}
          className={appointment.in_window ? '' : 'mm-journey--outside'}
          onClick={() => onOpenAppointment(appointment)}
        >
          <div className="mm-journey-head">
            <strong>{appointment.steps.join(' + ') || appointment.types.join(', ') || 'Untyped'}</strong>
            <span className={`mm-outcome mm-outcome--${appointment.outcome}`}>
              {OUTCOME_LABELS[appointment.outcome]}
            </span>
          </div>
          <div className="mm-journey-meta">
            <span>{formatDate(appointment.start_at)}</span>
            <span>{appointment.kind === 'PERSONAL' ? 'Personal' : 'Trainer request'}</span>
            <span>Agent: {appointment.agent.name || '—'}</span>
            {appointment.kind === 'REQUEST_TRAINER' && <span>Trainer: {appointment.trainer.name || '—'}</span>}
            {!appointment.in_window && <span>outside selected dates</span>}
          </div>
          {appointment.flags.length > 0 && (
            <div className="mm-flags">
              {appointment.flags.map((flag) => (
                <em key={flag} className="mm-tag">{FLAG_LABELS[flag] ?? flag}</em>
              ))}
              {appointment.referrals > 0 && <em className="mm-tag">{appointment.referrals} referrals</em>}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
