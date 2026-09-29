/**
 * The standalone page's standings, as dtez's `render()` draws them (parity phase 19).
 *
 * One CSS grid, `240px repeat(n, minmax(260px, 1fr))`, not a table plus a card list:
 * a narrow board reflows the same rows into one stacked card per agent
 * (`contests.css`, "results grid"). So there is a single rendering to keep in step,
 * where the Home v2 card's `ContestStandings` keeps two.
 *
 *   header   Agent | MD ↓ / "0 qualified · 0 close" / period | …
 *   agent    name / "07VIR · SMD" / "Leader: Barry Wong · Best 73%"
 *   cell     <h3>"SMD: Almost qualified · 89%"</h3> + pills "BR 71 / 90", whole cell tinted
 *
 * Every identity part is shown only when the server sent it: `agency_code` is `""`,
 * and `level` and `leader_name` are absent, when the display settings hide them. A
 * present `""` is a person with none, which reads "No level" and "Leader: -", as dtez.
 *
 * The grid carries table roles, so the header's `aria-sort` and the row headers still
 * mean something to a screen reader, as the old table's did.
 */

import type { CSSProperties } from 'react';

import type { MetricProgress, StandingRow, TierEvaluation, TierSummary } from '../types';
import { formatAmount, formatPercent, pillTitle } from './contest-format';

interface ContestResultsProps {
  rows: StandingRow[];
  tiers: TierSummary[];
  sortTier: number | null;
  direction: 'asc' | 'desc';
  showNearQualifiers: boolean;
  /** The per-metric "close" threshold for the pills, as dtez's `near_qualifier_percent`. */
  nearPercent: number;
  teamCreditNote: string;
  hasMore: boolean;
  isFetchingMore: boolean;
  onSort: (tierId: number) => void;
  onOpenProof: (row: StandingRow, tier: TierSummary, metric: MetricProgress) => void;
  onOpenProfile: (row: StandingRow) => void;
  onLoadMore: () => void;
}

/** dtez's `identity`: code, then level or "No level". */
function identityLine(row: StandingRow): string {
  return [row.agency_code, row.level === undefined ? '' : row.level || 'No level']
    .filter(Boolean)
    .join(' · ');
}

