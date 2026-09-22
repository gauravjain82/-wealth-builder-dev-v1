/** React Query hooks for the Product Management UI. */

import { useQuery } from '@tanstack/react-query';

import { fetchProductHistory, fetchProductsAccess } from '../services/products-service';

/** Capability flags used to gate the menu group and route guard. */
export function useProductsAccess() {
  return useQuery({
    queryKey: ['products', 'my-access'],
    queryFn: fetchProductsAccess,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Audit history for one product; enabled only when a product is open and the
 * viewer has audit access (and the CompanyProduct ContentType id is known).
 */
export function useProductHistory(
  contentTypeId: number | undefined,
  productId: number | null,
) {
  return useQuery({
    queryKey: ['products', 'history', productId],
    queryFn: () => fetchProductHistory(contentTypeId as number, productId as number),
    enabled: productId != null && contentTypeId != null,
    staleTime: 60 * 1000,
  });
}
