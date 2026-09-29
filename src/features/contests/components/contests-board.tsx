/**
 * The standalone contest page's board, laid out as dtez's `wb_contests.php`:
 *
 *   title "Wealth Builders Contests" · status line · ? Help
 *   the contests as a row of buttons
 *   the filter bar, always visible, with its summary line
 *   the contest title row: name, status, period, view, flyer icon
 *   the tier strip
 *   the standings
 *
 * It reads the same state as the Home v2 card (`useContestBoard`), so the rules are
 * one implementation; only the arrangement differs. The two banners the card shows
 * above the grid are absent here: the applied filters are the bar's summary line, and
 * the team-credit note (C5) is the BR/BP/LIC pills' tooltip and the proof dialog's
 * first line.
 *
 * Containment: the host gives the height and `.wb-ct-scroll` is the one flexible row,
 * as in the card. `/contests` gives no bounded height, though, so the board grows and
 * the page scrolls, as dtez's does: the controls scroll away above the grid
 * (`contests.css`, "standalone page").
 */

import { useEffect, useState } from 'react';

import '../contests.css';
import { useContestBoard } from '../hooks/use-contest-board';
import { BoardDialogs, StandingsRegion } from './contest-board-parts';
import { ContestFilterBar } from './contest-filter-bar';
import { scopeLabel } from './scope-options';
import { ContestSelector } from './contest-selector';
import { TierSelector } from './tier-selector';

function plural(count: number, word: string): string {
  return `${count.toLocaleString()} ${word}${count === 1 ? '' : 's'}`;
}

export function ContestsBoard() {
  const board = useContestBoard({ prefetchOtherContests: true });
  const { contests, loadingContests, activeContestId, contest, filters, dialogs } = board;
  const { data, isLoading, isFetching, isError } = board.standings;

  // Latched, so the summary keeps its count while the next view loads rather than
  // flashing "—". It moves only with the viewer's candidate map, not the filters.
  const [leaderCount, setLeaderCount] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (data?.leader_count !== undefined) setLeaderCount(data.leader_count);
  }, [data?.leader_count]);

  const status = loadingContests
    ? { tone: 'busy', text: 'Loading contests…' }
    : isError
      ? { tone: 'error', text: 'Standings could not be loaded.' }
      : {
          tone: isLoading ? 'busy' : 'ok',
          text: [
            plural(contests?.length ?? 0, 'contest'),
            data ? plural(data.total_rows, 'agent') : '',
          ]
            .filter(Boolean)
            .join(' · '),
        };

  return (
    <div className="wb-ct wb-ct--page">
      <header className="wb-ct-page-head">
        <h1 className="wb-ct-page-title">Wealth Builders Contests</h1>
        <div className="wb-ct-status">
          <span className={`wb-ct-dot wb-ct-dot--${status.tone}`} aria-hidden="true" />
          <span aria-live="polite">{status.text}</span>
          <button
            type="button"
            className="wb-ct-help"
            aria-label="How to use this page"
            title="How to use this page"
            onClick={() => dialogs.setShowHelp(true)}
          >
            ?
          </button>
        </div>
      </header>

      <div className="wb-ct-page-body">
        <ContestSelector
          contests={contests ?? []}
          activeContestId={activeContestId}
          onSelect={board.switchContest}
        />

        <ContestFilterBar
          applied={filters}
          profileContestId={contests?.[0]?.id ?? null}
          leaderCount={leaderCount}
          onApply={board.applyFilters}
        />

        {contest ? (
          <div className="wb-ct-contest-info">
            <div className="wb-ct-contest-heading">
              <h2 className="wb-ct-contest-name">{contest.name}</h2>
              <div className="wb-ct-contest-summary">
                <span
                  className={`wb-ct-badge wb-ct-badge--${contest.status === 'active' ? 'active' : 'ended'}`}
                >
                  {contest.status}
                </span>
                <span>{contest.period_label}</span>
                <span>
                  {scopeLabel(filters.scope)}
                  {filters.net ? ' · Direct reports only' : ''}
                </span>
                {isFetching ? <span aria-live="polite">Updating…</span> : null}
              </div>
            </div>
            {contest.has_visible_flyer ? (
              <button
                type="button"
                className="wb-ct-flyer-button"
                title="View contest flyer"
                aria-label="View contest flyer"
                onClick={dialogs.openFlyer}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              </button>
            ) : null}
          </div>
        ) : null}

        {data?.show_tier_overview ? (
          <TierSelector
            tiers={data.tiers}
            selected={board.selectedTiers}
            showCounts={data.show_tier_overview}
            onChange={board.setSelectedTiers}
          />
        ) : null}

        <StandingsRegion board={board} />
      </div>

      <BoardDialogs board={board} />
    </div>
  );
}
