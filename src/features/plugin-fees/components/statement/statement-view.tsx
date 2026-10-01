/**
 * The statement of account (D16): the invoices by month and, for SMDs, the ledger with
 * its running balance. Shared by the agent's own page and the read-only admin lookup;
 * it renders the payload and fetches nothing. P4: each invoice shows its payment state,
 * and on the agent's own page an invoice with `can_pay_now` offers Pay now (the page
 * owns the pay-link mutation and passes `payNow`).
 *
 * Screens and states: `docs/plugin-fees/UI.md` §2.5.
 */

import { Fragment, useState } from 'react';

import { Button } from '@/shared/components';

import type { InvoiceStatus, LedgerEntry, PluginFeesStatement, StatementInvoice, StatementLine } from '../../types';
import {
  formatMoney,
  formatMonth,
  formatMonthShort,
  formatSignedMoney,
  formatTimestampDate,
  humanize,
} from '../../utils/plugin-fees-format';
import { StatusBadge } from '../submission-parts';
import { PaymentFacts, PaymentStateCell } from '../payments/payment-state';

const INVOICE_STATUS: Record<InvoiceStatus, { label: string; tone: string }> = {
  draft: { label: 'Scheduled', tone: 'info' },
  no_charge: { label: 'Nothing to pay', tone: 'neutral' },
  open: { label: 'Due', tone: 'pending' },
  processing: { label: 'Processing', tone: 'info' },
  paid: { label: 'Paid', tone: 'approved' },
  failed: { label: 'Failed', tone: 'rejected' },
  void: { label: 'Void', tone: 'neutral' },
};

/** Invoice (and cycle-agent) status badge. Unknown statuses fall back to the raw value. */
export function InvoiceStatusBadge({ status }: { status: string }) {
  const known = INVOICE_STATUS[status as InvoiceStatus];
  if (status === 'excluded') return <StatusBadge status={status} label="Excluded" tone="rejected" />;
  return <StatusBadge status={status} label={known?.label ?? humanize(status)} tone={known?.tone ?? 'neutral'} />;
}

/** `amount` coloured by sign: credits green, debits red, zero plain. */
export function SignedAmount({ cents, signed = false }: { cents: number; signed?: boolean }) {
  const tone = cents > 0 ? ' wb-pf-amount--credit' : cents < 0 ? ' wb-pf-amount--debit' : '';
  return <span className={`wb-pf-amount${tone}`}>{signed ? formatSignedMoney(cents) : formatMoney(cents)}</span>;
}

