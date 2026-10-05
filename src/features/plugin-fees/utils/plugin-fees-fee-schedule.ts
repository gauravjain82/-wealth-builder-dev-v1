/**
 * Wording and lookups for the fee configuration screen (2026-10-03): the four fee cells
 * (MD / SMD × with / without an approved office), their labels, the upcoming prices of a
 * cell, and the change-history values. Display only — the backend owns every rule.
 */

import type { FeeLevelCode, FeeMatrixCell, FeeRate, FeeSchedule } from '../types';
import { formatDate, formatMoney, formatMonthShort, humanize } from './plugin-fees-format';

/** The levels the backend bills; falls back to MD and SMD for an empty list. */
export function billedLevels(schedule: FeeSchedule): FeeLevelCode[] {
  return schedule.billed_levels.length ? schedule.billed_levels : ['MD', 'SMD'];
}

/** The two office columns, in display order. */
export const OFFICE_COLUMNS: { withOffice: boolean; label: string }[] = [
  { withOffice: true, label: 'With approved office' },
  { withOffice: false, label: 'Without office' },
];

/** A stable key for one cell, for form state and field errors: `MD:office`. */
export function cellKey(level: FeeLevelCode, withOffice: boolean): string {
  return `${level}:${withOffice ? 'office' : 'no-office'}`;
}

/** `MD · with approved office`. */
export function cellLabel(level: FeeLevelCode, withOffice: boolean): string {
  return `${level} · ${withOffice ? 'with approved office' : 'without office'}`;
}

export function findCell(schedule: FeeSchedule, level: FeeLevelCode, withOffice: boolean): FeeMatrixCell | null {
  return schedule.matrix.find((cell) => cell.level_code === level && cell.with_office === withOffice) ?? null;
}

/** `2026-12-01` → `Dec 2026`. */
export function effectiveMonthLabel(effectiveFrom: string): string {
  return formatMonthShort(effectiveFrom.slice(0, 7));
}

/**
 * Prices of a cell that are not in force yet, earliest first: the next cycle's price when
 * it differs from the current one, then every scheduled price (each once).
 */
export function upcomingRates(cell: FeeMatrixCell): FeeRate[] {
  const out: FeeRate[] = [];
  const seen = new Set<number>();
  const add = (rate: FeeRate | null) => {
    if (!rate || seen.has(rate.id) || rate.id === cell.current?.id) return;
    seen.add(rate.id);
    out.push(rate);
  };
  add(cell.next_cycle);
  cell.scheduled.forEach(add);
  return out.sort((a, b) => a.effective_from.localeCompare(b.effective_from));
}

/** Scheduled prices across the table (not yet started), earliest first. */
export function scheduledRates(schedule: FeeSchedule): FeeRate[] {
  return schedule.rows
    .filter((rate) => !rate.started)
    .sort((a, b) => a.effective_from.localeCompare(b.effective_from) || a.level_code.localeCompare(b.level_code));
}

/** Where a row of the full history stands: in force, superseded, or scheduled. */
export function rateStanding(schedule: FeeSchedule, rate: FeeRate): 'in_force' | 'superseded' | 'scheduled' {
  if (!rate.started) return 'scheduled';
  return schedule.matrix.some((cell) => cell.current?.id === rate.id) ? 'in_force' : 'superseded';
}

/* --- change history -------------------------------------------------------- */

const FIELD_LABELS: Record<string, string> = {
  amount_cents: 'Price',
  effective_from: 'Effective from',
  level_code: 'Level',
  with_office: 'With office',
  go_live_month: 'Go-live month',
  self_pay_due_day: 'Self-pay due day',
  reverify_window_days: 'Re-verification window (days)',
  assistant_verification_deadline: 'Assistant verification deadline',
  submission_min_level: 'Office & assistant from level',
};

export function historyFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? humanize(field);
}

/**
 * One old/new value of a history change, worded: cents fields as dollars, dates as
 * dates, booleans as Yes/No, absent as `—`.
 */
export function formatHistoryValue(field: string, value: unknown): string {
  if (field === 'submission_min_level' && value === null) return 'Default';
  if (value === null || value === undefined || value === '') return '—';
  if (field.endsWith('_cents') && typeof value === 'number') return formatMoney(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value);
  if (typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)) return formatMonthShort(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
