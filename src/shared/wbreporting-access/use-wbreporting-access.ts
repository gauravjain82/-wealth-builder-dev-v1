/**
 * The single cache entry for `GET /api/wbreporting/my-access/`.
 *
 * The shell menu, the pipeline screen, leaderboards, Home v2 and contests all read this
 * one payload. They used to fetch it under three module keys, and React Query cannot
 * deduplicate across keys, so every `/contests` load sent the same request three
 * times — and the browser ran the three one after another, because it holds back an
 * identical in-flight GET until the first completes (Phase 12,
 * `docs/contests/PHASES.md`). Each module now reads it through a `select`, keeping
 * its own hook name and return shape.
 *
 * Long `staleTime`: an access-console grant does not change while somebody is looking
 * at a page, and every guard blocks rendering on this, so a refetch costs a loader for
 * nothing. `retry: false`: a denial is an answer, not a transient failure.
 *
 * Anything that invalidates access must use `WB_REPORTING_ACCESS_KEY`; an
 * invalidation on one of the old module keys would match nothing.
 */

import { useQuery } from '@tanstack/react-query';

import type { WbReportingAccess } from './types';
import { fetchWbReportingAccess } from './wbreporting-access-service';

export const WB_REPORTING_ACCESS_KEY = ['wbreporting', 'my-access'] as const;

/**
 * Read the shared payload, optionally narrowed.
 *
 * Pass a `select` defined at module scope: React Query re-runs an inline one on every
 * render.
 */
export function useWbReportingAccess<T = WbReportingAccess>(
  select?: (access: WbReportingAccess) => T
) {
  return useQuery({
    queryKey: WB_REPORTING_ACCESS_KEY,
    queryFn: ({ signal }) => fetchWbReportingAccess(signal),
    staleTime: 5 * 60 * 1000,
    retry: false,
    select,
  });
}
