import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

import { useGmsAccess } from '@/features/gms';

interface GuidanceRouteProps {
  children: ReactNode;
}

/**
 * Route guard for the Guidance management page.
 *
 * Access is per person, not per plan: `/api/gms/my-access/` decides, and `can_author` is
 * true only for someone granted `gms:author` (or `gms:administer`) in the access
 * console. No role holds either, so the page stays invisible until somebody is named —
 * the same limited-rollout shape as `misalignments` and Home v2.
 *
 * The backend enforces the same gate on every endpoint independently. This guard only
 * decides whether to render; hiding a control is not authorization.
 */
export function GuidanceRoute({ children }: GuidanceRouteProps) {
  const { data, isLoading, isError } = useGmsAccess();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (isError || !data?.gms_enabled || !data?.can_author) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
