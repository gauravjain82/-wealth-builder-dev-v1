import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Button, LoadingState, UserAutocompleteDropdown } from '@shared/components';
import { UserDetailsLink } from '@/features/team/components/user-details-link';
import { useToastStore } from '@/store';
import { BPMCard, BPMPageShell } from '../components/bpm-page-shell';
import { BPMOccurrencePicker } from '../components/bpm-occurrence-picker';
import { useBpmSelection } from '../context/bpm-selection-context';
import { CheckinStatCards, type CheckinCountCard } from '../components/checkin-stat-cards';
import { InvitedAssociatesCard } from '../components/invited-associates-card';
import { bpmService, formatOccurrenceTime } from '../services/bpm-service';
import type { AssociateCheckIn, CheckinDimension } from '../types';

/**
 * Which rankings this page shows.
 *
 * Four are available since Phase 6 gave associate invites an `invited_by`, but
 * the screen still shows two: it is read at a door, and the cards above compete
 * for the same row as the two counters. Top SMD and Top MD are the ones the
 * brief asked for; `inviter` and `leader` are one line away if that changes.
 */
const ASSOCIATE_DIMENSIONS: CheckinDimension[] = ['smd', 'md'];

/** Sortable columns, keyed by the question they answer rather than the field. */
type SortKey = 'name' | 'leader' | 'smd' | 'arrived';

function sortValue(record: AssociateCheckIn, key: SortKey): string | number {
  switch (key) {
    case 'name':
      return (record.user_name || '').toLowerCase();
    case 'leader':
      return (record.leader_name || '').toLowerCase();
    case 'smd':
      return (record.smd_name || '').toLowerCase();
    case 'arrived':
      return Date.parse(record.checked_in_at);
    default:
      return '';
  }
}

export default function AssociateCheckinPage() {
  const addToast = useToastStore((state) => state.addToast);
  // Sticky: the BPM/date chosen here follows the user to the other sub-tools.
  const { occurrence } = useBpmSelection();
  const [records, setRecords] = useState<AssociateCheckIn[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [ascending, setAscending] = useState(true);
  // Bumped on every check-in so the leaderboards re-fetch — they are read while
  // the room fills up.
  const [statsVersion, setStatsVersion] = useState(0);

  const load = useCallback(
    async (occurrenceId: number) => {
      setLoading(true);
      try {
        setRecords(await bpmService.associateCheckins(occurrenceId));
        setStatsVersion((version) => version + 1);
      } catch (error) {
        addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load check-ins' });
      } finally {
        setLoading(false);
      }
    },
    [addToast],
  );

  useEffect(() => {
    if (occurrence) void load(occurrence.id);
    else setRecords([]);
  }, [occurrence, load]);

  const checkIn = async (userId: number) => {
    if (!occurrence) return;
    setBusy(true);
    try {
      await bpmService.checkInAssociate(occurrence.id, userId);
      addToast({ type: 'success', message: 'Associate checked in.' });
      await load(occurrence.id);
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Check-in failed' });
    } finally {
      setBusy(false);
    }
  };

  const undoCheckIn = async (userId: number) => {
    if (!occurrence) return;
    setBusy(true);
    try {
      await bpmService.undoCheckInAssociate(occurrence.id, userId);
      addToast({ type: 'success', message: 'Check-in undone.' });
      await load(occurrence.id);
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Undo failed' });
    } finally {
      setBusy(false);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setAscending((previous) => !previous);
      return;
    }
    setSortKey(key);
    setAscending(true);
  };

  // Who is already in the room, for the Invited Associates panel's "Here" mark.
  const checkedInUserIds = useMemo(
    () => new Set(records.map((record) => record.user)),
    [records],
  );

  const sorted = useMemo(() => {
    // Unsorted means the server's order — most recent arrival first, which is
    // what somebody watching the door wants by default.
    if (!sortKey) return records;
    const direction = ascending ? 1 : -1;
    return [...records].sort((a, b) => {
      const left = sortValue(a, sortKey);
      const right = sortValue(b, sortKey);
      if (left === right) return 0;
      return left > right ? direction : -direction;
    });
  }, [records, sortKey, ascending]);

  // Both read the leaderboard's own totals. Since Phase 6 "Invited" is this
  // date's BPMAssociateInvite rows, not the event-wide roster, so the number
  // finally describes the date on screen — and the panel below it is the list.
  const countCards = useMemo<CheckinCountCard[]>(
    () => [
      { key: 'invited', label: 'Agents Invited', from: 'invited', className: 'bg-sky-500' },
      { key: 'checked_in', label: 'Agents Checked In', from: 'checked_in', className: 'bg-emerald-500' },
    ],
    [],
  );

  return (
    <BPMPageShell title="Associate Check-In" description="Record associate/member attendance at a BPM.">
      <BPMCard className="mb-4">
        <BPMOccurrencePicker allowPast />
      </BPMCard>

      {occurrence ? (
        <CheckinStatCards
          occurrenceId={occurrence.id}
          audience="associate"
          countCards={countCards}
          dimensions={ASSOCIATE_DIMENSIONS}
          reloadKey={statsVersion}
        />
      ) : null}

      {/* Above the check-in box on purpose: it is read down while people
          arrive, so it must not be behind a click. */}
      <InvitedAssociatesCard
        occurrenceId={occurrence?.id ?? null}
        checkedInUserIds={checkedInUserIds}
        reloadKey={statsVersion}
      />

      <BPMCard className="mb-4">
        <label className="mb-2 block text-xs font-semibold text-slate-700 dark:text-white/80">
          Check in an associate
        </label>
        <UserAutocompleteDropdown
          selectedId={null}
          selectedLabel=""
          placeholder={occurrence ? 'Search associate' : 'Select a BPM first'}
          fetchFromApi
          disabled={!occurrence || busy}
          buttonText="CHECK IN"
          onSelect={(option) => void checkIn(option.id)}
        />
      </BPMCard>

      <BPMCard>
        {loading ? (
          <LoadingState />
        ) : records.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
            No associates checked in yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-white/60">
                  <SortHeader label="Name" columnKey="name" sortKey={sortKey} ascending={ascending} onSort={toggleSort} />
                  <SortHeader label="Leader" columnKey="leader" sortKey={sortKey} ascending={ascending} onSort={toggleSort} />
                  <SortHeader label="SMD" columnKey="smd" sortKey={sortKey} ascending={ascending} onSort={toggleSort} />
                  <th className="px-3 py-2">4X4</th>
                  <SortHeader
                    label="Checked in"
                    columnKey="arrived"
                    sortKey={sortKey}
                    ascending={ascending}
                    onSort={toggleSort}
                  />
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((record) => (
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
                    <td className="px-3 py-2 text-slate-700 dark:text-white/80">{record.smd_name || '—'}</td>
                    <td className="px-3 py-2">
                      <MissionTrackerDots record={record} />
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500 dark:text-white/60">
                      {formatOccurrenceTime(record.checked_in_at, { weekday: undefined })}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        aria-label={`Undo check-in for ${record.user_name || `user ${record.user}`}`}
                        onClick={() => void undoCheckIn(record.user)}
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
      </BPMCard>
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
  columnKey: SortKey;
  sortKey: SortKey | null;
  ascending: boolean;
  onSort: (key: SortKey) => void;
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

/** Three 4X4 mission-tracker dots: green when the milestone is done, red when not. */
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
