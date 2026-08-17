import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, CheckCircle2, ChevronDown, ChevronRight, Download, MoreHorizontal, NotebookPen, Pencil, UserPlus, XCircle } from 'lucide-react';
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

type GroupKey = number | 'unassigned';

interface TrainerGroup {
  key: GroupKey;
  name: string;
  level?: string | null;
  leaderName?: string | null;
  depth: number;
  items: AppointmentListItem[];
}

interface AppointmentListProps {
  items: AppointmentListItem[];
  count: number;
  statuses: MatchupStatusMeta[];
  loading?: boolean;
  onOpen: (item: AppointmentListItem) => void;
  onViewDetails: (item: AppointmentListItem) => void;
  onOpenContact?: (contactId: number, contactName: string) => void;
  onAssign: (item: AppointmentListItem) => void;
  onComplete: (item: AppointmentListItem) => void;
  onCancel: (item: AppointmentListItem) => void;
  onExport: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  noteDraftByAppointmentId?: Record<number, string>;
  savingNoteAppointmentIds?: Set<number>;
  onNoteDraftChange?: (appointmentId: number, value: string) => void;
  onAddNote?: (appointmentId: number, userId: number) => void;
  onOpenNotes?: (userId: number, contactName: string) => void;
}

export function AppointmentList({
  items,
  count,
  statuses,
  loading = false,
  onOpen,
  onViewDetails,
  onOpenContact,
  onAssign,
  onComplete,
  onCancel,
  onExport,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  noteDraftByAppointmentId = {},
  savingNoteAppointmentIds = new Set(),
  onNoteDraftChange,
  onAddNote,
  onOpenNotes,
}: AppointmentListProps) {
  const [focusedNoteInputId, setFocusedNoteInputId] = useState<number | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<GroupKey>>(new Set());
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore || !onLoadMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingMore) onLoadMore();
      },
      { rootMargin: '200px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, items.length, loadingMore, onLoadMore]);

  // Segregate appointments by assigned trainer, ordered by the trainer's place
  // in the org hierarchy (upline first, shallower depth first), then by name.
  // Unassigned appointments fall into a single bucket that always sorts last.
  const groups = useMemo<TrainerGroup[]>(() => {
    const map = new Map<GroupKey, TrainerGroup>();
    for (const item of items) {
      const key: GroupKey = item.assigned_to ?? 'unassigned';
      let group = map.get(key);
      if (!group) {
        group = {
          key,
          name: key === 'unassigned' ? 'Unassigned' : assignedName(item),
          level: item.assigned_to_level,
          leaderName: item.assigned_to_leader_name,
          depth: item.assigned_to_depth ?? Number.MAX_SAFE_INTEGER,
          items: [],
        };
        map.set(key, group);
      }
      group.items.push(item);
    }
    return [...map.values()].sort((a, b) => {
      if (a.key === 'unassigned') return 1;
      if (b.key === 'unassigned') return -1;
      if (a.depth !== b.depth) return a.depth - b.depth;
      return a.name.localeCompare(b.name);
    });
  }, [items]);

  const toggleGroup = (key: GroupKey) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderRow = (item: AppointmentListItem) => {
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
        <td>
          <span className={`matchup-kind-badge ${item.kind === 'REQUEST_TRAINER' ? 'is-request-trainer' : 'is-personal'}`}>
            {item.kind === 'REQUEST_TRAINER' ? 'Request Trainer' : 'Personal'}
          </span>
        </td>
        <td>
          {item.contact && item.contact_name ? (
            <button
              type="button"
              className="matchup-contact-link"
              onClick={() => onOpenContact?.(item.contact as number, item.contact_name as string)}
              title={`View ${item.contact_name}'s profile`}
            >
              {item.contact_name}
            </button>
          ) : '-'}
        </td>
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
          {(() => {
            const userId = item.contact || item.trainee;
            if (!userId) return '-';

            const draft = noteDraftByAppointmentId[item.id] || '';
            const lastNoteText = typeof item.last_note === 'string'
              ? item.last_note
              : item.last_note?.text || '';
            const isFocused = focusedNoteInputId === item.id;
            const inputValue = isFocused ? draft : draft || lastNoteText;

            return (
              <div className="flex min-w-[220px] flex-col gap-1">
                <div className="flex items-center gap-1">
                  <input
                    className="h-8 min-w-0 flex-1 rounded border border-white/15 bg-white/5 px-2 text-xs outline-none"
                    placeholder="Add note... (Press Enter)"
                    value={inputValue}
                    disabled={savingNoteAppointmentIds.has(item.id)}
                    onFocus={() => setFocusedNoteInputId(item.id)}
                    onBlur={() => setFocusedNoteInputId((current) => (current === item.id ? null : current))}
                    onChange={(event) => onNoteDraftChange?.(item.id, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        onAddNote?.(item.id, userId);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="View all contact notes"
                    aria-label={`View all notes for ${item.contact_name || item.trainee_name || 'contact'}`}
                    onClick={() => onOpenNotes?.(userId, item.contact_name || item.trainee_name || 'Contact')}
                  >
                    <NotebookPen size={15} />
                  </Button>
                </div>
                {lastNoteText && !isFocused && !draft ? (
                  <div className="truncate text-[11px] text-slate-500">
                    {typeof item.last_note === 'object' && item.last_note?.created_by_name
                      ? `${item.last_note.created_by_name} • ${new Date(item.last_note.created_at || '').toLocaleString()}`
                      : '-'}
                  </div>
                ) : null}
              </div>
            );
          })()}
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
                size="sm"
                aria-label="Record appointment result"
                title="Record the outcome of this appointment"
                className="matchup-action-button matchup-result-pill is-complete"
                onClick={() => onComplete(item)}
              >
                <CheckCircle2 size={15} />
                <span>Result Required</span>
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
              onClick={() => onViewDetails(item)}
            >
              <MoreHorizontal size={15} />
            </Button>
          </div>
        </td>
      </tr>
    );
  };

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
        <div className="matchup-trainer-groups">
          {groups.map((group) => {
            const collapsed = collapsedGroups.has(group.key);
            return (
              <div key={group.key} className="matchup-trainer-group">
                <button
                  type="button"
                  className="matchup-trainer-group-header"
                  aria-expanded={!collapsed}
                  onClick={() => toggleGroup(group.key)}
                >
                  {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  <span className="matchup-trainer-group-title">{group.name}</span>
                  {group.level ? <span className="matchup-trainer-level">{group.level}</span> : null}
                  {group.leaderName ? <span className="matchup-trainer-leader">under {group.leaderName}</span> : null}
                  <span className="matchup-trainer-count">{group.items.length}</span>
                </button>
                {collapsed ? null : (
                  <div className="matchup-table-wrap">
                    <table className="matchup-table">
                      <thead>
                        <tr>
                          <th>When</th>
                          <th>Kind</th>
                          <th>Contact</th>
                          <th>Trainee</th>
                          <th>Trainer</th>
                          <th>Types</th>
                          <th>Location</th>
                          <th>Notes</th>
                          <th aria-label="Actions" />
                        </tr>
                      </thead>
                      <tbody>{group.items.map(renderRow)}</tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
          {hasMore ? (
            <div ref={loadMoreRef} className="matchup-muted" style={{ padding: '0.75rem', textAlign: 'center' }}>
              {loadingMore ? 'Loading more appointments...' : 'Scroll to load more'}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
