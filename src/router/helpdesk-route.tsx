import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

import { useHelpdeskAccess } from '@/features/helpdesk/hooks/use-helpdesk-access';
import type { HelpdeskAccess } from '@/features/helpdesk/services/helpdesk-service';

interface HelpdeskRouteProps {
  children: ReactNode;
  /** my-access flag the route needs: `can_view` (Support Queue, default) or `team_queue` (Team Support). */
  requires?: keyof HelpdeskAccess;
}

/**
 * Route guard for Helpdesk Admin.
 *
 * Access is not plan- or role-based: the backend `/api/helpdesk/my-access/`
 * endpoint decides who may view (anyone granted `helpdesk:read` in the access
 * console). While the check is in flight we render a loader; users without
 * `can_view` are redirected to /home. The backend enforces the same gate on
 * every staff endpoint independently. `requires="team_queue"` gates Team Support
 * (active SMDs and their assistants) the same way.
 */
export function HelpdeskRoute({ children, requires = 'can_view' }: HelpdeskRouteProps) {
  const { data, isLoading, isError } = useHelpdeskAccess();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (isError || !data?.[requires]) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
