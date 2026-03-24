import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { ReactNode } from 'react';

interface PublicRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

/**
 * PublicRoute - Redirects authenticated users to dashboard
 * Use for login, signup, and other public pages that authenticated users shouldn't access
 */
export function PublicRoute({ children, redirectTo = '/dashboard' }: PublicRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // If authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // If not authenticated, show the public page
  return <>{children}</>;
}
