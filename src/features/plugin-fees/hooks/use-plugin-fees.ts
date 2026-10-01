/**
 * React Query hooks for the plug-in fees P2, P3 and P4 surfaces.
 *
 * Query keys carry the full selection (status, search, page) and every `queryFn`
 * forwards React Query's `signal` into `fetch`, as in
 * `src/features/leaderboards/hooks/use-leaderboards.ts`. Key map and invalidation:
 * `docs/plugin-fees/ARCHITECTURE.md` §4.
 */

import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  approveCycle,
  createCost,
  createInvoicePayLink,
  createPaymentMethodSetupSession,
  decideAssistant,
  decideOffice,
  deleteCost,
  fetchAgentStatement,
  fetchAssistantReviews,
  fetchBalances,
  fetchCosts,
  fetchCyclePreview,
  fetchCycleReport,
  fetchCycles,
  fetchFollowUps,
  fetchMyPluginFees,
  fetchMyStatement,
  fetchOfficeReviews,
  fetchPayments,
  fetchPluginFeesAccess,
  resolveFollowUp,
  sendCycle,
  setPaymentPreference,
  submitAssistant,
  submitOffice,
  withdrawAssistant,
  withdrawOffice,
} from '../services/plugin-fees-service';
import type {
  AssistantReviewStatus,
  CostsQuery,
  FollowUpStatusFilter,
  OfficeReviewStatus,
  ReviewKind,
  ReviewQuery,
} from '../types';

/**
 * File URLs in `me/` and the review payloads are signed for 15 minutes. Refetch well
 * inside that window, and on focus, so a link on screen is never an expired one.
 */
const SIGNED_URL_REFRESH_MS = 10 * 60 * 1000;

/**
 * Submissions are multipart uploads; the app-wide `mutations.retry: 1` would resend one
 * after an ambiguous failure and earn an `already_pending`. Never retry these.
 */
const NO_RETRY = { retry: false } as const;

export const pluginFeesKeys = {
  root: ['plugin-fees'] as const,
  access: ['plugin-fees', 'my-access'] as const,
  me: ['plugin-fees', 'me'] as const,
  review: (kind: ReviewKind) => ['plugin-fees', 'review', kind] as const,
  reviewPage: (kind: ReviewKind, query: ReviewQuery<string>) =>
    [
      'plugin-fees',
      'review',
      kind,
      { status: query.status, search: query.search, page: query.page },
    ] as const,
  myStatement: ['plugin-fees', 'statement', 'me'] as const,
  agentStatement: (id: number) => ['plugin-fees', 'statement', 'agent', id] as const,
  cycles: ['plugin-fees', 'cycles'] as const,
  cycle: (month: string) => ['plugin-fees', 'cycle', month] as const,
  cyclePreviewAll: ['plugin-fees', 'cycle-preview'] as const,
  cyclePreview: (month: string) => ['plugin-fees', 'cycle-preview', month] as const,
  costsAll: ['plugin-fees', 'costs'] as const,
  costs: (query: CostsQuery) =>
    ['plugin-fees', 'costs', { smd: query.smd, month: query.month, page: query.page }] as const,
  paymentsAll: ['plugin-fees', 'payments'] as const,
  payments: (month: string) => ['plugin-fees', 'payments', month] as const,
  followUpsAll: ['plugin-fees', 'follow-ups'] as const,
  followUps: (status: FollowUpStatusFilter) => ['plugin-fees', 'follow-ups', status] as const,
  balances: ['plugin-fees', 'balances'] as const,
};

/** What the current user may do with plug-in fees. Drives the menu, guard and Settings sections. */
export function usePluginFeesAccess() {
  return useQuery({
    queryKey: pluginFeesKeys.access,
    queryFn: ({ signal }) => fetchPluginFeesAccess(signal),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * The agent's own office, assistant, payment method, deadlines and rates.
 *
 * `pollEveryMs` is set briefly after returning from Stripe, because the saved method
 * only appears once Stripe's webhook lands. Otherwise it refreshes inside the signed-URL
 * lifetime.
 */
export function useMyPluginFees(enabled: boolean, pollEveryMs: number | false = false) {
  return useQuery({
    queryKey: pluginFeesKeys.me,
    queryFn: ({ signal }) => fetchMyPluginFees(signal),
    enabled,
    staleTime: 60 * 1000,
    refetchInterval: pollEveryMs || SIGNED_URL_REFRESH_MS,
    refetchOnWindowFocus: true,
  });
}

function useInvalidateMe() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: pluginFeesKeys.me });
}

