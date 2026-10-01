import { useEffect, useState } from 'react';
import { Modal } from '@shared/components';
import { UserDetailsLink } from '@/features/team/components/user-details-link';
import { useBpmConfig } from '../context/bpm-config-context';
import { bpmService } from '../services/bpm-service';
import type {
  BPMStatCardKey,
  CheckinAudience,
  CheckinDimension,
  CheckinDimensionStats,
  CheckinRankEntry,
  CheckinStats,
} from '../types';

/**
 * The cards across the top of both check-in screens, and the ranking behind them.
 *
 * Both screens open on a row of cards — a few plain counts, then the rankings
 * (Top Inviter / Leader / MD / SMD, and Top Direct for associates) — and every
 * ranking opens the full ranked list. That is one
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
 *
 * `colorKey` names the card's colour in BPM Settings (`stat_card_colors`); the
 * page says *which* card it is, and the settings say what that looks like.
 */
export interface CheckinCountCard {
  key: string;
  label: string;
  colorKey: BPMStatCardKey;
  value?: number | string;
  from?: 'invited' | 'checked_in' | 'ratio';
}

interface CheckinStatCardsProps {
  /**
   * The scope the numbers describe: one location, or every location of a date.
   * Empty means nothing is selected. Several ids count each person once across
   * the locations (D22) — that is the server's job, not a sum taken here.
   */
  occurrenceIds: number[];
  audience: CheckinAudience;
  /** Plain counters shown before the rankings (Agents Invited, Total Invites…). */
  countCards?: CheckinCountCard[];
  /** Which rankings to show, in order. */
  dimensions: CheckinDimension[];
  /** Change this to force a reload — the pages bump it after every check-in. */
  reloadKey?: number;
}

/**
 * Tailwind background per card, used only until BPM Settings arrives (or if it
 * never does). The configured colours are the real ones — an admin picks them in
 * Settings — but a row of grey boxes while the settings load would read as
 * broken, so each card keeps the colour it shipped with as a fallback.
 */
const FALLBACK_CLASS: Record<BPMStatCardKey, string> = {
  guests_invited: 'bg-sky-500',
  guests_checked_in: 'bg-emerald-500',
  guests_ratio: 'bg-indigo-500',
  agents_invited: 'bg-sky-500',
  agents_checked_in: 'bg-emerald-500',
  inviter: 'bg-sky-500',
  leader: 'bg-violet-500',
  md: 'bg-amber-500',
  smd: 'bg-emerald-600',
  direct: 'bg-rose-500',
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
  direct: 'Top Direct',
};

/** One upline column in the ranking modal, and the field it reads. */
interface UplineColumn {
  label: string;
  field: 'leader_name' | 'md_name' | 'smd_name';
}

const LEADER_COLUMN: UplineColumn = { label: 'Leader', field: 'leader_name' };
const MD_COLUMN: UplineColumn = { label: 'MD', field: 'md_name' };
const SMD_COLUMN: UplineColumn = { label: 'SMD', field: 'smd_name' };

/**
 * The ranked person's upline, as far as it is *above* them.
 *
 * A Top MD list with an MD column would repeat the name beside it, so each
 * dimension shows only the levels over its own: an inviter or a direct recruiter
 * can sit anywhere in a team and gets all three, an SMD has nobody to show.
 */
const UPLINE_COLUMNS: Record<CheckinDimension, UplineColumn[]> = {
  inviter: [LEADER_COLUMN, MD_COLUMN, SMD_COLUMN],
  leader: [MD_COLUMN, SMD_COLUMN],
  md: [SMD_COLUMN],
  smd: [],
  direct: [LEADER_COLUMN, MD_COLUMN, SMD_COLUMN],
};

/**
 * Grid columns by card count, so a row never ends with one orphan.
 *
 * Four or fewer keep the original one-row layout on a wide screen; six split
 * into two rows of three; seven or eight into rows of four. Spelled out in full
 * because Tailwind only emits classes it can find as literal strings.
 */
function gridClass(count: number): string {
  if (count <= 4) return 'sm:grid-cols-2 xl:grid-cols-4';
  if (count === 5) return 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5';
  if (count === 6) return 'sm:grid-cols-2 lg:grid-cols-3';
  return 'sm:grid-cols-2 lg:grid-cols-4';
}

