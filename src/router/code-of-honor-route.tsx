import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

import { useCodeOfHonorAccess } from '@/features/code-of-honor';

interface CodeOfHonorRouteProps {
  children: ReactNode;
}

/**
 * Route guard for the Code of Honor committee/admin page.
 *
 * `/api/code-of-honor/my-access/` decides: only people granted a `code_of_honor:*`
 * permission in the access console (`can_review` or `can_manage`) get in; everyone else
 * is redirected to /home. The backend enforces the same gate on every endpoint.
 */
export function CodeOfHonorRoute({ children }: CodeOfHonorRouteProps) {
  const { data, isLoading, isError } = useCodeOfHonorAccess();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (isError || !(data?.can_review || data?.can_manage)) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
