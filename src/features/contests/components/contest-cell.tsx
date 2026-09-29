/**
 * One standings cell: a percentage, its metric pills, or a blank.
 *
 * The blank is the part that matters. `docs/contests/UI.md` §2.5 requires
 * that an ineligible cell renders visually empty and **never** shows the word
 * "Restricted" — it reads as a punishment rather than as "this tier is not for you",
 * and a Non-License tier blanks every licensed person by design. The accessible text
 * carries the meaning instead, so the cell is empty to the eye and explicit to a
 * screen reader.
 *
 * The blank is also structural rather than cosmetic: the server sends
 * `progress: null` and an empty `metrics` array for an ineligible cell, so there is
 * no number here to hide by accident.
 */

import type { MetricProgress, TierEvaluation } from '../types';
import { formatAmount, formatPercent, pillTitle } from './contest-format';

interface ContestCellProps {
  evaluation: TierEvaluation | undefined;
  tierName: string;
  showNearQualifiers: boolean;
  /**
   * Decision C5's label for the single-hop measures. The standalone page shows no
   * banner above the grid (parity phase 18), so the BR/BP/LIC pills carry it here, and
   * the proof dialog states it in full.
   */
  teamCreditNote: string;
  onOpenProof: (metric: MetricProgress) => void;
}

export function ContestCell({
  evaluation,
  tierName,
  showNearQualifiers,
  teamCreditNote,
  onOpenProof,
}: ContestCellProps) {
  if (!evaluation || !evaluation.eligible) {
    return (
      <>
        <span className="wb-ct-blank" aria-hidden="true" />
        <span className="wb-ct-sr-only">Not eligible for {tierName}</span>
      </>
    );
  }

  const tone = evaluation.qualified
    ? 'wb-ct-cell--qualified'
    : evaluation.near && showNearQualifiers
      ? 'wb-ct-cell--near'
      : '';

  return (
    <div className={`wb-ct-cell ${tone}`.trim()}>
      <span className="wb-ct-percent">{formatPercent(evaluation.progress)}</span>
      {evaluation.qualified ? <span className="wb-ct-sr-only">Qualified</span> : null}
      <div className="wb-ct-pills">
        {evaluation.metrics.map((metric) => (
          <button
            key={metric.metric}
            type="button"
            className={`wb-ct-pill${metric.available ? '' : ' wb-ct-pill--unavailable'}`}
            disabled={!metric.detail_available}
            title={pillTitle(metric, teamCreditNote)}
            onClick={() => onOpenProof(metric)}
          >
            <span className="wb-ct-pill__label">{metric.metric.toUpperCase()}</span>
            {/* A sourceless metric counts as 0 (C15); its title says why. */}
            <span className="wb-ct-pill__value">
              <span className="wb-ct-pill__actual">{formatAmount(metric.actual)}</span>
              <span className="wb-ct-pill__req">/{formatAmount(metric.requirement)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
