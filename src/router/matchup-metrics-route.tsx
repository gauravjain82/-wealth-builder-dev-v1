import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

import { useMatchupMetricsAccess } from '@/features/matchup/metrics/hooks/use-matchup-metrics';

interface MatchupMetricsRouteProps {
  children: ReactNode;
}

/**
 * Route guard for Match Up metrics. The backend `my-access` endpoint decides
 * (`matchup_metrics:read`, granted in the access console); users without it
 * are sent back to Matchup. Every report endpoint enforces the same gate.
 */
export function MatchupMetricsRoute({ children }: MatchupMetricsRouteProps) {
  const { data, isLoading, isError } = useMatchupMetricsAccess();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (isError || !data?.can_view) {
    return <Navigate to="/matchup" replace />;
  }

  return <>{children}</>;
}
