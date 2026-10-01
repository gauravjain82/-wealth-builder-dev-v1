/**
 * Formatting, client-side file pre-checks and error messages for plug-in fees.
 *
 * The file checks are UX only — the backend sniffs the bytes and is the authority
 * (`file_type_invalid` / `file_size_invalid`).
 */

import { PluginFeesError } from '../services/plugin-fees-service';
import type { AssistantHours, Weekday } from '../types';

const MiB = 1024 * 1024;

export const LEASE_RULE = {
  accept: 'application/pdf,image/jpeg,image/png,image/webp',
  mimes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  maxBytes: 15 * MiB,
  label: 'PDF, JPEG, PNG or WebP, up to 15 MB',
};

export const PHOTO_RULE = {
  accept: 'image/jpeg,image/png,image/webp',
  mimes: ['image/jpeg', 'image/png', 'image/webp'],
  maxBytes: 10 * MiB,
  label: 'JPEG, PNG or WebP, up to 10 MB',
};

export type FileRule = typeof LEASE_RULE;

/** A message if `file` fails the client-side pre-check, else null. */
export function checkFile(file: File | null, rule: FileRule): string | null {
  if (!file) return 'Choose a file.';
  if (file.size === 0) return 'The file is empty.';
  if (file.size > rule.maxBytes) return `The file is too large (${rule.label}).`;
  if (file.type && !rule.mimes.includes(file.type)) return `Unsupported file type (${rule.label}).`;
  return null;
}

export const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
  { value: 'sun', label: 'Sunday' },
];

export function weekdayLabel(day: string): string {
  return WEEKDAYS.find((d) => d.value === day)?.label ?? day;
}

/** Integer cents as dollars. An absent amount is `—`, never `$0`. */
export function formatCents(cents: number | null | undefined): string {
  if (typeof cents !== 'number') return '—';
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}

const MINUS = '\u2212';

/**
 * Integer cents as dollars, always with cents: statements and reports show exact
 * amounts. A negative amount (a credit on an invoice, a debit on a ledger) is
 * `−$150.00` with a true minus sign. Absent → `—`, never `$0.00`.
 */
export function formatMoney(cents: number | null | undefined): string {
  if (typeof cents !== 'number') return '—';
  const text = (Math.abs(cents) / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return cents < 0 ? `${MINUS}${text}` : text;
}

/** As `formatMoney`, with an explicit `+` on a positive amount (ledger entries). */
export function formatSignedMoney(cents: number | null | undefined): string {
  if (typeof cents !== 'number') return '—';
  return cents > 0 ? `+${formatMoney(cents)}` : formatMoney(cents);
}

/**
 * A dollar amount typed by an admin → integer cents. Accepts `30`, `30.5`, `30.50`,
 * `1,200.00`; rejects negatives and more than two decimals. Blank → `null`.
 * Parsed as text, never through floating point, so `0.29` is exactly 29 cents.
 */
export function parseDollarsToCents(value: string): number | null | 'invalid' {
  const text = value.trim().replace(/[$,\s]/g, '');
  if (!text) return null;
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) return 'invalid';
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : 'invalid';
}

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  // Construct in local time: a `YYYY-MM-DD` date must not shift across a timezone.
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** `2026-10-31` → `Oct 31, 2026`. Absent → `—`. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = parseIsoDate(value);
  if (!date) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** ISO-8601 timestamp → local date and time. Absent → `—`. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** `2026-11` → `November 2026`. */
export function formatMonth(value: string | null | undefined): string {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/** `2026-12` → `Dec 2026`. */
export function formatMonthShort(value: string | null | undefined): string {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

/** The local calendar date of an ISO-8601 timestamp: `Nov 20, 2026`. Absent → `—`. */
export function formatTimestampDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** `YYYY-MM` of the month after today (the cycle being prepared). */
export function nextMonthValue(today = new Date()): string {
  const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
}

/** Today as `YYYY-MM-DD`, local time. */
export function todayValue(today = new Date()): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;
}

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** The month after a `YYYY-MM-DD` date, by name: `2026-10-31` → `November`. */
export function monthAfter(value: string): string | null {
  const date = parseIsoDate(value);
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth() + 1, 1).toLocaleDateString('en-US', {
    month: 'long',
  });
}

export function humanize(value: string): string {
  const text = value.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const CODE_MESSAGES: Record<string, string> = {
  file_type_invalid: 'That file type is not allowed.',
  file_size_invalid: 'That file is empty or too large.',
  already_pending: 'You already have a pending submission. Withdraw it first.',
  not_eligible: 'Your account is not eligible for this.',
  not_withdrawable: 'This submission can no longer be withdrawn.',
  stripe_unavailable: 'Payments are temporarily unavailable. Please try again shortly.',
  forbidden: 'You do not have access to this.',
  note_required: 'A note is required to reject.',
  not_pending: 'This submission was already decided.',
  not_decidable: 'This submission was already decided.',
  validation_error: 'Please correct the highlighted fields.',
  not_awaiting_approval: 'This cycle is no longer awaiting approval.',
  not_found: 'That cycle has not been generated.',
  already_applied: 'This cost was already netted into a cycle and cannot be deleted.',
  not_payable: 'This invoice can no longer be paid here — it may already be paid.',
  already_resolved: 'This follow-up was already resolved.',
  not_approved: 'This cycle has not been approved yet, so nothing can be sent.',
  quarter_not_ended: 'That quarter has not ended yet, so its payout cannot be prepared.',
  not_draft: 'This payout is no longer a draft — it was already approved.',
  not_retryable: 'This payout line can no longer be retried.',
  not_voidable: 'This invoice can no longer be voided — it may be paid or processing.',
};

/**
 * A user-facing message for a failed request. The backend's `detail` is preferred; the
 * `code` map is the fallback for an empty detail.
 */
export function describeError(error: unknown, fallback: string): string {
  if (error instanceof PluginFeesError) {
    const detail = error.message && !error.message.startsWith('Request failed') ? error.message : '';
    return detail || (error.code && CODE_MESSAGES[error.code]) || fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Per-field messages from a `validation_error`, joined for display. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof PluginFeesError) || !error.fields) return {};
  const out: Record<string, string> = {};
  for (const [field, messages] of Object.entries(error.fields)) {
    out[field] = Array.isArray(messages) ? messages.join(' ') : String(messages);
  }
  return out;
}

/** True for the "someone already decided this" conflicts. */
export function isAlreadyDecided(error: unknown): boolean {
  return error instanceof PluginFeesError && error.status === 409;
}

/* --- assistant hours ------------------------------------------------------- */

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Contract rules for `hours`: at least one row, `HH:MM` 24-hour, `start < end`.
 * A message per invalid row index, plus a whole-editor message; empty when valid.
 */
export function validateHours(hours: AssistantHours[]): { rows: Record<number, string>; form?: string } {
  const rows: Record<number, string> = {};
  if (!hours.length) return { rows, form: 'Add at least one day.' };
  hours.forEach((row, index) => {
    if (!TIME_RE.test(row.start) || !TIME_RE.test(row.end)) {
      rows[index] = 'Enter start and end times.';
    } else if (row.start >= row.end) {
      // `HH:MM` strings compare correctly as text.
      rows[index] = 'Start must be before end.';
    }
  });
  return { rows };
}

/* --- CSV export ------------------------------------------------------------ */

function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  // Quote anything with a delimiter, quote or newline; neutralise spreadsheet formulas.
  const safe = /^[=+\-@]/.test(text) && typeof value === 'string' ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: (string | number | boolean | null | undefined)[][]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

/** Hands the browser a CSV file to save. Client-side only — no request is made. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
