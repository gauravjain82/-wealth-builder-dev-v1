import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

import { usePipelineAccess } from '@/features/admin/wb-pipeline';

interface WbPipelineRouteProps {
  children: ReactNode;
}

/**
 * Route guard for the admin-only Reporting Pipeline screen.
 *
 * Access is not plan-based: the backend `/api/wbreporting/my-access/` endpoint
 * decides who may view (only individuals granted `wbreporting:read` or
 * `wbreporting:manage` in the access console). While the check is in flight we
 * render a loader; users without `can_view` are redirected to /home. The backend
 * enforces the same gate on every endpoint independently.
 */
export function WbPipelineRoute({ children }: WbPipelineRouteProps) {
  const { data, isLoading, isError } = usePipelineAccess();

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
