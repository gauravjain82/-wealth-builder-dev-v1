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

/**
 * The server sends whole numbers (C20, as dtez shows them); it qualifies and sorts on the
 * exact value. `Math.round` only guards against a stale cached payload with decimals.
 */
function formatPercent(value: number | null): string {
  return value === null ? '' : `${Math.round(value)}%`;
}

/**
 * A metric amount for display: whole numbers with thousands separators. Points arrive
 * with cents (17385.53) but are read as a round score, so the decimals are dropped;
 * counts like recruits and licences are already integers.
 */
function formatAmount(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return Math.round(numeric).toLocaleString('en-US');
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
            title={
              metric.available
                ? metric.single_hop_team
                  ? `${metric.label} — ${teamCreditNote || 'counts direct reports only'}`
                  : metric.label
                : metric.unavailable_reason
            }
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
