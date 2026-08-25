import { useEffect, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { Button, Input, Modal, Select } from '@shared/components/ui';
import { formatAppointmentTime, matchupService } from '../services/matchup-service';
import type { AppointmentListItem, TrainerCandidate } from '../types';

type SegmentScope = 'BASESHOP' | 'SUPERBASE' | 'SUPERTEAM';

const SEGMENT_OPTIONS: Array<{ value: SegmentScope; label: string }> = [
  { value: 'BASESHOP', label: 'BaseShop' },
  { value: 'SUPERBASE', label: 'SuperBase' },
  { value: 'SUPERTEAM', label: 'SuperTeam' },
];

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
  const [city, setCity] = useState('');
  const [segment, setSegment] = useState<SegmentScope>('BASESHOP');
  const [trainersOnly, setTrainersOnly] = useState(false);
  const [candidates, setCandidates] = useState<TrainerCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setCity('');
      setSegment('BASESHOP');
      setTrainersOnly(false);
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
          segment,
          trainersOnly,
          city,
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
  }, [appointment, segment, trainersOnly, city, open, query]);

  return (
    <Modal open={open} title="Assign Trainer" onClose={onClose} contentClassName="matchup-modal-content">
      <div className="matchup-assign-modal">
        {appointment ? (
          <div className="matchup-assign-summary">
            <strong>{appointment.contact_name || `Appointment #${appointment.id}`}</strong>
            <span>{formatAppointmentTime(appointment.start_at)} - {appointment.timezone}</span>
          </div>
        ) : null}

        <div className="matchup-assign-filters">
          <div className="matchup-search-input matchup-search-input--grow">
            <Search size={16} />
            <Input variant="surface" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, agency code, or mobile" />
          </div>
          <div className="matchup-search-input matchup-search-input--city">
            <MapPin size={16} />
            <Input variant="surface" value={city} onChange={(event) => setCity(event.target.value)} placeholder="City" />
          </div>
          <div className="matchup-filter-toggles">
            <Select
              variant="surface"
              value={segment}
              onChange={(event) => setSegment(event.target.value as SegmentScope)}
              aria-label="Segment scope"
            >
              {SEGMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
            <label className="matchup-inline-check">
              <input type="checkbox" checked={trainersOnly} onChange={(event) => setTrainersOnly(event.target.checked)} />
              <span>Trainers Only</span>
            </label>
          </div>
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
