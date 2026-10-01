/**
 * Admin billing cycles: preview a month (dry run, `:manage`), open a generated month's
 * stored report, and approve the go-live month (`:payout_approve`).
 * Route `/admin/plugin-fees/cycles`, guarded on `can_manage || can_review ||
 * can_approve_payouts`. The backend re-checks every request.
 *
 * P4: the SMD ledger balances table (`GET balances/`) sits under the cycle list.
 *
 * The open report lives in the URL (`?view=preview|report&month=YYYY-MM`) so returning
 * from an agent's statement restores it. Screens and states: `docs/plugin-fees/UI.md` §2.6.
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button, ErrorState, Heading, Input, NonIdealState, Text } from '@/shared/components';
import { useToastStore } from '@/store';

import {
  useApproveCycle,
  useCyclePreview,
  useCycleReport,
  useCycles,
  usePluginFeesAccess,
} from '../hooks/use-plugin-fees';
import { CycleReportView, CycleStatusBadge } from '../components/cycles/cycle-report';
import { BalancesSection } from '../components/payments/balances-section';
import {
  canApproveCycles,
  canPreviewCycles,
  canSeeAgentStatements,
  canSeeBalances,
} from '../utils/plugin-fees-access';
import {
  describeError,
  formatDateTime,
  formatMonth,
  isAlreadyDecided,
  MONTH_RE,
  nextMonthValue,
} from '../utils/plugin-fees-format';
import '../components/plugin-fees.css';

type View = 'preview' | 'report';

export default function PluginFeesCyclesPage() {
  const { addToast } = useToastStore();
  const { data: access } = usePluginFeesAccess();
  const canPreview = canPreviewCycles(access);
  const canApprove = canApproveCycles(access);
  const canOpenStatement = canSeeAgentStatements(access);
  const showBalances = canSeeBalances(access);

  const [searchParams, setSearchParams] = useSearchParams();
  const paramView = searchParams.get('view');
  const paramMonth = searchParams.get('month');
  const view: View | null =
    paramMonth && MONTH_RE.test(paramMonth) && (paramView === 'preview' || paramView === 'report')
      ? paramView
      : null;
  const month = view ? (paramMonth as string) : null;

  const [monthInput, setMonthInput] = useState(() => (view === 'preview' && month) || nextMonthValue());
  const monthValid = MONTH_RE.test(monthInput);

  const cycles = useCycles();
  const preview = useCyclePreview(view === 'preview' && canPreview ? month : null);
  const stored = useCycleReport(view === 'report' ? month : null);
  const current = view === 'preview' ? preview : stored;
  const approve = useApproveCycle();

  const open = (nextView: View, nextMonth: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('view', nextView);
    next.set('month', nextMonth);
    setSearchParams(next);
  };

  const onApprove = async (note: string): Promise<boolean> => {
    if (!month) return false;
    try {
      await approve.mutateAsync({ month, note });
      addToast({ type: 'success', message: `${formatMonth(month)} approved. Its invoices are released.` });
      return true;
    } catch (error) {
      if (isAlreadyDecided(error)) {
        // Already approved (or no longer awaiting approval); the report refetches on settle.
        addToast({ type: 'warning', message: describeError(error, 'This cycle is no longer awaiting approval.') });
        void current.refetch();
        return true;
      }
      addToast({ type: 'error', message: describeError(error, 'Failed to approve the cycle.') });
      return false;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h4" weight="bold">
          Billing Cycles
        </Heading>
        <Text variant="muted">
          Who is billed what each month, and why. A preview is a dry run and saves nothing; a
          generated month is stored. Only the go-live month waits for approval.
        </Text>
      </div>

      {canPreview ? (
        <form
          className="wb-pf-toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            if (monthValid) open('preview', monthInput);
          }}
        >
          <label className="wb-pf-row" style={{ gap: 6 }}>
            <span className="text-sm">Month</span>
            <Input
              type="month"
              value={monthInput}
              onChange={(event) => setMonthInput(event.target.value)}
              placeholder="YYYY-MM"
              pattern="\d{4}-\d{2}"
              aria-invalid={!monthValid}
              className="w-auto"
            />
          </label>
          <Button type="submit" disabled={!monthValid || preview.isFetching}>
            {preview.isFetching && view === 'preview' ? 'Previewing…' : 'Preview'}
          </Button>
          {!monthValid ? <span className="wb-pf-field-error">Enter a month as YYYY-MM.</span> : null}
        </form>
      ) : null}

      <section className="wb-pf-card" aria-labelledby="wb-pf-cycles-heading">
        <h2 id="wb-pf-cycles-heading" className="wb-pf-subheading">
          Generated cycles
        </h2>
        {cycles.isLoading ? (
          <p className="wb-pf-muted">Loading…</p>
        ) : cycles.isError ? (
          <ErrorState
            description={describeError(cycles.error, 'Unable to load billing cycles.')}
            onRetry={() => void cycles.refetch()}
          />
        ) : !cycles.data?.length ? (
          <p className="wb-pf-muted">No cycle has been generated yet.</p>
        ) : (
          <div className="wb-pf-table-wrap">
            <table className="wb-pf-table">
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">Status</th>
                  <th scope="col">Generated</th>
                  <th scope="col">Approved</th>
                  <th scope="col">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {cycles.data.map((cycle) => {
                  const isOpen = view === 'report' && month === cycle.month;
                  return (
                    <tr key={cycle.month} className={isOpen ? 'wb-pf-row--selected' : undefined}>
                      <td>{formatMonth(cycle.month)}</td>
                      <td>
                        <CycleStatusBadge status={cycle.status} />
                      </td>
                      <td>{formatDateTime(cycle.generated_at)}</td>
                      <td>
                        {cycle.approved_at
                          ? `${formatDateTime(cycle.approved_at)}${cycle.approved_by ? ` · ${cycle.approved_by}` : ''}`
                          : '—'}
                      </td>
                      <td>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={cycle.status === 'generating' || isOpen}
                          onClick={() => open('report', cycle.month)}
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

      {showBalances ? (
        <BalancesSection
          canOpenStatement={canOpenStatement}
          backTo={`/admin/plugin-fees/cycles${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}
        />
      ) : null}

      {view === null || !month ? (
        <NonIdealState
          title="No report open"
          description={
            canPreview
              ? 'Preview a month, or open a generated cycle above.'
              : 'Open a generated cycle above.'
          }
        />
      ) : view === 'preview' && !canPreview ? (
        <NonIdealState title="Preview not available" description="Previewing a month needs plug-in fee manage access." />
      ) : current.isLoading ? (
        <p className="wb-pf-muted">
          {view === 'preview' ? `Computing the ${formatMonth(month)} preview…` : 'Loading report…'}
        </p>
      ) : current.isError || !current.data ? (
        <ErrorState
          description={describeError(
            current.error,
            view === 'preview' ? 'Unable to preview this month.' : 'Unable to load this report.'
          )}
          onRetry={() => void current.refetch()}
        />
      ) : (
        <CycleReportView
          key={`${view}-${month}`}
          report={current.data}
          canApprove={canApprove}
          canOpenStatement={canOpenStatement}
          approving={approve.isPending}
          onApprove={onApprove}
        />
      )}
    </div>
  );
}
