import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';
import { Button, Checkbox, Input, LoadingState, UserAutocompleteDropdown } from '@shared/components';
import { UserDetailsLink } from '@/features/team/components/user-details-link';
import { useToastStore } from '@/store';
import { BPMCard, BPMPageShell } from '../components/bpm-page-shell';
import { BPMOccurrencePicker } from '../components/bpm-occurrence-picker';
import { useBpmSelection } from '../context/bpm-selection-context';
import { CheckinStatCards, type CheckinCountCard } from '../components/checkin-stat-cards';
import { CheckinWindowNotice } from '../components/checkin-window-notice';
import { canCheckInNow } from '../components/checkin-window';
import { BpmQrModal } from '../components/bpm-qr-modal';
import { InvitedAssociatesCard } from '../components/invited-associates-card';
import { ScopeLocationSelect } from '../components/scope-location-select';
import { useScopeLocation } from '../hooks/use-scope-location';
import { bpmService, formatOccurrenceTime } from '../services/bpm-service';
import type { AssociateCheckIn, BPMCapabilities, CheckinDimension } from '../types';

/**
 * Which rankings this page shows, after the two counters.
 *
 * Top Direct ranks by who recruited the associate (`User.recruited_by`), which
 * only this audience carries. `inviter` is the one dimension left off: on this
 * screen it mostly repeats Top Leader.
 */
const ASSOCIATE_DIMENSIONS: CheckinDimension[] = ['smd', 'md', 'leader', 'direct'];

/** The text and date columns — each one sortable and filterable. */
type ColumnKey = 'name' | 'leader' | 'md' | 'smd' | 'location' | 'arrived';

const formatArrival = (record: AssociateCheckIn) =>
  formatOccurrenceTime(record.checked_in_at, { weekday: undefined });

/**
 * `text` is what a filter matches and what the cell shows; `sort` overrides it
 * where text order is wrong — a time sorts by instant, not by "Oct 1, 7:05 PM".
 */
const COLUMNS: Array<{
  key: ColumnKey;
  label: string;
  text: (record: AssociateCheckIn) => string;
  sort?: (record: AssociateCheckIn) => number;
}> = [
  { key: 'name', label: 'Name', text: (record) => record.user_name || `User #${record.user}` },
  { key: 'leader', label: 'Leader', text: (record) => record.leader_name || '' },
  { key: 'md', label: 'MD', text: (record) => record.md_name || '' },
  { key: 'smd', label: 'SMD', text: (record) => record.smd_name || '' },
  // All-locations mode only: which of the date's locations the row belongs to.
  { key: 'location', label: 'Location', text: (record) => record.occurrence_label || '' },
  {
    key: 'arrived',
    label: 'Checked in',
    text: formatArrival,
    sort: (record) => Date.parse(record.checked_in_at),
  },
];

/** Every column but Location — what a single-location scope shows. */
const SINGLE_LOCATION_COLUMNS = COLUMNS.filter(({ key }) => key !== 'location');

const EMPTY_FILTERS: Record<ColumnKey, string> = {
  name: '',
  leader: '',
  md: '',
  smd: '',
  location: '',
  arrived: '',
};

/**
 * Newest arrival first, replacing any earlier row for the same person — the
 * server's order. By person, not by location: a person counts once across the
 * date's locations (D22), so a check-in anywhere in scope supersedes the row.
 */
function upsertRecord(records: AssociateCheckIn[], record: AssociateCheckIn): AssociateCheckIn[] {
  return [record, ...records.filter((row) => row.user !== record.user)];
}

