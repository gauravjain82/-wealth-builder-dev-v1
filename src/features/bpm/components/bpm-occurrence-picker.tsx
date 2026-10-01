import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { Checkbox, Select } from '@shared/components';
import { useToastStore } from '@/store';
import { useBpmSelection } from '../context/bpm-selection-context';
import { occurrenceLocalDate } from '../context/occurrence-date';
import { bpmService, formatOccurrenceTime } from '../services/bpm-service';
import { CONCEALED_STATUSES } from '../types';
import type { BPMEventListItem, BPMOccurrence } from '../types';
import { BPM_TARGETS } from '../gms-targets';
import { emit, gmsTarget } from '@/features/gms/services/gms-adapter';

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
 * Both render {@link PickerFields}, so they stay visually identical. Only the
 * sticky picker offers a date's "All locations" entry: a scope can span
 * several locations, a destination cannot.
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

/** One date's locations, in picker order. */
interface DateGroup {
  date: string;
  rows: BPMOccurrence[];
}

/**
 * Group an already-sorted occurrence list by the date *at the event*.
 *
 * Groups keep the list's order; within one, locations are ordered by start then
 * id, the same order the selection context uses, so "first location" agrees.
 */
function groupByDate(rows: BPMOccurrence[]): DateGroup[] {
  const groups = new Map<string, DateGroup>();
  for (const row of rows) {
    const date = occurrenceLocalDate(row);
    let group = groups.get(date);
    if (!group) {
      group = { date, rows: [] };
      groups.set(date, group);
    }
    group.rows.push(row);
  }
  for (const group of groups.values()) {
    group.rows.sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime() || a.id - b.id,
    );
  }
  return [...groups.values()];
}

/** Option-value prefix for a date's "All locations" entry, keyed by the date. */
const ALL_PREFIX = 'all:';

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
  /** Rendered at the right end of the Date / Location label row. */
  dateAction?: ReactNode;
  /**
   * The date (`YYYY-MM-DD`, at the event) whose All-locations entry is selected,
   * or null when the scope is one location.
   */
  allDate?: string | null;
  /**
   * Offer an "All locations" entry for each multi-location date, first among
   * that date's options (D23). Called with the date's first location. Absent
   * for the destination picker, where a guest has to land on exactly one.
   */
  onAllLocationsChange?: (anchorOccurrenceId: number) => void;
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
  dateAction,
  allDate = null,
  onAllLocationsChange,
}: PickerFieldsProps) {
  const dateSelectId = useId();
  const groups = useMemo(() => groupByDate(occurrences), [occurrences]);
  const datePlaceholder = (): string => {
    if (eventId === null) return 'Select a BPM first';
    if (occurrencesLoading) return 'Loading dates…';
    if (occurrences.length === 0) return includePast ? 'No dates' : 'No upcoming dates';
    return 'Select a date';
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="grid gap-1.5" {...gmsTarget(BPM_TARGETS.contextEvent)}>
        <span className="text-xs font-semibold text-slate-700 dark:text-white/80">BPM Name</span>
        <Select
          variant="surface"
          value={eventId ?? ''}
          disabled={eventsLoading}
          onChange={(event) => {
            onEventChange(event.target.value ? Number(event.target.value) : null);
            emit(BPM_TARGETS.contextEvent, 'selected');
          }}
        >
          <option value="">{eventsLoading ? 'Loading BPMs…' : 'Select a BPM'}</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </Select>
      </label>

      {/* A div, not a <label>: the heading row now holds its own controls (the
          past-dates toggle, and a page's `dateAction`), and a label wrapping
          several controls forwards its clicks to the first of them. */}
      <div className="grid gap-1.5" {...gmsTarget(BPM_TARGETS.contextOccurrence)}>
        <div className="flex min-h-[1.75rem] flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-700 dark:text-white/80">
          <label htmlFor={dateSelectId}>BPM Date / Location</label>
          {allowPast || dateAction ? (
            <div className="flex items-center gap-3">
              {allowPast ? (
                <label className="flex items-center gap-1.5 font-normal text-slate-500 dark:text-white/60">
                  <Checkbox
                    checked={includePast}
                    onChange={(event) => onIncludePastChange(event.target.checked)}
                  />
                  Include past dates
                </label>
              ) : null}
              {dateAction}
            </div>
          ) : null}
        </div>
        <Select
          id={dateSelectId}
          variant="surface"
          value={allDate ? `${ALL_PREFIX}${allDate}` : (occurrenceId ?? '')}
          disabled={eventId === null || occurrencesLoading}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw.startsWith(ALL_PREFIX)) {
              const group = groups.find((row) => row.date === raw.slice(ALL_PREFIX.length));
              if (group && onAllLocationsChange) onAllLocationsChange(group.rows[0].id);
            } else {
              onOccurrenceChange(raw ? Number(raw) : null);
            }
            emit(BPM_TARGETS.contextOccurrence, 'selected');
          }}
        >
          <option value="">{datePlaceholder()}</option>
          {groups.flatMap((group) => {
            const first = group.rows[0];
            // Each location option keeps its full date and time rather than being
            // indented under the All entry: the closed select shows only the one
            // option, and on a phone that has to say which date it is.
            const all =
              onAllLocationsChange && group.rows.length > 1 ? (
                <option key={`${ALL_PREFIX}${group.date}`} value={`${ALL_PREFIX}${group.date}`}>
                  {formatOccurrenceTime(first.start_at, {
                    hour: undefined,
                    minute: undefined,
                    timeZone: first.timezone,
                  })}
                  {` · All locations (${group.rows.length})`}
                </option>
              ) : null;
            return [
              ...(all ? [all] : []),
              ...group.rows.map((occurrence) => {
                const place = occurrence.location_detail?.label;
                return (
                  <option key={occurrence.id} value={occurrence.id}>
                    {formatOccurrenceTime(occurrence.start_at)} ({occurrence.timezone})
                    {place ? ` · ${place}` : ''}
                  </option>
                );
              }),
            ];
          })}
        </Select>
      </div>
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
  /**
   * A control for the selected date, drawn at the right end of the Date /
   * Location heading — the check-in pages put their QR button here, beside the
   * date the code belongs to.
   */
  dateAction?: ReactNode;
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
  dateAction,
}: BPMOccurrencePickerProps) {
  const {
    eventId,
    occurrenceId,
    occurrence,
    allLocations,
    events,
    occurrences,
    dayOccurrences,
    eventsLoading,
    occurrencesLoading,
    includePast,
    selectEvent,
    selectOccurrence,
    selectAllLocations,
    setIncludePast,
  } = useBpmSelection();

  // The selected date's locations are always offered, even once they are past
  // and "Include past dates" is off — otherwise the select cannot show what is
  // selected, and "All locations (N)" would count fewer than the scope covers.
  const visible = useMemo(() => {
    const known = new Set(occurrences.map((row) => row.id));
    const rows = [...occurrences, ...dayOccurrences.filter((row) => !known.has(row.id))].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime() || a.id - b.id,
    );
    return excludeOccurrenceId ? rows.filter((row) => row.id !== excludeOccurrenceId) : rows;
  }, [occurrences, dayOccurrences, excludeOccurrenceId]);

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
      dateAction={dateAction}
      allDate={allLocations && occurrence ? occurrenceLocalDate(occurrence) : null}
      onAllLocationsChange={selectAllLocations}
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
