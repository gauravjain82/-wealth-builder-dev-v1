import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

import { useLeaderboardAccess } from '@/features/leaderboards';

interface LeaderboardsRouteProps {
  children: ReactNode;
}

/**
 * Route guard for the Home v2 page and the Leaderboards routes.
 *
 * Access is not plan-based: the backend `/api/wbreporting/my-access/` endpoint
 * decides, and `can_view_leaderboards` is true only for people granted `homev2:read`
 * in the access console (or `wbreporting:manage`, so an operator configuring the
 * board can see it). This is a deliberately limited rollout — a named list, not a
 * role — which is why no plan grants it.
 *
 * The backend enforces the same gate on every endpoint independently; this guard only
 * decides whether to render.
 */
export function LeaderboardsRoute({ children }: LeaderboardsRouteProps) {
  const { data, isLoading, isError } = useLeaderboardAccess();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (isError || !data?.can_view_leaderboards) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