export default function AssociateCheckinPage() {
  const addToast = useToastStore((state) => state.addToast);
  // Sticky: the BPM/date chosen here follows the user to the other sub-tools.
  const { occurrence, allLocations, scopeOccurrences, scopeIds } = useBpmSelection();
  // Where somebody new is checked in. In All-locations mode that is a choice
  // (sticky per BPM); otherwise it is simply the selected occurrence.
  const { choices, location, setLocationId } = useScopeLocation();
  // The scope as one comparable value — what the stale-write guards key on.
  const scopeKey = scopeIds.join(',');
  const [records, setRecords] = useState<AssociateCheckIn[]>([]);
  // Only the first load of a scope blanks the table. Everything after — a
  // check-in, an undo, Z, a scan, Refresh — patches rows or refetches quietly,
  // because the list is being read while it changes.
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savingZoom, setSavingZoom] = useState<Set<number>>(() => new Set());
  const [capabilities, setCapabilities] = useState<BPMCapabilities | null>(null);
  const [sortKey, setSortKey] = useState<ColumnKey | null>(null);
  const [ascending, setAscending] = useState(true);
  const [filters, setFilters] = useState<Record<ColumnKey, string>>(EMPTY_FILTERS);
  // Bumped on every check-in so the leaderboards re-fetch — they are read while
  // the room fills up.
  const [statsVersion, setStatsVersion] = useState(0);
  const [qrOpen, setQrOpen] = useState(false);
  // A quiet refetch that lands after the scope changed — another date, or a
  // switch into or out of All locations — must not overwrite the new rows.
  const currentScope = useRef<string | null>(null);
  // Bumped by every load and every local patch; only a load still holding the
  // latest number may write. So a quiet Refresh that started before a check-in
  // cannot land after it and take the new row away again.
  const latestWrite = useRef(0);

  useEffect(() => {
    bpmService.capabilities().then(setCapabilities).catch(() => setCapabilities(null));
  }, []);

  const load = useCallback(
    async (ids: number[], quiet = false) => {
      const scope = ids.join(',');
      const request = ++latestWrite.current;
      if (quiet) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await bpmService.associateCheckinsForScope(ids);
        if (currentScope.current !== scope || request !== latestWrite.current) return;
        setRecords(data);
        setStatsVersion((version) => version + 1);
      } catch (error) {
        // A failure for a scope the user has already left is not news.
        if (currentScope.current !== scope) return;
        addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load check-ins' });
      } finally {
        if (quiet) setRefreshing(false);
        else if (currentScope.current === scope) setLoading(false);
      }
    },
    [addToast],
  );

  // Keyed on `scopeKey`, not the `scopeIds` array, so a re-render that rebuilds
  // an identical scope does not blank the table and reload it.
  useEffect(() => {
    const ids = scopeKey ? scopeKey.split(',').map(Number) : [];
    currentScope.current = scopeKey || null;
    setRecords([]);
    // Filters describe the rows of one scope; a Location filter in particular
    // would otherwise linger, invisible, after leaving All locations.
    setFilters(EMPTY_FILTERS);
    if (ids.length) void load(ids);
    else setLoading(false);
  }, [scopeKey, load]);

  /**
   * Apply a row change from a mutation that started on scope `scope`.
   *
   * Skipped when the user has moved to another scope since — the response is
   * about rows that are no longer on screen. Otherwise it also retires any load
   * in flight, whose list predates this change.
   */
  const patchRecords = (scope: string, update: (current: AssociateCheckIn[]) => AssociateCheckIn[]) => {
    if (currentScope.current !== scope) return false;
    latestWrite.current += 1;
    setRecords(update);
    return true;
  };

  const checkIn = async (userId: number) => {
    if (!location) return;
    // A person counts once across the date's locations (D22): somebody already
    // in at *another* location in scope is reported, not checked in there too.
    // The same location still goes to the server, which answers idempotently.
    const existing = records.find((row) => row.user === userId && row.occurrence !== location.id);
    if (existing) {
      addToast({
        type: 'info',
        message: `Already checked in at ${existing.occurrence_label || 'another location'}.`,
      });
      return;
    }
    const scope = scopeKey;
    setBusy(true);
    try {
      const record = await bpmService.checkInAssociate(location.id, userId);
      if (patchRecords(scope, (current) => upsertRecord(current, record))) {
        setStatsVersion((version) => version + 1);
      }
      addToast({ type: 'success', message: 'Associate checked in.' });
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Check-in failed' });
    } finally {
      setBusy(false);
    }
  };

  // Undo and Z act on the row's own location, which in All-locations mode is
  // not necessarily the selected one.
  const undoCheckIn = async (record: AssociateCheckIn) => {
    const scope = scopeKey;
    setBusy(true);
    try {
      await bpmService.undoCheckInAssociate(record.occurrence, record.user);
      if (patchRecords(scope, (current) => current.filter((row) => row.id !== record.id))) {
        setStatsVersion((version) => version + 1);
      }
      addToast({ type: 'success', message: 'Check-in undone.' });
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Undo failed' });
    } finally {
      setBusy(false);
    }
  };

  const setZoom = async (record: AssociateCheckIn, zoom: boolean) => {
    const scope = scopeKey;
    setSavingZoom((current) => new Set(current).add(record.user));
    try {
      const updated = await bpmService.setAssociateCheckinZoom(record.occurrence, record.user, zoom);
      // In place: Z is not an arrival, so the row keeps its position.
      patchRecords(scope, (current) => current.map((row) => (row.id === record.id ? updated : row)));
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to update Zoom' });
    } finally {
      setSavingZoom((current) => {
        const next = new Set(current);
        next.delete(record.user);
        return next;
      });
    }
  };

  const toggleSort = (key: ColumnKey) => {
    if (sortKey === key) {
      setAscending((previous) => !previous);
      return;
    }
    setSortKey(key);
    setAscending(true);
  };

  // The Location column exists only when the rows span several locations.
  const columns = allLocations ? COLUMNS : SINGLE_LOCATION_COLUMNS;

  // Who is already in the room — at any location in scope — so the Invited
  // Associates panel can drop them.
  const checkedInUserIds = useMemo(
    () => new Set(records.map((record) => record.user)),
    [records],
  );

  const visible = useMemo(() => {
    const active = columns.filter(({ key }) => filters[key].trim());
    const filtered = active.length
      ? records.filter((record) =>
          active.every(({ key, text }) =>
            text(record).toLowerCase().includes(filters[key].trim().toLowerCase()),
          ),
        )
      : records;
    // Unsorted means the server's order — most recent arrival first, which is
    // what somebody watching the door wants by default.
    const column = columns.find(({ key }) => key === sortKey);
    if (!column) return filtered;
    const value = column.sort ?? ((record: AssociateCheckIn) => column.text(record).toLowerCase());
    const direction = ascending ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const left = value(a);
      const right = value(b);
      if (left === right) return 0;
      return left > right ? direction : -direction;
    });
  }, [records, filters, sortKey, ascending, columns]);

  // Server-derived: the window opens N hours before start and closes some hours
  // after the end. After close, holders of `can_checkin_after_close` (BPM
  // managers) may still check people in; before open, nobody may. Undo is never
  // gated — a mistake must stay fixable after the window shuts. Read off the
  // location the check-in lands on, since each location keeps its own window.
  const canCheckIn = canCheckInNow(location, capabilities?.can_checkin_after_close);

  // Both read the leaderboard's own totals. Since Phase 6 "Invited" is this
  // date's BPMAssociateInvite rows, not the event-wide roster, so the number
  // finally describes the date on screen — and the panel below it is the list.
  const countCards = useMemo<CheckinCountCard[]>(
    () => [
      { key: 'invited', label: 'Agents Invited', from: 'invited', colorKey: 'agents_invited' },
      { key: 'checked_in', label: 'Agents Checked In', from: 'checked_in', colorKey: 'agents_checked_in' },
    ],
    [],
  );

  const hasFilters = columns.some(({ key }) => filters[key].trim());

  return (
    <BPMPageShell title="Associate Check-In" description="Record associate/member attendance at a BPM.">
      <BPMCard className="mb-4">
        <BPMOccurrencePicker
          allowPast
          // Beside the date it scans into — the other way, besides the search
          // below, of finding the person who just walked in. The window is
          // enforced server-side, so it stays enabled outside it: the modal
          // reports the refusal in the sentence the server sends.
          dateAction={
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="whitespace-nowrap"
              disabled={!occurrence}
              onClick={() => setQrOpen(true)}
            >
              QR
            </Button>
          }
        />
      </BPMCard>

      <CheckinWindowNotice
        occurrence={location}
        canCheckinAfterClose={capabilities?.can_checkin_after_close ?? false}
      />

      {occurrence ? (
        <CheckinStatCards
          occurrenceIds={scopeIds}
          audience="associate"
          countCards={countCards}
          dimensions={ASSOCIATE_DIMENSIONS}
          reloadKey={statsVersion}
        />
      ) : null}

      {/* Above the check-in box on purpose: it is read down while people
          arrive, so it must not be behind a click. */}
      <InvitedAssociatesCard
        occurrenceIds={scopeIds}
        checkedInUserIds={checkedInUserIds}
        reloadKey={statsVersion}
      />

      <BPMCard className="mb-4">
        <label className="mb-2 block text-xs font-semibold text-slate-700 dark:text-white/80">
          Check in an associate
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {/* All-locations mode only (renders nothing for one choice): the rows
              below span every location, but a new check-in lands on one. */}
          <ScopeLocationSelect
            label="Check in at"
            choices={choices}
            value={location}
            onChange={setLocationId}
            disabled={busy}
          />
          <div className="min-w-0 flex-1">
            <UserAutocompleteDropdown
              selectedId={null}
              selectedLabel=""
              placeholder={
                !location
                  ? 'Select a BPM first'
                  : canCheckIn
                    ? 'Search associate'
                    : location.checkin_closed
                      ? 'Check-in has closed'
                      : 'Check-in has not opened yet'
              }
              fetchFromApi
              // Held while the scope's first load runs: a check-in made then
              // would retire that load (see `latestWrite`) and leave only its
              // own row — and the already-checked-in test needs the rows.
              disabled={!location || busy || loading || !canCheckIn}
              buttonText="CHECK IN"
              onSelect={(option) => void checkIn(option.id)}
            />
          </div>
        </div>
      </BPMCard>

      <BPMCard>
        {loading ? (
          <LoadingState />
        ) : (
          <>
            {/* Filters sit above the table rather than in its header so they wrap
                on a phone instead of scrolling away sideways with the columns. */}
            <div className="mb-3 flex flex-wrap items-end gap-2">
              {columns.map(({ key, label }) => (
                <div key={key} className="w-full sm:w-40">
                  <Input
                    variant="surface"
                    value={filters[key]}
                    aria-label={`Filter by ${label}`}
                    placeholder={label}
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, [key]: event.target.value }))
                    }
                  />
                </div>
              ))}
              {hasFilters ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Clear
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="whitespace-nowrap sm:ml-auto"
                disabled={scopeIds.length === 0 || refreshing}
                onClick={() => {
                  if (scopeIds.length) void load(scopeIds, true);
                }}
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : undefined} /> Refresh
              </Button>
            </div>

            <div className="mb-2 text-xs text-slate-500 dark:text-white/60">
              Showing {visible.length} of {records.length}
            </div>

            {visible.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
                {records.length === 0 ? 'No associates checked in yet.' : 'No check-ins match these filters.'}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
                <table className="w-full min-w-[880px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-white/60">
                      {columns
                        .filter(({ key }) => key !== 'arrived')
                        .map(({ key, label }) => (
                          <SortHeader
                            key={key}
                            label={label}
                            columnKey={key}
                            sortKey={sortKey}
                            ascending={ascending}
                            onSort={toggleSort}
                          />
                        ))}
                      <th className="px-3 py-2">Mission</th>
                      <SortHeader
                        label="Checked in"
                        columnKey="arrived"
                        sortKey={sortKey}
                        ascending={ascending}
                        onSort={toggleSort}
                      />
                      <th className="px-3 py-2 text-center" title="Attending on Zoom">
                        Z
                      </th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((record) => (
                      <tr
                        key={record.id}
                        // The row highlight is not decoration: Undo sits at the far
                        // end of a wide row, and without it there is no way to be
                        // sure which person is about to be un-checked-in.
                        className="border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/10"
                      >
                        <td className="px-3 py-2">
                          <UserDetailsLink
                            userId={record.user}
                            name={record.user_name || `User #${record.user}`}
                            className="font-medium text-slate-900 dark:text-white"
                          />
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-white/80">{record.leader_name || '—'}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-white/80">{record.md_name || '—'}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-white/80">{record.smd_name || '—'}</td>
                        {allLocations ? (
                          <td className="px-3 py-2 text-slate-700 dark:text-white/80">
                            {record.occurrence_label || '—'}
                          </td>
                        ) : null}
                        <td className="px-3 py-2">
                          <MissionTrackerDots record={record} />
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500 dark:text-white/60">
                          {formatArrival(record)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Checkbox
                            checked={record.zoom}
                            disabled={savingZoom.has(record.user)}
                            aria-label={`Attending ${record.user_name || `user ${record.user}`} on Zoom`}
                            onChange={(event) => void setZoom(record, event.target.checked)}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busy}
                            aria-label={`Undo check-in for ${record.user_name || `user ${record.user}`}`}
                            onClick={() => void undoCheckIn(record)}
                          >
                            Undo
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </BPMCard>

      <BpmQrModal
        open={qrOpen}
        occurrenceId={location?.id ?? occurrence?.id ?? null}
        // In All-locations mode the modal asks which location to scan into (D24),
        // defaulting to — and updating — this page's "Check in at" choice.
        locations={scopeOccurrences}
        onLocationChange={setLocationId}
        onClose={() => setQrOpen(false)}
        onCheckedIn={(result) => {
          if (!scopeIds.length) return;
          // An associate scan into any location in scope carries the row;
          // anything else (a guest pass scanned here) is refetched quietly
          // rather than guessed at.
          const record = result.check_in;
          if (record && scopeIds.includes(result.occurrence_id)) {
            if (patchRecords(scopeKey, (current) => upsertRecord(current, record))) {
              setStatsVersion((version) => version + 1);
            }
          } else {
            void load(scopeIds, true);
          }
        }}
      />
    </BPMPageShell>
  );
}

/** A clickable column heading that shows which way it is currently sorting. */
function SortHeader({
  label,
  columnKey,
  sortKey,
  ascending,
  onSort,
}: {
  label: string;
  columnKey: ColumnKey;
  sortKey: ColumnKey | null;
  ascending: boolean;
  onSort: (key: ColumnKey) => void;
}) {
  const active = sortKey === columnKey;
  return (
    <th className="px-3 py-2">
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-900 dark:hover:text-white"
      >
        {label}
        {active ? (ascending ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : null}
      </button>
    </th>
  );
}

/**
 * Three mission-tracker dots: green when the milestone is done, red when not.
 *
 * Still the 4X4 milestones; which fields the Mission column should read is
 * being confirmed separately, so only the header has changed.
 */
function MissionTrackerDots({ record }: { record: AssociateCheckIn }) {
  const dots: Array<{ label: string; done: boolean }> = [
    { label: '1st Recruit', done: record.finish_1st_recruit },
    { label: 'Personal Savings', done: record.finish_1st_savings },
    { label: 'Big Event', done: record.big_event_1st },
  ];
  return (
    <span className="flex items-center gap-1">
      {dots.map((dot) => (
        <span
          key={dot.label}
          title={`${dot.label}: ${dot.done ? 'Done' : 'Not done'}`}
          className={`inline-block h-2.5 w-2.5 rounded-full ${
            dot.done ? 'bg-emerald-500' : 'bg-red-500'
          }`}
        />
      ))}
    </span>
  );
}
