import { useCallback, useEffect, useMemo, useState } from 'react';
import { Checkbox, Select } from '@shared/components';
import { useToastStore } from '@/store';
import { useBpmSelection } from '../context/bpm-selection-context';
import { bpmService, formatOccurrenceTime } from '../services/bpm-service';
import { CONCEALED_STATUSES } from '../types';
import type { BPMEventListItem, BPMOccurrence } from '../types';

/**
 * The two-step "BPM name / BPM date-location" picker.
 *
 * It comes in two flavours, because the same control does two different jobs:
 *
 * - {@link BPMOccurrencePicker} is bound to the sticky page selection, so the
 *   chosen BPM and date follow the user between sub-tools.
 * - {@link BPMOccurrenceSelect} is standalone and controlled, for picking a
 *   *destination* inside a modal (transfer, reschedule to another event). It
 *   must never write to the sticky selection — moving a guest elsewhere should
 *   not navigate the page the user is working on.
 *
 * Both render {@link PickerFields}, so they stay visually identical.
 */

/** An occurrence is "past" once it has finished. */
function isPast(occurrence: BPMOccurrence, now: number): boolean {
  return new Date(occurrence.end_at).getTime() < now;
}

/**
 * Narrow a raw occurrence list to the dates worth offering.
 *
 * Cancelled dates are never offered. Past dates are hidden unless `includePast`
 * is on, which the pages that must stay usable after an event turn on.
 */
export function selectableOccurrences(
  rows: BPMOccurrence[],
  includePast: boolean,
  excludeOccurrenceId?: number,
): BPMOccurrence[] {
  const now = Date.now();
  return rows
    .filter((row) => !CONCEALED_STATUSES.includes(row.effective_status))
    .filter((row) => row.id !== excludeOccurrenceId)
    .filter((row) => includePast || !isPast(row, now))
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
}

interface PickerFieldsProps {
  events: BPMEventListItem[];
  occurrences: BPMOccurrence[];
  eventId: number | null;
  occurrenceId: number | null;
  eventsLoading: boolean;
  occurrencesLoading: boolean;
  includePast: boolean;
  allowPast: boolean;
  onEventChange: (eventId: number | null) => void;
  onOccurrenceChange: (occurrenceId: number | null) => void;
  onIncludePastChange: (includePast: boolean) => void;
}

/** Presentational half — no data fetching, no state of its own. */
function PickerFields({
  events,
  occurrences,
  eventId,
  occurrenceId,
  eventsLoading,
  occurrencesLoading,
  includePast,
  allowPast,
  onEventChange,
  onOccurrenceChange,
  onIncludePastChange,
}: PickerFieldsProps) {
  const datePlaceholder = (): string => {
    if (eventId === null) return 'Select a BPM first';
    if (occurrencesLoading) return 'Loading dates…';
    if (occurrences.length === 0) return includePast ? 'No dates' : 'No upcoming dates';
    return 'Select a date';
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold text-slate-700 dark:text-white/80">BPM Name</span>
        <Select
          variant="surface"
          value={eventId ?? ''}
          disabled={eventsLoading}
          onChange={(event) => onEventChange(event.target.value ? Number(event.target.value) : null)}
        >
          <option value="">{eventsLoading ? 'Loading BPMs…' : 'Select a BPM'}</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </Select>
      </label>

      <label className="grid gap-1.5">
        <span className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700 dark:text-white/80">
          <span>BPM Date / Location</span>
          {allowPast ? (
            <span className="flex items-center gap-1.5 font-normal text-slate-500 dark:text-white/60">
              <Checkbox
                checked={includePast}
                onChange={(event) => onIncludePastChange(event.target.checked)}
              />
              Include past dates
            </span>
          ) : null}
        </span>
        <Select
          variant="surface"
          value={occurrenceId ?? ''}
          disabled={eventId === null || occurrencesLoading}
          onChange={(event) =>
            onOccurrenceChange(event.target.value ? Number(event.target.value) : null)
          }
        >
          <option value="">{datePlaceholder()}</option>
          {occurrences.map((occurrence) => {
            const place = occurrence.location_detail?.label;
            return (
              <option key={occurrence.id} value={occurrence.id}>
                {formatOccurrenceTime(occurrence.start_at)} ({occurrence.timezone})
                {place ? ` · ${place}` : ''}
              </option>
            );
          })}
        </Select>
      </label>
    </div>
  );
}

