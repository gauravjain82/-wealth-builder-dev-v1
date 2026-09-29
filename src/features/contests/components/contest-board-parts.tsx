/**
 * The two pieces the compact card and the standalone page render identically: the
 * standings region and the four dialogs. Each placement arranges its own rows around
 * them (`contests-card.tsx`, `contests-board.tsx`).
 */

import type { ContestBoard } from '../hooks/use-contest-board';
import {
  FlyerDialog,
  HelpDialog,
  ProfileDialog,
  ProofDialog,
} from './contest-dialogs';
import { ContestStandings } from './contest-standings';

/**
 * `.wb-ct-scroll`, the card's single flexible row and the owner of both scroll axes
 * (the containment contract at the top of `contests.css`).
 */
export function StandingsRegion({ board }: { board: ContestBoard }) {
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
      <ProofDialog
        target={dialogs.proofTarget}
        onClose={dialogs.closeProof}
        onOpenAgent={(agentId, name) => {
          dialogs.closeProof();
          dialogs.openProfile(agentId, name);
        }}
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
