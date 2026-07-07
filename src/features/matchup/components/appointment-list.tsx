import { CalendarClock, CheckCircle2, Download, MoreHorizontal, Pencil, UserPlus, XCircle } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { formatAppointmentTime } from '../services/matchup-service';
import type { AppointmentListItem, MatchupStatusMeta } from '../types';

function assignedName(item: AppointmentListItem) {
  return item.assigned_to_name || item.assigned_to_detail?.name || '-';
}

function statusLabel(item: AppointmentListItem, statuses: MatchupStatusMeta[]) {
  return item.status_label || statuses.find((status) => status.value === item.status)?.label || item.status.replace(/_/g, ' ');
}

function statusColor(item: AppointmentListItem, statuses: MatchupStatusMeta[]) {
  return item.status_color || statuses.find((status) => status.value === item.status)?.color || '#64748b';
}

function locationText(item: AppointmentListItem) {
  if (item.location_type === 'VIRTUAL') return item.url_nickname || 'Zoom link';
  return [item.address, item.city, item.state, item.zip_code].filter(Boolean).join(', ') || '-';
}

interface AppointmentListProps {
  items: AppointmentListItem[];
  count: number;
  statuses: MatchupStatusMeta[];
  loading?: boolean;
  onOpen: (item: AppointmentListItem) => void;
  onAssign: (item: AppointmentListItem) => void;
  onComplete: (item: AppointmentListItem) => void;
  onCancel: (item: AppointmentListItem) => void;
  onExport: () => void;
}

export function AppointmentList({
  items,
  count,
  statuses,
  loading = false,
  onOpen,
  onAssign,
  onComplete,
  onCancel,
  onExport,
}: AppointmentListProps) {
  return (
    <section className="matchup-panel matchup-list-panel">
      <div className="matchup-panel-header">
        <div>
          <h2>Appointments</h2>
          <p>{count} visible records</p>
        </div>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download size={15} /> Export
        </Button>
      </div>

      {loading ? (
        <p className="matchup-muted">Loading appointments...</p>
      ) : items.length === 0 ? (
        <p className="matchup-muted">No appointments match the current filters.</p>
      ) : (
        <div className="matchup-table-wrap">
          <table className="matchup-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Contact</th>
                <th>Trainee</th>
                <th>Trainer</th>
                <th>Types</th>
                <th>Location</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const color = statusColor(item, statuses);
                return (
                <tr key={item.id} style={{ ['--appointment-status-color' as string]: color }}>
                  <td className="matchup-when-cell">
                    <div className="matchup-cell-main">
                      <CalendarClock size={15} />
                      <span>{formatAppointmentTime(item.start_at)}</span>
                    </div>
                    <small>{item.timezone}</small>
                    <span className="matchup-row-status" style={{ color }}>{statusLabel(item, statuses)}</span>
                  </td>
                  <td>{item.contact_name || '-'}</td>
                  <td>{item.trainee_name || '-'}</td>
                  <td>{assignedName(item)}</td>
                  <td>
                    <div className="matchup-type-pills">
                      {item.types.length ? item.types.map((type) => <span key={type.id}>{type.name}</span>) : <span>Personal</span>}
                    </div>
                  </td>
                  <td className="matchup-location-cell">
                    {item.location_type === 'VIRTUAL' && item.url ? (
                      <a href={item.url} target="_blank" rel="noreferrer" title={item.url}>
                        {locationText(item)}
                      </a>
                    ) : (
                      <span title={locationText(item)}>{locationText(item)}</span>
                    )}
                  </td>
                  <td>
                    <div className="matchup-row-actions">
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Edit appointment"
                        title="Edit appointment"
                        className="matchup-action-button is-edit"
                        onClick={() => onOpen(item)}
                      >
                        <Pencil size={15} />
                      </Button>
                      {item.status === 'REQUESTED' ? (
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Assign trainer"
                          title="Assign trainer"
                          className="matchup-action-button is-assign"
                          onClick={() => onAssign(item)}
                        >
                          <UserPlus size={15} />
                        </Button>
                      ) : null}
                      {['ACCEPTED', 'RESCHEDULED'].includes(item.status) ? (
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Complete follow up"
                          title="Complete follow up"
                          className="matchup-action-button is-complete"
                          onClick={() => onComplete(item)}
                        >
                          <CheckCircle2 size={15} />
                        </Button>
                      ) : null}
                      {!['DONE', 'CANCELLED', 'NOT_INTERESTED'].includes(item.status) ? (
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Cancel appointment"
                          title="Cancel appointment"
                          className="matchup-action-button is-cancel"
                          onClick={() => onCancel(item)}
                        >
                          <XCircle size={15} />
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="More appointment details"
                        title="More appointment details"
                        className="matchup-action-button is-more"
                        onClick={() => onOpen(item)}
                      >
                        <MoreHorizontal size={15} />
                      </Button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
