/**
 * Who sees which plug-in fees surface, from `GET my-access/` (contract §1 and the §5
 * "who can do what" table). One definition shared by the route guards, the menu and the
 * pages, so the three never disagree. These decide rendering only — every endpoint
 * re-checks its own capability.
 */

import type { PluginFeesAccess } from '../types';

type Access = PluginFeesAccess | undefined | null;

/** `/plugin-fees/statement` and "My Plug-in Fees": an active MD or SMD. */
export const canSeeOwnStatement = (access: Access): boolean => Boolean(access?.is_billable);

/** `/admin/plugin-fees/review`: the Hierarchy Assistant. */
export const canSeeReviews = (access: Access): boolean => Boolean(access?.can_review);

/** `/admin/plugin-fees/cycles`: readers (`:review`, `:manage`) and the approver. */
export const canSeeCycles = (access: Access): boolean =>
  Boolean(access?.can_manage || access?.can_review || access?.can_approve_payouts);

/** The dry run (`cycles/preview/`) is `:manage` only. */
export const canPreviewCycles = (access: Access): boolean => Boolean(access?.can_manage);

/** `cycles/{month}/approve/` is `:payout_approve` only. */
export const canApproveCycles = (access: Access): boolean => Boolean(access?.can_approve_payouts);

/** `/admin/plugin-fees/agents/:id/statement`: `:review` or `:manage`. */
export const canSeeAgentStatements = (access: Access): boolean =>
  Boolean(access?.can_review || access?.can_manage);

/** `/admin/plugin-fees/costs`: `:manage`. */
export const canManageCosts = (access: Access): boolean => Boolean(access?.can_manage);

/* --- P4: collection (contract §6) ------------------------------------------ */

/** `/admin/plugin-fees/payments` (dashboard + follow-ups): `:manage` or `:review`. */
export const canSeePayments = (access: Access): boolean =>
  Boolean(access?.can_manage || access?.can_review);

/** `cycles/{month}/send/` is `:manage` only. */
export const canSendCycles = (access: Access): boolean => Boolean(access?.can_manage);

/** `follow-ups/{id}/resolve/` is `:manage` only; `:review` reads. */
export const canResolveFollowUps = (access: Access): boolean => Boolean(access?.can_manage);

/** `balances/`: `:manage`, `:review` or `:payout_approve` — the cycles page's audience. */
export const canSeeBalances = (access: Access): boolean =>
  Boolean(access?.can_manage || access?.can_review || access?.can_approve_payouts);

/* --- P5: payouts (contract §7) ---------------------------------------------- */

/** The "Get paid" panel on the own statement: an SMD (`me/connect/` is active SMDs only). */
export const canSetUpPayouts = (access: Access): boolean =>
  Boolean(access?.is_billable && access?.level_code === 'SMD');

/** `/admin/plugin-fees/payouts`: readers are `:manage`, `:review` and `:payout_approve`. */
export const canSeePayouts = (access: Access): boolean =>
  Boolean(access?.can_manage || access?.can_review || access?.can_approve_payouts);

/** `POST payouts/` (prepare) and `payouts/{q}/lines/{id}/retry/`: `:manage`. */
export const canPreparePayouts = (access: Access): boolean => Boolean(access?.can_manage);

/** `payouts/{q}/approve/`: `:payout_approve`. */
export const canApprovePayouts = (access: Access): boolean => Boolean(access?.can_approve_payouts);

/* --- P6: admin dashboard remainder (contract §8) ---------------------------- */

/** `/admin/plugin-fees` (overview, `dashboard/`): `:manage` or `:review`. */
export const canSeeOverview = (access: Access): boolean =>
  Boolean(access?.can_manage || access?.can_review);

/** `/admin/plugin-fees/sevc-totals` (`sevc-totals/`): `:manage` or `:review`. */
export const canSeeSevcTotals = (access: Access): boolean =>
  Boolean(access?.can_manage || access?.can_review);

/** `/admin/plugin-fees/adjustments`: `:manage` only — the Hierarchy Assistant cannot change ledgers. */
export const canManageAdjustments = (access: Access): boolean => Boolean(access?.can_manage);

/** `invoices/{id}/void/`: `:manage`. */
export const canVoidInvoices = (access: Access): boolean => Boolean(access?.can_manage);
