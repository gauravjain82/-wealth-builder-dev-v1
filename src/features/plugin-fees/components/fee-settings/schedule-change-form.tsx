/**
 * Schedule a price change (`POST fee-schedule/`, `:manage`). The month starts at
 * `earliest_effective_from` (also its minimum); the four dollar inputs start at the next
 * cycle's prices and are parsed as text into integer cents (never through floating
 * point). Only the prices that differ from the next cycle's are sent — the others keep
 * their price — so with nothing changed the submit stays disabled. A confirmation lists
 * old → new per changed price and the month. `validation_error` fields
 * (`effective_from`, `rates`, `rates[i].amount_cents`, `reason`), `reason_required` and
 * `effective_from_not_future` map onto the inputs; `cycle_exists` / `conflict` (409) show
 * the server's `detail`.
 */

import { useState, type FormEvent } from 'react';

import { Button, ConfirmationDialog, Input, Textarea } from '@/shared/components';
import { useToastStore } from '@/store';

import { useScheduleFeeChange } from '../../hooks/use-plugin-fees';
import { PluginFeesError } from '../../services/plugin-fees-service';
import type { FeeLevelCode, FeeRateInput, FeeSchedule } from '../../types';
import {
  centsToDollarText,
  describeError,
  fieldErrors,
  formatMoney,
  formatMonth,
  MONTH_RE,
  parseDollarsToCents,
} from '../../utils/plugin-fees-format';
import {
  billedLevels,
  cellKey,
  cellLabel,
  findCell,
  OFFICE_COLUMNS,
} from '../../utils/plugin-fees-fee-schedule';

interface Cell {
  key: string;
  level: FeeLevelCode;
  withOffice: boolean;
  /** The next cycle's price — the baseline a change is measured against. */
  baseline: number | null;
}

function cellsOf(schedule: FeeSchedule): Cell[] {
  return billedLevels(schedule).flatMap((level) =>
    OFFICE_COLUMNS.map((column) => ({
      key: cellKey(level, column.withOffice),
      level,
      withOffice: column.withOffice,
      baseline: findCell(schedule, level, column.withOffice)?.next_cycle?.amount_cents ?? null,
    }))
  );
}

function initialAmounts(cells: Cell[]): Record<string, string> {
  return Object.fromEntries(cells.map((cell) => [cell.key, centsToDollarText(cell.baseline)]));
}

/** `rates[2].amount_cents` / `rates[2]` → the key of the cell that was sent third. */
function mapRateErrors(byField: Record<string, string>, sent: FeeRateInput[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [field, message] of Object.entries(byField)) {
    const match = /^rates\[(\d+)\]/.exec(field);
    const rate = match ? sent[Number(match[1])] : undefined;
    if (rate) out[cellKey(rate.level_code, rate.with_office)] = message;
    else out[field] = message;
  }
  return out;
}

interface Pending {
  effectiveFrom: string;
  reason: string;
  rates: FeeRateInput[];
}

