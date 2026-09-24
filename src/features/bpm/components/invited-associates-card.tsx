import { useCallback, useEffect, useMemo, useState } from 'react';
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
 * sits above the check-in box rather than in a modal, and why it marks who has
 * already arrived instead of dropping them.
 *
 * The SMD / MD / Leader selects narrow cumulatively and are built from whoever
 * is actually on the list, mirroring the Guest Check-In filters: an option that
 * matches nobody is worse than no option.
 */

interface InvitedAssociatesCardProps {
  occurrenceId: number | null;
  /** User ids already checked in, so an arrival can be struck through. */
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
  occurrenceId,
  checkedInUserIds,
  reloadKey = 0,
}: InvitedAssociatesCardProps) {
  const [rows, setRows] = useState<BPMAssociateInviteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<FilterKey, string>>({
    smd_name: '',
    md_name: '',
    leader_name: '',
  });

  const load = useCallback(async () => {
    if (!occurrenceId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const data = await bpmService.associateInvites({
        occurrence: occurrenceId,
        page_size: PAGE_SIZE,
        sort: 'name',
        filters: { invited: 'true' },
      });
      setRows(data.results);
    } catch {
      // Non-fatal: checking people in is the job on this screen, and a failed
      // panel must not take the check-in box down with it.
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [occurrenceId]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  /**
   * Options come from the rows on screen, and each select's options respect the
   * *other* two, so the three narrow cumulatively rather than offering dead ends.
   */
  const optionsFor = useCallback(
    (key: FilterKey) =>
      Array.from(
        new Set(
          rows
            .filter((row) =>
              FILTERS.every(
                ({ key: other }) =>
                  other === key || !selected[other] || row[other] === selected[other],
              ),
            )
            .map((row) => row[key])
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [rows, selected],
  );

  const visible = useMemo(
    () =>
      rows.filter((row) =>
        FILTERS.every(({ key }) => !selected[key] || row[key] === selected[key]),
      ),
    [rows, selected],
  );

  const arrived = visible.filter((row) => checkedInUserIds.has(row.user_id)).length;

  if (!occurrenceId) return null;

  return (
    <BPMCard className="mb-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Invited Associates
          </h2>
          <p className="text-xs text-slate-500 dark:text-white/60">
            {visible.length} invited · {arrived} arrived
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
            : 'No invited associates match these filters.'}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((row) => {
            const here = checkedInUserIds.has(row.user_id);
            return (
              <li
                key={row.user_id}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-sm dark:border-white/10"
              >
                <UserDetailsLink
                  userId={row.user_id}
                  name={row.name || `User #${row.user_id}`}
                  className={
                    here
                      ? 'text-slate-400 line-through dark:text-white/40'
                      : 'text-slate-900 dark:text-white'
                  }
                />
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                    here
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                      : 'bg-slate-500/10 text-slate-500 dark:text-white/50'
                  }`}
                >
                  {here ? 'Here' : 'Waiting'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </BPMCard>
  );
}
