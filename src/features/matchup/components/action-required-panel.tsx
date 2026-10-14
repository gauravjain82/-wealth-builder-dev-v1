import { Check, Eye, PanelLeftClose, PanelLeftOpen, UserPlus, X } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { formatAppointmentTime } from '../services/matchup-service';
import type { AppointmentListItem, MatchupStatusMeta } from '../types';
import { StatusBadge } from './status-badge';

interface ActionRequiredPanelProps {
  items: AppointmentListItem[];
  statuses: MatchupStatusMeta[];
  canTakeAction?: boolean;
  onAssign: (item: AppointmentListItem) => void;
  onAccept: (item: AppointmentListItem) => void;
  onDecline: (item: AppointmentListItem) => void;
  onView: (item: AppointmentListItem) => void;
  busy?: boolean;
  /** Minimized to a rail (a bar on narrow screens) so the list gets the room. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export function ActionRequiredPanel({
  items,
  statuses,
  canTakeAction = false,
  onAssign,
  onAccept,
  onDecline,
  onView,
  busy = false,
  collapsed = false,
  onToggleCollapsed,
}: ActionRequiredPanelProps) {
  if (collapsed) {
    return (
      <section className="matchup-panel matchup-action-panel is-collapsed">
        <button
          type="button"
          className="matchup-action-rail"
          aria-expanded={false}
          aria-label={`Expand Action Required (${items.length} waiting)`}
          title="Expand Action Required"
          onClick={onToggleCollapsed}
        >
          <PanelLeftOpen size={16} aria-hidden />
          <span className={`matchup-action-rail-count${items.length ? ' has-items' : ''}`}>{items.length}</span>
          <span className="matchup-action-rail-label">Action Required</span>
        </button>
      </section>
    );
  }

  return (
    <section className="matchup-panel matchup-action-panel">
      <div className="matchup-panel-header">
        <h2>Action Required</h2>
        <div className="matchup-action-panel-tools">
          <span>{items.length}</span>
          {onToggleCollapsed ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-expanded
              aria-label="Minimize Action Required"
              title="Minimize Action Required"
              onClick={onToggleCollapsed}
            >
              <PanelLeftClose size={16} />
            </Button>
          ) : null}
        </div>
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
              <div className="matchup-row-actions">
                <Button variant="outline" size="sm" onClick={() => onView(item)} title="View appointment" aria-label="View appointment">
                  <Eye size={15} /> View
                </Button>
                {canTakeAction && (
                  item.status === 'REQUESTED' ? (
                    <Button variant="default" size="sm" onClick={() => onAssign(item)} disabled={busy}>
                      <UserPlus size={12} /> Assign
                    </Button>
                  ) : (
                    <>
                    <Button variant="default" size="sm" onClick={() => onAccept(item)} disabled={busy}>
                      <Check size={12} /> Accept
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDecline(item)} disabled={busy}>
                      <X size={12} /> Decline
                    </Button>
                    </>
                  )
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