interface BPMOccurrencePickerProps {
  /** Optionally hide one occurrence (e.g. the source of a transfer). */
  excludeOccurrenceId?: number;
  /**
   * Show the "Include past dates" toggle. On for the pages the brief says must
   * stay usable after the event — Guest Invites and both check-in pages — so
   * corrections can still be made.
   */
  allowPast?: boolean;
}

/**
 * Picker bound to the sticky page selection.
 *
 * Holds no state: the selection lives in {@link useBpmSelection}, so it survives
 * navigation between sub-tools and is mirrored into the URL. Several instances
 * may be mounted at once and they stay in sync.
 */
export function BPMOccurrencePicker({
  excludeOccurrenceId,
  allowPast = false,
}: BPMOccurrencePickerProps) {
  const {
    eventId,
    occurrenceId,
    events,
    occurrences,
    eventsLoading,
    occurrencesLoading,
    includePast,
    selectEvent,
    selectOccurrence,
    setIncludePast,
  } = useBpmSelection();

  const visible = useMemo(
    () =>
      excludeOccurrenceId
        ? occurrences.filter((row) => row.id !== excludeOccurrenceId)
        : occurrences,
    [occurrences, excludeOccurrenceId],
  );

  return (
    <PickerFields
      events={events}
      occurrences={visible}
      eventId={eventId}
      occurrenceId={occurrenceId}
      eventsLoading={eventsLoading}
      occurrencesLoading={occurrencesLoading}
      includePast={includePast}
      allowPast={allowPast}
      onEventChange={selectEvent}
      onOccurrenceChange={selectOccurrence}
      onIncludePastChange={setIncludePast}
    />
  );
}

interface BPMOccurrenceSelectProps {
  value: BPMOccurrence | null;
  onChange: (occurrence: BPMOccurrence | null) => void;
  excludeOccurrenceId?: number;
  allowPast?: boolean;
}

/**
 * Standalone controlled picker for choosing a *destination* occurrence.
 *
 * Deliberately independent of the sticky selection: transferring or rescheduling
 * a guest to another event must not change which BPM the user is working on.
 * The cached event list is read from the provider (it is already loaded and is
 * not mutated here); occurrences are fetched per selected event.
 */
export function BPMOccurrenceSelect({
  value,
  onChange,
  excludeOccurrenceId,
  allowPast = true,
}: BPMOccurrenceSelectProps) {
  const addToast = useToastStore((state) => state.addToast);
  const { events, eventsLoading } = useBpmSelection();

  const [eventId, setEventId] = useState<number | null>(null);
  const [rows, setRows] = useState<BPMOccurrence[]>([]);
  const [loading, setLoading] = useState(false);
  const [includePast, setIncludePast] = useState(false);

  useEffect(() => {
    if (eventId === null) {
      setRows([]);
      return;
    }
    let active = true;
    setLoading(true);
    bpmService
      .eventOccurrences(eventId)
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((error: unknown) => {
        if (active) {
          setRows([]);
          addToast({
            type: 'error',
            message: error instanceof Error ? error.message : 'Failed to load dates',
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [eventId, addToast]);

  const occurrences = useMemo(
    () => selectableOccurrences(rows, includePast, excludeOccurrenceId),
    [rows, includePast, excludeOccurrenceId],
  );

  const handleEventChange = useCallback(
    (nextEventId: number | null) => {
      setEventId(nextEventId);
      onChange(null);
    },
    [onChange],
  );

  const handleOccurrenceChange = useCallback(
    (nextOccurrenceId: number | null) => {
      onChange(occurrences.find((row) => row.id === nextOccurrenceId) ?? null);
    },
    [occurrences, onChange],
  );

  return (
    <PickerFields
      events={events}
      occurrences={occurrences}
      eventId={eventId}
      occurrenceId={value?.id ?? null}
      eventsLoading={eventsLoading}
      occurrencesLoading={loading}
      includePast={includePast}
      allowPast={allowPast}
      onEventChange={handleEventChange}
      onOccurrenceChange={handleOccurrenceChange}
      onIncludePastChange={setIncludePast}
    />
  );
}
