import { useQuery } from '@tanstack/react-query';

import { fetchHomePageContent } from '../services/home-content-service';

/** Current CMS-managed home-page content (config + media by slot). */
export function useHomePageContent() {
  return useQuery({
    queryKey: ['home', 'content'],
    queryFn: fetchHomePageContent,
    staleTime: 5 * 60 * 1000,
  });
}
