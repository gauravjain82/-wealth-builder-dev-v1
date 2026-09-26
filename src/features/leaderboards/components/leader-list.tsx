/**
 * One ranking panel — "Top 5 SMD" or "Top 5 MD".
 *
 * Two presentations from one component, because they differ in exactly one way
 * (`DATA_CONTRACT.md` §Rankings): a standard ranking shows what exists, while the
 * Full Report reserves five equal-height slots so its four columns stay aligned.
 * `reserveSlots` picks between them.
 *
 * Every value is a button. Opening the proof for a number is the point of the
 * screen, so the number itself is the affordance rather than a separate icon.
 */

import type { LeaderRow, LeaderboardMetric } from '../types';
import { formatMetricValue, levelLabel } from './format';

interface LeaderListProps {
  title: string;
  rows: LeaderRow[];
  metric: LeaderboardMetric;
  /** Pad to five slots for Full Report alignment. */
  reserveSlots?: boolean;
  /** Drop the director-title subtitle — the Full Report's narrow columns show one line per row. */
  compact?: boolean;
  /** Opens the proof detail for one leader. Omit to render values as plain text. */
  onSelect?: (row: LeaderRow) => void;
  emptyMessage?: string;
}

const SLOT_COUNT = 5;

export function LeaderList({
  title,
  rows,
  metric,
  reserveSlots = false,
  compact = false,
  onSelect,
  emptyMessage = 'No results for this period',
}: LeaderListProps) {
  /**
   * A tie that straddles the fifth position is summarised rather than truncated:
   * showing an arbitrary four of six people tied at rank 4 would misrepresent the
   * result. The backend ranks densely, so the tie is detectable from the ranks.
   */
  const lastRank = rows.length ? rows[rows.length - 1].rank : 0;
  const tiedAtBoundary = rows.filter((row) => row.rank === lastRank);
  const showTieSummary = reserveSlots && rows.length >= SLOT_COUNT && tiedAtBoundary.length > 1;
  const visibleRows = showTieSummary ? rows.slice(0, SLOT_COUNT - 1) : rows.slice(0, SLOT_COUNT);
  const hiddenTieCount = showTieSummary
    ? tiedAtBoundary.length - visibleRows.filter((row) => row.rank === lastRank).length
    : 0;

  const blankSlots = reserveSlots
    ? Math.max(0, SLOT_COUNT - visibleRows.length - (showTieSummary ? 1 : 0))
    : 0;

  return (
    <div className="wb-lb-panel">
      <h4 className="wb-lb-panel__title">{title}</h4>

      {visibleRows.length === 0 && !reserveSlots && (
        <p className="wb-lb-panel__empty">{emptyMessage}</p>
      )}

      <ol className="wb-lb-panel__list">
        {visibleRows.map((row) => (
          <li key={`${row.agent_id}-${row.rank}`} className="wb-lb-panel__row">
            <span className="wb-lb-panel__rank">#{row.rank}</span>
            <span className="wb-lb-panel__identity">
              <span className="wb-lb-panel__name" title={row.name}>
                {row.name || row.agent_id}
              </span>
              {!compact && (
                <span className="wb-lb-panel__meta">
                  {levelLabel(row.level_code)}
                  {levelLabel(row.level_code) && ' · '}
                  {row.member_count} members
                  {row.contributes_to_label && row.contributes_to_name && (
                    <>
                      {' · '}
                      <span title={`Contributes to ${row.contributes_to_name}`}>
                        → {row.contributes_to_label}
                      </span>
                    </>
                  )}
                </span>
              )}
            </span>
            {onSelect ? (
              <button
                type="button"
                className="wb-lb-panel__value wb-lb-panel__value--action"
                onClick={() => onSelect(row)}
                aria-label={`Show how ${row.name || row.agent_id} reached ${formatMetricValue(metric, row.value)}`}
              >
                {formatMetricValue(metric, row.value)}
              </button>
            ) : (
              <span className="wb-lb-panel__value">{formatMetricValue(metric, row.value)}</span>
            )}
          </li>
        ))}

        {showTieSummary && (
          <li className="wb-lb-panel__row wb-lb-panel__row--tie">
            <span className="wb-lb-panel__tie">
              +{hiddenTieCount} more tied at #{lastRank}
            </span>
          </li>
        )}

        {/* Non-semantic padding. Hidden from assistive technology so an empty slot
            is never announced as a result. */}
        {Array.from({ length: blankSlots }, (_, index) => (
          <li
            key={`blank-${index}`}
            className="wb-lb-panel__row wb-lb-panel__row--blank"
            aria-hidden="true"
          />
        ))}
      </ol>

      {reserveSlots && visibleRows.length === 0 && (
        <p className="wb-lb-panel__empty wb-lb-panel__empty--overlay">{emptyMessage}</p>
      )}
    </div>
  );
}

export default LeaderList;
