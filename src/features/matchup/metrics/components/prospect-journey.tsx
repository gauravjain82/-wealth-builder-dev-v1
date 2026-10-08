import type { ReactNode } from 'react';
import { Ban, Check, Clock, FileQuestion, UserX, X } from 'lucide-react';

import type { JourneyAppointment, Outcome, ProspectJourney } from '../types';
import { OUTCOME_LABELS, OUTCOME_PRIORITY, type OutcomeSegmentKey, formatDate, outcomeSegment } from './format';

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
const ACHIEVEMENTS = ['fna', 'ama', 'sale', 'second_appointment', 'invited_to_bpm'];

/** An icon per outcome, so the step nodes and timeline never rely on colour alone. */
const OUTCOME_ICONS: Record<OutcomeSegmentKey, ReactNode> = {
  showed: <Check size={16} />,
  no_show: <X size={16} />,
  upcoming: <Clock size={14} />,
  result_pending: <FileQuestion size={14} />,
  unanswered: <UserX size={14} />,
  cancelled: <Ban size={14} />,
};

const rank = (outcome: Outcome) => OUTCOME_PRIORITY.indexOf(outcome);

/**
 * Every appointment this prospect had, oldest first — not cut at the window.
 * The step track sums the story up (best outcome per step, across all
 * appointments); the timeline below is the detail, one card per appointment.
 */
export function ProspectJourneyView({ journey, onOpenAppointment }: ProspectJourneyProps) {
  // The journey endpoint names steps by label; map back to the step catalogue.
  const keyByLabel: Record<string, string> = Object.fromEntries(journey.steps.map((step) => [step.label, step.key]));
  const perStep = new Map<string, { best: Outcome; attempts: number }>();
  journey.appointments.forEach((appointment) => {
    appointment.steps.forEach((label) => {
      const key = keyByLabel[label];
      if (!key) return;
      const seen = perStep.get(key);
      perStep.set(key, {
        best: seen && rank(seen.best) <= rank(appointment.outcome) ? seen.best : appointment.outcome,
        attempts: (seen?.attempts ?? 0) + 1,
      });
    });
  });
  const track = journey.steps.filter((step) => !step.historical || perStep.has(step.key));
  const furthest = track.reduce((last, step, index) => (perStep.has(step.key) ? index : last), -1);

  const flags = new Set(journey.appointments.flatMap((appointment) => appointment.flags));
  const referrals = journey.appointments.reduce((sum, appointment) => sum + appointment.referrals, 0);
  const inWindow = journey.appointments.filter((appointment) => appointment.in_window).length;

  return (
    <div className="mm-journey-view">
      <section className="mm-journey-card" aria-label="Journey summary">
        <header>
          <div>
            <h2>{journey.subject.name}</h2>
            {journey.subject.agency_code && <small className="mm-code">{journey.subject.agency_code}</small>}
          </div>
          <span>
            {journey.appointments.length} appointment{journey.appointments.length === 1 ? '' : 's'} · {inWindow} in the
            selected dates
          </span>
        </header>

        <div className="mm-track-wrap">
          <ol className="mm-track">
            {track.map((step, index) => {
              const state = perStep.get(step.key);
              const segment = state ? outcomeSegment(state.best) : null;
              return (
                <li key={step.key} className={index <= furthest ? 'is-reached' : ''}>
                  <span className={`mm-track-node${segment ? ` mm-o--${segment}` : ''}`} aria-hidden="true">
                    {segment ? OUTCOME_ICONS[segment] : index + 1}
                  </span>
                  <strong>{step.label}</strong>
                  <small>
                    {state
                      ? `${OUTCOME_LABELS[state.best]}${state.attempts > 1 ? ` · ${state.attempts} tries` : ''}`
                      : 'Not booked'}
                  </small>
                </li>
              );
            })}
          </ol>
        </div>

        <ul className="mm-achieve">
          {ACHIEVEMENTS.map((flag) => (
            <li key={flag} className={flags.has(flag) ? 'is-yes' : ''}>
              {flags.has(flag) ? <Check size={14} aria-hidden="true" /> : <span aria-hidden="true">·</span>}
              {FLAG_LABELS[flag]}
              <span className="sr-only">{flags.has(flag) ? ': yes' : ': no'}</span>
            </li>
          ))}
          {referrals > 0 && <li className="is-yes">{referrals} referral{referrals === 1 ? '' : 's'}</li>}
        </ul>
      </section>

      <ol className="mm-timeline">
        {journey.appointments.map((appointment) => {
          const segment = outcomeSegment(appointment.outcome);
          return (
            <li key={appointment.id} className={appointment.in_window ? '' : 'is-outside'}>
              <span className={`mm-timeline-dot mm-o--${segment}`} aria-hidden="true" />
              <button type="button" className="mm-timeline-card" onClick={() => onOpenAppointment(appointment)}>
                <div className="mm-journey-head">
                  <strong>{appointment.steps.join(' + ') || appointment.types.join(', ') || 'Untyped'}</strong>
                  <span className="mm-outcome">
                    <i className={`mm-swatch mm-o--${segment}`} />
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
                {(appointment.flags.length > 0 || appointment.referrals > 0) && (
                  <div className="mm-flags">
                    {appointment.flags.map((flag) => (
                      <em key={flag} className="mm-tag">{FLAG_LABELS[flag] ?? flag}</em>
                    ))}
                    {appointment.referrals > 0 && <em className="mm-tag">
                        {appointment.referrals} referral{appointment.referrals === 1 ? '' : 's'}
                      </em>}
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
