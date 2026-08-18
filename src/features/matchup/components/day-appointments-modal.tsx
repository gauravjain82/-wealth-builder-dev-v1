import { Fragment, useEffect, useMemo, useState } from 'react';
import { Eye, FileText } from 'lucide-react';
import { Modal } from '@shared/components/ui';
import { formatAppointmentTime, matchupService } from '../services/matchup-service';
import type {
  AppointmentListItem,
  CalendarAppointment,
  DayAppointmentGroup,
  DayAppointmentItem,
  MatchupStatusMeta,
} from '../types';
import { appointmentTitle, assignedName } from './month-calendar';
import { StatusBadge } from './status-badge';

interface DayAppointmentsModalProps {
  date: Date | null;
  items: CalendarAppointment[];
  appointmentsById: Record<number, AppointmentListItem>;
  statuses: MatchupStatusMeta[];
  segment?: string;
  onClose: () => void;
  onItemClick?: (id: number) => void;
}

interface StatusOption {
  value: string;
  label: string;
  color: string;
  count: number;
}

const UNASSIGNED_KEY = '__unassigned__';

function kindLabel(kind: string) {
  return kind === 'PERSONAL' ? 'Personal' : 'Request Trainer';
}

function whenTime(item: DayAppointmentItem) {
  return formatAppointmentTime(item.start_at, {
    month: undefined,
    day: undefined,
    timeZone: item.timezone,
    timeZoneName: 'short',
  });
}

function locationText(item: DayAppointmentItem) {
  if (item.location_type === 'VIRTUAL') return item.url_nickname || 'Virtual';
  return [item.city, item.state].filter(Boolean).join(', ') || 'In person';
}

function formatRescheduleTime(value: string, timezone?: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone || undefined,
    timeZoneName: 'short',
  }).format(new Date(value));
}

