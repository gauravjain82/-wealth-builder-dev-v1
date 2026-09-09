import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useBuilderMyAccess } from '@/features/builder-ai/hooks/use-builder-ai';

interface BuilderAiRouteProps {
  children: ReactNode;
}

/**
 * Route guard for Builder AI pages.
 *
 * Access is not plan-based: the backend `/api/builderai/my-access/` endpoint
 * decides who may view (company owners, active builders, and pending invitees).
 * While that check is in flight we render a loader; users without `can_view`
 * are redirected to /home. Backend endpoints still enforce access independently.
 */
export function BuilderAiRoute({ children }: BuilderAiRouteProps) {
  const { data, isLoading, isError } = useBuilderMyAccess();

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
