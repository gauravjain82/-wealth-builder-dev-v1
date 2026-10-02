/**
 * The read side of the fee schedule (`GET fee-schedule/`): the 2×2 fee table with the
 * prices still to come, the scheduled changes (with Remove for `:manage`, which needs a
 * reason and only works before the price starts) and the full price history. Every
 * write answers the whole schedule, which the hooks put straight into the cache.
 */

import { useEffect, useState } from 'react';

import { Button, ConfirmationDialog, Textarea } from '@/shared/components';
import { useToastStore } from '@/store';

import { useDeleteFeeRate } from '../../hooks/use-plugin-fees';
import { PluginFeesError } from '../../services/plugin-fees-service';
import type { FeeRate, FeeSchedule } from '../../types';
import { describeError, formatDate, formatDateTime, formatMoney } from '../../utils/plugin-fees-format';
import {
  billedLevels,
  cellLabel,
  effectiveMonthLabel,
  findCell,
  OFFICE_COLUMNS,
  rateStanding,
  scheduledRates,
  upcomingRates,
} from '../../utils/plugin-fees-fee-schedule';

/** Current price per level × office, each with its upcoming prices beneath. */
export function FeeTable({ schedule }: { schedule: FeeSchedule }) {
  return (
    <div className="wb-pf-table-wrap">
      <table className="wb-pf-table">
        <thead>
          <tr>
            <th scope="col">Level</th>
            {OFFICE_COLUMNS.map((column) => (
              <th key={String(column.withOffice)} scope="col" className="wb-pf-num">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {billedLevels(schedule).map((level) => (
            <tr key={level}>
              <th scope="row">{level}</th>
              {OFFICE_COLUMNS.map((column) => {
                const cell = findCell(schedule, level, column.withOffice);
                const upcoming = cell ? upcomingRates(cell) : [];
                return (
                  <td key={String(column.withOffice)} className="wb-pf-num">
                    <strong>{cell?.current ? formatMoney(cell.current.amount_cents) : 'Not set'}</strong>
                    {upcoming.map((rate) => (
                      <span key={rate.id} className="wb-pf-muted" style={{ display: 'block' }}>
                        From {effectiveMonthLabel(rate.effective_from)}: {formatMoney(rate.amount_cents)}
                      </span>
                    ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RemoveRateDialog({
  rate,
  loading,
  onConfirm,
  onClose,
}: {
  rate: FeeRate | null;
  loading: boolean;
  onConfirm: (reason: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (rate) setReason('');
  }, [rate]);

  return (
    <ConfirmationDialog
      open={rate !== null}
      title="Remove scheduled price"
      message={
        rate
          ? `Remove the ${formatMoney(rate.amount_cents)} price for ${cellLabel(
              rate.level_code,
              rate.with_office
            )} from ${effectiveMonthLabel(rate.effective_from)}? The price before it stays in force.`
          : ''
      }
      confirmText="Remove"
      confirmDisabled={!reason.trim()}
      loading={loading}
      onConfirm={() => onConfirm(reason.trim())}
      onClose={onClose}
    >
      <label className="block space-y-1 text-sm">
        <span className="text-slate-700 dark:text-white/80">Reason (required)</span>
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          required
          aria-required="true"
          disabled={loading}
        />
      </label>
    </ConfirmationDialog>
  );
}

/** Prices not yet in force. `canManage` adds Remove. */
export function ScheduledChanges({ schedule, canManage }: { schedule: FeeSchedule; canManage: boolean }) {
  const { addToast } = useToastStore();
  const remove = useDeleteFeeRate();
  const [removing, setRemoving] = useState<FeeRate | null>(null);
  const rates = scheduledRates(schedule);

  const onRemove = async (reason: string) => {
    if (!removing) return;
    try {
      await remove.mutateAsync({ id: removing.id, reason });
      addToast({ type: 'success', message: 'Scheduled price removed.' });
      setRemoving(null);
    } catch (error) {
      if (error instanceof PluginFeesError && (error.status === 409 || error.status === 404)) {
        // `rate_started` / `cycle_exists` / `not_found`: the schedule moved on; it refetches.
        addToast({ type: 'warning', message: describeError(error, 'This price can no longer be removed.') });
        setRemoving(null);
      } else {
        addToast({ type: 'error', message: describeError(error, 'Failed to remove the scheduled price.') });
      }
    }
  };

  if (!rates.length) return <p className="wb-pf-muted">No price changes are scheduled.</p>;
  return (
    <>
      <div className="wb-pf-table-wrap">
        <table className="wb-pf-table wb-pf-table--dense">
          <thead>
            <tr>
              <th scope="col">From</th>
              <th scope="col">Fee</th>
              <th scope="col" className="wb-pf-num">
                Price
              </th>
              <th scope="col">Note</th>
              <th scope="col">Scheduled by</th>
              {canManage ? (
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rates.map((rate) => (
              <tr key={rate.id}>
                <td>{effectiveMonthLabel(rate.effective_from)}</td>
                <td>{cellLabel(rate.level_code, rate.with_office)}</td>
                <td className="wb-pf-num">{formatMoney(rate.amount_cents)}</td>
                <td>{rate.note ? <span className="wb-pf-note-cell">{rate.note}</span> : '—'}</td>
                <td>
                  {rate.created_by_name || '—'}
                  <span className="wb-pf-muted" style={{ display: 'block' }}>
                    {formatDateTime(rate.created_at)}
                  </span>
                </td>
                {canManage ? (
                  <td>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => setRemoving(rate)}
                      disabled={remove.isPending}
                    >
                      Remove
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <RemoveRateDialog
        rate={removing}
        loading={remove.isPending}
        onConfirm={onRemove}
        onClose={() => setRemoving(null)}
      />
    </>
  );
}

const STANDING_LABEL = { in_force: 'In force', superseded: 'Superseded', scheduled: 'Scheduled' } as const;

/** Every price ever set, newest `effective_from` first (the server's order), collapsed. */
export function PriceHistory({ schedule }: { schedule: FeeSchedule }) {
  if (!schedule.rows.length) return <p className="wb-pf-muted">No prices have been set.</p>;
  return (
    <details className="wb-pf-history">
      <summary>Price history ({schedule.rows.length})</summary>
      <div className="wb-pf-table-wrap">
        <table className="wb-pf-table wb-pf-table--dense">
          <thead>
            <tr>
              <th scope="col">Effective from</th>
              <th scope="col">Fee</th>
              <th scope="col" className="wb-pf-num">
                Price
              </th>
              <th scope="col">Status</th>
              <th scope="col">Note</th>
              <th scope="col">Set by</th>
            </tr>
          </thead>
          <tbody>
            {schedule.rows.map((rate) => (
              <tr key={rate.id}>
                <td>{formatDate(rate.effective_from)}</td>
                <td>{cellLabel(rate.level_code, rate.with_office)}</td>
                <td className="wb-pf-num">{formatMoney(rate.amount_cents)}</td>
                <td>{STANDING_LABEL[rateStanding(schedule, rate)]}</td>
                <td>{rate.note ? <span className="wb-pf-note-cell">{rate.note}</span> : '—'}</td>
                <td>
                  {rate.created_by_name || '—'}
                  <span className="wb-pf-muted" style={{ display: 'block' }}>
                    {formatDateTime(rate.created_at)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
