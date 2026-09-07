/** React Query hooks for the BuilderAI dashboards. */

import { useQuery } from '@tanstack/react-query';

import {
  fetchBuilderBaseshop,
  fetchBuilderBulletin,
  fetchBuilderCompany,
  fetchBuilderHome,
  fetchBuilderMyAccess,
  fetchBuilderReporting,
  fetchBuilderRoster,
  type BuilderMetricKey,
  type BuilderRange,
  type BuilderSegment,
} from '../services/builder-ai-service';

const rangeKey = (range?: BuilderRange) => [range?.startDate ?? '', range?.endDate ?? ''];

export function useBuilderMyAccess() {
  return useQuery({
    queryKey: ['builder-ai', 'my-access'],
    queryFn: fetchBuilderMyAccess,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBuilderHome(segment: BuilderSegment, range?: BuilderRange) {
  return useQuery({
    queryKey: ['builder-ai', 'home', segment, ...rangeKey(range)],
    queryFn: () => fetchBuilderHome(segment, range),
  });
}

export function useBuilderCompany(range?: BuilderRange) {
  return useQuery({
    queryKey: ['builder-ai', 'company', ...rangeKey(range)],
    queryFn: () => fetchBuilderCompany(range),
  });
}

export function useBuilderBaseshop(range?: BuilderRange) {
  return useQuery({
    queryKey: ['builder-ai', 'baseshop', ...rangeKey(range)],
    queryFn: () => fetchBuilderBaseshop(range),
  });
}

export function useBuilderRoster(segment: BuilderSegment, range?: BuilderRange) {
  return useQuery({
    queryKey: ['builder-ai', 'roster', segment, ...rangeKey(range)],
    queryFn: () => fetchBuilderRoster(segment, range),
  });
}

export function useBuilderReporting(segment: BuilderSegment, range?: BuilderRange) {
  return useQuery({
    queryKey: ['builder-ai', 'reporting', segment, ...rangeKey(range)],
    queryFn: () => fetchBuilderReporting(segment, range),
  });
}

export function useBuilderBulletin(
  segment: BuilderSegment,
  metric: BuilderMetricKey,
  search: string,
  range?: BuilderRange
) {
  return useQuery({
    queryKey: ['builder-ai', 'bulletin', segment, metric, search, ...rangeKey(range)],
    queryFn: () => fetchBuilderBulletin(segment, metric, search, range),
  });
}
