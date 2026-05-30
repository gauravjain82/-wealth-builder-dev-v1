import { queryClient } from './provider';

const REFERENCE_DATA_QUERY_KEY = 'reference-data';

function getReferenceDataQueryKey(key: string): readonly [string, string, string] {
  return [
    REFERENCE_DATA_QUERY_KEY,
    key,
    localStorage.getItem('wb.userId') || '',
  ];
}

export function fetchCachedReferenceData<T>(key: string, queryFn: () => Promise<T>): Promise<T> {
  return queryClient.fetchQuery({
    queryKey: getReferenceDataQueryKey(key),
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn,
  });
}

export async function invalidateReferenceData(key?: string): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: key ? [REFERENCE_DATA_QUERY_KEY, key] : [REFERENCE_DATA_QUERY_KEY],
  });
}