export function useSubmitOffice() {
  const invalidate = useInvalidateMe();
  return useMutation({ mutationFn: submitOffice, onSettled: invalidate, ...NO_RETRY });
}

export function useWithdrawOffice() {
  const invalidate = useInvalidateMe();
  return useMutation({ mutationFn: withdrawOffice, onSettled: invalidate, ...NO_RETRY });
}

export function useSubmitAssistant() {
  const invalidate = useInvalidateMe();
  return useMutation({ mutationFn: submitAssistant, onSettled: invalidate, ...NO_RETRY });
}

export function useWithdrawAssistant() {
  const invalidate = useInvalidateMe();
  return useMutation({ mutationFn: withdrawAssistant, onSettled: invalidate, ...NO_RETRY });
}

export function useSetPaymentPreference() {
  const invalidate = useInvalidateMe();
  return useMutation({ mutationFn: setPaymentPreference, onSettled: invalidate, ...NO_RETRY });
}

export function useCreatePaymentMethodSetupSession() {
  return useMutation({ mutationFn: createPaymentMethodSetupSession, ...NO_RETRY });
}

/* --- review queues --------------------------------------------------------- */

export function useOfficeReviews(query: ReviewQuery<OfficeReviewStatus>) {
  return useQuery({
    queryKey: pluginFeesKeys.reviewPage('offices', query),
    queryFn: ({ signal }) => fetchOfficeReviews(query, signal),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchInterval: SIGNED_URL_REFRESH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useAssistantReviews(query: ReviewQuery<AssistantReviewStatus>) {
  return useQuery({
    queryKey: pluginFeesKeys.reviewPage('assistants', query),
    queryFn: ({ signal }) => fetchAssistantReviews(query, signal),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchInterval: SIGNED_URL_REFRESH_MS,
    refetchOnWindowFocus: true,
  });
}

/** Decisions refetch the whole queue for that kind, whatever filter/page is showing. */
export function useDecideOffice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: decideOffice,
    ...NO_RETRY,
    onSettled: () => queryClient.invalidateQueries({ queryKey: pluginFeesKeys.review('offices') }),
  });
}

export function useDecideAssistant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: decideAssistant,
    ...NO_RETRY,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: pluginFeesKeys.review('assistants') }),
  });
}

/* --- P3: statements -------------------------------------------------------- */

/**
 * The signed-in agent's invoices and (for SMDs) ledger. `pollEveryMs` is set briefly
 * after returning from a Stripe payment page, until the webhook has moved the invoice.
 */
export function useMyStatement(enabled = true, pollEveryMs: number | false = false) {
  return useQuery({
    queryKey: pluginFeesKeys.myStatement,
    queryFn: ({ signal }) => fetchMyStatement(signal),
    enabled,
    staleTime: 60 * 1000,
    refetchInterval: pollEveryMs,
  });
}

/** P4: a pay link for one of my invoices. Nothing to invalidate — the page redirects away. */
export function useCreateInvoicePayLink() {
  return useMutation({ mutationFn: createInvoicePayLink, ...NO_RETRY });
}

/** Any agent's statement, read-only (Hierarchy Assistant / admin). */
export function useAgentStatement(id: number | null) {
  return useQuery({
    queryKey: pluginFeesKeys.agentStatement(id ?? 0),
    queryFn: ({ signal }) => fetchAgentStatement(id as number, signal),
    enabled: id !== null,
    staleTime: 60 * 1000,
  });
}

/* --- P3: billing cycles ---------------------------------------------------- */

export function useCycles(enabled = true) {
  return useQuery({
    queryKey: pluginFeesKeys.cycles,
    queryFn: ({ signal }) => fetchCycles(signal),
    enabled,
    staleTime: 30 * 1000,
  });
}

