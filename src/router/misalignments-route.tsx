import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

import { useMisalignmentsAccess } from '@/features/admin/misalignments/hooks/use-misalignments';

interface MisalignmentsRouteProps {
  children: ReactNode;
}

/**
 * Route guard for the admin-only Data Integrity reports.
 *
 * Access is not plan-based: the backend `/api/misalignments/my-access/`
 * endpoint decides who may view (only individuals granted `misalignments:read`
 * in the access console). While the check is in flight we render a loader;
 * users without `can_view` are redirected to /home. The backend enforces the
 * same gate on every report endpoint independently.
 */
export function MisalignmentsRoute({ children }: MisalignmentsRouteProps) {
  const { data, isLoading, isError } = useMisalignmentsAccess();

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
