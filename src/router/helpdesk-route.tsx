import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

import { useHelpdeskAccess } from '@/features/helpdesk/hooks/use-helpdesk-access';

interface HelpdeskRouteProps {
  children: ReactNode;
}

/**
 * Route guard for Helpdesk Admin.
 *
 * Access is not plan- or role-based: the backend `/api/helpdesk/my-access/`
 * endpoint decides who may view (anyone granted `helpdesk:read` in the access
 * console). While the check is in flight we render a loader; users without
 * `can_view` are redirected to /home. The backend enforces the same gate on
 * every staff endpoint independently.
 */
export function HelpdeskRoute({ children }: HelpdeskRouteProps) {
  const { data, isLoading, isError } = useHelpdeskAccess();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (isError || !data?.can_view) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
