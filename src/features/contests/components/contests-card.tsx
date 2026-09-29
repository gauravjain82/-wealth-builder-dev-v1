/**
 * The contest card — the piece that owns containment.
 *
 * On `/home-v2` this is a full-width block of its own, like the leaderboard. The host
 * decides how big it is: `home-v2-page.tsx` wraps it in a clipping flex column of
 * `height: clamp(480px, 70vh, 760px)`, and that height arrives here. Nothing in this
 * component or its stylesheet sets a pixel height, a `vh` unit, or a content-driven
 * minimum — see the containment contract at the top of `contests.css`.
 *
 * The consequence for anyone editing this file: the header, meta line, tier strip and
 * filter summary are fixed-size rows, and `.wb-ct-scroll` is the single flexible one.
 * Adding another `flex: 1` child, or dropping a `min-height: 0`, turns internal
 * scrolling into page growth and the failure is silent.
 *
 * All four overlays go through the shared `Modal`, which portals to `document.body`,
 * so `overflow: hidden` here cannot clip them.
 */

import { useState } from 'react';

import { Modal } from '@/shared/components/ui/modal';

import '../contests.css';
import { useContestBoard } from '../hooks/use-contest-board';
import type { FilterDraft } from '../types';
import { BoardDialogs, StandingsRegion } from './contest-board-parts';
import { ContestFilters } from './contest-filters';
import { scopeLabel } from './scope-options';
import { TierSelector } from './tier-selector';

interface ContestsCardProps {
  /** Rendered inside the host's own card chrome when false. Defaults to true. */
  withChrome?: boolean;
  /**
   * Warm the other contests' standings once the first is shown. Off by default, and
   * off on `/home-v2` (decision C24); see `useContestBoard`.
   */
  prefetchOtherContests?: boolean;
}

/**
 * The compact placement, on `/home-v2`. The standalone `/contests` page renders
 * `ContestsBoard` over the same state (`useContestBoard`) instead.
 */
export function ContestsCard({
  withChrome = true,
  prefetchOtherContests = false,
}: ContestsCardProps) {
  const board = useContestBoard({ prefetchOtherContests });
  const { contests, activeContestId, contest, filters, dialogs } = board;
  const { data, isFetching } = board.standings;

  const [showFilters, setShowFilters] = useState(false);

  const body = (
    <div className="wb-ct">
      <div className="wb-ct-header">
        {contests && contests.length > 1 ? (
          <select
            className="wb-ct-title"
            aria-label="Contest"
            value={activeContestId ?? ''}
            onChange={(event) => board.switchContest(Number(event.target.value))}
          >
            {contests.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        ) : (
          <h3 className="wb-ct-title">{contest?.name ?? 'Contests'}</h3>
        )}

        <div className="wb-ct-header-actions">
          {contest?.has_visible_flyer ? (
            <button
              type="button"
              className="wb-ct-pill"
              onClick={dialogs.openFlyer}
            >
              Flyer
            </button>
          ) : null}
          <button
            type="button"
            className="wb-ct-pill"
            onClick={() => setShowFilters(true)}
          >
            Filters
          </button>
          <button
            type="button"
            className="wb-ct-pill"
            onClick={() => dialogs.setShowHelp(true)}
          >
            Help
          </button>
        </div>
      </div>

      {contest ? (
        <div className="wb-ct-meta">
          <span
            className={`wb-ct-badge wb-ct-badge--${contest.status === 'active' ? 'active' : 'ended'}`}
          >
            {contest.status}
          </span>
          <span>{contest.period_label}</span>
          {isFetching ? <span aria-live="polite">Updating…</span> : null}
        </div>
      ) : null}

      {data ? (
        <>
          {data.show_tier_overview ? (
            <TierSelector
              tiers={data.tiers}
              selected={board.selectedTiers}
              showCounts={data.show_tier_overview}
              onChange={board.setSelectedTiers}
            />
          ) : null}

          <p className="wb-ct-applied">{describeFilters(filters)}</p>

          {/* Decision C5: BR/BP/LIC count one hop of Leader, so any view using them
              says so rather than letting the number be read as a base-shop figure. */}
          {data.team_credit_note ? (
            <p className="wb-ct-note">{data.team_credit_note}</p>
          ) : null}
        </>
      ) : null}

      <StandingsRegion board={board} />

      <Modal open={showFilters} title="Filters" onClose={() => setShowFilters(false)}>
        <ContestFilters
          applied={filters}
          onApply={(draft) => {
            board.applyFilters(draft);
            setShowFilters(false);
          }}
          onClose={() => setShowFilters(false)}
        />
      </Modal>

      <BoardDialogs board={board} />
    </div>
  );

  if (!withChrome) return body;

  return (
    <div
      className="wb-ct-host carousel-card rounded-xl border p-4"
      style={{ containerName: 'wb-ct-card', containerType: 'inline-size' }}
    >
      {body}
    </div>
  );
}

/** The applied-filter summary, which stays visible when the controls collapse. */
function describeFilters(filters: FilterDraft): string {
  const extras = [
    filters.net ? 'direct reports only' : '',
    filters.leaders && filters.agents ? '' : filters.leaders ? 'leaders only' : 'agents only',
  ].filter(Boolean);

  return [scopeLabel(filters.scope), ...extras].join(' · ');
}