/** The stored report for a generated month. `null` disables the query. */
export function useCycleReport(month: string | null) {
  return useQuery({
    queryKey: pluginFeesKeys.cycle(month ?? ''),
    queryFn: ({ signal }) => fetchCycleReport(month as string, signal),
    enabled: month !== null,
    staleTime: 30 * 1000,
  });
}

/**
 * The dry run for a month. It writes nothing but recomputes every agent, so it is held
 * for a minute and never refetched on focus. `null` disables the query.
 */
export function useCyclePreview(month: string | null) {
  return useQuery({
    queryKey: pluginFeesKeys.cyclePreview(month ?? ''),
    queryFn: ({ signal }) => fetchCyclePreview(month as string, signal),
    enabled: month !== null,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Approve releases the month's invoices. The returned report is written into the cache;
 * the list, the stored report and the preview for that month are refetched on settle
 * (a 409 `not_awaiting_approval` means someone else approved it — the refetch shows that).
 */
export function useApproveCycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveCycle,
    ...NO_RETRY,
    onSuccess: (report) => queryClient.setQueryData(pluginFeesKeys.cycle(report.month), report),
    onSettled: (_data, _error, input) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: pluginFeesKeys.cycles }),
        queryClient.invalidateQueries({ queryKey: pluginFeesKeys.cycle(input.month) }),
        queryClient.invalidateQueries({ queryKey: pluginFeesKeys.cyclePreview(input.month) }),
      ]),
  });
}

/* --- P3: recognition and mailing costs ------------------------------------- */

export function useCosts(query: CostsQuery) {
  return useQuery({
    queryKey: pluginFeesKeys.costs(query),
    queryFn: ({ signal }) => fetchCosts(query, signal),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

/** A logged or deleted cost changes every costs page and any pending preview. */
function useInvalidateCosts() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: pluginFeesKeys.costsAll }),
      queryClient.invalidateQueries({ queryKey: pluginFeesKeys.cyclePreviewAll }),
    ]);
}

export function useCreateCost() {
  const invalidate = useInvalidateCosts();
  return useMutation({ mutationFn: createCost, onSettled: invalidate, ...NO_RETRY });
}

export function useDeleteCost() {
  const invalidate = useInvalidateCosts();
  return useMutation({ mutationFn: deleteCost, onSettled: invalidate, ...NO_RETRY });
}

/* --- P4: collection -------------------------------------------------------- */

/** The payments dashboard for a month (`YYYY-MM`). `null` disables the query. */
export function usePayments(month: string | null) {
  return useQuery({
    queryKey: pluginFeesKeys.payments(month ?? ''),
    queryFn: ({ signal }) => fetchPayments(month as string, signal),
    enabled: month !== null,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

export function useFollowUps(status: FollowUpStatusFilter, enabled = true) {
  return useQuery({
    queryKey: pluginFeesKeys.followUps(status),
    queryFn: ({ signal }) => fetchFollowUps(status, signal),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

export function useBalances(enabled = true) {
  return useQuery({
    queryKey: pluginFeesKeys.balances,
    queryFn: ({ signal }) => fetchBalances(signal),
    enabled,
    staleTime: 60 * 1000,
  });
}

/**
 * Send now: refetches every payments month and the cycle report for that month (its
 * `sending` block), and the cycle list, on settle — a `409 not_approved` included.
 */
export function useSendCycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendCycle,
    ...NO_RETRY,
    onSettled: (_data, _error, month) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: pluginFeesKeys.paymentsAll }),
        queryClient.invalidateQueries({ queryKey: pluginFeesKeys.cycle(month) }),
        queryClient.invalidateQueries({ queryKey: pluginFeesKeys.cycles }),
      ]),
  });
}

/** Resolving changes every follow-up filter and the payments rows' follow-up flag. */
export function useResolveFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resolveFollowUp,
    ...NO_RETRY,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: pluginFeesKeys.followUpsAll }),
        queryClient.invalidateQueries({ queryKey: pluginFeesKeys.paymentsAll }),
      ]),
  });
}

/** `value`, settled for `delayMs`. Used for the review search box. */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setSettled(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return settled;
}
