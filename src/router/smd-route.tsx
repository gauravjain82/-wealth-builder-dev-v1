import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '@/features/auth';
import { isSmdOrAbove } from '@/features/team/associate-tracker/smd-access';

interface SmdRouteProps {
  children: ReactNode;
}

/**
 * Route guard for SMD-only pages (Broker and above, e.g. My Team → Producers).
 *
 * Same auth checks as AdminRoute, with the SMD bar the associate tracker uses
 * for its SMD-only columns. Anyone below is redirected to /home.
 */
export function SmdRoute({ children }: SmdRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isSmdOrAbove(user)) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