function Card({
  label,
  value,
  caption,
  colorKey,
  onClick,
}: {
  label: string;
  value: string | number;
  caption?: string;
  colorKey: BPMStatCardKey;
  onClick?: () => void;
}) {
  // A configured colour wins; the class is only the fallback until it arrives.
  const color = useBpmConfig().settings?.stat_card_colors?.[colorKey];
  const content = (
    <>
      <div className="text-xs font-medium uppercase tracking-wide text-white/80">{label}</div>
      <div className="mt-1 truncate text-2xl font-bold" title={String(value)}>
        {value}
      </div>
      {caption ? <div className="mt-0.5 text-xs text-white/80">{caption}</div> : null}
    </>
  );
  const classes = `rounded-xl p-4 text-left text-white shadow-sm ${color ? '' : FALLBACK_CLASS[colorKey]}`;
  const style = color ? { backgroundColor: color } : undefined;
  if (!onClick) {
    return (
      <div className={classes} style={style}>
        {content}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${classes} transition hover:brightness-110`}
      style={style}
    >
      {content}
    </button>
  );
}

/** The ranked list behind one card. */
function RankingModal({
  open,
  dimension,
  stats,
  onClose,
}: {
  open: boolean;
  dimension: CheckinDimension | null;
  stats: CheckinDimensionStats | null;
  onClose: () => void;
}) {
  const uplines = dimension ? UPLINE_COLUMNS[dimension] : [];
  return (
    <Modal
      open={open}
      title={stats?.label ?? ''}
      onClose={onClose}
      contentClassName={uplines.length ? 'max-w-[820px]' : 'max-w-[560px]'}
    >
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
                {uplines.map((column) => (
                  <th key={column.field} className="px-3 py-2">
                    {column.label}
                  </th>
                ))}
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
                  {uplines.map((column) => (
                    <td key={column.field} className="px-3 py-2 text-slate-700 dark:text-white/80">
                      {entry[column.field] || '—'}
                    </td>
                  ))}
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
  occurrenceIds,
  audience,
  countCards = [],
  dimensions,
  reloadKey = 0,
}: CheckinStatCardsProps) {
  const [stats, setStats] = useState<CheckinStats | null>(null);
  const [openDimension, setOpenDimension] = useState<CheckinDimension | null>(null);
  // Keyed on the ids' *values*: the pages rebuild the array whenever the
  // occurrence list refreshes, and that alone must not refetch the cards.
  const idsKey = occurrenceIds.join(',');

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',').map(Number) : [];
    if (ids.length === 0) {
      setStats(null);
      return;
    }
    // Only the latest request may paint: switching scope (or a burst of
    // check-ins) while a slow load is in flight must not land an older answer
    // over a newer one.
    let active = true;
    bpmService
      .checkinStatsForScope(ids, audience)
      .then((next) => {
        if (active) setStats(next);
      })
      .catch(() => {
        // Non-fatal: the cards fall back to em dashes rather than taking the
        // check-in list down with them. Checking people in is the job here.
        if (active) setStats(null);
      });
    return () => {
      active = false;
    };
  }, [idsKey, audience, reloadKey]);

  return (
    <>
      {/* Two up on a tablet, as few rows as fit on a wide screen — these are
          read at a glance from across a room. */}
      <div className={`mb-4 grid grid-cols-1 gap-3 ${gridClass(countCards.length + dimensions.length)}`}>
        {countCards.map((card) => {
          const total = card.from && stats ? stats.totals[card.from] : undefined;
          const value =
            card.value ?? (total === undefined ? '—' : card.from === 'ratio' ? `${total}%` : total);
          return <Card key={card.key} label={card.label} value={value} colorKey={card.colorKey} />;
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
              colorKey={dimension}
              onClick={() => setOpenDimension(dimension)}
            />
          );
        })}
      </div>

      <RankingModal
        open={openDimension !== null}
        dimension={openDimension}
        stats={openDimension ? stats?.dimensions[openDimension] ?? null : null}
        onClose={() => setOpenDimension(null)}
      />
    </>
  );
}
