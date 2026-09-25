import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

import { useContestAccess } from '@/features/contests';

interface ContestSettingsRouteProps {
  children: ReactNode;
}

/**
 * Route guard for contest settings.
 *
 * Distinct from `ContestsRoute`: reading standings is `homev2:read`, but configuring a
 * contest is `wbreporting:manage` — the gate that already owns every other reporting
 * configuration model. A reader who opens this URL is sent back to the card rather
 * than to a 403 they can do nothing about.
 */
export function ContestSettingsRoute({ children }: ContestSettingsRouteProps) {
  const { data, isLoading, isError } = useContestAccess();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (isError || !data?.can_manage) {
    return <Navigate to="/contests" replace />;
  }

  return <>{children}</>;
}
