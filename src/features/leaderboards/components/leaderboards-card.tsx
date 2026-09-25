/**
 * The compact home-page card.
 *
 * Deliberately small (`APPLICATION_CONTRACT.md` puts a 750 ms warm target on it): one
 * metric, a three-row preview per panel, and no proof rows or personal list. The full
 * filter matrix lives in the expanded view.
 *
 * It works at its **container** width rather than the viewport's, so dropping it into
 * a narrow column on the Home v2 page does not need a media query — which matters
 * because the same card is used in a two-column grid and at iPhone width.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { useLeaderboardCard } from '../hooks/use-leaderboards';
import type { GeneralMetric, LeaderboardSelection } from '../types';
import { LeaderList } from './leader-list';
import { SCOPE_LABELS, SOURCE_LABELS } from './format';
import '../leaderboards.css';

/** The four tabs, matching the labels the business already uses. */
const TABS: Array<{ id: GeneralMetric; label: string }> = [
  { id: 'recruits', label: 'Business Partners' },
  { id: 'points', label: 'Points' },
  { id: 'licenses', label: 'Licenses' },
  { id: 'convention', label: 'Convention' },
];

interface LeaderboardsCardProps {
  /** Where the expand action goes. */
  fullRoute?: string;
}

export function LeaderboardsCard({ fullRoute = '/leaderboards' }: LeaderboardsCardProps) {
  const navigate = useNavigate();
  const [metric, setMetric] = useState<GeneralMetric>('points');

  const selection: LeaderboardSelection = {
    metric,
    scope: 'smd_base',
    rangeKey: 'current',
  };
  const { data, isLoading, isError, error } = useLeaderboardCard(selection);

  /** Carry the selected metric into the expanded view, as the contract asks. */
  const expand = () => navigate(`${fullRoute}?metric=${metric}`);

  return (
    <Card className="wb-lb-card">
      <CardHeader className="wb-lb-card__header">
        <div>
          <CardTitle className="wb-lb-card__title">Wealth Builders Leaderboards</CardTitle>
          <p className="wb-lb-card__status">
            {data ? `${data.period_label} · ${SOURCE_LABELS[data.source]}` : 'Loading…'}
            {data && ` · ${SCOPE_LABELS[data.scope]}`}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={expand} className="wb-lb-card__expand">
          Open full leaderboard
        </Button>
      </CardHeader>

      <CardContent>
        <div className="wb-lb-card__tabs" role="tablist" aria-label="Leaderboard metric">
          {TABS.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={metric === tab.id}
              variant={metric === tab.id ? 'default' : 'outline'}
              onClick={() => setMetric(tab.id)}
              className="wb-lb-card__tab"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {isLoading && (
          <div className="wb-lb-card__skeleton" role="status" aria-live="polite">
            <span className="sr-only">Loading leaderboard</span>
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="wb-lb-card__skeleton-row" aria-hidden="true" />
            ))}
          </div>
        )}

        {isError && (
          <p className="wb-lb-card__message" role="alert">
            {(error as Error)?.message || 'The leaderboard is unavailable right now.'}
          </p>
        )}

        {data && (
          <div className="wb-lb-card__panels">
            <LeaderList title="Top SMD" rows={data.smd} metric={data.metric} />
            <LeaderList title="Top MD" rows={data.md} metric={data.metric} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LeaderboardsCard;
