/**
 * Admin quarterly payouts (P5, contract §7). Route `/admin/plugin-fees/payouts`, guarded
 * on `can_manage || can_review || can_approve_payouts`. Lists `GET payouts/`; `:manage`
 * prepares a finished quarter's draft (`POST payouts/`) and retries a failed or held line;
 * `:payout_approve` approves a draft, which sends the Stripe transfers. While a report is
 * `approved` or `sending` it is polled every 5 s until `sent` or `partial`.
 *
 * The open report lives in the URL (`?quarter=YYYY-Qn`) so returning from an agent's
 * statement restores it. Screens and states: `docs/plugin-fees/UI.md` §2.10.
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button, ErrorState, Heading, NonIdealState, Select, Text } from '@/shared/components';
import { useToastStore } from '@/store';

import {
  useApprovePayout,
  usePayoutReport,
  usePayouts,
  usePluginFeesAccess,
  usePreparePayout,
  useRetryPayoutLine,
} from '../hooks/use-plugin-fees';
import { PayoutReportView, PayoutStatusBadge } from '../components/payouts/payout-report';
import { PluginFeesError } from '../services/plugin-fees-service';
import type { PayoutLine } from '../types';
import {
  canApprovePayouts,
  canPreparePayouts,
  canSeeAgentStatements,
} from '../utils/plugin-fees-access';
import { describeError, formatDate, formatDateTime, formatMoney, isAlreadyDecided } from '../utils/plugin-fees-format';
import { endedQuarters, formatQuarter, lastEndedQuarter, QUARTER_RE } from '../utils/plugin-fees-payout';
import '../components/plugin-fees.css';

export default function PluginFeesPayoutsPage() {
  const { addToast } = useToastStore();
  const { data: access } = usePluginFeesAccess();
  const canPrepare = canPreparePayouts(access);
  const canApprove = canApprovePayouts(access);
  const canOpenStatement = canSeeAgentStatements(access);

  const [searchParams, setSearchParams] = useSearchParams();
  const paramQuarter = searchParams.get('quarter');
  const quarter = paramQuarter && QUARTER_RE.test(paramQuarter) ? paramQuarter : null;

  const [quarterInput, setQuarterInput] = useState(() => lastEndedQuarter());
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const payouts = usePayouts();
  const report = usePayoutReport(quarter);
  const prepare = usePreparePayout();
  const approve = useApprovePayout();
  const retry = useRetryPayoutLine();

  const openQuarter = (next: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('quarter', next);
    setSearchParams(params);
  };

  const onPrepare = async () => {
    try {
      const prepared = quarterInput;
      await prepare.mutateAsync(prepared);
      addToast({
        type: 'success',
        message: `${formatQuarter(prepared)} payout report is ready for review.`,
      });
      openQuarter(prepared);
    } catch (error) {
      if (error instanceof PluginFeesError && error.code === 'quarter_not_ended') {
        addToast({
          type: 'warning',
          message: describeError(error, `${formatQuarter(quarterInput)} has not ended yet.`),
        });
        return;
      }
      addToast({ type: 'error', message: describeError(error, 'Failed to prepare the payout report.') });
    }
  };

  const onApprove = async (note: string): Promise<boolean> => {
    if (!quarter) return false;
    try {
      await approve.mutateAsync({ quarter, note });
      addToast({
        type: 'success',
        message: `${formatQuarter(quarter)} payout approved. Transfers are being sent.`,
      });
      return true;
    } catch (error) {
      if (isAlreadyDecided(error)) {
        // `not_draft`: someone else approved it; the report refetches on settle.
        addToast({ type: 'warning', message: describeError(error, 'This payout is no longer a draft.') });
        void report.refetch();
        return true;
      }
      addToast({
        type: 'error',
        message:
          error instanceof PluginFeesError && error.code === 'note_required'
            ? 'A note is required to approve the payout.'
            : describeError(error, 'Failed to approve the payout.'),
      });
      return false;
    }
  };

  const onRetry = async (line: PayoutLine) => {
    if (!quarter) return;
    setRetryingId(line.id);
    try {
      await retry.mutateAsync({ quarter, lineId: line.id });
      addToast({ type: 'success', message: `Retrying the payout to ${line.agent.name || 'this SMD'}.` });
    } catch (error) {
      if (isAlreadyDecided(error)) {
        addToast({
          type: 'warning',
          message: describeError(error, 'This payout line can no longer be retried.'),
        });
        void report.refetch();
      } else {
        addToast({ type: 'error', message: describeError(error, 'Failed to retry the payout line.') });
      }
    } finally {
      setRetryingId(null);
    }
  };

  const options = endedQuarters(8);

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h4" weight="bold">
          Quarterly Payouts
        </Heading>
        <Text variant="muted">
          After each quarter, every SMD&apos;s positive ledger balance is paid to their bank through
          Stripe. Review the report, then approve it to send the transfers. An SMD without a ready payout
          account is held and their balance carries forward.
        </Text>
      </div>

      {canPrepare ? (
        <form
          className="wb-pf-toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            void onPrepare();
          }}
        >
          <label className="wb-pf-row" style={{ gap: 6 }}>
            <span className="text-sm">Quarter</span>
            <Select
              value={quarterInput}
              onChange={(event) => setQuarterInput(event.target.value)}
              className="w-auto min-w-[12rem]"
            >
              {options.map((value) => (
                <option key={value} value={value}>
                  {formatQuarter(value)}
                </option>
              ))}
            </Select>
          </label>
          <Button type="submit" disabled={prepare.isPending}>
            {prepare.isPending ? 'Preparing…' : 'Prepare report'}
          </Button>
          <span className="wb-pf-muted">
            Prepared automatically the day after each quarter ends; preparing again returns the same draft.
          </span>
        </form>
      ) : null}

      <section className="wb-pf-card" aria-labelledby="wb-pf-payouts-heading">
        <h2 id="wb-pf-payouts-heading" className="wb-pf-subheading">
          Payout reports
        </h2>
        {payouts.isLoading ? (
          <p className="wb-pf-muted">Loading…</p>
        ) : payouts.isError ? (
          <ErrorState
            description={describeError(payouts.error, 'Unable to load payouts.')}
            onRetry={() => void payouts.refetch()}
          />
        ) : !payouts.data?.length ? (
          <p className="wb-pf-muted">No payout report has been prepared yet.</p>
        ) : (
          <div className="wb-pf-table-wrap">
            <table className="wb-pf-table">
              <thead>
                <tr>
                  <th scope="col">Quarter</th>
                  <th scope="col">Period end</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="wb-pf-num">
                    Total
                  </th>
                  <th scope="col" className="wb-pf-num">
                    SMDs
                  </th>
                  <th scope="col" className="wb-pf-num">
                    Held
                  </th>
                  <th scope="col" className="wb-pf-num">
                    Failed
                  </th>
                  <th scope="col">Approved</th>
                  <th scope="col">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {payouts.data.map((row) => {
                  const isOpen = quarter === row.quarter;
                  return (
                    <tr key={row.quarter} className={isOpen ? 'wb-pf-row--selected' : undefined}>
                      <td>{formatQuarter(row.quarter)}</td>
                      <td>{formatDate(row.period_end)}</td>
                      <td>
                        <PayoutStatusBadge status={row.status} />
                      </td>
                      <td className="wb-pf-num">{formatMoney(row.total_cents)}</td>
                      <td className="wb-pf-num">{row.lines.toLocaleString()}</td>
                      <td className="wb-pf-num">{row.held.toLocaleString()}</td>
                      <td className="wb-pf-num">
                        {row.failed > 0 ? <span className="wb-pf-warn-text">{row.failed.toLocaleString()}</span> : '0'}
                      </td>
                      <td>
                        {row.approved_at
                          ? `${formatDateTime(row.approved_at)}${row.approved_by ? ` · ${row.approved_by}` : ''}`
                          : '—'}
                      </td>
                      <td>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isOpen}
                          onClick={() => openQuarter(row.quarter)}
                        >
                          {isOpen ? 'Showing' : 'View report'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {quarter === null ? (
        <NonIdealState
          title="No report open"
          description={canPrepare ? 'Prepare a quarter, or open a report above.' : 'Open a report above.'}
        />
      ) : report.isLoading ? (
        <p className="wb-pf-muted">Loading the {formatQuarter(quarter)} payout…</p>
      ) : report.isError || !report.data ? (
        <ErrorState
          description={describeError(report.error, 'Unable to load this payout report.')}
          onRetry={() => void report.refetch()}
        />
      ) : (
        <PayoutReportView
          key={quarter}
          report={report.data}
          canApprove={canApprove}
          canRetry={canPrepare}
          canOpenStatement={canOpenStatement}
          backTo={`/admin/plugin-fees/payouts?quarter=${quarter}`}
          approving={approve.isPending}
          retryingId={retryingId}
          onApprove={onApprove}
          onRetry={(line) => void onRetry(line)}
        />
      )}
    </div>
  );
}
