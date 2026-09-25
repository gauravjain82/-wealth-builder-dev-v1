import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button, DateRangePicker, Input, LoadingState, Select, type DateRangeValue } from '@shared/components';
import { useToastStore } from '@/store';
import { BPMCard, BPMPageShell } from '../components/bpm-page-shell';
import { BPMFormModal } from '../components/bpm-form-modal';
import { StatusBadge, StatusControl } from '../components/status-control';
import { OccurrenceRowActions } from '../components/occurrence-row-actions';
import { AttachmentsModal } from '../components/event-attachments';
import { useAttachmentsDownloadAllowed } from '../context/bpm-config-context';
import { bpmService, formatOccurrenceTime } from '../services/bpm-service';
import type {
  BPMCapabilities,
  BPMEventAttachment,
  BPMOccurrence,
  BPMEventDetail,
  BPMStatusOverride,
  OccurrenceFilters,
} from '../types';

/** The calendar date an occurrence runs on, in its own timezone (YYYY-MM-DD). */
const occurrenceLocalDate = (occurrence: BPMOccurrence): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: occurrence.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(occurrence.start_at));

const locationLabel = (occurrence: BPMOccurrence): string =>
  occurrence.location_detail?.label ||
  (occurrence.location_detail?.kind === 'ONLINE' ? 'Online' : 'In person');

interface OccurrenceGroup {
  key: string;
  eventId: number;
  eventName: string;
  date: string;
  occurrences: BPMOccurrence[];
  guestCount: number;
  checkedInCount: number;
}