/** dtez's `ownership`: "Leader: X", then "Best N%". */
function ownershipLine(row: StandingRow): string {
  return [
    row.leader_name === undefined ? '' : `Leader: ${row.leader_name || '-'}`,
    row.best_percent === null ? '' : `Best ${formatPercent(row.best_percent)}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * A pill's tone, per metric rather than per cell, as dtez's: met at 100% of its goal,
 * close at the near threshold. Computed from the unrounded amounts, since the rounded
 * `percent` would call 74.6% close at 75.
 */
function pillTone(metric: MetricProgress, nearPercent: number): string {
  if (metric.met) return ' wb-ct-metric-pill--met';
  if (metric.actual === null || !metric.requirement) return '';
  return (metric.actual / metric.requirement) * 100 >= nearPercent
    ? ' wb-ct-metric-pill--near'
    : '';
}

interface ResultCellProps {
  evaluation: TierEvaluation | undefined;
  tier: TierSummary;
  showNearQualifiers: boolean;
  nearPercent: number;
  teamCreditNote: string;
  onOpenProof: (metric: MetricProgress) => void;
}

/**
 * One tier result. Ineligible is blank to the eye and never says "Restricted"
 * (`docs/contests/UI.md` §2.5); the screen-reader text carries the meaning, as dtez's
 * `aria-label="Not eligible for this tier"`.
 */
function ResultCell({
  evaluation,
  tier,
  showNearQualifiers,
  nearPercent,
  teamCreditNote,
  onOpenProof,
}: ResultCellProps) {
  if (!evaluation || !evaluation.eligible) {
    return (
      <div role="cell" className="wb-ct-result wb-ct-result--blank">
        <span className="wb-ct-sr-only">Not eligible for {tier.name}</span>
      </div>
    );
  }

  const near = !evaluation.qualified && evaluation.near && showNearQualifiers;
  const state = evaluation.qualified ? 'Qualified' : near ? 'Almost qualified' : '';
  const tone = evaluation.qualified
    ? ' wb-ct-result--qualified'
    : near
      ? ' wb-ct-result--near'
      : '';
  const percent = formatPercent(evaluation.progress);

  return (
    <div role="cell" className={`wb-ct-result${tone}`}>
      <h3 className="wb-ct-result-title">
        {tier.name}: {[state, percent].filter(Boolean).join(' · ')}
      </h3>
      {evaluation.metrics.length ? (
        <div className="wb-ct-result-pills">
          {evaluation.metrics.map((metric) => (
            <button
              key={metric.metric}
              type="button"
              className={`wb-ct-metric-pill${pillTone(metric, nearPercent)}${
                metric.available ? '' : ' wb-ct-metric-pill--unavailable'
              }`}
              disabled={!metric.detail_available}
              title={pillTitle(metric, teamCreditNote)}
              onClick={() => onOpenProof(metric)}
            >
              {metric.metric.toUpperCase()} {formatAmount(metric.actual)} /{' '}
              {formatAmount(metric.requirement)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ContestResults({
  rows,
  tiers,
  sortTier,
  direction,
  showNearQualifiers,
  nearPercent,
  teamCreditNote,
  hasMore,
  isFetchingMore,
  onSort,
  onOpenProof,
  onOpenProfile,
  onLoadMore,
}: ContestResultsProps) {
  if (!rows.length) {
    return (
      <p className="wb-ct-state">
        No one in this view has activity against the selected tiers yet.
      </p>
    );
  }

  const ariaSort = (tierId: number): 'ascending' | 'descending' | 'none' =>
    sortTier === tierId ? (direction === 'asc' ? 'ascending' : 'descending') : 'none';

  // dtez's --tier-count and --results-min-width: 240 px + 260 px per column.
  const gridStyle = { '--wb-ct-tier-count': tiers.length } as CSSProperties;

  return (
    <>
      <div className="wb-ct-results" style={gridStyle}>
        <div
          className="wb-ct-results-grid"
          role="table"
          aria-label="Contest standings. Blank cells mean the agent is not eligible for that tier."
        >
          <div className="wb-ct-results-head" role="row">
            <div role="columnheader">Agent</div>
            {tiers.map((tier) => (
              <div key={tier.id} role="columnheader" aria-sort={ariaSort(tier.id)}>
                <button
                  type="button"
                  className="wb-ct-tier-sort"
                  onClick={() => onSort(tier.id)}
                >
                  {tier.name}
                  {sortTier === tier.id ? (direction === 'asc' ? ' ↑' : ' ↓') : ''}
                </button>
                <div className="wb-ct-meta-line">
                  {tier.qualified} qualified
                  {showNearQualifiers ? ` · ${tier.near} close` : ''}
                </div>
                <div className="wb-ct-meta-line">{tier.period_label}</div>
              </div>
            ))}
          </div>

          {rows.map((row) => {
            const identity = identityLine(row);
            const ownership = ownershipLine(row);
            return (
              <div key={row.agent_id} className="wb-ct-standing" role="row">
                <div role="rowheader" className="wb-ct-standing-agent">
                  <button
                    type="button"
                    className="wb-ct-agent-name"
                    onClick={() => onOpenProfile(row)}
                  >
                    {row.name || row.agency_code}
                  </button>
                  {identity ? <div className="wb-ct-meta-line">{identity}</div> : null}
                  {ownership ? <div className="wb-ct-meta-line">{ownership}</div> : null}
                </div>
                {tiers.map((tier) => (
                  <ResultCell
                    key={tier.id}
                    evaluation={row.evaluations[String(tier.id)]}
                    tier={tier}
                    showNearQualifiers={showNearQualifiers}
                    nearPercent={nearPercent}
                    teamCreditNote={teamCreditNote}
                    onOpenProof={(metric) => onOpenProof(row, tier, metric)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {hasMore ? (
        <button
          type="button"
          className="wb-ct-more"
          onClick={onLoadMore}
          disabled={isFetchingMore}
        >
          {isFetchingMore ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
    </>
  );
}
