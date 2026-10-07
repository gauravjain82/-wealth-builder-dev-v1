/** Yearly coin standings; tied members share a rank. */

import { useState } from 'react';

import { useCoinLeaderboard } from '../hooks/use-code-of-honor';
import { Avatar } from './avatar';
import { Empty, ErrorNotice, Loading } from './states';

export function CoinsTab() {
  const [year, setYear] = useState<number | null>(null);
  const board = useCoinLeaderboard(year);

  if (board.isLoading) return <Loading label="Loading coin standings" />;
  if (board.isError || !board.data) return <ErrorNotice error={board.error} onRetry={() => board.refetch()} />;
  const data = board.data;

  return (
    <div className="wb-coh-coins">
      {data.years.length > 1 && (
        <div className="wb-coh-toolbar">
          <label className="wb-coh-label" htmlFor="wb-coh-year">Year</label>
          <select
            id="wb-coh-year"
            className="wb-coh-input wb-coh-input--inline"
            value={data.year}
            onChange={(event) => setYear(Number(event.target.value))}
          >
            {data.years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      )}
      {data.rows.length === 0 ? (
        <Empty>No coins awarded yet.</Empty>
      ) : (
        <ol className="wb-coh-standings">
          {data.rows.map((row) => (
            <li key={`${row.nominee_id}-${row.name}`} className="wb-coh-standing">
              <span className="wb-coh-standing__rank" aria-label={`Rank ${row.rank}`}>{row.rank}</span>
              <Avatar name={row.name} initials={row.initials} photoUrl={row.photo_url} />
              <span className="wb-coh-standing__name">
                {row.name}
                <span className="wb-coh-muted">
                  {' '}· {row.podiums} top-three {row.podiums === 1 ? 'finish' : 'finishes'}
                  {row.firsts > 0 && `, ${row.firsts} first${row.firsts === 1 ? '' : 's'}`}
                </span>
              </span>
              <span className="wb-coh-standing__coins">
                {row.coins} {row.coins === 1 ? 'coin' : 'coins'}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
