import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useBuilderMyAccess } from '@/features/builder-ai/hooks/use-builder-ai';

interface BuilderAiRouteProps {
  children: ReactNode;
  // Company Owner & Builder are separate things. Owner-only pages (Home,
  // Company, Reporting, Bulletin) set this so a Builder who lands on them by URL
  // is bounced to their Invitations page. Baseshop & Invitations leave it off.
  ownerOnly?: boolean;
}

/**
 * Route guard for Builder AI pages.
 *
 * Access is not plan-based: the backend `/api/builderai/my-access/` endpoint
 * decides who may view (company owners, active builders, and pending invitees).
 * While that check is in flight we render a loader; users without `can_view`
 * are redirected to /home. Backend endpoints still enforce access independently.
 */
export function BuilderAiRoute({ children, ownerOnly = false }: BuilderAiRouteProps) {
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

  // Company Owner & Builder are separate things: a Builder is only part of a
  // baseshop and just needs to accept their invitation, so keep them off the
  // owner-only pages and send them to Invitations. Owners (is_owner) pass through.
  if (ownerOnly && !data?.is_owner) {
    return <Navigate to="/builder-ai/invitations" replace />;
  }

  return <>{children}</>;
}
