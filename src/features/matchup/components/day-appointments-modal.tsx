import { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import { Modal } from '@shared/components/ui';
import { formatAppointmentTime } from '../services/matchup-service';
import type { AppointmentListItem, CalendarAppointment, MatchupStatusMeta } from '../types';
import { appointmentTitle, assignedName } from './month-calendar';
import { StatusBadge } from './status-badge';

interface DayAppointmentsModalProps {
  date: Date | null;
  items: CalendarAppointment[];
  appointmentsById: Record<number, AppointmentListItem>;
  statuses: MatchupStatusMeta[];
  onClose: () => void;
  onItemClick?: (id: number) => void;
}

interface StatusOption {
  value: string;
  label: string;
  color: string;
  count: number;
}

export function DayAppointmentsModal({
  date,
  items,
  appointmentsById,
  statuses,
  onClose,
  onItemClick,
}: DayAppointmentsModalProps) {
  const [statusFilter, setStatusFilter] = useState('all');

  const statusOptions = useMemo<StatusOption[]>(() => {
    const map = new Map<string, StatusOption>();
    items.forEach((item) => {
      const meta = statuses.find((entry) => entry.value === item.status);
      const existing = map.get(item.status);
      if (existing) {
        existing.count += 1;
        return;
      }
      map.set(item.status, {
        value: item.status,
        label: item.status_label || meta?.label || item.status.replace(/_/g, ' '),
        color: item.status_color || meta?.color || '#64748b',
        count: 1,
      });
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [items, statuses]);

  const sorted = useMemo(
    () =>
      [...items]
        .filter((item) => statusFilter === 'all' || item.status === statusFilter)
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()),
    [items, statusFilter],
  );

  if (!date) return null;

  const title = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);

  return (
    <Modal open title={title} onClose={onClose} contentClassName="matchup-modal-content matchup-day-modal">
      <p className="matchup-muted matchup-day-modal-count">
        {sorted.length} of {items.length} appointment{items.length === 1 ? '' : 's'}
      </p>

      {statusOptions.length > 1 ? (
        <div className="matchup-day-filter" role="group" aria-label="Filter by status">
          <button
            type="button"
            className={`matchup-day-filter-chip ${statusFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All <span>{items.length}</span>
          </button>
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`matchup-day-filter-chip ${statusFilter === option.value ? 'is-active' : ''}`}
              style={{ ['--status-color' as string]: option.color }}
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label} <span>{option.count}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="matchup-day-modal-list">
        {sorted.length === 0 ? (
          <p className="matchup-muted">No appointments match this status.</p>
        ) : (
          sorted.map((item) => {
            const trainerName = assignedName(item, appointmentsById[item.id]);
            return (
              <button
                key={item.id}
                type="button"
                className="matchup-day-modal-item"
                onClick={() => onItemClick?.(item.id)}
              >
                <div>
                  <strong>{appointmentTitle(item)}</strong>
                  <span>{formatAppointmentTime(item.start_at, { month: undefined, day: undefined })}</span>
                  {trainerName ? <small>Assigned to {trainerName}</small> : null}
                </div>
                <span className="matchup-day-modal-item-actions">
                  <StatusBadge status={item.status} label={item.status_label} color={item.status_color} statuses={statuses} />
                  <Eye size={15} aria-hidden="true" />
                </span>
              </button>
            );
          })
        )}
      </div>
    </Modal>
  );
}
