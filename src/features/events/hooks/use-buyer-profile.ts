import { useQuery } from '@tanstack/react-query';

import { buyerProfileService, hasAppLogin } from '../services/buyer-profile-service';

/**
 * The signed-in member's details for prefilling the ticket form, or `null` for
 * a guest. Fetched once per event; a failure is not retried or surfaced —
 * prefilling is a convenience, never a reason to block a purchase.
 */
export function useBuyerProfile(shortcut: string) {
  const signedIn = hasAppLogin();
  const { data } = useQuery({
    queryKey: ['events', 'public', 'buyer-profile', shortcut, signedIn],
    queryFn: ({ signal }) => buyerProfileService.get(shortcut, signal),
    enabled: signedIn,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return { signedIn, profile: data ?? null };
}
