import { Check, UserPlus, X } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { formatAppointmentTime } from '../services/matchup-service';
import type { AppointmentListItem, MatchupStatusMeta } from '../types';
import { StatusBadge } from './status-badge';

interface ActionRequiredPanelProps {
  items: AppointmentListItem[];
  statuses: MatchupStatusMeta[];
  onAssign: (item: AppointmentListItem) => void;
  onAccept: (item: AppointmentListItem) => void;
  onDecline: (item: AppointmentListItem) => void;
  busy?: boolean;
}

export function ActionRequiredPanel({
  items,
  statuses,
  onAssign,
  onAccept,
  onDecline,
  busy = false,
}: ActionRequiredPanelProps) {
  return (
    <section className="matchup-panel">
      <div className="matchup-panel-header">
        <h2>Action Required</h2>
        <span>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="matchup-muted">No matchup actions waiting on you.</p>
      ) : (
        <div className="matchup-action-list">
          {items.map((item) => (
            <article key={item.id} className="matchup-action-row">
              <div>
                <strong>{item.contact_name || item.trainee_name || `Appointment #${item.id}`}</strong>
                <span>{formatAppointmentTime(item.start_at)}</span>
                <StatusBadge
                  status={item.status}
                  label={item.status_label}
                  color={item.status_color}
                  statuses={statuses}
                />
              </div>
              {item.status === 'REQUESTED' ? (
                <Button size="sm" onClick={() => onAssign(item)} disabled={busy}>
                  <UserPlus size={15} /> Assign
                </Button>
              ) : (
                <div className="matchup-row-actions">
                  <Button size="sm" onClick={() => onAccept(item)} disabled={busy}>
                    <Check size={15} /> Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onDecline(item)} disabled={busy}>
                    <X size={15} /> Decline
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
