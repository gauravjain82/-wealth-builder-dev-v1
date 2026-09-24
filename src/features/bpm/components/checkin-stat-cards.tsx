import { useCallback, useEffect, useState } from 'react';
import { Modal } from '@shared/components';
import { UserDetailsLink } from '@/features/team/components/user-details-link';
import { bpmService } from '../services/bpm-service';
import type {
  CheckinAudience,
  CheckinDimension,
  CheckinDimensionStats,
  CheckinRankEntry,
  CheckinStats,
} from '../types';

/**
 * The cards across the top of both check-in screens, and the ranking behind them.
 *
 * Both screens open on a row of cards — a plain count or two, then Top Inviter /
 * Leader / MD / SMD — and every card opens the full ranked list. That is one
 * component rather than two because the only differences between the screens are
 * which audience the numbers describe and what the plain counts are called, and
 * a second copy would be the thing that drifts.
 *
 * The whole payload (cards *and* the lists behind them) arrives in a single
 * request, so opening a card costs nothing. It is reloaded whenever `reloadKey`
 * changes — the pages bump it on every check-in, because the numbers are read
 * while the room fills up.
 */

/**
 * A plain counter card rather than a ranking.
 *
 * `from` reads one of the fetched totals, which is how "Agents Invited" gets a
 * number at all — the occurrence serializer's `associate_count` is the number
 * *checked in*, and the roster it would have to be compared against lives on
 * the event. The leaderboard already resolves both, so the card reads that
 * rather than re-deriving a figure that would silently be the wrong one.
 * `value` is for counters the page genuinely owns.
 */
export interface CheckinCountCard {
  key: string;
  label: string;
  className: string;
  value?: number | string;
  from?: 'invited' | 'checked_in' | 'ratio';
}

interface CheckinStatCardsProps {
  occurrenceId: number | null;
  audience: CheckinAudience;
  /** Plain counters shown before the rankings (Agents Invited, Total Invites…). */
  countCards?: CheckinCountCard[];
  /** Which rankings to show, in order. */
  dimensions: CheckinDimension[];
  /** Change this to force a reload — the pages bump it after every check-in. */
  reloadKey?: number;
}

/** Tailwind background per ranking card, so the four are told apart at a glance. */
const DIMENSION_CLASS: Record<CheckinDimension, string> = {
  inviter: 'bg-sky-500',
  leader: 'bg-violet-500',
  md: 'bg-amber-500',
  smd: 'bg-emerald-600',
};

/**
 * Card headings used until the server's own labels arrive — and if they never
 * do. A card that reads as a blank box while loading looks broken.
 */
const DIMENSION_LABEL: Record<CheckinDimension, string> = {
  inviter: 'Top Inviter',
  leader: 'Top Leader',
  md: 'Top MD',
  smd: 'Top SMD',
};

function Card({
  label,
  value,
  caption,
  className,
  onClick,
}: {
  label: string;
  value: string | number;
  caption?: string;
  className: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="text-xs font-medium uppercase tracking-wide text-white/80">{label}</div>
      <div className="mt-1 truncate text-2xl font-bold" title={String(value)}>
        {value}
      </div>
      {caption ? <div className="mt-0.5 text-xs text-white/80">{caption}</div> : null}
    </>
  );
  const classes = `rounded-xl p-4 text-left text-white shadow-sm ${className}`;
  if (!onClick) return <div className={classes}>{content}</div>;
  return (
    <button type="button" onClick={onClick} className={`${classes} transition hover:brightness-110`}>
      {content}
    </button>
  );
}

/** The ranked list behind one card. */
function RankingModal({
  open,
  stats,
  onClose,
}: {
  open: boolean;
  stats: CheckinDimensionStats | null;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title={stats?.label ?? ''} onClose={onClose} contentClassName="max-w-[560px]">
      {!stats || stats.entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
          Nobody to rank yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-white/60">
                <th className="px-3 py-2 w-12">#</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2 text-right">Invited</th>
                <th className="px-3 py-2 text-right">Checked in</th>
                <th className="px-3 py-2 text-right">Ratio</th>
              </tr>
            </thead>
            <tbody>
              {stats.entries.map((entry) => (
                <tr key={entry.user_id} className="border-t border-slate-100 dark:border-white/10">
                  <td className="px-3 py-2 text-slate-500 dark:text-white/50">{entry.rank}</td>
                  <td className="px-3 py-2">
                    <UserDetailsLink
                      userId={entry.user_id}
                      name={entry.name}
                      className="font-medium text-slate-900 dark:text-white"
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700 dark:text-white/80">{entry.invited}</td>
                  <td className="px-3 py-2 text-right text-slate-700 dark:text-white/80">{entry.checked_in}</td>
                  <td className="px-3 py-2 text-right text-slate-700 dark:text-white/80">{entry.ratio}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

export function CheckinStatCards({
  occurrenceId,
  audience,
  countCards = [],
  dimensions,
  reloadKey = 0,
}: CheckinStatCardsProps) {
  const [stats, setStats] = useState<CheckinStats | null>(null);
  const [openDimension, setOpenDimension] = useState<CheckinDimension | null>(null);

  const load = useCallback(async () => {
    if (!occurrenceId) {
      setStats(null);
      return;
    }
    try {
      setStats(await bpmService.checkinStats(occurrenceId, audience));
    } catch {
      // Non-fatal: the cards fall back to em dashes rather than taking the
      // check-in list down with them. Checking people in is the job here.
      setStats(null);
    }
  }, [occurrenceId, audience]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  return (
    <>
      {/* Two up on a tablet, all of them in one row on a wide screen — these
          are read at a glance from across a room. */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {countCards.map((card) => {
          const total = card.from && stats ? stats.totals[card.from] : undefined;
          const value =
            card.value ?? (total === undefined ? '—' : card.from === 'ratio' ? `${total}%` : total);
          return <Card key={card.key} label={card.label} value={value} className={card.className} />;
        })}
        {dimensions.map((dimension) => {
          const entry = stats?.dimensions[dimension] ?? null;
          const top: CheckinRankEntry | null = entry?.leader ?? null;
          return (
            <Card
              key={dimension}
              label={entry?.label ?? DIMENSION_LABEL[dimension]}
              value={top?.name ?? '—'}
              caption={
                top
                  ? `${top.checked_in} of ${top.invited} in · ${top.ratio}%`
                  : 'Nobody yet'
              }
              className={DIMENSION_CLASS[dimension]}
              onClick={() => setOpenDimension(dimension)}
            />
          );
        })}
      </div>

      <RankingModal
        open={openDimension !== null}
        stats={openDimension ? stats?.dimensions[openDimension] ?? null : null}
        onClose={() => setOpenDimension(null)}
      />
    </>
  );
}
