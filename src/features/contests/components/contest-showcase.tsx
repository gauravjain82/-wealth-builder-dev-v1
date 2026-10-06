/**
 * The featured-contest card on `/home-v2` — dtez's `wb_contests_showcase.php`.
 *
 * A banner (the contest's image flyer behind its name and period), then two boards of
 * five and a status line. With more than one contest the name is a picker; the choice
 * is not remembered (decision C25), so a reload opens on the first contest again. It replaces the compact standings card on Home v2: the full
 * grid, filters and proofs live on `/contests`, which "View all" opens.
 *
 * Nothing is ranked here. The backend's `showcase/` endpoint places each person at the
 * tier that matters for the card — the hardest they qualified for, or the hardest they
 * are still running on — over everyone the viewer may see, which no standings page
 * holds. This component only decides how to lay the two lists out (`mode`).
 */

import { useState } from 'react';

import '../contests.css';
import { useContests, useFlyer, useShowcase } from '../hooks/use-contests';
import type { ShowcaseEntry } from '../types';

/**
 * dtez's three presentations. `closest` is the reference design: ten people closest to
 * qualifying across both boards. `mixed` puts the top qualifiers on the left and the
 * closest who are not among them on the right.
 */
export type ShowcaseMode = 'closest' | 'qualifiers' | 'mixed';

interface ContestShowcaseProps {
  mode?: ShowcaseMode;
  /** Opens the standalone `/contests` page. Omit to hide "View all". */
  onViewAll?: () => void;
}

const BOARD_SIZE = 5;

