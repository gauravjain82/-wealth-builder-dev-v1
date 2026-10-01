import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LoadingState } from '@shared/components';
import { UserDetailsLink } from '@/features/team/components/user-details-link';
import { bpmService } from '../services/bpm-service';
import { BPMCard } from './bpm-page-shell';
import type { BPMAssociateInviteRow } from '../types';

/**
 * Who was invited to this date, on the check-in screen — the list the
 * *Agents Invited* card counts.
 *
 * Until Phase 6 there was no such list: "invited" was the event-level roster,
 * so the card printed a number spanning every date of the BPM with nothing
 * behind it. `BPMAssociateInvite` makes it a real, per-date set, and this panel
 * is what somebody at the door reads down while people arrive — which is why it
 * sits above the check-in box rather than in a modal.
 *
 * It lists only who is still expected. Arrivals drop out, because the checked-in
 * table below already lists them; striking them through here made the one list
 * the door reads grow longer as the room filled. The header still counts both.
 *
 * The SMD / MD / Leader selects narrow cumulatively and are built from whoever
 * is actually on the list, mirroring the Guest Check-In filters: an option that
 * matches nobody is worse than no option.
 *
 * **All locations.** An associate invite is to the date, not a location (D21),
 * so with several `occurrenceIds` the list reads across all of them, each name
 * labelled with the location its invite is stored on; and an arrival at any of
 * them drops the name, because a person counts once (D22).
 */

interface InvitedAssociatesCardProps {
  /** The scope — one location, or every location of the date. Empty for none. */
  occurrenceIds: number[];
  /** User ids checked in at any location in scope, so an arrival drops off the list. */
  checkedInUserIds: Set<number>;
  /** Bumped by the page after every check-in, and after every invite change. */
  reloadKey?: number;
}

/** One invited associate needs no paging in practice, but the endpoint pages. */
const PAGE_SIZE = 200;

type FilterKey = 'smd_name' | 'md_name' | 'leader_name';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'smd_name', label: 'SMD' },
  { key: 'md_name', label: 'MD' },
  { key: 'leader_name', label: 'Leader' },
];

export function InvitedAssociatesCard({
  occurrenceIds,
  checkedInUserIds,
  reloadKey = 0,
}: InvitedAssociatesCardProps) {
  // The scope as one comparable value: the callback below depends on it rather
  // than on the array, so a rebuilt but identical scope does not reload.
  const scopeKey = occurrenceIds.join(',');
  const allLocations = occurrenceIds.length > 1;
  const [rows, setRows] = useState<BPMAssociateInviteRow[]>([]);
  const [loading, setLoading] = useState(false);
  // The scope whose rows are on screen. Only a new scope shows the loading
  // state; the reload after every check-in swaps rows in place instead of
  // blanking the panel somebody is reading.
  const loadedFor = useRef<string | null>(null);
  // Only the newest request may write — a reload for the previous scope must
  // not land on top of this one.
  const latestRequest = useRef(0);
  const [selected, setSelected] = useState<Record<FilterKey, string>>({
    smd_name: '',
    md_name: '',
    leader_name: '',
  });

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    if (!scopeKey) {
      loadedFor.current = null;
      setRows([]);
      return;
    }
    const ids = scopeKey.split(',').map(Number);
    const quiet = loadedFor.current === scopeKey;
    if (!quiet) setLoading(true);
    try {
      // Exactly one of `occurrence` / `occurrences` is sent: one id keeps the
      // single-location request unchanged.
      const data = await bpmService.associateInvites({
        ...(ids.length > 1 ? { occurrences: ids } : { occurrence: ids[0] }),
        page_size: PAGE_SIZE,
        sort: 'name',
        filters: { invited: 'true' },
      });
      if (request !== latestRequest.current) return;
      setRows(data.results);
      loadedFor.current = scopeKey;
    } catch {
      // Non-fatal: checking people in is the job on this screen, and a failed
      // panel must not take the check-in box down with it. A failed quiet
      // reload keeps the rows it had.
      if (request === latestRequest.current && !quiet) setRows([]);
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  }, [scopeKey]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  // Who is still to arrive — the only rows this panel shows.
  const pending = useMemo(
    () => rows.filter((row) => !checkedInUserIds.has(row.user_id)),
    [rows, checkedInUserIds],
  );

  /**
   * Options come from the rows on screen, and each select's options respect the
   * *other* two, so the three narrow cumulatively rather than offering dead ends.
   */
  const optionsFor = useCallback(
    (key: FilterKey) =>
      Array.from(
        new Set(
          pending
            .filter((row) =>
              FILTERS.every(
                ({ key: other }) =>
                  other === key || !selected[other] || row[other] === selected[other],
              ),
            )
            .map((row) => row[key])
            // A chosen value stays listed after its last person arrives, so
            // the select never shows a value it has no option for.
            .concat(selected[key])
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [pending, selected],
  );

  const matches = useCallback(
    (row: BPMAssociateInviteRow) =>
      FILTERS.every(({ key }) => !selected[key] || row[key] === selected[key]),
    [selected],
  );

  const visible = useMemo(() => pending.filter(matches), [pending, matches]);

  // Counted over the whole invite list under the same filters, so the two
  // numbers still add up to what the Agents Invited card says when unfiltered.
  const arrived = useMemo(
    () => rows.filter((row) => matches(row) && checkedInUserIds.has(row.user_id)).length,
    [rows, matches, checkedInUserIds],
  );

  if (!scopeKey) return null;

  return (
    <BPMCard className="mb-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Invited Associates
          </h2>
          <p className="text-xs text-slate-500 dark:text-white/60">
            {visible.length} still expected · {arrived} arrived
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map(({ key, label }) => (
            <select
              key={key}
              value={selected[key]}
              aria-label={`Filter by ${label}`}
              className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-white/80"
              onChange={(event) =>
                setSelected((current) => ({ ...current, [key]: event.target.value }))
              }
            >
              <option value="">All {label}s</option>
              {optionsFor(key).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
          {rows.length === 0
            ? 'Nobody has been invited to this date yet — use Associate Invites.'
            : pending.length === 0
              ? 'Everyone invited is here.'
              : arrived > 0
                ? 'Everyone invited who matches these filters is here.'
                : 'No invited associates match these filters.'}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((row) => (
            <li
              key={row.user_id}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-sm dark:border-white/10"
            >
              <UserDetailsLink
                userId={row.user_id}
                name={row.name || `User #${row.user_id}`}
                className="text-slate-900 dark:text-white"
              />
              {allLocations && row.invite_occurrence_label ? (
                <span className="ml-auto shrink-0 text-xs text-slate-500 dark:text-white/60">
                  {row.invite_occurrence_label}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </BPMCard>
  );
}
