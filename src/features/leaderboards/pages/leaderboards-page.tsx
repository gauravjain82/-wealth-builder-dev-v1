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
import { LeaderboardSettings } from '../components/leaderboard-settings';
import { useLeaderboardAccess } from '../hooks/use-leaderboards';
import type { LeaderboardMetric, Scope } from '../types';
import '../leaderboards.css';

type View = 'board' | 'report' | 'settings';

const METRICS = new Set([
  'recruits', 'points', 'licenses', 'convention', 'npr', 'ppr', 'ppl', 'lr',
]);

export default function LeaderboardsPage() {
  const [searchParams] = useSearchParams();
  // Home v2's "Full Report" deep-links here with ?view=report; the board is the default.
  const requestedView = searchParams.get('view');
  const [view, setView] = useState<View>(requestedView === 'report' ? 'report' : 'board');
  // The settings tab appears only for holders of wbreporting:manage. The backend
  // enforces the same gate on every PATCH, so this only decides whether to offer it.
  const { data: access } = useLeaderboardAccess();

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
        {access?.can_manage && (
          <Button
            type="button"
            variant={view === 'settings' ? 'default' : 'outline'}
            onClick={() => setView('settings')}
          >
            Settings
          </Button>
        )}
      </nav>

      {view === 'board' && (
        <LeaderboardPanel
          initialMetric={initialMetric}
          initialScope={scope}
          onOpenFullReport={() => setView('report')}
        />
      )}
      {view === 'report' && <FullReport scope={scope} />}
      {view === 'settings' && access?.can_manage && <LeaderboardSettings />}
    </div>
  );
}
