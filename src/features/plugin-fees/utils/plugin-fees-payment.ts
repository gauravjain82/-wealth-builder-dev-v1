/**
 * The P4 payment state of an invoice, in words (contract §6). One definition shared by
 * the agent's statement and the admin payments dashboard, so the two never disagree.
 * Wording and decisions: `docs/plugin-fees/UI.md` §2.9 and PHASES PF24–PF26.
 */

import type { InvoicePaymentState, PaidVia, PaymentFailure } from '../types';
import { formatDate, formatTimestampDate, humanize } from './plugin-fees-format';

/** Whose screen: the agent's own statement, or an admin looking at someone else's. */
export type PaymentAudience = 'own' | 'admin';

/** Badge tones understood by `StatusBadge`. */
export type PaymentTone = 'info' | 'neutral' | 'pending' | 'approved' | 'rejected';

export interface PaymentDescription {
  /** Short badge text. */
  badge: string;
  tone: PaymentTone;
  /** The sentence under the badge, e.g. "Payment failed — retrying on Nov 9, 2026". */
  headline: string | null;
  /** A self-pay invoice past its due date and not paid. */
  overdue: boolean;
  /** An automatic invoice that has failed at least once and is still open. */
  retrying: boolean;
}

/**
 * Today as `YYYY-MM-DD` in **UTC**: the backend computes due dates and retries in UTC
 * (D5), so "overdue" is judged on the same calendar.
 */
export function todayUtc(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Past `due_date`, not paid. Dashboard rows carry the backend's `overdue` flag (contract
 * §6.1), which wins; statement invoices do not, so it is computed there on the same UTC
 * calendar. `YYYY-MM-DD` strings compare correctly as text.
 */
export function isOverdue(
  state: InvoicePaymentState & { overdue?: boolean },
  today = todayUtc()
): boolean {
  if (typeof state.overdue === 'boolean') return state.overdue;
  return (
    state.collection === 'self_pay' &&
    state.status === 'open' &&
    Boolean(state.due_date) &&
    (state.due_date as string) < today
  );
}

export function isRetrying(state: InvoicePaymentState): boolean {
  return state.collection === 'automatic' && state.status === 'open' && state.attempts >= 1;
}

const PAID_VIA_LABEL: Record<PaidVia, string> = {
  automatic: 'Automatic charge',
  retry: 'Automatic retry',
  self_pay: 'Payment link',
  pay_now: 'Pay now',
  klarna: 'Klarna (pay over time)',
};

export function paidViaLabel(value: PaidVia | string | null | undefined): string {
  if (!value) return '—';
  return PAID_VIA_LABEL[value as PaidVia] ?? humanize(value);
}

export function collectionLabel(value: string | null | undefined): string {
  if (value === 'automatic') return 'Automatic';
  if (value === 'self_pay') return 'Self-pay';
  return value ? humanize(value) : '—';
}

/** Stripe failure / decline codes in plain words; anything else is humanised. */
const FAILURE_CODE_LABEL: Record<string, string> = {
  insufficient_funds: 'Insufficient funds',
  card_declined: 'Card declined',
  generic_decline: 'Declined by the bank',
  expired_card: 'Card expired',
  incorrect_cvc: 'Incorrect security code',
  processing_error: 'Processing error',
  authentication_required: 'Bank authentication required',
  do_not_honor: 'Declined by the bank',
  lost_card: 'Card reported lost',
  stolen_card: 'Card reported stolen',
  account_closed: 'Bank account closed',
  no_account: 'Bank account not found',
  debit_not_authorized: 'Debit not authorised by the account holder',
  invalid_account_number: 'Invalid bank account number',
  no_payment_method: 'No saved payment method',
  payment_method_missing: 'No saved payment method',
  dispute: 'Payment disputed',
  reversed: 'Payment reversed',
};

export function failureCodeLabel(code: string | null | undefined): string {
  if (!code) return '—';
  return FAILURE_CODE_LABEL[code] ?? humanize(code);
}

/** "Card declined — Your card was declined." (message omitted when it repeats the label). */
export function describeFailure(failure: PaymentFailure | null | undefined): string {
  if (!failure) return '—';
  const label = failureCodeLabel(failure.code);
  const message = failure.message?.trim();
  return message && message.toLowerCase() !== label.toLowerCase() ? `${label} — ${message}` : label;
}

export function describePayment(
  state: InvoicePaymentState,
  audience: PaymentAudience,
  today = todayUtc()
): PaymentDescription {
  const overdue = isOverdue(state, today);
  const retrying = isRetrying(state);
  const base = { overdue, retrying };

  switch (state.status) {
    case 'draft':
      return { ...base, badge: 'Scheduled', tone: 'info', headline: 'Not sent yet' };
    case 'no_charge':
      return { ...base, badge: 'Nothing to pay', tone: 'neutral', headline: null };
    case 'open':
      if (state.collection === 'self_pay') {
        if (overdue) {
          return {
            ...base,
            badge: 'Overdue',
            tone: 'rejected',
            headline: `Was due by ${formatDate(state.due_date)}`,
          };
        }
        return {
          ...base,
          badge: 'Due',
          tone: 'pending',
          headline: state.due_date ? `Due by ${formatDate(state.due_date)}` : 'Due',
        };
      }
      if (retrying) {
        return {
          ...base,
          badge: 'Retrying',
          tone: 'pending',
          headline: state.next_retry_on
            ? `Payment failed — retrying on ${formatDate(state.next_retry_on)}`
            : 'Payment failed — a retry is pending',
        };
      }
      return { ...base, badge: 'Charge scheduled', tone: 'info', headline: 'Charge scheduled' };
    case 'processing':
      return {
        ...base,
        badge: 'Processing',
        tone: 'info',
        headline: 'Bank payment in progress — settles in about 4 business days',
      };
    case 'paid':
      return {
        ...base,
        badge: 'Paid',
        tone: 'approved',
        headline: state.paid_at
          ? `Paid ${formatTimestampDate(state.paid_at)}${state.paid_via ? ` · ${paidViaLabel(state.paid_via)}` : ''}`
          : null,
      };
    case 'failed':
      return {
        ...base,
        badge: 'Failed',
        tone: 'rejected',
        headline:
          audience === 'own'
            ? 'Payment failed — please pay now'
            : 'Payment failed — the agent can still pay now',
      };
    case 'void':
      return { ...base, badge: 'Void', tone: 'neutral', headline: null };
    default:
      return { ...base, badge: humanize(String(state.status)), tone: 'neutral', headline: null };
  }
}

/** Contract §8: only these can be voided; `paid` and `processing` answer `409 not_voidable`. */
const VOIDABLE: ReadonlySet<string> = new Set(['draft', 'open', 'failed']);

export function isVoidable(status: string): boolean {
  return VOIDABLE.has(status);
}