export function DayAppointmentsModal({
  date,
  items,
  appointmentsById,
  statuses,
  segment,
  onClose,
  onItemClick,
}: DayAppointmentsModalProps) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [groups, setGroups] = useState<DayAppointmentGroup[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    matchupService
      .dayGrouped(date, segment)
      .then((response) => {
        if (!cancelled) setGroups(response.groups);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load appointments.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, segment]);

  // Status chips are derived from the loaded rich groups when available, else
  // from the lean calendar items so the modal still works during load/on error.
  const allItems = useMemo<{ status: string; status_label?: string; status_color?: string }[]>(
    () => (groups ? groups.flatMap((group) => group.appointments) : items),
    [groups, items],
  );

  const statusOptions = useMemo<StatusOption[]>(() => {
    const map = new Map<string, StatusOption>();
    allItems.forEach((item) => {
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
  }, [allItems, statuses]);

  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    return groups
      .map((group) => ({
        ...group,
        appointments: group.appointments.filter(
          (item) => statusFilter === 'all' || item.status === statusFilter,
        ),
      }))
      .filter((group) => group.appointments.length > 0);
  }, [groups, statusFilter]);

  const totalCount = allItems.length;
  const visibleCount = useMemo(
    () => filteredGroups.reduce((total, group) => total + group.appointments.length, 0),
    [filteredGroups],
  );

  // Fallback list (name + time only) from calendar items, used when the rich
  // day endpoint failed but we still have the month calendar payload.
  const fallbackGroups = useMemo(() => {
    const map = new Map<string, { key: string; title: string; items: CalendarAppointment[] }>();
    items
      .filter((item) => statusFilter === 'all' || item.status === statusFilter)
      .forEach((item) => {
        const trainerName = assignedName(item, appointmentsById[item.id]);
        const key = trainerName || UNASSIGNED_KEY;
        const bucket = map.get(key);
        if (bucket) {
          bucket.items.push(item);
          return;
        }
        map.set(key, { key, title: trainerName || 'Awaiting Trainer', items: [item] });
      });
    const unassigned = map.get(UNASSIGNED_KEY);
    const assigned = [...map.values()]
      .filter((group) => group.key !== UNASSIGNED_KEY)
      .sort((a, b) => a.title.localeCompare(b.title));
    return unassigned ? [unassigned, ...assigned] : assigned;
  }, [items, statusFilter, appointmentsById]);

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
        {visibleCount} of {totalCount} appointment{totalCount === 1 ? '' : 's'}
      </p>

      {statusOptions.length > 1 ? (
        <div className="matchup-day-filter" role="group" aria-label="Filter by status">
          <button
            type="button"
            className={`matchup-day-filter-chip ${statusFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All <span>{totalCount}</span>
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

      {error ? <p className="matchup-day-modal-error">{error}</p> : null}

      <div className="matchup-day-modal-list">
        {loading && !groups ? (
          <p className="matchup-muted">Loading appointments…</p>
        ) : groups ? (
          filteredGroups.length === 0 ? (
            <p className="matchup-muted">No appointments match this status.</p>
          ) : (
            filteredGroups.map((group) => (
              <section key={group.trainer?.id ?? UNASSIGNED_KEY} className="matchup-day-modal-group">
                <header className="matchup-day-modal-group-header">
                  <span className="matchup-day-modal-group-title">{group.title}</span>
                  <span className="matchup-day-modal-group-count">{group.appointments.length}</span>
                </header>
                <div className="matchup-day-table-wrap">
                  <table className="matchup-day-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Appt. Kind</th>
                        <th>When/Where</th>
                        <th>Appt. Type</th>
                        <th>Contact Name</th>
                        <th>Trainee</th>
                        <th>Notes</th>
                        <th>Results</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.appointments.map((item, index) => (
                        <Fragment key={item.id}>
                        <tr onClick={() => onItemClick?.(item.id)}>
                          <td>{index + 1}</td>
                          <td>
                            <span className={`matchup-kind-badge kind-${item.kind.toLowerCase()}`}>
                              {kindLabel(item.kind)}
                            </span>
                          </td>
                          <td>
                            <strong>{whenTime(item)}</strong>
                            <span className="matchup-day-cell-sub">{locationText(item)}</span>
                          </td>
                          <td>
                            {item.types.length ? (
                              <span className="matchup-day-types">
                                {item.types.map((type) => (
                                  <span key={type.id} className="matchup-day-type-chip">
                                    {type.name}
                                  </span>
                                ))}
                              </span>
                            ) : (
                              <span className="matchup-day-cell-sub">—</span>
                            )}
                          </td>
                          <td>
                            <strong>{item.contact_name || '—'}</strong>
                            {item.contact_phone ? <span className="matchup-day-cell-sub">{item.contact_phone}</span> : null}
                            {item.contact_email ? <span className="matchup-day-cell-sub">{item.contact_email}</span> : null}
                          </td>
                          <td>
                            <strong>{item.trainee_name || '—'}</strong>
                            {item.trainee_phone ? <span className="matchup-day-cell-sub">{item.trainee_phone}</span> : null}
                            {item.trainee_email ? <span className="matchup-day-cell-sub">{item.trainee_email}</span> : null}
                          </td>
                          <td>
                            {item.last_note?.text ? (
                              <span className="matchup-day-note">
                                <FileText size={13} aria-hidden="true" />
                                {item.last_note.text}
                              </span>
                            ) : (
                              <span className="matchup-day-cell-sub">—</span>
                            )}
                          </td>
                          <td>
                            <span className="matchup-day-results">
                              <StatusBadge
                                status={item.status}
                                label={item.status_label}
                                color={item.status_color}
                                statuses={statuses}
                              />
                              {item.created_by_name ? (
                                <span className="matchup-day-created-by">Created by {item.created_by_name}</span>
                              ) : null}
                              <Eye size={15} aria-hidden="true" />
                            </span>
                          </td>
                        </tr>
                        {item.reschedules && item.reschedules.length ? (
                          <tr className="matchup-day-reschedule-row">
                            <td colSpan={8}>
                              {item.reschedules.map((reschedule) => (
                                <span key={reschedule.id} className="matchup-day-reschedule-chip">
                                  Rescheduled for {formatRescheduleTime(reschedule.new_start_at, reschedule.new_timezone)}
                                </span>
                              ))}
                            </td>
                          </tr>
                        ) : null}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))
          )
        ) : fallbackGroups.length === 0 ? (
          <p className="matchup-muted">No appointments match this status.</p>
        ) : (
          fallbackGroups.map((group) => (
            <section key={group.key} className="matchup-day-modal-group">
              <header className="matchup-day-modal-group-header">
                <span className="matchup-day-modal-group-title">{group.title}</span>
                <span className="matchup-day-modal-group-count">{group.items.length}</span>
              </header>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="matchup-day-modal-item"
                  onClick={() => onItemClick?.(item.id)}
                >
                  <div>
                    <strong>{appointmentTitle(item)}</strong>
                    <span>{formatAppointmentTime(item.start_at, { month: undefined, day: undefined })}</span>
                  </div>
                  <span className="matchup-day-modal-item-actions">
                    <StatusBadge status={item.status} label={item.status_label} color={item.status_color} statuses={statuses} />
                    <Eye size={15} aria-hidden="true" />
                  </span>
                </button>
              ))}
            </section>
          ))
        )}
      </div>
    </Modal>
  );
}
