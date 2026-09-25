/**
 * The standings body — the only thing in the card that scrolls.
 *
 * Two renderings of the same data, chosen by a **container** query rather than a
 * viewport breakpoint (see `contests.css`): the card can be narrow on a wide screen
 * and wide on a narrow one, so viewport width is the wrong question. Both are always
 * in the DOM and CSS picks one, which keeps sort and focus state identical between
 * them.
 *
 * Wide: a table with a sticky header and a sticky agent column, scrolling on both
 * axes *inside* this element. Narrow: one card per agent with the tier results
 * stacked beneath the identity line.
 */

import type { MetricProgress, StandingRow, TierSummary } from '../types';
import { ContestCell } from './contest-cell';

interface ContestStandingsProps {
  rows: StandingRow[];
  tiers: TierSummary[];
  sortTier: number | null;
  direction: 'asc' | 'desc';
  showNearQualifiers: boolean;
  hasMore: boolean;
  isFetchingMore: boolean;
  onSort: (tierId: number) => void;
  onOpenProof: (row: StandingRow, tier: TierSummary, metric: MetricProgress) => void;
  onOpenProfile: (row: StandingRow) => void;
  onLoadMore: () => void;
}

export function ContestStandings({
  rows,
  tiers,
  sortTier,
  direction,
  showNearQualifiers,
  hasMore,
  isFetchingMore,
  onSort,
  onOpenProof,
  onOpenProfile,
  onLoadMore,
}: ContestStandingsProps) {
  if (!rows.length) {
    return (
      <p className="wb-ct-state">
        No one in this view has activity against the selected tiers yet.
      </p>
    );
  }

  /** `aria-sort` for a tier header, per the UI contract's sorting requirements. */
  const ariaSort = (tierId: number): 'ascending' | 'descending' | 'none' =>
    sortTier === tierId ? (direction === 'asc' ? 'ascending' : 'descending') : 'none';

  return (
    <>
      <div className="wb-ct-table-wrap">
        <table className="wb-ct-table">
          <caption className="wb-ct-sr-only">
            Contest standings. Blank cells mean the agent is not eligible for that tier.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="wb-ct-agent-col">
                Agent
              </th>
              {tiers.map((tier) => (
                <th key={tier.id} scope="col" aria-sort={ariaSort(tier.id)}>
                  <button
                    type="button"
                    className="wb-ct-sort"
                    onClick={() => onSort(tier.id)}
                  >
                    {tier.name}
                    {sortTier === tier.id ? (direction === 'asc' ? ' ▲' : ' ▼') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.agent_id}>
                <td className="wb-ct-agent-col">
                  <button
                    type="button"
                    className="wb-ct-agent-link"
                    onClick={() => onOpenProfile(row)}
                  >
                    {row.name || row.agency_code}
                  </button>
                  {row.level ? (
                    <span className="wb-ct-tier-period"> · {row.level}</span>
                  ) : null}
                </td>
                {tiers.map((tier) => (
                  <td key={tier.id}>
                    <ContestCell
                      evaluation={row.evaluations[String(tier.id)]}
                      tierName={tier.name}
                      showNearQualifiers={showNearQualifiers}
                      onOpenProof={(metric) => onOpenProof(row, tier, metric)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="wb-ct-cards">
        {rows.map((row) => (
          <article key={row.agent_id} className="wb-ct-card-row">
            <div className="wb-ct-card-identity">
              <button
                type="button"
                className="wb-ct-agent-link"
                onClick={() => onOpenProfile(row)}
              >
                {row.name || row.agency_code}
              </button>
              {row.best_percent !== null ? (
                <span className="wb-ct-tier-period">best {row.best_percent}%</span>
              ) : null}
            </div>
            {tiers.map((tier) => (
              <div key={tier.id} className="wb-ct-card-tier">
                <span>{tier.name}</span>
                <ContestCell
                  evaluation={row.evaluations[String(tier.id)]}
                  tierName={tier.name}
                  showNearQualifiers={showNearQualifiers}
                  onOpenProof={(metric) => onOpenProof(row, tier, metric)}
                />
              </div>
            ))}
          </article>
        ))}
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
