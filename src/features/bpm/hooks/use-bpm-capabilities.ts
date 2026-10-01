import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { bpmService } from '../services/bpm-service';

/**
 * The current user's BPM capabilities, for the sidebar.
 *
 * The BPM pages still fetch their own copy on mount — they need it fresh after a
 * grant changes, and they predate this hook. The sidebar needs it on every
 * screen, so it goes through React Query and is shared and cached here.
 *
 * Keyed by user id: signing out and in as somebody else in the same tab must
 * not show the first user's grants from cache. Invalidate by the
 * `['bpm', 'capabilities']` prefix to refresh whoever is signed in.
 *
 * `retry: false`: a user without BPM access gets a refusal, which is an answer,
 * not a blip. Callers treat "no data" (loading or refused) as no capability.
 */
export function useBpmCapabilities() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: ['bpm', 'capabilities', userId],
    queryFn: ({ signal }) => bpmService.capabilities(signal),
    enabled: userId !== null,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
