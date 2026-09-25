/**
 * The standalone Leaderboards route.
 *
 * Two surfaces on one page, because `APPLICATION_CONTRACT.md` treats them as
 * different readings of the same data rather than different features: the expanded
 * leaderboard answers "who is ahead right now", the Full Report answers "how is the
 * period going against goal".
 *
 * The initial metric comes from the query string so expanding the home card lands on
 * the tab the reader was already looking at.
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@/shared/components/ui/button';
import { FullReport } from '../components/full-report';
import { LeaderboardPanel } from '../components/leaderboard-panel';
import type { LeaderboardMetric, Scope } from '../types';
import '../leaderboards.css';

type View = 'board' | 'report';

const METRICS = new Set([
  'recruits', 'points', 'licenses', 'convention', 'npr', 'ppr', 'ppl', 'lr',
]);

export default function LeaderboardsPage() {
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<View>('board');

  const requested = searchParams.get('metric');
  const initialMetric = (
    requested && METRICS.has(requested) ? requested : 'points'
  ) as LeaderboardMetric;
  const scope = (searchParams.get('scope') as Scope) || 'smd_base';

  return (
    <div className="wb-lb-page">
      <nav className="wb-lb-page__views wb-lb-no-print" aria-label="Leaderboard view">
        <Button
          type="button"
          variant={view === 'board' ? 'default' : 'outline'}
          onClick={() => setView('board')}
        >
          Leaderboard
        </Button>
        <Button
          type="button"
          variant={view === 'report' ? 'default' : 'outline'}
          onClick={() => setView('report')}
        >
          Full Report
        </Button>
      </nav>

      {view === 'board' ? (
        <LeaderboardPanel
          initialMetric={initialMetric}
          initialScope={scope}
          onOpenFullReport={() => setView('report')}
        />
      ) : (
        <FullReport scope={scope} />
      )}
    </div>
  );
}
