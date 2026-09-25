import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { bpmService } from '../services/bpm-service';
import { CONCEALED_STATUSES } from '../types';
import type { BPMEventListItem, BPMOccurrence } from '../types';

/**
 * Sticky BPM/date/location selection, shared across every BPM sub-tool.
 *
 * Most BPM users are not creating events — they are inviting, checking in and
 * following up, over and over, for the same meeting. Before this, each sub-tool
 * held its own `useState` and the two-step picker refetched and reset on every
 * navigation, so moving from Guest Invites to Guest Check-In meant re-selecting
 * the BPM and the date every time.
 *
 * The provider keeps that selection in one place and persists it two ways:
 *
 * - **URL search params** (`?event=&occurrence=`) so a deep link from the
 *   calendar lands on a sub-tool with the list already populated, and so the
 *   back button behaves;
 * - **sessionStorage** so the selection survives a reload or a trip out to
 *   another part of the app and back.
 *
 * The URL wins on first load — a shared or generated link must not be
 * overridden by whatever the tab happened to have selected before.
 *
 * It also caches the event list and the selected event's occurrences, so the
 * picker stops re-fetching them on every page mount.
 */

/** sessionStorage key holding the last selection for this tab. */
const STORAGE_KEY = 'wb.bpm.selection';

/** Search-param names. Kept short because they end up in shared links. */
const PARAM_EVENT = 'event';
const PARAM_OCCURRENCE = 'occurrence';

interface PersistedSelection {
  eventId: number | null;
  occurrenceId: number | null;
  includePast: boolean;
}

interface BpmSelectionContextValue {
  /** Currently selected BPM event, or null. */
  eventId: number | null;
  /** Currently selected dated occurrence (date + location), or null. */
  occurrenceId: number | null;
  /** The resolved occurrence, once loaded. */
  occurrence: BPMOccurrence | null;
  /** Whether past dates are offered in the date picker. Sticky. */
  includePast: boolean;

  /** Cached active-event list, shared by every picker instance. */
  events: BPMEventListItem[];
  /** Occurrences of the selected event, already filtered by `includePast`. */
  occurrences: BPMOccurrence[];

  eventsLoading: boolean;
  occurrencesLoading: boolean;

  /** Select a BPM. Clears the date, since occurrences belong to one event. */
  selectEvent: (eventId: number | null) => void;
  /** Select a dated occurrence. */
  selectOccurrence: (occurrenceId: number | null) => void;
  /**
   * Select both at once — used by the calendar deep-links, where the event and
   * the location-specific occurrence are both already known.
   */
  selectBoth: (eventId: number | null, occurrenceId: number | null) => void;
  setIncludePast: (includePast: boolean) => void;
  /** Force a refresh of the cached event list (after a create/edit). */
  refreshEvents: () => Promise<void>;
  /** Force a refresh of the selected event's occurrences. */
  refreshOccurrences: () => Promise<void>;
}

const BpmSelectionContext = createContext<BpmSelectionContextValue | null>(null);

/** Read the persisted selection, tolerating absent or corrupt storage. */
function readStored(): PersistedSelection {
  const empty: PersistedSelection = {
    eventId: null,
    occurrenceId: null,
    includePast: false,
  };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<PersistedSelection>;
    return {
      eventId: typeof parsed.eventId === 'number' ? parsed.eventId : null,
      occurrenceId:
        typeof parsed.occurrenceId === 'number' ? parsed.occurrenceId : null,
      includePast: parsed.includePast === true,
    };
  } catch {
    // Private windows and blocked site data both throw here.
    return empty;
  }
}

function writeStored(selection: PersistedSelection): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // Non-fatal: the selection simply will not survive a reload.
  }
}

/** Parse a search param as a positive integer id, else null. */
function paramId(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key);
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** An occurrence is "past" once it has finished. */
function isPast(occurrence: BPMOccurrence, now: number): boolean {
  return new Date(occurrence.end_at).getTime() < now;
}

