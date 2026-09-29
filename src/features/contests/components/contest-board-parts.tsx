/**
 * The two pieces both placements render: the standings region and the four dialogs.
 * Each placement arranges its own rows around them (`contests-card.tsx`,
 * `contests-board.tsx`). The region's states are shared; its grid is not: the card
 * keeps its compact table and cards, the page draws dtez's grid (parity phase 19).
 */

import type { ContestBoard } from '../hooks/use-contest-board';
import {
  FlyerDialog,
  HelpDialog,
  ProfileDialog,
  ProofDialog,
} from './contest-dialogs';
import { ContestResults } from './contest-results';
import { ContestStandings } from './contest-standings';

/**
 * `.wb-ct-scroll`, the card's single flexible row and the owner of both scroll axes
 * (the containment contract at the top of `contests.css`). On the page it is neither:
 * the page scrolls, and the grid scrolls sideways inside `.wb-ct-results`.
 *
 * `variant` picks the grid: `card` (default) is the Home v2 card's `ContestStandings`,
 * `page` is dtez's `ContestResults`.
 */
export function StandingsRegion({
  board,
  variant = 'card',
}: {
  board: ContestBoard;
  variant?: 'card' | 'page';
}) {
  const { contests, loadingContests, standings, pageSize, dialogs } = board;
  const { data, isLoading, isFetching, isError, error } = standings;

  return (
    <div className="wb-ct-scroll" tabIndex={0} role="region" aria-label="Contest standings">
      {loadingContests || isLoading ? (
        <p className="wb-ct-state">Loading standings…</p>
      ) : isError ? (
        <p className="wb-ct-state" role="alert">
          {(error as Error)?.message ?? 'Standings could not be loaded.'}
        </p>
      ) : !contests?.length ? (
        <p className="wb-ct-state">There are no contests running right now.</p>
      ) : data && variant === 'page' ? (
        <ContestResults
          rows={data.rows.slice(0, pageSize)}
          tiers={data.tiers.filter((tier) => tier.selected)}
          sortTier={data.sort_tier}
          direction={data.direction}
          showNearQualifiers={data.show_near_qualifiers}
          nearPercent={data.near_percent}
          teamCreditNote={data.team_credit_note}
          hasMore={data.rows.length > pageSize || Boolean(data.next_cursor)}
          isFetchingMore={isFetching}
          onSort={board.sortBy}
          onOpenProof={dialogs.openProof}
          onOpenProfile={(row) => dialogs.openProfile(row.agent_id, row.name || row.agency_code)}
          onLoadMore={board.loadMore}
        />
      ) : data ? (
        <ContestStandings
          rows={data.rows.slice(0, pageSize)}
          // Every tier comes back for the cards (C18); only the selected are columns.
          tiers={data.tiers.filter((tier) => tier.selected)}
          sortTier={data.sort_tier}
          direction={data.direction}
          showNearQualifiers={data.show_near_qualifiers}
          teamCreditNote={data.team_credit_note}
          hasMore={data.rows.length > pageSize || Boolean(data.next_cursor)}
          isFetchingMore={isFetching}
          onSort={board.sortBy}
          onOpenProof={dialogs.openProof}
          onOpenProfile={(row) => dialogs.openProfile(row.agent_id, row.name || row.agency_code)}
          onLoadMore={board.loadMore}
        />
      ) : null}
    </div>
  );
}

/** Proof, profile, flyer and Help; all portal out of the card through the shared `Modal`. */
export function BoardDialogs({ board }: { board: ContestBoard }) {
  const { dialogs, contest } = board;
  return (
    <>
      {/* A name in a proof opens the profile on top of it, as dtez's does; closing the
          profile returns to the proof. The profile renders second, so its portal is
          mounted after the proof's and sits above it. */}
      <ProofDialog
        target={dialogs.proofTarget}
        onClose={dialogs.closeProof}
        onOpenAgent={dialogs.openProfile}
      />
      <ProfileDialog target={dialogs.profileTarget} onClose={dialogs.closeProfile} />
      <FlyerDialog
        contestId={dialogs.flyerFor}
        contestName={contest?.name ?? ''}
        onClose={dialogs.closeFlyer}
      />
      <HelpDialog open={dialogs.showHelp} onClose={() => dialogs.setShowHelp(false)} />
    </>
  );
}
