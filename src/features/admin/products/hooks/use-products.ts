/** React Query hooks for the Product Management UI. */

import { useQuery } from '@tanstack/react-query';

import {
  fetchProductHistory,
  fetchProductsAccess,
  listCompanies,
} from '../services/products-service';

/** Capability flags used to gate the menu group and route guard. */
export function useProductsAccess() {
  return useQuery({
    queryKey: ['products', 'my-access'],
    queryFn: fetchProductsAccess,
    staleTime: 5 * 60 * 1000,
  });
}

/** Query key for the company list, so a save can invalidate it in one place. */
export const COMPANIES_QUERY_KEY = ['products', 'companies'] as const;

/**
 * The company list, sourced from the catalog rather than a hard-coded constant.
 *
 * Invalidate `COMPANIES_QUERY_KEY` after creating or editing a product so a newly
 * introduced company shows up in the filters and suggestions straight away.
 */
export function useCompanies() {
  return useQuery({
    queryKey: COMPANIES_QUERY_KEY,
    queryFn: listCompanies,
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
