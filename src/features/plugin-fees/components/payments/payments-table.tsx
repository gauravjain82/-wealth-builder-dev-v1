/**
 * The invoices of a month on the payments dashboard: filter tabs (client-side over
 * `rows` — the payload carries every sent invoice), a name / agency-code search, a CSV of
 * exactly the rows showing, and one row per invoice with its payment state. P6: `onVoid`
 * (passed for `:manage`) adds "Void…" on `draft`, `open` and `failed` rows.
 * Screens: `docs/plugin-fees/UI.md` §2.9.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button, Input, NonIdealState } from '@/shared/components';

import type { PaymentRow } from '../../types';
import { downloadCsv, formatDate, formatMoney, formatTimestampDate, toCsv } from '../../utils/plugin-fees-format';
import {
  collectionLabel,
  describeFailure,
  failureCodeLabel,
  isOverdue,
  isRetrying,
  isVoidable,
  paidViaLabel,
  todayUtc,
} from '../../utils/plugin-fees-payment';
import { PaidVia, PaymentStateCell } from './payment-state';

export type PaymentFilter =
  | 'all'
  | 'failed'
  | 'retrying'
  | 'self_pay_open'
  | 'overdue'
  | 'processing'
  | 'paid'
  | 'klarna';

const FILTERS: { value: PaymentFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'failed', label: 'Failed' },
  { value: 'retrying', label: 'Retrying' },
  { value: 'self_pay_open', label: 'Self-pay open' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'processing', label: 'Processing' },
  { value: 'paid', label: 'Paid' },
  { value: 'klarna', label: 'Klarna' },
];

/**
 * "Self-pay open" and "Overdue" are disjoint, like the `self_pay_open` and
 * `self_pay_overdue` counts they sit beside (PF27).
 */
function matches(row: PaymentRow, filter: PaymentFilter, today: string): boolean {
  switch (filter) {
    case 'failed':
      return row.status === 'failed';
    case 'retrying':
      return isRetrying(row);
    case 'self_pay_open':
      return row.collection === 'self_pay' && row.status === 'open' && !isOverdue(row, today);
    case 'overdue':
      return isOverdue(row, today);
    case 'processing':
      return row.status === 'processing';
    case 'paid':
      return row.status === 'paid';
    case 'klarna':
      return row.paid_via === 'klarna';
    default:
      return true;
  }
}

const dollars = (cents: number) => (cents / 100).toFixed(2);

function exportRows(rows: PaymentRow[], today: string) {
  return [
    [
      'invoice_id',
      'user_id',
      'name',
      'agency_code',
      'level',
      'kind',
      'amount',
      'status',
      'overdue',
      'collection',
      'attempts',
      'next_retry_on',
      'due_date',
      'last_failure_code',
      'last_failure',
      'last_failure_at',
      'paid_at',
      'paid_via',
      'follow_up_open',
    ],
    ...rows.map((row) => [
      row.invoice_id,
      row.agent.id,
      row.agent.name,
      row.agent.agency_code,
      row.agent.level_code,
      row.kind,
      dollars(row.amount_cents),
      row.status,
      isOverdue(row, today) ? 'yes' : 'no',
      row.collection,
      row.attempts,
      row.next_retry_on,
      row.due_date,
      row.last_failure?.code,
      row.last_failure ? describeFailure(row.last_failure) : '',
      row.last_failure?.at,
      row.paid_at,
      row.paid_via ? paidViaLabel(row.paid_via) : '',
      row.follow_up_open ? 'yes' : 'no',
    ]),
  ];
}

function RetryOrDue({ row }: { row: PaymentRow }) {
  if (row.collection === 'self_pay') {
    return <span>{row.due_date ? `Due ${formatDate(row.due_date)}` : '—'}</span>;
  }
  return <span>{row.next_retry_on ? `Retry ${formatDate(row.next_retry_on)}` : '—'}</span>;
}

