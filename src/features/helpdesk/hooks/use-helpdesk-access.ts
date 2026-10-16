/** React Query hook for the Helpdesk Admin access check. */

import { useQuery } from '@tanstack/react-query';

import { getHelpdeskAccess, type HelpdeskAccess } from '../services/helpdesk-service';

/**
 * Whether the current user may view (helpdesk:read) and update (helpdesk:update)
 * Helpdesk Admin, as granted in the access console. Not plan- or role-based.
 */
export function useHelpdeskAccess() {
  return useQuery<HelpdeskAccess>({
    queryKey: ['helpdesk', 'my-access'],
    queryFn: getHelpdeskAccess,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