/** An invoice's lines and its total. Negative lines are credits. */
export function LinesTable({ lines, totalCents }: { lines: StatementLine[]; totalCents: number }) {
  if (!lines.length) return <p className="wb-pf-muted">No lines.</p>;
  return (
    <table className="wb-pf-lines">
      <tbody>
        {lines.map((line, index) => (
          <tr key={`${line.label}-${index}`}>
            <td>{line.label}</td>
            <td className="wb-pf-num">
              <span className={line.amount_cents < 0 ? 'wb-pf-amount wb-pf-amount--credit' : 'wb-pf-amount'}>
                {formatMoney(line.amount_cents)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Total</th>
          <td className="wb-pf-num">
            <strong>{formatMoney(totalCents)}</strong>
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

/** A disclosure button for an expandable table row. */
export function ExpandButton({
  expanded,
  controls,
  label,
  onToggle,
}: {
  expanded: boolean;
  controls: string;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="wb-pf-expand"
      aria-expanded={expanded}
      aria-controls={controls}
      aria-label={`${expanded ? 'Hide' : 'Show'} lines for ${label}`}
      onClick={onToggle}
    >
      <span aria-hidden>{expanded ? '▾' : '▸'}</span>
    </button>
  );
}

/** Pay now, offered by the agent's own statement page. */
export interface PayNowControl {
  onPay: (invoice: StatementInvoice) => void;
  /** The invoice whose pay link is being requested; every Pay now is disabled meanwhile. */
  payingId: number | null;
}

const PAY_NOW_COPY =
  "Pay by bank, card, or Klarna (pay over time, subject to Klarna's approval and fees).";

function InvoicesTable({
  invoices,
  own,
  payNow,
}: {
  invoices: StatementInvoice[];
  own: boolean;
  payNow?: PayNowControl;
}) {
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const toggle = (id: number) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (!invoices.length) return <p className="wb-pf-muted">No invoices yet.</p>;

  const showPay = Boolean(payNow) && invoices.some((invoice) => invoice.can_pay_now);
  const columns = showPay ? 7 : 6;

  return (
    <div className="wb-pf-table-wrap">
      <table className="wb-pf-table">
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Lines</span>
            </th>
            <th scope="col">Month</th>
            <th scope="col">Kind</th>
            <th scope="col">Status</th>
            <th scope="col" className="wb-pf-num">
              Amount
            </th>
            <th scope="col">Paid</th>
            {showPay ? (
              <th scope="col">
                <span className="sr-only">Pay</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => {
            const expanded = open.has(invoice.id);
            const panelId = `wb-pf-invoice-${invoice.id}`;
            const partial = invoice.paid_cents > 0 && invoice.paid_cents !== invoice.amount_cents;
            return (
              <Fragment key={invoice.id}>
                <tr>
                  <td>
                    <ExpandButton
                      expanded={expanded}
                      controls={panelId}
                      label={formatMonth(invoice.month)}
                      onToggle={() => toggle(invoice.id)}
                    />
                  </td>
                  <td>{formatMonth(invoice.month)}</td>
                  <td>{invoice.kind}</td>
                  <td>
                    <PaymentStateCell state={invoice} audience={own ? 'own' : 'admin'} />
                  </td>
                  <td className="wb-pf-num">{formatMoney(invoice.amount_cents)}</td>
                  <td>
                    {formatTimestampDate(invoice.paid_at)}
                    {partial ? <span className="wb-pf-muted"> ({formatMoney(invoice.paid_cents)} paid)</span> : null}
                  </td>
                  {showPay && payNow ? (
                    <td>
                      {invoice.can_pay_now ? (
                        <span className="wb-pf-pay-now">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => payNow.onPay(invoice)}
                            disabled={payNow.payingId !== null}
                            aria-describedby={`wb-pf-pay-copy-${invoice.id}`}
                          >
                            {payNow.payingId === invoice.id ? 'Opening…' : 'Pay now'}
                          </Button>
                          <span id={`wb-pf-pay-copy-${invoice.id}`} className="wb-pf-pay-copy">
                            {PAY_NOW_COPY}
                          </span>
                        </span>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
                {expanded ? (
                  <tr id={panelId} className="wb-pf-detail-row">
                    <td colSpan={columns}>
                      <div className="wb-pf-detail-inner">
                        <LinesTable lines={invoice.lines} totalCents={invoice.amount_cents} />
                        <PaymentFacts state={invoice} />
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LedgerDescription({ entry }: { entry: LedgerEntry }) {
  return (
    <span>
      <span className="wb-pf-row" style={{ gap: 6 }}>
        <strong>{entry.label || humanize(entry.type)}</strong>
        {entry.type === 'md_credit_rollup' ? <span className="wb-pf-tag">Rolled up</span> : null}
      </span>
      {entry.memo ? <span className="wb-pf-muted" style={{ display: 'block' }}>{entry.memo}</span> : null}
    </span>
  );
}

function BalanceCard({ cents, own }: { cents: number; own: boolean }) {
  const caption =
    cents > 0
      ? own
        ? 'Owed to you, paid quarterly'
        : 'Owed to the agent, paid quarterly'
      : cents < 0
        ? own
          ? 'You owe'
          : 'The agent owes'
        : 'Balance';
  const tone = cents > 0 ? ' wb-pf-balance--credit' : cents < 0 ? ' wb-pf-balance--debit' : '';
  return (
    <div className={`wb-pf-balance${tone}`} role="status">
      <span className="wb-pf-detail-label">{caption}</span>
      <span className="wb-pf-balance-amount">{formatMoney(Math.abs(cents))}</span>
    </div>
  );
}

function LedgerTable({ entries }: { entries: LedgerEntry[] }) {
  if (!entries.length) return <p className="wb-pf-muted">No ledger entries yet.</p>;
  return (
    <div className="wb-pf-table-wrap">
      <table className="wb-pf-table">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Month</th>
            <th scope="col">Description</th>
            <th scope="col" className="wb-pf-num">
              Amount
            </th>
            <th scope="col" className="wb-pf-num">
              Balance
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>{formatTimestampDate(entry.posted_at)}</td>
              <td>{formatMonthShort(entry.month)}</td>
              <td>
                <LedgerDescription entry={entry} />
              </td>
              <td className="wb-pf-num">
                <SignedAmount cents={entry.amount_cents} signed />
              </td>
              <td className="wb-pf-num">{formatMoney(entry.balance_cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * `own` words the balance and payment states for the signed-in agent; false for the
 * admin lookup. `payNow` is passed only by the agent's own page.
 */
export function StatementView({
  statement,
  own = true,
  payNow,
}: {
  statement: PluginFeesStatement;
  own?: boolean;
  payNow?: PayNowControl;
}) {
  return (
    <div className="wb-pf-stack">
      {statement.ledger ? (
        <section className="wb-pf-card" aria-labelledby="wb-pf-ledger-heading">
          <h2 id="wb-pf-ledger-heading" className="wb-pf-subheading">
            Balance and ledger
          </h2>
          <BalanceCard cents={statement.ledger.balance_cents} own={own} />
          <p className="wb-pf-muted" style={{ margin: 0 }}>
            Credits are positive and debits negative. MD fees credited from own MDs and MD fees
            rolled up from below are listed separately.
          </p>
          <LedgerTable entries={statement.ledger.entries} />
        </section>
      ) : null}

      <section className="wb-pf-card" aria-labelledby="wb-pf-invoices-heading">
        <h2 id="wb-pf-invoices-heading" className="wb-pf-subheading">
          Invoices
        </h2>
        <InvoicesTable invoices={statement.invoices} own={own} payNow={payNow} />
      </section>
    </div>
  );
}
