import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Button, Input, Modal } from '@shared/components/ui';
import { formatAppointmentTime, matchupService } from '../services/matchup-service';
import type { AppointmentListItem, TrainerCandidate } from '../types';

interface AssignTrainerModalProps {
  open: boolean;
  appointment: AppointmentListItem | null;
  saving?: boolean;
  onClose: () => void;
  onAssign: (trainerId: number) => Promise<void>;
}

export function AssignTrainerModal({
  open,
  appointment,
  saving = false,
  onClose,
  onAssign,
}: AssignTrainerModalProps) {
  const [query, setQuery] = useState('');
  const [baseOnly, setBaseOnly] = useState(true);
  const [candidates, setCandidates] = useState<TrainerCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setCandidates([]);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !appointment) return;
    const handle = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await matchupService.trainerSearch({
          q: query,
          baseOnly,
          start: appointment.start_at,
          end: appointment.end_at,
        });
        setCandidates(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search trainers');
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(handle);
  }, [appointment, baseOnly, open, query]);

  return (
    <Modal open={open} title="Assign Trainer" onClose={onClose} contentClassName="matchup-modal-content">
      <div className="matchup-assign-modal">
        {appointment ? (
          <div className="matchup-assign-summary">
            <strong>{appointment.contact_name || `Appointment #${appointment.id}`}</strong>
            <span>{formatAppointmentTime(appointment.start_at)} - {appointment.timezone}</span>
          </div>
        ) : null}

        <div className="matchup-search-row">
          <div className="matchup-search-input">
            <Search size={16} />
            <Input variant="surface" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or agency code" />
          </div>
          <label className="matchup-inline-check">
            <input type="checkbox" checked={baseOnly} onChange={(event) => setBaseOnly(event.target.checked)} />
            <span>Base Only</span>
          </label>
        </div>

        {error ? <div className="matchup-form-error">{error}</div> : null}
        {loading ? <p className="matchup-muted">Searching trainers...</p> : null}

        <div className="matchup-candidate-list">
          {candidates.map((candidate) => (
            <article key={candidate.id} className="matchup-candidate-row">
              <div>
                <strong>{candidate.name}</strong>
                <span>{[candidate.agency_code, candidate.phone].filter(Boolean).join(' | ')}</span>
                {candidate.busy.length ? (
                  <small>Busy: {candidate.busy.map((slot) => formatAppointmentTime(slot.start_at)).join(', ')}</small>
                ) : (
                  <small>Available for this slot</small>
                )}
              </div>
              <Button disabled={saving} onClick={() => void onAssign(candidate.id)}>
                {saving ? 'Assigning...' : 'Assign'}
              </Button>
            </article>
          ))}
          {!loading && candidates.length === 0 ? <p className="matchup-muted">No trainers found.</p> : null}
        </div>
      </div>
    </Modal>
  );
}
