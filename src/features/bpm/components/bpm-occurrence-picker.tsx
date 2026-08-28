import { useCallback, useEffect, useState } from 'react';
import { Select } from '@shared/components';
import { useToastStore } from '@/store';
import { bpmService, formatOccurrenceTime } from '../services/bpm-service';
import type { BPMEventListItem, BPMOccurrence } from '../types';

interface BPMOccurrencePickerProps {
  value: BPMOccurrence | null;
  onChange: (occurrence: BPMOccurrence | null) => void;
  /** Optionally hide occurrences from this event id (e.g. transfer source). */
  excludeOccurrenceId?: number;
}

/**
 * Two-step picker used across Add Guest / View Invites / Check-In: select a BPM,
 * then a specific dated occurrence. Shows the BPM name and date, matching the
 * "BPM NAME" / "BPM DATE" fields in the reference mock.
 */
export function BPMOccurrencePicker({ value, onChange, excludeOccurrenceId }: BPMOccurrencePickerProps) {
  const addToast = useToastStore((state) => state.addToast);
  const [events, setEvents] = useState<BPMEventListItem[]>([]);
  const [occurrences, setOccurrences] = useState<BPMOccurrence[]>([]);
  const [eventId, setEventId] = useState<number | ''>('');
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingOccurrences, setLoadingOccurrences] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingEvents(true);
    bpmService
      .events({ is_active: true, ordering: 'name' })
      .then((data) => {
        if (active) setEvents(data.results);
      })
      .catch((error: unknown) => {
        addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load BPMs' });
      })
      .finally(() => {
        if (active) setLoadingEvents(false);
      });
    return () => {
      active = false;
    };
  }, [addToast]);

  const loadOccurrences = useCallback(
    async (id: number) => {
      setLoadingOccurrences(true);
      try {
        const rows = await bpmService.eventOccurrences(id);
        const upcoming = rows
          .filter((row) => row.status !== 'CANCELLED' && row.id !== excludeOccurrenceId)
          .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
        setOccurrences(upcoming);
      } catch (error) {
        addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load dates' });
      } finally {
        setLoadingOccurrences(false);
      }
    },
    [addToast, excludeOccurrenceId],
  );

  const handleEventChange = (id: number | '') => {
    setEventId(id);
    onChange(null);
    setOccurrences([]);
    if (id !== '') void loadOccurrences(id);
  };

  const handleOccurrenceChange = (id: number | '') => {
    onChange(occurrences.find((row) => row.id === id) ?? null);
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold text-slate-700 dark:text-white/80">BPM Name</span>
        <Select
          variant="surface"
          value={eventId}
          disabled={loadingEvents}
          onChange={(event) => handleEventChange(event.target.value ? Number(event.target.value) : '')}
        >
          <option value="">{loadingEvents ? 'Loading BPMs…' : 'Select a BPM'}</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold text-slate-700 dark:text-white/80">BPM Date</span>
        <Select
          variant="surface"
          value={value?.id ?? ''}
          disabled={eventId === '' || loadingOccurrences}
          onChange={(event) => handleOccurrenceChange(event.target.value ? Number(event.target.value) : '')}
        >
          <option value="">
            {eventId === ''
              ? 'Select a BPM first'
              : loadingOccurrences
                ? 'Loading dates…'
                : occurrences.length === 0
                  ? 'No upcoming dates'
                  : 'Select a date'}
          </option>
          {occurrences.map((occurrence) => (
            <option key={occurrence.id} value={occurrence.id}>
              {formatOccurrenceTime(occurrence.start_at)} ({occurrence.timezone})
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}
