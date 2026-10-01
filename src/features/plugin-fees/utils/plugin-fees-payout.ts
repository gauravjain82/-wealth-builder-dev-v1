/**
 * P5 wording and helpers: Stripe Connect status, payout and payout-line status, Stripe
 * requirement paths in plain words, and quarters (`YYYY-Qn`). One definition shared by
 * the SMD's "Get paid" panel, the payouts page and the admin overview.
 * Wording and decisions: `docs/plugin-fees/UI.md` §2.5, §2.10 and PHASES PF34–PF41.
 */

import type { ConnectStatus, PayoutFailure, PayoutLineStatus, PayoutStatus } from '../types';
import { humanize } from './plugin-fees-format';
import type { PaymentTone } from './plugin-fees-payment';

interface Wording {
  label: string;
  tone: PaymentTone;
}

const CONNECT: Record<ConnectStatus, Wording> = {
  none: { label: 'Not set up', tone: 'neutral' },
  onboarding: { label: 'Setup started — finish it', tone: 'pending' },
  restricted: { label: 'Stripe needs more information', tone: 'rejected' },
  enabled: { label: 'Ready to receive payouts', tone: 'approved' },
};

export function connectStatusWording(status: string): Wording {
  return CONNECT[status as ConnectStatus] ?? { label: humanize(status), tone: 'neutral' };
}

/** The onboarding button's label for a status. */
export function connectActionLabel(status: string): string {
  if (status === 'none') return 'Set up payouts';
  if (status === 'enabled') return 'Update details';
  return 'Finish setup';
}

const PAYOUT: Record<PayoutStatus, Wording> = {
  draft: { label: 'Draft — awaiting approval', tone: 'pending' },
  approved: { label: 'Approved — queuing transfers', tone: 'info' },
  sending: { label: 'Sending', tone: 'info' },
  sent: { label: 'Sent', tone: 'approved' },
  partial: { label: 'Partly sent', tone: 'rejected' },
};

export function payoutStatusWording(status: string): Wording {
  return PAYOUT[status as PayoutStatus] ?? { label: humanize(status), tone: 'neutral' };
}

/** Transfers are still being made; the report is polled. */
export function isPayoutInFlight(status: string): boolean {
  return status === 'approved' || status === 'sending';
}

const LINE: Record<PayoutLineStatus, Wording> = {
  pending: { label: 'Pending', tone: 'pending' },
  held_no_connect: { label: 'Not onboarded — balance carries forward', tone: 'neutral' },
  sent: { label: 'Sent', tone: 'approved' },
  failed: { label: 'Failed', tone: 'rejected' },
};

export function payoutLineWording(status: string): Wording {
  return LINE[status as PayoutLineStatus] ?? { label: humanize(status), tone: 'neutral' };
}

/** A retry is offered for a failed or held line of a payout that is past draft. */
export function isLineRetryable(lineStatus: string, payoutStatus: string): boolean {
  return payoutStatus !== 'draft' && (lineStatus === 'failed' || lineStatus === 'held_no_connect');
}

export function describePayoutFailure(failure: PayoutFailure | null | undefined): string {
  if (!failure) return '—';
  if (typeof failure === 'string') return failure || '—';
  const code = failure.code ? humanize(failure.code) : '';
  const message = failure.message?.trim() ?? '';
  if (code && message && message.toLowerCase() !== code.toLowerCase()) return `${code} — ${message}`;
  return message || code || '—';
}

/** Stripe requirement paths most often due, in plain words. Anything else is humanised. */
const REQUIREMENT_LABEL: Record<string, string> = {
  'individual.verification.document': 'A photo ID',
  'individual.verification.additional_document': 'An additional identity document',
  'individual.id_number': 'Social Security number',
  'individual.ssn_last_4': 'Last 4 digits of your SSN',
  'individual.dob.day': 'Date of birth',
  'individual.dob.month': 'Date of birth',
  'individual.dob.year': 'Date of birth',
  'individual.address.line1': 'Home address',
  'individual.address.city': 'Home address',
  'individual.address.postal_code': 'Home address',
  'individual.address.state': 'Home address',
  'individual.phone': 'Phone number',
  'individual.email': 'Email address',
  'individual.first_name': 'Legal name',
  'individual.last_name': 'Legal name',
  external_account: 'Bank account for payouts',
  'business_profile.url': 'Business website or profile',
  'business_profile.mcc': 'Business type',
  'business_profile.product_description': 'Description of your business',
  'tos_acceptance.date': "Accept Stripe's terms",
  'tos_acceptance.ip': "Accept Stripe's terms",
  business_type: 'Business type',
};

/** `individual.verification.document` → "A photo ID"; unknown paths read "Verification document". */
export function requirementLabel(path: string): string {
  const known = REQUIREMENT_LABEL[path];
  if (known) return known;
  const last = path.split('.').filter(Boolean).pop() ?? path;
  return humanize(last);
}

/** The requirement list in plain words, duplicates folded ("Date of birth" once, not three times). */
export function humanizeRequirements(paths: string[]): string[] {
  return Array.from(new Set(paths.map(requirementLabel)));
}

/* --- quarters --------------------------------------------------------------- */

export const QUARTER_RE = /^(\d{4})-Q([1-4])$/;

/** The quarter containing a date, by its UTC calendar (the backend's, D5). */
export function quarterOf(date: Date): string {
  return `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
}

function shiftQuarter(value: string, by: number): string {
  const match = QUARTER_RE.exec(value);
  if (!match) return value;
  const index = Number(match[1]) * 4 + (Number(match[2]) - 1) + by;
  return `${Math.floor(index / 4)}-Q${(index % 4) + 1}`;
}

/** The most recently **ended** quarter: on 2026-10-01 that is `2026-Q3`. */
export function lastEndedQuarter(now = new Date()): string {
  return shiftQuarter(quarterOf(now), -1);
}

/** The `count` most recently ended quarters, newest first — the Prepare select's options. */
export function endedQuarters(count = 8, now = new Date()): string[] {
  const latest = lastEndedQuarter(now);
  return Array.from({ length: count }, (_, index) => shiftQuarter(latest, -index));
}

/** `2026-Q4` → `Q4 2026 (Oct–Dec)`. */
export function formatQuarter(value: string | null | undefined): string {
  if (!value) return '—';
  const match = QUARTER_RE.exec(value);
  if (!match) return value;
  const months = ['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec'][Number(match[2]) - 1];
  return `Q${match[2]} ${match[1]} (${months})`;
}