export function BpmSelectionProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();

  // The URL wins on first load so deep links are authoritative; otherwise fall
  // back to whatever this tab last had selected.
  const initial = useRef<PersistedSelection>(null as never);
  if (initial.current === null) {
    const stored = readStored();
    const urlEvent = paramId(searchParams, PARAM_EVENT);
    const urlOccurrence = paramId(searchParams, PARAM_OCCURRENCE);
    initial.current =
      urlEvent || urlOccurrence
        ? {
            eventId: urlEvent,
            occurrenceId: urlOccurrence,
            includePast: stored.includePast,
          }
        : stored;
  }

  const [eventId, setEventId] = useState<number | null>(initial.current.eventId);
  const [occurrenceId, setOccurrenceId] = useState<number | null>(
    initial.current.occurrenceId,
  );
  const [includePast, setIncludePastState] = useState<boolean>(
    initial.current.includePast,
  );

  const [events, setEvents] = useState<BPMEventListItem[]>([]);
  const [allOccurrences, setAllOccurrences] = useState<BPMOccurrence[]>([]);
  const [occurrence, setOccurrence] = useState<BPMOccurrence | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [occurrencesLoading, setOccurrencesLoading] = useState(false);

  // -- persistence --------------------------------------------------------

  useEffect(() => {
    writeStored({ eventId, occurrenceId, includePast });
  }, [eventId, occurrenceId, includePast]);

  // Mirror the selection into the URL. `replace` keeps the picker out of the
  // back-button history — only real navigations should create entries.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    const apply = (key: string, value: number | null) => {
      if (value === null) next.delete(key);
      else next.set(key, String(value));
    };
    apply(PARAM_EVENT, eventId);
    apply(PARAM_OCCURRENCE, occurrenceId);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // `searchParams` is intentionally omitted: including it re-runs this effect
    // on every URL change and fights with other params on the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, occurrenceId, setSearchParams]);

  // -- data ---------------------------------------------------------------

  const refreshEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const data = await bpmService.events({ is_active: true, ordering: 'name' });
      setEvents(data.results);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshEvents().catch(() => setEvents([]));
  }, [refreshEvents]);

  const refreshOccurrences = useCallback(async () => {
    if (eventId === null) {
      setAllOccurrences([]);
      return;
    }
    setOccurrencesLoading(true);
    try {
      setAllOccurrences(await bpmService.eventOccurrences(eventId));
    } finally {
      setOccurrencesLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void refreshOccurrences().catch(() => setAllOccurrences([]));
  }, [refreshOccurrences]);

  /**
   * Dates offered for the selected event.
   *
   * Cancelled occurrences are never offered. Past dates are hidden unless
   * `includePast` is on — Guest Invites and both check-in pages turn it on so
   * the page stays usable after the event, per the BPM v2 brief.
   */
  const occurrences = useMemo(() => {
    const now = Date.now();
    return allOccurrences
      .filter((row) => !CONCEALED_STATUSES.includes(row.effective_status))
      .filter((row) => includePast || !isPast(row, now))
      .sort(
        (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
      );
  }, [allOccurrences, includePast]);

  // Resolve the selected id to a full occurrence. Normally it is already in the
  // loaded list; on a cold deep-link (or when the date is filtered out of the
  // list by `includePast`) fall back to fetching it directly, so the selection
  // is never silently dropped.
  useEffect(() => {
    if (occurrenceId === null) {
      setOccurrence(null);
      return;
    }
    const known = allOccurrences.find((row) => row.id === occurrenceId);
    if (known) {
      setOccurrence(known);
      return;
    }
    let active = true;
    bpmService
      .occurrence(occurrenceId)
      .then((row) => {
        if (active) setOccurrence(row);
      })
      .catch(() => {
        if (active) setOccurrence(null);
      });
    return () => {
      active = false;
    };
  }, [occurrenceId, allOccurrences]);

  // -- actions ------------------------------------------------------------

  const selectEvent = useCallback((nextEventId: number | null) => {
    setEventId(nextEventId);
    // Occurrences belong to exactly one event, so the date cannot survive an
    // event change.
    setOccurrenceId(null);
    setOccurrence(null);
  }, []);

  const selectOccurrence = useCallback((nextOccurrenceId: number | null) => {
    setOccurrenceId(nextOccurrenceId);
  }, []);

  const selectBoth = useCallback(
    (nextEventId: number | null, nextOccurrenceId: number | null) => {
      setEventId(nextEventId);
      setOccurrenceId(nextOccurrenceId);
    },
    [],
  );

  const setIncludePast = useCallback((next: boolean) => {
    setIncludePastState(next);
  }, []);

  const value = useMemo<BpmSelectionContextValue>(
    () => ({
      eventId,
      occurrenceId,
      occurrence,
      includePast,
      events,
      occurrences,
      eventsLoading,
      occurrencesLoading,
      selectEvent,
      selectOccurrence,
      selectBoth,
      setIncludePast,
      refreshEvents,
      refreshOccurrences,
    }),
    [
      eventId,
      occurrenceId,
      occurrence,
      includePast,
      events,
      occurrences,
      eventsLoading,
      occurrencesLoading,
      selectEvent,
      selectOccurrence,
      selectBoth,
      setIncludePast,
      refreshEvents,
      refreshOccurrences,
    ],
  );

  return (
    <BpmSelectionContext.Provider value={value}>
      {children}
    </BpmSelectionContext.Provider>
  );
}

/**
 * Access the sticky BPM selection.
 *
 * @throws When called outside {@link BpmSelectionProvider} — that means a BPM
 *         page was mounted outside the `/bpm` route tree, which is a wiring bug.
 */
export function useBpmSelection(): BpmSelectionContextValue {
  const context = useContext(BpmSelectionContext);
  if (!context) {
    throw new Error('useBpmSelection must be used within a BpmSelectionProvider');
  }
  return context;
}

/**
 * Build a link into a BPM sub-tool with the selection pre-applied.
 *
 * Used by the calendar day modal and the Overview/Schedule row actions, which
 * must "take you directly to the appropriate page with appropriate selections
 * so that the list in that subtool shows up".
 */
export function bpmSubToolPath(
  path: string,
  eventId: number,
  occurrenceId: number,
): string {
  const params = new URLSearchParams({
    [PARAM_EVENT]: String(eventId),
    [PARAM_OCCURRENCE]: String(occurrenceId),
  });
  return `${path}?${params.toString()}`;
}
