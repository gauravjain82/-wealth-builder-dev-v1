/**
 * React Query hooks for the plug-in fees P2–P6 surfaces and the fee configuration screen.
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
  approvePayout,
  createAdjustment,
  createConnectOnboardingLink,
  createCost,
  createInvoicePayLink,
  createPaymentMethodSetupSession,
  decideAssistant,
  decideOffice,
  deleteCost,
  deleteFeeRate,
  fetchAdjustments,
  fetchAgentStatement,
  fetchAssistantReviews,
  fetchBalances,
  fetchBillingSettings,
  fetchConfigHistory,
  fetchCosts,
  fetchCyclePreview,
  fetchCycleReport,
  fetchCycles,
  fetchDashboard,
  fetchFeeSchedule,
  fetchFollowUps,
  fetchMyConnect,
  fetchMyPluginFees,
  fetchMyStatement,
  fetchOfficeReviews,
  fetchPayments,
  fetchPayoutReport,
  fetchPayouts,
  fetchPluginFeesAccess,
  fetchSevcTotals,
  preparePayout,
  resolveFollowUp,
  retryPayoutLine,
  scheduleFeeChange,
  sendCycle,
  setPaymentPreference,
  setSelfPayAllowed,
  submitAssistant,
  submitOffice,
  updateBillingSettings,
  voidInvoice,
  withdrawAssistant,
  withdrawOffice,
} from '../services/plugin-fees-service';
import type {
  AdjustmentsQuery,
  AssistantReviewStatus,
  CostsQuery,
  FollowUpStatusFilter,
  OfficeReviewStatus,
  ReviewKind,
  PayoutStatus,
  ReviewQuery,
  SevcTotalsRange,
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
  /** Prefix of `myStatement` and every `agentStatement`. */
  statementsAll: ['plugin-fees', 'statement'] as const,
  connectMe: ['plugin-fees', 'connect', 'me'] as const,
  payouts: ['plugin-fees', 'payouts'] as const,
  payoutAll: ['plugin-fees', 'payout'] as const,
  payout: (quarter: string) => ['plugin-fees', 'payout', quarter] as const,
  dashboard: ['plugin-fees', 'dashboard'] as const,
  sevcTotalsAll: ['plugin-fees', 'sevc-totals'] as const,
  sevcTotals: (range: SevcTotalsRange) => ['plugin-fees', 'sevc-totals', range.from, range.to] as const,
  adjustmentsAll: ['plugin-fees', 'adjustments'] as const,
  adjustments: (query: AdjustmentsQuery) =>
    ['plugin-fees', 'adjustments', { smd: query.smd, page: query.page }] as const,
  feeSchedule: ['plugin-fees', 'fee-schedule'] as const,
  billingSettings: ['plugin-fees', 'settings'] as const,
  configHistory: ['plugin-fees', 'config-history'] as const,
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

/** Enabling or withdrawing pay-by-invoice changes the follow-ups' `self_pay_allowed`. */
export function useSetSelfPayAllowed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setSelfPayAllowed,
    ...NO_RETRY,
    onSettled: () => queryClient.invalidateQueries({ queryKey: pluginFeesKeys.followUpsAll }),
  });
}

/* --- P5: Stripe Connect --------------------------------------------------- */

/**
 * The signed-in SMD's payout account. Enable it only for an SMD — anyone else gets
 * `403 not_eligible`. `pollEveryMs` is set briefly after returning from Stripe.
 */
export function useMyConnect(enabled: boolean, pollEveryMs: number | false = false) {
  return useQuery({
    queryKey: pluginFeesKeys.connectMe,
    queryFn: ({ signal }) => fetchMyConnect(signal),
    enabled,
    staleTime: 60 * 1000,
    refetchInterval: pollEveryMs,
    // A 403 / 503 will not fix itself on a retry; show it at once.
    retry: false,
  });
}

/** Nothing to invalidate — the page redirects away to Stripe. */
export function useCreateConnectOnboardingLink() {
  return useMutation({ mutationFn: createConnectOnboardingLink, ...NO_RETRY });
}

/* --- P5: quarterly payouts ------------------------------------------------- */

/** Transfers are queued after approval; poll the report until they settle. */
const PAYOUT_IN_FLIGHT: ReadonlySet<PayoutStatus> = new Set<PayoutStatus>(['approved', 'sending']);
const PAYOUT_POLL_MS = 5000;

/** The payout list; polled like the report while any quarter is still sending. */
export function usePayouts(enabled = true) {
  return useQuery({
    queryKey: pluginFeesKeys.payouts,
    queryFn: ({ signal }) => fetchPayouts(signal),
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: (query) =>
      query.state.data?.some((row) => PAYOUT_IN_FLIGHT.has(row.status)) ? PAYOUT_POLL_MS : false,
  });
}

/** A quarter's payout report; polled every 5 s while its status is `approved` or `sending`. */
export function usePayoutReport(quarter: string | null) {
  return useQuery({
    queryKey: pluginFeesKeys.payout(quarter ?? ''),
    queryFn: ({ signal }) => fetchPayoutReport(quarter as string, signal),
    enabled: quarter !== null,
    staleTime: 30 * 1000,
    refetchInterval: (query) =>
      query.state.data && PAYOUT_IN_FLIGHT.has(query.state.data.status) ? PAYOUT_POLL_MS : false,
  });
}

/** Approve / retry move money and post ledger entries: everything that shows either. */
function useInvalidatePayouts() {
  const queryClient = useQueryClient();
  return (quarter: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: pluginFeesKeys.payout(quarter) }),
      queryClient.invalidateQueries({ queryKey: pluginFeesKeys.payouts }),
      queryClient.invalidateQueries({ queryKey: pluginFeesKeys.balances }),
      queryClient.invalidateQueries({ queryKey: pluginFeesKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: pluginFeesKeys.statementsAll }),
    ]);
}

