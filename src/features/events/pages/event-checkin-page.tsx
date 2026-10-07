import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ErrorState, Heading, Input, LoadingState, Text } from '@shared/components';
import { useToastStore } from '@/store';
import { useCheckIn } from '../hooks/use-check-in';
import { eventService } from '../services/event-service';
import { checkinService } from '../services/checkin-service';
import { EventSubnav } from '../components/event-subnav';
import { CheckinProgress } from '../components/checkin-progress';
import { CheckinScanBox } from '../components/checkin-scan-box';
import { CheckinPurchaseList, type CheckinListView } from '../components/checkin-purchase-list';
import { useCheckinView } from '../hooks/use-checkin-view';
import type { BigEvent } from '../types/event';
import type { CheckinAttendee, CheckinPayload, CheckinStats } from '../types/checkin';
import { PURCHASE_SEARCH_HELP, PURCHASE_SEARCH_PLACEHOLDER } from '../utils/purchase-search';
import { SearchInSelect } from '../components/search-in-select';

type ArrivedTab = 'all' | 'false' | 'true';

const ARRIVED_TABS: Array<{ id: ArrivedTab; label: string; count: (stats: CheckinStats) => number }> = [
  { id: 'all', label: 'All', count: (stats) => stats.expected },
  { id: 'false', label: 'Not arrived', count: (stats) => stats.remaining },
  { id: 'true', label: 'Arrived', count: (stats) => stats.arrived },
];

const VIEW_TABS: Array<{ id: CheckinListView; label: string; hint: string }> = [
  { id: 'door', label: 'Door', hint: 'Name, ticket and Check in — unnamed tickets folded' },
  { id: 'detailed', label: 'Detailed', hint: 'Every ticket with status, references, SMD and who checked them in' },
];

