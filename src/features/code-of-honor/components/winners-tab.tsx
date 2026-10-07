/** The reveal of a completed month: podium, then everyone else recognized. Never the poster. */

import { useState } from 'react';

import { useResults } from '../hooks/use-code-of-honor';
import { ActText } from './act-text';
import { Podium } from './podium';
import { Empty, ErrorNotice, Loading } from './states';

export function WinnersTab() {
  const [cycle, setCycle] = useState<string | null>(null);
  const results = useResults(cycle);

  if (results.isLoading) return <Loading label="Loading winners" />;
  if (results.isError || !results.data) return <ErrorNotice error={results.error} onRetry={() => results.refetch()} />;
  const result = results.data.result;
  if (!result) return <Empty>No month has been completed yet.</Empty>;

  return (
    <div className="wb-coh-winners">
      <div className="wb-coh-toolbar">
        <label className="wb-coh-label" htmlFor="wb-coh-month">Month</label>
        <select
          id="wb-coh-month"
          className="wb-coh-input wb-coh-input--inline"
          value={result.cycle_id}
          onChange={(event) => setCycle(event.target.value)}
        >
          {results.data.months.map((month) => (
            <option key={month.id} value={month.id}>{month.label}</option>
          ))}
        </select>
      </div>
      {result.winners.length === 0 ? (
        <Empty>No act received a like in {result.label}.</Empty>
      ) : (
        <Podium
          entries={result.winners.map((w) => ({
            ...w, place: w.place ?? 0, coins: w.coins ?? 0, shared_place: Boolean(w.shared_place),
          }))}
        />
      )}
      {result.others.length > 0 && (
        <section aria-label="Also recognized">
          <h3 className="wb-coh-heading">Also recognized in {result.label}</h3>
          <ul className="wb-coh-list">
            {result.others.map((act) => (
              <li key={act.id} className="wb-coh-act">
                <div className="wb-coh-act__who">{act.nominee_name}</div>
                <ActText text={act.text} />
                <div className="wb-coh-act__meta">
                  <span className="wb-coh-tag">{act.value}</span>
                  <span className="wb-coh-count">{act.likes} {act.likes === 1 ? 'like' : 'likes'}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