/**
 * Prepare refetches the list and that quarter's report rather than caching the response:
 * the contract says it "returns the existing draft" without pinning the body's shape.
 */
export function usePreparePayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: preparePayout,
    ...NO_RETRY,
    onSettled: (_data, _error, quarter) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: pluginFeesKeys.payouts }),
        queryClient.invalidateQueries({ queryKey: pluginFeesKeys.payout(quarter) }),
        queryClient.invalidateQueries({ queryKey: pluginFeesKeys.dashboard }),
      ]),
  });
}

export function useApprovePayout() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidatePayouts();
  return useMutation({
    mutationFn: approvePayout,
    ...NO_RETRY,
    onSuccess: (report) => queryClient.setQueryData(pluginFeesKeys.payout(report.quarter), report),
    onSettled: (_data, _error, input) => invalidate(input.quarter),
  });
}

export function useRetryPayoutLine() {
  const invalidate = useInvalidatePayouts();
  return useMutation({
    mutationFn: retryPayoutLine,
    ...NO_RETRY,
    onSettled: (_data, _error, input) => invalidate(input.quarter),
  });
}

/* --- P6: admin overview, SEVC totals, adjustments, void --------------------- */

export function useDashboard(enabled = true) {
  return useQuery({
    queryKey: pluginFeesKeys.dashboard,
    queryFn: ({ signal }) => fetchDashboard(signal),
    enabled,
    staleTime: 30 * 1000,
  });
}

/** `null` disables the query (an invalid range). */
export function useSevcTotals(range: SevcTotalsRange | null) {
  return useQuery({
    queryKey: pluginFeesKeys.sevcTotals(range ?? { from: '', to: '' }),
    queryFn: ({ signal }) => fetchSevcTotals(range as SevcTotalsRange, signal),
    enabled: range !== null,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

export function useAdjustments(query: AdjustmentsQuery) {
  return useQuery({
    queryKey: pluginFeesKeys.adjustments(query),
    queryFn: ({ signal }) => fetchAdjustments(query, signal),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

/** An adjustment posts a ledger entry: every list, statement and balance that shows one. */
export function useCreateAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAdjustment,
    ...NO_RETRY,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: pluginFeesKeys.adjustmentsAll }),
        queryClient.invalidateQueries({ queryKey: pluginFeesKeys.statementsAll }),
        queryClient.invalidateQueries({ queryKey: pluginFeesKeys.balances }),
        queryClient.invalidateQueries({ queryKey: pluginFeesKeys.dashboard }),
        queryClient.invalidateQueries({ queryKey: pluginFeesKeys.connectMe }),
      ]),
  });
}

/**
 * Voiding cancels the charge and its retries and resolves its follow-ups; it never
 * touches the ledger, so balances are not refetched.
 */
export function useVoidInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: voidInvoice,
    ...NO_RETRY,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: pluginFeesKeys.paymentsAll }),
        queryClient.invalidateQueries({ queryKey: pluginFeesKeys.statementsAll }),
        queryClient.invalidateQueries({ queryKey: pluginFeesKeys.followUpsAll }),
        queryClient.invalidateQueries({ queryKey: pluginFeesKeys.dashboard }),
      ]),
  });
}

/* --- fee configuration (2026-10-03) ----------------------------------------- */

export function useFeeSchedule(enabled = true) {
  return useQuery({
    queryKey: pluginFeesKeys.feeSchedule,
    queryFn: ({ signal }) => fetchFeeSchedule(signal),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useBillingSettings(enabled = true) {
  return useQuery({
    queryKey: pluginFeesKeys.billingSettings,
    queryFn: ({ signal }) => fetchBillingSettings(signal),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useConfigHistory(enabled = true) {
  return useQuery({
    queryKey: pluginFeesKeys.configHistory,
    queryFn: ({ signal }) => fetchConfigHistory(signal),
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * A fee schedule write changes the schedule, the history, the agents' own `rates` in
 * `me/` and any cached cycle preview (it prices the next cycle).
 */
function useInvalidateFeeSchedule() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: pluginFeesKeys.feeSchedule }),
      queryClient.invalidateQueries({ queryKey: pluginFeesKeys.configHistory }),
      queryClient.invalidateQueries({ queryKey: pluginFeesKeys.me }),
      queryClient.invalidateQueries({ queryKey: pluginFeesKeys.cyclePreviewAll }),
    ]);
}

/** The response is the whole schedule: written into the cache, then refetched anyway. */
export function useScheduleFeeChange() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateFeeSchedule();
  return useMutation({
    mutationFn: scheduleFeeChange,
    ...NO_RETRY,
    onSuccess: (schedule) => queryClient.setQueryData(pluginFeesKeys.feeSchedule, schedule),
    onSettled: invalidate,
  });
}

export function useDeleteFeeRate() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateFeeSchedule();
  return useMutation({
    mutationFn: deleteFeeRate,
    ...NO_RETRY,
    onSuccess: (schedule) => queryClient.setQueryData(pluginFeesKeys.feeSchedule, schedule),
    onSettled: invalidate,
  });
}

/**
 * Billing settings feed the agent's own deadlines in `me/` (self-pay due day, the
 * assistant verification deadline), so `me/` refetches too.
 */
export function useUpdateBillingSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateBillingSettings,
    ...NO_RETRY,
    onSuccess: (settings) => queryClient.setQueryData(pluginFeesKeys.billingSettings, settings),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: pluginFeesKeys.billingSettings }),
        queryClient.invalidateQueries({ queryKey: pluginFeesKeys.configHistory }),
        queryClient.invalidateQueries({ queryKey: pluginFeesKeys.me }),
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
