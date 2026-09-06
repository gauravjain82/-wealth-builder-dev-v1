/**
 * Builder AI — React Query hooks.
 *
 * Typed data-access hooks over `builderAiService`. Queries carry stable keys so
 * the near-real-time dashboards (Decision 12) refetch cheaply and mutations can
 * invalidate them. This module owns caching/refetch policy only — no rendering.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { builderAiService } from '../services/builder-ai-service';
import { HttpError, isNoBuilderProgramError } from '../services/http';
import type {
  AIReview,
  BreakdownGroupBy,
  CreateAIReviewPayload,
  DashboardScope,
} from '../types';

/** Root query-key namespace so the whole feature can be invalidated at once. */
const KEY = 'builder-ai';

/**
 * The caller's Builder capability flags (drives menu gating). Cached for the whole
 * session — grants change rarely — and enabled unconditionally for logged-in users.
 * Never throws to the menu: on error the flags are treated as all-false by callers.
 */
export function useMyBuilderAccess(enabled = true) {
  return useQuery({
    queryKey: [KEY, 'my-access'],
    queryFn: () => builderAiService.myAccess(),
    enabled,
    staleTime: 1000 * 60 * 5,
    retry: retryNon4xx,
  });
}

/** The single active BDC program (used to resolve the program id for invites). */
export function usePrograms() {
  return useQuery({
    queryKey: [KEY, 'programs'],
    queryFn: () => builderAiService.programs(),
    staleTime: 1000 * 60 * 30, // program config rarely changes
  });
}

/** Don't retry client errors (4xx) — a 403/404 won't fix itself; other errors retry as usual. */
function retryNon4xx(failureCount: number, error: unknown): boolean {
  if (error instanceof HttpError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 3;
}

/**
 * Config-driven KPI dashboard for a viewer at a segment. `as_of` in the payload
 * reflects Celery/cache freshness; we keep a short stale time to match Decision 12.
 * Pass `enabled: false` to hold the fetch (e.g. while probing access before mount).
 */
export function useDashboard(scope: DashboardScope, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [KEY, 'dashboard', scope],
    queryFn: () => builderAiService.dashboard(scope),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 30,
    retry: retryNon4xx,
  });
}

/**
 * Sidebar-gating signal for the Builder AI group, derived from one probe of the
 * `individual` dashboard (shared query key → a single request that also pre-warms the
 * page). Only one case matters now (Decision 31 — one dashboard, self-gating toggle):
 *   - 404 "No matching builder program" → the viewer has no builder program at all
 *     (`noProgram`); the entire Builder AI group should be hidden.
 * Transient/network errors leave it `false`, so nothing is hidden by a flaky request.
 * Pass `enabled: false` when the plan has no Builder AI group, so the probe never fires.
 */
export function useBuilderAiAccess(enabled: boolean): {
  noProgram: boolean;
} {
  const query = useDashboard('individual', { enabled });
  return { noProgram: isNoBuilderProgramError(query.error) };
}

/** Builder roster (one row per visible builder), filterable by name/agency code. */
export function useRoster(scope: DashboardScope, search: string) {
  return useQuery({
    queryKey: [KEY, 'roster', scope, search],
    queryFn: () => builderAiService.roster({ scope, search: search || undefined }),
    staleTime: 1000 * 30,
  });
}

/** Per-period metric series for trend charts (Reporting). */
export function useTimeseries(params: {
  metric: string;
  scope: DashboardScope;
  period_type?: string;
  from?: string;
  to?: string;
  enabled?: boolean;
}) {
  const { enabled = true, ...query } = params;
  return useQuery({
    queryKey: [KEY, 'timeseries', query],
    queryFn: () => builderAiService.timeseries(query),
    enabled: enabled && Boolean(query.metric),
    staleTime: 1000 * 60,
  });
}

/** Metric composition grouped by status/level/member (donut/bar + compare). */
export function useBreakdown(params: {
  metric: string;
  scope: DashboardScope;
  group_by: BreakdownGroupBy;
  enabled?: boolean;
}) {
  const { enabled = true, ...query } = params;
  return useQuery({
    queryKey: [KEY, 'breakdown', query],
    queryFn: () => builderAiService.breakdown(query),
    enabled: enabled && Boolean(query.metric),
    staleTime: 1000 * 60,
  });
}