export function PaymentsTable({
  rows,
  month,
  onVoid,
}: {
  rows: PaymentRow[];
  month: string;
  /** `:manage` only: open the void dialog for a row. */
  onVoid?: (row: PaymentRow) => void;
}) {
  const [filter, setFilter] = useState<PaymentFilter>('all');
  const [search, setSearch] = useState('');
  const today = todayUtc();

  const counts = useMemo(() => {
    const out = {} as Record<PaymentFilter, number>;
    for (const entry of FILTERS) out[entry.value] = rows.filter((row) => matches(row, entry.value, today)).length;
    return out;
  }, [rows, today]);

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (!matches(row, filter, today)) return false;
      if (!needle) return true;
      return `${row.agent.name ?? ''} ${row.agent.agency_code ?? ''}`.toLowerCase().includes(needle);
    });
  }, [rows, filter, search, today]);

  const backState = { backTo: `/admin/plugin-fees/payments?month=${month}`, backLabel: 'Payments' };

  const onDownload = () =>
    downloadCsv(`plugin-fees-payments-${month}-${filter}.csv`, toCsv(exportRows(shown, today)));

  return (
    <div className="wb-pf-stack">
      <div className="wb-pf-tabs wb-pf-tabs--scroll" role="tablist" aria-label="Filter invoices">
        {FILTERS.map((entry) => (
          <button
            key={entry.value}
            type="button"
            role="tab"
            aria-selected={filter === entry.value}
            aria-controls="wb-pf-payments-panel"
            className="wb-pf-tab"
            onClick={() => setFilter(entry.value)}
          >
            {entry.label} <span className="wb-pf-tab-count">{counts[entry.value].toLocaleString()}</span>
          </button>
        ))}
      </div>

      <div className="wb-pf-toolbar">
        <div className="wb-pf-search">
          <Input
            type="search"
            aria-label="Search invoices"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or agency code"
          />
        </div>
        <span className="wb-pf-muted">
          {shown.length.toLocaleString()} of {rows.length.toLocaleString()}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={onDownload} disabled={!shown.length}>
          Download CSV
        </Button>
      </div>

      <div id="wb-pf-payments-panel" role="tabpanel">
        {!shown.length ? (
          <NonIdealState
            title="No invoices"
            description={rows.length ? 'No invoices match this filter.' : 'No invoices have been sent for this month.'}
          />
        ) : (
          <div className="wb-pf-table-wrap">
            <table className="wb-pf-table wb-pf-table--dense">
              <thead>
                <tr>
                  <th scope="col">Agent</th>
                  <th scope="col">Level</th>
                  <th scope="col">Kind</th>
                  <th scope="col" className="wb-pf-num">
                    Amount
                  </th>
                  <th scope="col">Status</th>
                  <th scope="col">Collection</th>
                  <th scope="col" className="wb-pf-num">
                    Attempts
                  </th>
                  <th scope="col">Next retry / due</th>
                  <th scope="col">Last failure</th>
                  <th scope="col">Paid</th>
                  <th scope="col">Follow-up</th>
                  {onVoid ? (
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr key={row.invoice_id}>
                    <td>
                      <Link
                        to={`/admin/plugin-fees/agents/${row.agent.id}/statement`}
                        state={backState}
                        className="wb-pf-link"
                      >
                        {row.agent.name || '—'}
                      </Link>
                      <span className="wb-pf-muted" style={{ display: 'block' }}>
                        {row.agent.agency_code || '—'}
                      </span>
                    </td>
                    <td>{row.agent.level_code || '—'}</td>
                    <td>{row.kind}</td>
                    <td className="wb-pf-num">{formatMoney(row.amount_cents)}</td>
                    <td>
                      <PaymentStateCell state={row} audience="admin" />
                    </td>
                    <td>{collectionLabel(row.collection)}</td>
                    <td className="wb-pf-num">{row.attempts.toLocaleString()}</td>
                    <td>
                      <RetryOrDue row={row} />
                    </td>
                    <td>
                      {row.last_failure ? (
                        <span title={row.last_failure.message || undefined}>
                          {failureCodeLabel(row.last_failure.code)}
                          <span className="wb-pf-muted" style={{ display: 'block' }}>
                            {formatTimestampDate(row.last_failure.at)}
                          </span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {row.paid_at ? (
                        <span>
                          {formatTimestampDate(row.paid_at)}
                          <PaidVia state={row} />
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{row.follow_up_open ? <span className="wb-pf-tag wb-pf-tag--danger">Open</span> : '—'}</td>
                    {onVoid ? (
                      <td>
                        {isVoidable(row.status) ? (
                          <Button type="button" size="sm" variant="outline" onClick={() => onVoid(row)}>
                            Void…
                          </Button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