/** A row of mutually exclusive buttons — the same pill style as the check-in type switch. */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ id: T; label: string; hint?: string; count?: number }>;
  onChange: (next: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/5"
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          title={option.hint}
          onClick={() => onChange(option.id)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            value === option.id
              ? 'bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white'
              : 'text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white'
          }`}
        >
          {option.label}
          {option.count !== undefined ? (
            <span className="ml-1.5 text-xs text-slate-400 dark:text-white/40">{option.count.toLocaleString()}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export default function EventCheckinPage({ eventId: eventIdProp }: { eventId?: number } = {}) {
  const { eventId } = useParams<{ eventId: string }>();
  const id = eventIdProp ?? Number(eventId);
  // Embedded inside a Big Event surface (its own header + event picker).
  const embedded = eventIdProp !== undefined;
  const addToast = useToastStore((state) => state.addToast);
  const {
    purchases,
    count,
    stats,
    filters,
    setFilters,
    loading,
    error,
    checkIn,
    undoCheckIn,
    refetch,
  } = useCheckIn(id);

  const [event, setEvent] = useState<BigEvent | null>(null);
  const [search, setSearch] = useState('');
  const [busyTicketId, setBusyTicketId] = useState<number | null>(null);
  // Tickets admitted from this device this visit: the Door view offers Undo on these only.
  const [undoableIds, setUndoableIds] = useState<ReadonlySet<number>>(new Set());
  const { view, setView } = useCheckinView();
  const exportMenu = useRef<HTMLDetailsElement>(null);

  const markUndoable = useCallback((ticketId: number, undoable: boolean) => {
    setUndoableIds((current) => {
      const next = new Set(current);
      if (undoable) next.add(ticketId);
      else next.delete(ticketId);
      return next;
    });
  }, []);

  const scan = useCallback(
    async (payload: CheckinPayload) => {
      const result = await checkIn(payload);
      if (!result.duplicate) markUndoable(result.id, true);
      return result;
    },
    [checkIn, markUndoable],
  );

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    void eventService
      .get(id)
      .then(setEvent)
      .catch(() => setEvent(null));
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => setFilters({ search: search || undefined }), 300);
    return () => clearTimeout(timer);
  }, [search, setFilters]);

  const runRowAction = async (
    attendee: CheckinAttendee,
    action: () => Promise<unknown>,
    successMessage: string,
  ) => {
    setBusyTicketId(attendee.id);
    try {
      await action();
      addToast({ type: 'success', message: successMessage });
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Action failed' });
    } finally {
      setBusyTicketId(null);
    }
  };

  const shortcut = event?.shortcut || 'event';

  const download = async (type: 'xlsx' | 'pdf') => {
    exportMenu.current?.removeAttribute('open');
    try {
      await checkinService.exportRoster(id, shortcut, type, filters);
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Export failed' });
    }
  };

  const print = async () => {
    exportMenu.current?.removeAttribute('open');
    try {
      await checkinService.printRoster(id, filters);
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Print failed' });
    }
  };

  if (!Number.isFinite(id)) {
    return <Text variant="muted">Invalid event.</Text>;
  }

  const arrivedTab: ArrivedTab = filters.arrived === undefined ? 'all' : filters.arrived ? 'true' : 'false';

  // Bottom padding keeps the last row's Check in clear of the floating assistant button.
  return (
    <div className="space-y-4 pb-24">
      {!embedded && (
        <>
          <div>
            <Heading as="h1" variant="h1">
              {event?.name || 'Check-in'}
            </Heading>
            <Text variant="muted">Scan tickets at the door and track who has arrived</Text>
          </div>
          <EventSubnav eventId={id} />
        </>
      )}

      <CheckinScanBox eventId={id} onScan={scan} onLinked={() => void refetch()} />
      <CheckinProgress stats={stats} />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Find attendee — ${PURCHASE_SEARCH_PLACEHOLDER.replace(/^Search /, '')}`}
          title={PURCHASE_SEARCH_HELP}
          aria-label={`Find attendee: ${PURCHASE_SEARCH_HELP}`}
          className="w-full sm:w-[22rem]"
        />
        <SearchInSelect
          value={filters.search_in}
          onChange={(searchIn) => setFilters({ search_in: searchIn })}
        />
        <Segmented
          label="Arrival"
          value={arrivedTab}
          options={ARRIVED_TABS.map((tab) => ({ id: tab.id, label: tab.label, count: tab.count(stats) }))}
          onChange={(tab) => setFilters({ arrived: tab === 'all' ? undefined : tab === 'true' })}
        />
        <div className="ml-auto flex items-center gap-2">
          {view === 'detailed' ? (
            <details ref={exportMenu} className="relative">
              <summary className="flex h-8 cursor-pointer list-none items-center rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-white/25 dark:text-white dark:hover:bg-white/5 [&::-webkit-details-marker]:hidden">
                Export ▾
              </summary>
              <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-slate-900">
                {[
                  { label: 'Excel', run: () => void download('xlsx') },
                  { label: 'PDF', run: () => void download('pdf') },
                  { label: 'Print', run: () => void print() },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.run}
                    className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-white/80 dark:hover:bg-white/10"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </details>
          ) : null}
          <Segmented label="List view" value={view} options={VIEW_TABS} onChange={setView} />
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState description={error} onRetry={() => void refetch()} />
      ) : (
        <CheckinPurchaseList
          purchases={purchases}
          view={view}
          undoableIds={undoableIds}
          count={count}
          page={filters.page ?? 1}
          busyTicketId={busyTicketId}
          onPageChange={(page) => setFilters({ page })}
          onCheckIn={(attendee) =>
            void runRowAction(
              attendee,
              async () => {
                await checkIn({ ticket_id: attendee.id });
                markUndoable(attendee.id, true);
              },
              `${attendee.holder_name || attendee.ticket_number} checked in.`,
            )
          }
          onUndo={(attendee) =>
            void runRowAction(
              attendee,
              async () => {
                await undoCheckIn(attendee.id);
                markUndoable(attendee.id, false);
              },
              `Check-in reversed for ${attendee.holder_name || attendee.ticket_number}.`,
            )
          }
        />
      )}
    </div>
  );
}
