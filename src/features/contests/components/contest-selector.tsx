/**
 * The contests as a row of buttons — the standalone page's selector, as on dtez.
 *
 * Gold when active (`aria-pressed`), and two columns under the card's narrow container
 * query (`contests.css`). The compact card keeps its `<select>`: a row of buttons does
 * not fit beside the Filters and Help pills.
 *
 * A click goes through `switchContest`, which keeps the filters and direction and
 * resets the tier selection and sort — the key the other contests were prefetched
 * under, so a switch is served from cache (C24).
 */

import type { ContestSummary } from '../types';

interface ContestSelectorProps {
  contests: ContestSummary[];
  activeContestId: number | null;
  onSelect: (contestId: number) => void;
}

export function ContestSelector({ contests, activeContestId, onSelect }: ContestSelectorProps) {
  if (!contests.length) return null;

  return (
    <div className="wb-ct-contests" role="group" aria-label="Contest">
      {contests.map((contest) => (
        <button
          key={contest.id}
          type="button"
          className="wb-ct-contest"
          aria-pressed={contest.id === activeContestId}
          onClick={() => onSelect(contest.id)}
        >
          {contest.name}
        </button>
      ))}
    </div>
  );
}
