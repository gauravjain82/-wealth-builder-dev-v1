import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

import { useContestAccess, usePrefetchContests } from '@/features/contests';

interface ContestsRouteProps {
  children: ReactNode;
}

/**
 * Route guard for any standalone contest surface.
 *
 * Access is not plan-based: `/api/wbreporting/my-access/` decides, and
 * `can_view_contests` is true only for people granted `homev2:read` in the access
 * console (or `wbreporting:manage`, so an operator configuring a contest can see it).
 * Decision C11 puts contests and leaderboards on the same limited rollout, because
 * the contest card lives on the page that gate already opens.
 *
 * The backend enforces the same gate on every endpoint independently; this guard only
 * decides whether to render — which is also why it starts the contest list alongside
 * the access check instead of after it: an unauthorised caller gets a 403 and sees
 * nothing.
 */
export function ContestsRoute({ children }: ContestsRouteProps) {
  const { data, isLoading, isError } = useContestAccess();
  usePrefetchContests();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (isError || !data?.can_view_contests) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}

/**
 * Starts the contest list for a page whose guard is not `ContestsRoute` — `/home-v2`,
 * behind `LeaderboardsRoute`, which `/leaderboards` shares and which has no use for
 * the list. Wrap it outside the guard so the list runs in parallel with the check.
 */
export function PrefetchContests({ children }: { children: ReactNode }) {
  usePrefetchContests();
  return <>{children}</>;
}
