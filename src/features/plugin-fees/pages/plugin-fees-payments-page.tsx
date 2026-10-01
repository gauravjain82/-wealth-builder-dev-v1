/**
 * Admin payments dashboard (P4, contract §6). Route `/admin/plugin-fees/payments`,
 * guarded on `can_manage || can_review` (read-only for review). Data:
 * `GET payments/?month=` and `GET follow-ups/?status=`. `:manage` may Send now
 * (`POST cycles/{month}/send/`), resolve follow-ups and (P6) void an invoice
 * (`POST invoices/{id}/void/`).
 *
 * The month lives in the URL (`?month=YYYY-MM`, default the current UTC month) so Back
 * from an agent statement restores it. Screens and states: `docs/plugin-fees/UI.md` §2.9.
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button, ConfirmationDialog, ErrorState, Heading, Input, Text } from '@/shared/components';
import { useToastStore } from '@/store';

import { usePayments, usePluginFeesAccess, useSendCycle } from '../hooks/use-plugin-fees';
import { PluginFeesError } from '../services/plugin-fees-service';
import { CycleStatusBadge, Stat } from '../components/cycles/cycle-report';
import { VoidInvoiceDialog, type VoidTarget } from '../components/invoices/void-invoice-dialog';
import { FollowUpsSection } from '../components/payments/follow-ups-section';
import { PaymentsTable } from '../components/payments/payments-table';
import { SendingProgress } from '../components/payments/sending-progress';
import type { PaymentsDashboard } from '../types';
import { canResolveFollowUps, canSendCycles, canVoidInvoices } from '../utils/plugin-fees-access';
import { describeError, formatMoney, formatMonth, MONTH_RE } from '../utils/plugin-fees-format';
import { todayUtc } from '../utils/plugin-fees-payment';
import '../components/plugin-fees.css';

const count = (value: number) => value.toLocaleString();

function TotalsCards({ data }: { data: PaymentsDashboard }) {
  const { totals, klarna } = data;
  const { counts } = totals;
  return (
    <div className="wb-pf-stack">
      <div className="wb-pf-stats">
        <Stat label="Invoiced" value={formatMoney(totals.invoiced_cents)} />
        <Stat label="Paid" value={formatMoney(totals.paid_cents)} />
        <Stat
          label="Outstanding"
          value={formatMoney(totals.outstanding_cents)}
          warning={totals.outstanding_cents > 0}
        />
      </div>
      <div className="wb-pf-stats">
        <Stat label="Paid" value={count(counts.paid)} />
        <Stat label="Processing" value={count(counts.processing)} sub="Bank payment, ~4 business days" />
        <Stat label="Charge scheduled" value={count(counts.open_automatic)} sub="Automatic, not yet charged" />
        <Stat label="Retrying" value={count(counts.retrying)} sub="Failed at least once" warning={counts.retrying > 0} />
        <Stat label="Self-pay open" value={count(counts.self_pay_open)} />
        <Stat
          label="Self-pay overdue"
          value={count(counts.self_pay_overdue)}
          warning={counts.self_pay_overdue > 0}
        />
        <Stat
          label="Failed"
          value={count(counts.failed)}
          sub="Retries exhausted or reversed"
          danger={counts.failed > 0}
        />
        <Stat label="Nothing to pay" value={count(counts.no_charge)} />
      </div>
      <div className="wb-pf-stat wb-pf-stat--klarna wb-pf-stat--wide">
        <span className="wb-pf-detail-label">Klarna</span>
        <span className="wb-pf-stat-value">
          {count(klarna.count)} · {formatMoney(klarna.paid_cents)}
        </span>
        <span className="wb-pf-stat-sub">
          Paid with Klarna this month. Klarna fees are higher; every Klarna payment is logged.
        </span>
      </div>
    </div>
  );
}

export default function PluginFeesPaymentsPage() {
  const { addToast } = useToastStore();
  const { data: access } = usePluginFeesAccess();
  const canSend = canSendCycles(access);
  const canResolve = canResolveFollowUps(access);
  const canVoid = canVoidInvoices(access);
  const [voiding, setVoiding] = useState<VoidTarget | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const paramMonth = searchParams.get('month');
  const month = paramMonth && MONTH_RE.test(paramMonth) ? paramMonth : todayUtc().slice(0, 7);
  const [monthInput, setMonthInput] = useState(month);
  // Keep the input in step when the URL month changes (Back / Forward).
  useEffect(() => setMonthInput(month), [month]);
  const monthValid = MONTH_RE.test(monthInput);

  const payments = usePayments(month);
  const send = useSendCycle();
  const [confirmSend, setConfirmSend] = useState(false);
  const data = payments.data && payments.data.month === month ? payments.data : undefined;

  const showMonth = (next: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('month', next);
    setSearchParams(params);
  };

  const onSend = async () => {
    try {
      await send.mutateAsync(month);
      addToast({
        type: 'success',
        message: `Sending ${formatMonth(month)} invoices. Progress updates here.`,
      });
      setConfirmSend(false);
    } catch (error) {
      setConfirmSend(false);
      if (error instanceof PluginFeesError && error.code === 'not_approved') {
        addToast({
          type: 'warning',
          message: describeError(error, 'This cycle has not been approved yet, so nothing can be sent.'),
        });
        return;
      }
      addToast({ type: 'error', message: describeError(error, 'Failed to send the invoices.') });
    }
  };

  const showSend = Boolean(data && canSend && data.cycle_status === 'approved' && data.sending.pending > 0);

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h4" weight="bold">
          Plug-in Fee Payments
        </Heading>
        <Text variant="muted">
          Collection for a billing month: what was sent, paid, retrying, overdue or failed, and
          who needs a follow-up. {canSend ? '' : 'Read-only.'}
        </Text>
      </div>

      <form
        className="wb-pf-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          if (monthValid) showMonth(monthInput);
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
        <Button type="submit" disabled={!monthValid || (monthInput === month && payments.isFetching)}>
          Show
        </Button>
        {!monthValid ? <span className="wb-pf-field-error">Enter a month as YYYY-MM.</span> : null}
      </form>

      {payments.isLoading || (!data && payments.isFetching) ? (
        <p className="wb-pf-muted">Loading {formatMonth(month)}…</p>
      ) : payments.isError || !data ? (
        <ErrorState
          description={describeError(payments.error, 'Unable to load payments for this month.')}
          onRetry={() => void payments.refetch()}
        />
      ) : (
        <>
          <section className="wb-pf-card" aria-labelledby="wb-pf-payments-heading">
            <div className="wb-pf-card-header">
              <div className="wb-pf-row">
                <h2 id="wb-pf-payments-heading" className="wb-pf-report-title">
                  {formatMonth(data.month)}
                </h2>
                {data.cycle_status ? (
                  <CycleStatusBadge status={data.cycle_status} />
                ) : (
                  <span className="wb-pf-muted">No cycle generated</span>
                )}
              </div>
              {showSend ? (
                <Button type="button" onClick={() => setConfirmSend(true)} disabled={send.isPending}>
                  {send.isPending ? 'Sending…' : 'Send now'}
                </Button>
              ) : null}
            </div>
            {data.cycle_status === 'generated' ? (
              <div className="wb-pf-callout">
                Awaiting approval. Nothing is sent to Stripe before the cycle is approved.
              </div>
            ) : null}
            {data.cycle_status ? <SendingProgress sending={data.sending} /> : null}
            <TotalsCards data={data} />
          </section>

          <section className="wb-pf-card" aria-labelledby="wb-pf-invoices-list-heading">
            <h2 id="wb-pf-invoices-list-heading" className="wb-pf-subheading">
              Invoices
            </h2>
            <PaymentsTable
              key={data.month}
              rows={data.rows}
              month={data.month}
              onVoid={
                canVoid
                  ? (row) =>
                      setVoiding({
                        id: row.invoice_id,
                        agentName: row.agent.name,
                        month: data.month,
                        amountCents: row.amount_cents,
                      })
                  : undefined
              }
            />
          </section>
        </>
      )}

      <FollowUpsSection canResolve={canResolve} />

      {canVoid ? <VoidInvoiceDialog target={voiding} onClose={() => setVoiding(null)} /> : null}

      {showSend && data ? (
        <ConfirmationDialog
          open={confirmSend}
          title={`Send ${formatMonth(month)} invoices now`}
          message={`${count(data.sending.pending)} approved invoice${
            data.sending.pending === 1 ? '' : 's'
          } will be sent to Stripe now instead of waiting for the scheduled job. Automatic invoices are then charged and self-pay agents get their payment link.`}
          confirmText="Send now"
          confirmVariant="default"
          loading={send.isPending}
          onConfirm={onSend}
          onClose={() => setConfirmSend(false)}
        />
      ) : null}
    </div>
  );
}