export function ScheduleChangeForm({ schedule }: { schedule: FeeSchedule }) {
  const { addToast } = useToastStore();
  const create = useScheduleFeeChange();
  const cells = cellsOf(schedule);
  const minMonth = schedule.earliest_effective_from.slice(0, 7);
  const [month, setMonth] = useState(minMonth);
  const [amounts, setAmounts] = useState<Record<string, string>>(() => initialAmounts(cells));
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Pending | null>(null);

  const parsed = cells.map((cell) => ({ cell, cents: parseDollarsToCents(amounts[cell.key] ?? '') }));
  const changed = parsed.filter(
    (item): item is { cell: Cell; cents: number } =>
      typeof item.cents === 'number' && item.cents !== item.cell.baseline
  );

  const validate = (): Record<string, string> => {
    const out: Record<string, string> = {};
    if (!MONTH_RE.test(month)) out.effective_from = 'Choose the month the new prices start.';
    // `YYYY-MM` strings compare correctly as text.
    else if (month < minMonth) out.effective_from = `The earliest possible month is ${formatMonth(minMonth)}.`;
    for (const { cell, cents } of parsed) {
      if (cents === 'invalid') out[cell.key] = 'Enter dollars, at most two decimals, not negative.';
      else if (cents === null && cell.baseline !== null) out[cell.key] = 'Enter a price.';
    }
    if (!changed.length) out.rates = 'Change at least one price.';
    if (!reason.trim()) out.reason = 'A reason is required — say why.';
    return out;
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    setConfirming({
      effectiveFrom: month,
      reason: reason.trim(),
      rates: changed.map(({ cell, cents }) => ({
        level_code: cell.level,
        with_office: cell.withOffice,
        amount_cents: cents,
      })),
    });
  };

  const onConfirm = async () => {
    if (!confirming) return;
    try {
      const next = await create.mutateAsync({
        effective_from: confirming.effectiveFrom,
        reason: confirming.reason,
        rates: confirming.rates,
      });
      addToast({
        type: 'success',
        message: `New prices scheduled from ${formatMonth(confirming.effectiveFrom)}.`,
      });
      setConfirming(null);
      setReason('');
      setErrors({});
      setAmounts(initialAmounts(cellsOf(next)));
      setMonth(next.earliest_effective_from.slice(0, 7));
    } catch (error) {
      const sent = confirming.rates;
      setConfirming(null);
      const byField = mapRateErrors(fieldErrors(error), sent);
      if (error instanceof PluginFeesError) {
        if (error.code === 'reason_required') byField.reason = 'A reason is required.';
        if (error.code === 'effective_from_not_future') {
          byField.effective_from = describeError(error, 'Choose a future month.');
        }
      }
      setErrors(byField);
      const message = describeError(error, 'Failed to schedule the price change.');
      setFormError(message);
      addToast({ type: error instanceof PluginFeesError && error.status === 409 ? 'warning' : 'error', message });
    }
  };

  const err = (key: string) =>
    errors[key] ? (
      <span className="wb-pf-field-error" role="alert">
        {errors[key]}
      </span>
    ) : null;

  const baselineOf = (rate: FeeRateInput) =>
    cells.find((cell) => cell.level === rate.level_code && cell.withOffice === rate.with_office)?.baseline ?? null;

  return (
    <form className="wb-pf-stack" onSubmit={onSubmit} noValidate>
      <div className="wb-pf-form-grid">
        <label className="wb-pf-field">
          <span className="wb-pf-field-label">Effective from (1st of the month) *</span>
          <Input
            type="month"
            value={month}
            min={minMonth}
            onChange={(event) => setMonth(event.target.value)}
            placeholder="YYYY-MM"
            aria-invalid={Boolean(errors.effective_from)}
            disabled={create.isPending}
          />
          {err('effective_from')}
        </label>
        <div className="wb-pf-field">
          <span className="wb-pf-field-label">Next cycle</span>
          <span className="wb-pf-detail-value">{formatMonth(schedule.next_cycle_month)}</span>
        </div>

        {cells.map((cell) => {
          const cents = parseDollarsToCents(amounts[cell.key] ?? '');
          const isChanged = typeof cents === 'number' && cents !== cell.baseline;
          return (
            <label key={cell.key} className="wb-pf-field">
              <span className="wb-pf-field-label">{cellLabel(cell.level, cell.withOffice)} ($)</span>
              <Input
                inputMode="decimal"
                value={amounts[cell.key] ?? ''}
                onChange={(event) => setAmounts((current) => ({ ...current, [cell.key]: event.target.value }))}
                placeholder="0.00"
                aria-invalid={Boolean(errors[cell.key])}
                disabled={create.isPending}
              />
              {err(cell.key)}
              <span className="wb-pf-muted" aria-live="polite">
                Next cycle: {formatMoney(cell.baseline)}
                {isChanged ? ` → ${formatMoney(cents)}` : ''}
              </span>
            </label>
          );
        })}

        <label className="wb-pf-field wb-pf-span-2">
          <span className="wb-pf-field-label">Reason * — recorded in the change history</span>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            placeholder="e.g. 2027 price increase approved by the board"
            aria-invalid={Boolean(errors.reason)}
            disabled={create.isPending}
          />
          {err('reason')}
        </label>
      </div>

      {err('rates')}
      {formError ? (
        <div className="wb-pf-form-error" role="alert">
          {formError}
        </div>
      ) : null}
      <div className="wb-pf-row">
        <Button type="submit" disabled={create.isPending || !changed.length}>
          {create.isPending ? 'Scheduling…' : 'Schedule change…'}
        </Button>
        {!changed.length ? <span className="wb-pf-muted">Change at least one price.</span> : null}
      </div>

      <ConfirmationDialog
        open={confirming !== null}
        title="Schedule a price change"
        message={
          confirming
            ? `From ${formatMonth(confirming.effectiveFrom)} these prices change. Prices not listed keep their price. A price already scheduled for that month is replaced.`
            : ''
        }
        confirmText="Schedule change"
        confirmVariant="default"
        loading={create.isPending}
        onConfirm={onConfirm}
        onClose={() => setConfirming(null)}
      >
        {confirming ? (
          <dl className="wb-pf-summary-list">
            {confirming.rates.map((rate) => (
              <div key={cellKey(rate.level_code, rate.with_office)}>
                <dt>{cellLabel(rate.level_code, rate.with_office)}</dt>
                <dd>
                  {formatMoney(baselineOf(rate))} → {formatMoney(rate.amount_cents)}
                </dd>
              </div>
            ))}
            <div>
              <dt>Effective from</dt>
              <dd>{formatMonth(confirming.effectiveFrom)}</dd>
            </div>
            <div>
              <dt>Reason</dt>
              <dd>{confirming.reason}</dd>
            </div>
          </dl>
        ) : null}
      </ConfirmationDialog>
    </form>
  );
}