/** The program's active leaderboard definitions (metadata for the picker). */
export function useLeaderboards() {
  return useQuery({
    queryKey: [KEY, 'leaderboards'],
    queryFn: () => builderAiService.leaderboards(),
    staleTime: 1000 * 60 * 5, // definitions change rarely (config edits)
  });
}

/**
 * The ranked rows for one leaderboard. `period` picks a historical period id;
 * a short stale time matches the near-real-time aggregate freshness (Decision 12).
 */
export function useLeaderboard(code: string, params: { period?: number; enabled?: boolean } = {}) {
  const { period, enabled = true } = params;
  return useQuery({
    queryKey: [KEY, 'leaderboard', code, period ?? null],
    queryFn: () => builderAiService.leaderboard(code, period),
    enabled: enabled && Boolean(code),
    staleTime: 1000 * 30,
  });
}

/** Sent/received BuilderInvitations for the current user. */
export function useInvitations() {
  return useQuery({
    queryKey: [KEY, 'invitations'],
    queryFn: () => builderAiService.invitations(),
    staleTime: 1000 * 15,
  });
}

/**
 * Invitation + roster mutations. Each invalidates the invitation list (and the
 * dashboards, whose builder counts change) so the UI reflects the new state.
 */
export function useInvitationMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: [KEY, 'invitations'] });
    void qc.invalidateQueries({ queryKey: [KEY, 'dashboard'] });
    void qc.invalidateQueries({ queryKey: [KEY, 'roster'] });
  };

  const create = useMutation({
    mutationFn: (payload: { program: number; invitee: number }) =>
      builderAiService.createInvitation(payload),
    onSuccess: invalidate,
  });

  const cancel = useMutation({
    mutationFn: (id: number) => builderAiService.cancelInvitation(id),
    onSuccess: invalidate,
  });

  const resend = useMutation({
    mutationFn: (id: number) => builderAiService.resendInvitation(id),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (vars: { profileId: number; reason: string }) =>
      builderAiService.removeBuilder(vars.profileId, vars.reason),
    onSuccess: invalidate,
  });

  return { create, cancel, resend, remove };
}

// --------------------------------------------------------------------------- //
// AI review (Phase 7)
// --------------------------------------------------------------------------- //

/** The program's AI review templates (drives the request picker). */
export function useAiReviewTemplates() {
  return useQuery({
    queryKey: [KEY, 'ai-review-templates'],
    queryFn: () => builderAiService.aiReviewTemplates(),
    staleTime: 1000 * 60 * 5, // template config changes rarely
  });
}

/**
 * The caller's AI reviews. While any review is still PENDING/RUNNING the list
 * polls every ~2.5 s so the freshly-requested result appears without a manual
 * refresh; once everything has settled the interval turns off.
 */
export function useAiReviews() {
  return useQuery({
    queryKey: [KEY, 'ai-reviews'],
    queryFn: () => builderAiService.aiReviews(),
    staleTime: 1000 * 10,
    refetchInterval: (query) => {
      const data = query.state.data as AIReview[] | undefined;
      const pending = data?.some((r) => r.status === 'PENDING' || r.status === 'RUNNING');
      return pending ? 2500 : false;
    },
  });
}

/** Performance periods (the BUILDER_PERIOD review subject picker). */
export function usePeriods() {
  return useQuery({
    queryKey: [KEY, 'periods'],
    queryFn: () => builderAiService.periods(),
    staleTime: 1000 * 60,
  });
}

/** The caller's submissions (the SUBMISSION review subject picker). */
export function useSubmissions() {
  return useQuery({
    queryKey: [KEY, 'submissions'],
    queryFn: () => builderAiService.submissions(),
    staleTime: 1000 * 30,
  });
}

/** Request an AI review; invalidates the list so the new PENDING row appears. */
export function useAiReviewMutations() {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: (payload: CreateAIReviewPayload) => builderAiService.createAiReview(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [KEY, 'ai-reviews'] });
    },
  });
  return { create };
}
