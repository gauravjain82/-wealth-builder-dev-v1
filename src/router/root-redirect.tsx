import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';

/**
 * RootRedirect - Smart root route handler
 * - If authenticated: redirect to home
 * - If not authenticated: redirect to login
 * - While loading: show loader
 */
export function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return <Navigate to="/login" replace />;
}