/** Group the flat occurrence list by (event, local date) for the expandable rows. */
const groupOccurrences = (occurrences: BPMOccurrence[]): OccurrenceGroup[] => {
  const groups = new Map<string, OccurrenceGroup>();
  for (const occurrence of occurrences) {
    const date = occurrenceLocalDate(occurrence);
    const key = `${occurrence.event}::${date}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        eventId: occurrence.event,
        eventName: occurrence.event_name,
        date,
        occurrences: [],
        guestCount: 0,
        checkedInCount: 0,
      };
      groups.set(key, group);
    }
    group.occurrences.push(occurrence);
    group.guestCount += occurrence.guest_count;
    group.checkedInCount += occurrence.checked_in_count;
  }
  return Array.from(groups.values());
};

export default function BpmSchedulePage() {
  const addToast = useToastStore((state) => state.addToast);
  const [range, setRange] = useState<DateRangeValue>({ startDate: '', endDate: '' });
  const [city, setCity] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [segment, setSegment] = useState('');
  const [occurrences, setOccurrences] = useState<BPMOccurrence[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<BPMEventDetail | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [capabilities, setCapabilities] = useState<BPMCapabilities | null>(null);
  const [attachmentsFor, setAttachmentsFor] = useState<{
    name: string;
    attachments: BPMEventAttachment[];
  } | null>(null);
  // D11: a UI gate only — the CDN URL stays reachable either way.
  const allowDownload = useAttachmentsDownloadAllowed();

  // BPM Schedule is the CRUD surface and the only list that shows HIDDEN /
  // CANCELLED / DELETED rows. Below broker level the page stays read-only.
  const canManage = Boolean(capabilities?.can_manage_schedule);

  const toggleGroup = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const filters = useMemo<OccurrenceFilters>(
    () => ({
      start_after: range.startDate ? new Date(`${range.startDate}T00:00:00`).toISOString() : undefined,
      start_before: range.endDate ? new Date(`${range.endDate}T23:59:59`).toISOString() : undefined,
      city: city.trim() || undefined,
      state: stateFilter.trim() || undefined,
      segment: segment || undefined,
      include_concealed: canManage,
      page_size: 100,
    }),
    [range, city, stateFilter, segment, canManage],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bpmService.occurrences(filters);
      setOccurrences(data.results);
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load BPMs' });
    } finally {
      setLoading(false);
    }
  }, [addToast, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    bpmService.capabilities().then(setCapabilities).catch(() => setCapabilities(null));
  }, []);

  /** Hard-set (or clear) one date's status, then refresh the list. */
  const changeStatus = async (
    occurrence: BPMOccurrence,
    next: BPMStatusOverride | null,
  ) => {
    setBusy(true);
    try {
      await bpmService.setOccurrenceStatus(occurrence.id, next);
      addToast({ type: 'success', message: 'Status updated.' });
      await load();
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update status',
      });
    } finally {
      setBusy(false);
    }
  };

  /** Open the attachments popup for a row's BPM. */
  const openAttachments = async (occurrence: BPMOccurrence) => {
    setBusy(true);
    try {
      const detail = await bpmService.event(occurrence.event);
      setAttachmentsFor({ name: detail.name, attachments: detail.attachments || [] });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to load attachments',
      });
    } finally {
      setBusy(false);
    }
  };

  const groups = useMemo(() => groupOccurrences(occurrences), [occurrences]);

  const openCreate = () => {
    setEditingEvent(null);
    setFormOpen(true);
  };

  const openEdit = async (occurrence: BPMOccurrence) => {
    setBusy(true);
    try {
      const detail = await bpmService.event(occurrence.event);
      setEditingEvent(detail);
      setFormOpen(true);
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load BPM' });
    } finally {
      setBusy(false);
    }
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingEvent(null);
  };

  return (
    <BPMPageShell
      title="BPM Schedule"
      description="Create BPMs and browse upcoming occurrences by date, location, or team."
      actions={canManage ? <Button onClick={openCreate}>Create BPM</Button> : null}
    >
      <BPMCard className="mb-4">
        <div className="grid gap-3 md:grid-cols-4">
          <DateRangePicker value={range} onChange={setRange} startLabel="From" endLabel="To" />
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-white/80">City</span>
            <Input variant="surface" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Dallas" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-white/80">State</span>
            <Input variant="surface" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} placeholder="TX" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-white/80">Team scope</span>
            <Select variant="surface" value={segment} onChange={(e) => setSegment(e.target.value)}>
              <option value="">Baseshop</option>
              <option value="SUPERBASE">Super Base</option>
              <option value="SUPERTEAM">Super Team</option>
            </Select>
          </label>
        </div>
      </BPMCard>

      <BPMCard>
        {loading ? (
          <LoadingState />
        ) : occurrences.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
            No BPM occurrences match these filters.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-white/60">
                  <th className="px-3 py-2">BPM</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2">Guests</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const isOpen = expanded.has(group.key);
                  return (
                    <Fragment key={group.key}>
                      <tr
                        className="cursor-pointer border-t border-slate-100 bg-slate-50/50 dark:border-white/10 dark:bg-white/5"
                        onClick={() => toggleGroup(group.key)}
                      >
                        <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                          <span className="inline-flex items-center gap-1.5">
                            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            {group.eventName}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-white/80">
                          {formatOccurrenceTime(group.occurrences[0].start_at, {
                            hour: undefined,
                            minute: undefined,
                          })}
                        </td>
                        <td className="px-3 py-2 text-slate-500 dark:text-white/60">
                          {group.occurrences.length}{' '}
                          {group.occurrences.length === 1 ? 'location' : 'locations'}
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-white/80">
                          {group.checkedInCount}/{group.guestCount}
                        </td>
                        <td className="px-3 py-2" />
                        <td className="px-3 py-2" />
                      </tr>
                      {isOpen
                        ? group.occurrences.map((occurrence) => (
                            <tr
                              key={occurrence.id}
                              className="border-t border-slate-100 dark:border-white/10"
                            >
                              <td className="px-3 py-2" />
                              <td className="px-3 py-2 text-slate-700 dark:text-white/80">
                                {formatOccurrenceTime(occurrence.start_at)} ({occurrence.timezone})
                              </td>
                              <td className="px-3 py-2 text-slate-700 dark:text-white/80">
                                {locationLabel(occurrence)}
                              </td>
                              <td className="px-3 py-2 text-slate-700 dark:text-white/80">
                                {occurrence.checked_in_count}/{occurrence.guest_count}
                              </td>
                              <td className="px-3 py-2 text-slate-700 dark:text-white/80">
                                {canManage ? (
                                  <StatusControl
                                    effectiveStatus={occurrence.effective_status}
                                    statusOverride={occurrence.status_override}
                                    disabled={busy}
                                    onChange={(next) => void changeStatus(occurrence, next)}
                                  />
                                ) : (
                                  <StatusBadge status={occurrence.effective_status} />
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex flex-wrap justify-end gap-2">
                                  {/* Same jump-to-sub-tool actions as BPM
                                      Overview, per the brief. */}
                                  <OccurrenceRowActions
                                    occurrences={[occurrence]}
                                    selected={occurrence}
                                    onSelect={() => undefined}
                                    hasAttachments={occurrence.has_attachments}
                                    onOpenAttachments={(row) => void openAttachments(row)}
                                    disabled={busy}
                                  />
                                  {canManage ? (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      disabled={busy || occurrence.is_read_only}
                                      title={
                                        occurrence.is_read_only
                                          ? 'Archived and deleted BPMs are read-only'
                                          : undefined
                                      }
                                      onClick={() => void openEdit(occurrence)}
                                    >
                                      Edit BPM
                                    </Button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ))
                        : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </BPMCard>

      <BPMFormModal open={formOpen} onClose={closeForm} onSaved={load} event={editingEvent} />

      <AttachmentsModal
        open={Boolean(attachmentsFor)}
        eventName={attachmentsFor?.name ?? ''}
        attachments={attachmentsFor?.attachments ?? []}
        allowDownload={allowDownload}
        onClose={() => setAttachmentsFor(null)}
      />
    </BPMPageShell>
  );
}
