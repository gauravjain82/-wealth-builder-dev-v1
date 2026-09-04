import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import PublicHomePage from '@/features/legal/pages/public-home-page';

/**
 * RootRedirect - Smart root route handler
 * - If authenticated: redirect to the in-app home
 * - If not authenticated: show the public app-purpose page (required for Google OAuth branding)
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

  return <PublicHomePage />;
}
