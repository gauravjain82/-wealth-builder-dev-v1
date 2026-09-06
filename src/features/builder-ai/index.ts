/**
 * Builder AI feature — public barrel.
 *
 * Re-exports the feature's types, service, hooks, and theme helpers. Pages are
 * lazy-imported directly by the router, so they are intentionally not re-exported
 * here (keeps code-splitting boundaries intact).
 */

export * from './types';
export * from './theme';
export { builderAiService } from './services/builder-ai-service';
export { builderConfigService } from './services/builder-config-service';
export {
  usePrograms,
  useDashboard,
  useRoster,
  useTimeseries,
  useBreakdown,
  useLeaderboards,
  useLeaderboard,
  useInvitations,
  useInvitationMutations,
  useAiReviewTemplates,
  useAiReviews,
  usePeriods,
  useSubmissions,
  useAiReviewMutations,
} from './hooks/use-builder-ai';
export {
  useDashboards,
  useSections,
  useWidgets,
  useMetricDefinitions,
  useDashboardBuilderMutations,
} from './hooks/use-builder-config';
