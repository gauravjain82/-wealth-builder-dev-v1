import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '@/features/auth';
import { Plan } from '@core/types';
import { isPlanAtLeast } from '@core/constants/roles';

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * Route guard for admin-tier pages (ADMIN and SUPER_ADMIN).
 *
 * Builds on the same auth checks as ProtectedRoute, then additionally requires
 * the current user to rank at least ADMIN. SUPER_ADMIN outranks ADMIN, so it
 * passes too. Non-admins are redirected to /home. Backend endpoints still
 * enforce permissions independently.
 */
export function AdminRoute({ children }: AdminRouteProps) {
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

  if (!isPlanAtLeast(user?.accountType, Plan.Admin)) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
