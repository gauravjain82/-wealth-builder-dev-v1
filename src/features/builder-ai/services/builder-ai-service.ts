/**
 * Builder AI — read API service layer.
 *
 * Thin, typed wrappers over the Django `builder` app read endpoints (mounted at
 * `/api/builder/`). Shares the HTTP primitives (`request`/`buildQuery`) with the
 * config write service via `./http` so there is one request path (Decision 29).
 *
 * This module owns HTTP only — no React, no business logic (Decision 24 SRP).
 */

import { buildQuery, request, unwrapList } from './http';
import type {
  AIReview,
  AIReviewTemplate,
  BreakdownGroupBy,
  BreakdownPayload,
  BuilderInvitation,
  BuilderProfile,
  BuilderProgram,
  CreateAIReviewPayload,
  CreateInvitationPayload,
  DashboardPayload,
  DashboardScope,
  LeaderboardDefinition,
  LeaderboardPayload,
  MyBuilderAccess,
  Paginated,
  PerformancePeriod,
  QualificationPayload,
  RosterPayload,
  SubmissionSummary,
  TimeseriesPayload,
} from '../types';

export const builderAiService = {
  // -- programs (needed to resolve the program id for invitations) ----------
  programs: () =>
    request<Paginated<BuilderProgram> | BuilderProgram[]>('/api/builder/programs/').then((data) =>
      Array.isArray(data) ? data : data.results,
    ),

  // -- my access (capability flags for menu gating; no program required) ----
  myAccess: () => request<MyBuilderAccess>('/api/builder/my-access/'),

  // -- dashboard reads (precomputed; Decision 12 — no live recompute) --------
  dashboard: (scope: DashboardScope) =>
    request<DashboardPayload>(`/api/builder/dashboard/${buildQuery({ scope })}`),

  roster: (params: { scope: DashboardScope; search?: string; metrics?: string }) =>
    request<RosterPayload>(
      `/api/builder/roster/${buildQuery({
        scope: params.scope,
        search: params.search,
        metrics: params.metrics,
      })}`,
    ),

  timeseries: (params: {
    metric: string;
    scope: DashboardScope;
    period_type?: string;
    from?: string;
    to?: string;
  }) =>
    request<TimeseriesPayload>(
      `/api/builder/metrics/timeseries${buildQuery({
        metric: params.metric,
        scope: params.scope,
        period_type: params.period_type,
        from: params.from,
        to: params.to,
      })}`,
    ),

  breakdown: (params: { metric: string; scope: DashboardScope; group_by: BreakdownGroupBy }) =>
    request<BreakdownPayload>(
      `/api/builder/metrics/breakdown${buildQuery({
        metric: params.metric,
        scope: params.scope,
        group_by: params.group_by,
      })}`,
    ),

  qualifications: (params: { builder?: number; from?: string; to?: string } = {}) =>
    request<QualificationPayload>(
      `/api/builder/qualifications/${buildQuery({
        builder: params.builder,
        from: params.from,
        to: params.to,
      })}`,
    ),

  // -- leaderboards (Phase 5) — named ranked top-N of the precomputed aggregates
  leaderboards: () => request<LeaderboardDefinition[]>('/api/builder/leaderboards/'),

  leaderboard: (code: string, period?: number) =>
    request<LeaderboardPayload>(
      `/api/builder/leaderboards/${encodeURIComponent(code)}/${buildQuery({ period })}`,
    ),

  // -- BuilderInvitation lifecycle (Phase 1) --------------------------------
  invitations: () =>
    request<Paginated<BuilderInvitation> | BuilderInvitation[]>(
      '/api/builder/builder-invitations/',
    ).then((data) => (Array.isArray(data) ? data : data.results)),

  createInvitation: (payload: CreateInvitationPayload) =>
    request<BuilderInvitation>('/api/builder/builder-invitations/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  cancelInvitation: (id: number) =>
    request<BuilderInvitation>(`/api/builder/builder-invitations/${id}/cancel/`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  resendInvitation: (id: number) =>
    request<BuilderInvitation>(`/api/builder/builder-invitations/${id}/resend/`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  // -- profiles (roster removal — "remove builder" is a direct action) ------
  removeBuilder: (profileId: number, reason: string) =>
    request<BuilderProfile>(`/api/builder/profiles/${profileId}/remove/`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // -- AI review (Phase 7) — request a review + poll the record for its result
  aiReviewTemplates: () =>
    request<Paginated<AIReviewTemplate> | AIReviewTemplate[]>(
      '/api/builder/config/ai-review-templates/',
    ).then(unwrapList),

  aiReviews: () =>
    request<Paginated<AIReview> | AIReview[]>('/api/builder/ai-reviews/').then(unwrapList),

  createAiReview: (payload: CreateAIReviewPayload) =>
    request<AIReview>('/api/builder/ai-reviews/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // -- lookups used by the review-request picker ----------------------------
  periods: () =>
    request<Paginated<PerformancePeriod> | PerformancePeriod[]>(
      '/api/builder/periods/',
    ).then(unwrapList),

  submissions: () =>
    request<Paginated<SubmissionSummary> | SubmissionSummary[]>(
      '/api/builder/submissions/',
    ).then(unwrapList),
};
