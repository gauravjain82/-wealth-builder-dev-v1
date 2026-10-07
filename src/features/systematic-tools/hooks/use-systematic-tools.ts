import { useQuery } from '@tanstack/react-query';
import { fetchSystematicTools } from '../services/systematic-tools-service';

export const SYSTEMATIC_TOOLS_QUERY_KEY = ['systematic-tools'] as const;

/** The role-filtered tool list for the current user. */
export function useSystematicTools() {
  return useQuery({
    queryKey: SYSTEMATIC_TOOLS_QUERY_KEY,
    queryFn: fetchSystematicTools,
    staleTime: 0,
  });
}
