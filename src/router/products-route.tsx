import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

import { useProductsAccess } from '@/features/admin/products/hooks/use-products';

interface ProductsRouteProps {
  children: ReactNode;
}

/**
 * Route guard for the Product Management UI.
 *
 * Access is not plan-based: the backend `/api/tracker/products/my-access/`
 * endpoint decides who may view (only individuals granted `products:read` in
 * the access console). While the check is in flight we render a loader; users
 * without `can_view` are redirected to /home. The backend enforces the same
 * gate on every product endpoint independently.
 */
export function ProductsRoute({ children }: ProductsRouteProps) {
  const { data, isLoading, isError } = useProductsAccess();

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
