import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, DateRangePicker, Input, LoadingState, Select, type DateRangeValue } from '@shared/components';
import { useToastStore } from '@/store';
import { BPMCard, BPMPageShell } from '../components/bpm-page-shell';
import { BPMFormModal } from '../components/bpm-form-modal';
import { bpmService, formatOccurrenceTime } from '../services/bpm-service';
import type { BPMEventDetail, BPMOccurrence, OccurrenceFilters } from '../types';

const FORMAT_LABELS: Record<string, string> = {
  IN_PERSON: 'In person',
  WEBINAR: 'Webinar',
  WEB_AND_IN_PERSON: 'Web & in person',
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

  const filters = useMemo<OccurrenceFilters>(
    () => ({
      start_after: range.startDate ? new Date(`${range.startDate}T00:00:00`).toISOString() : undefined,
      start_before: range.endDate ? new Date(`${range.endDate}T23:59:59`).toISOString() : undefined,
      city: city.trim() || undefined,
      state: stateFilter.trim() || undefined,
      segment: segment || undefined,
      page_size: 100,
    }),
    [range, city, stateFilter, segment],
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

  const cancelOccurrence = async (occurrence: BPMOccurrence) => {
    setBusy(true);
    try {
      await bpmService.cancelOccurrence(occurrence.id);
      addToast({ type: 'success', message: 'Occurrence cancelled.' });
      await load();
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to cancel' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <BPMPageShell
      title="BPM Schedule"
      description="Create BPMs and browse upcoming occurrences by date, location, or team."
      actions={<Button onClick={openCreate}>Create BPM</Button>}
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
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-white/60">
                  <th className="px-3 py-2">BPM</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Guests</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {occurrences.map((occurrence) => (
                  <tr key={occurrence.id} className="border-t border-slate-100 dark:border-white/10">
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{occurrence.event_name}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-white/80">
                      {formatOccurrenceTime(occurrence.start_at)} ({occurrence.timezone})
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-white/80">
                      {FORMAT_LABELS[occurrence.bpm_format] || occurrence.bpm_format}
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-white/80">
                      {occurrence.checked_in_count}/{occurrence.guest_count}
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-white/80">{occurrence.status}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => void openEdit(occurrence)}>
                          Edit BPM
                        </Button>
                        {occurrence.status === 'SCHEDULED' ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={busy}
                            onClick={() => void cancelOccurrence(occurrence)}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </BPMCard>

      <BPMFormModal open={formOpen} onClose={closeForm} onSaved={load} event={editingEvent} />
    </BPMPageShell>
  );
}