export function ContestShowcase({ mode = 'closest', onViewAll }: ContestShowcaseProps) {
  const { data: contests, isLoading: loadingContests, isError: contestsFailed } = useContests();
  // The list arrives active-first, so the featured contest defaults to the one the board
  // opens on; the title becomes a picker when there is more than one.
  const [chosenId, setChosenId] = useState<number | null>(null);
  const contest = contests?.find((item) => item.id === chosenId) ?? contests?.[0] ?? null;

  const showcase = useShowcase(contest?.id ?? null);
  const hasImageFlyer = Boolean(contest?.has_visible_flyer && contest.flyer_kind === 'image');
  const flyer = useFlyer(hasImageFlyer && contest ? contest.id : null);
  const bannerImage = flyer.data?.kind === 'image' ? flyer.data.url : undefined;

  const data = showcase.data;
  const boards = data ? layoutBoards(mode, data.qualifiers, data.closest) : [];

  let status: { tone: 'ok' | 'error' | 'idle'; text: string };
  if (contestsFailed || showcase.isError) {
    status = {
      tone: 'error',
      text: (showcase.error as Error)?.message || 'Contest results are unavailable right now.',
    };
  } else if (data) {
    status = {
      tone: 'ok',
      text: `${data.qualified_count.toLocaleString()} qualified · ${data.in_progress_count.toLocaleString()} in progress`,
    };
  } else {
    status = { tone: 'idle', text: 'Loading' };
  }

  const noContest = !loadingContests && !contestsFailed && !contest;

  return (
    <section className="wb-ct-sc" aria-label="Featured contest">
      <header
        className="wb-ct-sc__banner"
        style={bannerImage ? { backgroundImage: `url("${bannerImage}")` } : undefined}
      >
        <div>
          <p className="wb-ct-sc__eyebrow">Featured contest</p>
          {contests && contests.length > 1 && contest ? (
            <h2 className="wb-ct-sc__title">
              <select
                className="wb-ct-sc__picker"
                aria-label="Contest"
                value={contest.id}
                onChange={(event) => setChosenId(Number(event.target.value))}
              >
                {contests.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </h2>
          ) : (
            <h2 className="wb-ct-sc__title">
              {contest?.name ?? (noContest ? 'Contests' : 'Loading contest…')}
            </h2>
          )}
          <p className="wb-ct-sc__meta">
            {contest
              ? [contest.period_label, MODE_LABELS[mode]].filter(Boolean).join(' · ')
              : 'Preparing standings'}
          </p>
        </div>
        {onViewAll ? (
          <button type="button" className="wb-ct-sc__view-all" onClick={onViewAll}>
            View all
          </button>
        ) : null}
      </header>

      <div className="wb-ct-sc__boards">
        {noContest ? (
          <div className="wb-ct-sc__board">
            <p className="wb-ct-sc__empty">No contest is running right now.</p>
          </div>
        ) : status.tone === 'error' ? (
          <div className="wb-ct-sc__board">
            <p className="wb-ct-sc__empty" role="alert">{status.text}</p>
          </div>
        ) : !data ? (
          <div className="wb-ct-sc__board">
            <p className="wb-ct-sc__empty" role="status">Loading showcase results…</p>
          </div>
        ) : (
          boards.map((board) => (
            <section key={board.key} className="wb-ct-sc__board" aria-label={board.title}>
              <header className="wb-ct-sc__board-head">
                <h3>{board.title}</h3>
                <span>{board.subtitle}</span>
              </header>
              {board.entries.length ? (
                <ol className="wb-ct-sc__list">
                  {board.entries.map((entry, index) => (
                    <ShowcaseRow
                      key={`${entry.agent_id}-${entry.tier_id}`}
                      entry={entry}
                      place={board.offset + index + 1}
                    />
                  ))}
                </ol>
              ) : (
                <p className="wb-ct-sc__empty">No matching people yet.</p>
              )}
            </section>
          ))
        )}
      </div>

      <footer className="wb-ct-sc__foot">
        <span>
          <i className={`wb-ct-sc__dot wb-ct-sc__dot--${status.tone}`} aria-hidden="true" />
          {status.tone === 'error' ? 'Unavailable' : status.text}
        </span>
        <span>Updated from WB contest results</span>
      </footer>
    </section>
  );
}

const MODE_LABELS: Record<ShowcaseMode, string> = {
  closest: 'Top 10 closest',
  qualifiers: 'Top 10 qualifiers',
  mixed: 'Top qualifiers + closest',
};

interface Board {
  key: string;
  title: string;
  subtitle: string;
  entries: ShowcaseEntry[];
  /** Rank of the board's first row, less one — the right board continues at #6. */
  offset: number;
}

/** dtez's `render()`: how the two server lists become two boards of five. */
function layoutBoards(
  mode: ShowcaseMode,
  qualifiers: ShowcaseEntry[],
  closest: ShowcaseEntry[]
): Board[] {
  if (mode === 'mixed') {
    const first = qualifiers.slice(0, BOARD_SIZE);
    // Someone qualified on an easier tier can still be running on a harder one; they
    // appear once, on the qualifiers' board.
    const shown = new Set(first.map((entry) => entry.agent_id));
    const second = closest.filter((entry) => !shown.has(entry.agent_id)).slice(0, BOARD_SIZE);
    return [
      {
        key: 'qualifiers',
        title: 'Top qualifiers',
        subtitle: 'Hardest tier reached',
        entries: first,
        offset: 0,
      },
      {
        key: 'closest',
        title: 'Closest',
        subtitle: 'Hardest active tier',
        entries: second,
        offset: 0,
      },
    ];
  }

  const source = mode === 'qualifiers' ? qualifiers : closest;
  const title = mode === 'qualifiers' ? 'Top qualifiers' : 'Closest to qualifying';
  const half = Math.min(BOARD_SIZE, source.length);
  return [
    { key: 'first', title, subtitle: 'Ranks 1–5', entries: source.slice(0, half), offset: 0 },
    {
      key: 'second',
      title,
      subtitle: 'Ranks 6–10',
      entries: source.slice(half, BOARD_SIZE * 2),
      offset: half,
    },
  ];
}

function ShowcaseRow({ entry, place }: { entry: ShowcaseEntry; place: number }) {
  const name = entry.name || entry.agency_code || 'Unnamed';
  const meta = [entry.agency_code, entry.tier_name].filter(Boolean).join(' · ');

  return (
    <li className={`wb-ct-sc__rank${entry.qualified ? ' wb-ct-sc__rank--qualified' : ''}`}>
      <span className="wb-ct-sc__place">#{place}</span>
      <span className="wb-ct-sc__person">
        <ShowcaseAvatar name={name} photoUrl={entry.photo_url} />
        <span className="wb-ct-sc__identity">
          <span className="wb-ct-sc__name" title={name}>
            {name}
          </span>
          {meta ? <span className="wb-ct-sc__row-meta">{meta}</span> : null}
        </span>
      </span>
      <span className="wb-ct-sc__value">
        {entry.qualified ? (
          <>
            <strong aria-label="Qualified">✓</strong>
            <span>qualified</span>
          </>
        ) : (
          <>
            {/* A null progress has no number; it is never shown as 0% (types/index.ts). */}
            <strong>{entry.progress === null ? '—' : `${entry.progress}%`}</strong>
            <span>complete</span>
          </>
        )}
      </span>
    </li>
  );
}

/** The photo over the initials, so a missing or expired photo still leaves a face. */
function ShowcaseAvatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="wb-ct-sc__avatar" aria-hidden="true">
      {initials(name)}
      {photoUrl && !failed ? (
        <img src={photoUrl} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : null}
    </span>
  );
}

function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .map((part) => part.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
  return letters || '?';
}

export default ContestShowcase;
