/**
 * One standings cell: a percentage, its metric pills, or a blank.
 *
 * The blank is the part that matters. `AGENTS.md` and `UI_CONTRACT.md` both require
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
  onOpenProof: (metric: MetricProgress) => void;
}

/** Percentages are rounded for display only; the server sorts on the exact value. */
function formatPercent(value: number | null): string {
  return value === null ? '' : `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

export function ContestCell({
  evaluation,
  tierName,
  showNearQualifiers,
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

  if (evaluation.unavailable) {
    return (
      <span className="wb-ct-pill wb-ct-pill--unavailable" role="note">
        Cannot be measured
      </span>
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
      {evaluation.partially_measurable ? (
        <span className="wb-ct-tier-period">
          {evaluation.unmeasured.length} of {evaluation.metrics.length} requirements
          cannot be measured
        </span>
      ) : null}
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
                  ? `${metric.label} — counts direct reports only`
                  : metric.label
                : metric.unavailable_reason
            }
            onClick={() => onOpenProof(metric)}
          >
            {metric.metric.toUpperCase()}{' '}
            {metric.available ? `${metric.actual ?? 0}/${metric.requirement}` : 'n/a'}
          </button>
        ))}
      </div>
    </div>
  );
}
