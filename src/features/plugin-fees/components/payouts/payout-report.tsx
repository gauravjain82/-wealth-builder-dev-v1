/**
 * A quarter's payout report (P5, contract §7): header, totals, the lines with the ledger
 * detail behind each amount, a client-side CSV, Approve (`:payout_approve`, draft only,
 * a note required) and Retry on a failed or held line of an approved payout (`:manage`).
 * Renders the payload it is given; the page owns fetching and the mutations.
 * Screens and states: `docs/plugin-fees/UI.md` §2.10.
 */

import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button, ConfirmationDialog, NonIdealState, Textarea } from '@/shared/components';

import type { PayoutLine, PayoutReport } from '../../types';
import {
  downloadCsv,
  formatDate,
  formatDateTime,
  formatMoney,
  formatMonthShort,
  formatTimestampDate,
  humanize,
  toCsv,
} from '../../utils/plugin-fees-format';
import {
  connectStatusWording,
  describePayoutFailure,
  formatQuarter,
  isLineRetryable,
  isPayoutInFlight,
  payoutLineWording,
  payoutStatusWording,
} from '../../utils/plugin-fees-payout';
import { Stat } from '../cycles/cycle-report';
import { ExpandButton, SignedAmount } from '../statement/statement-view';
import { StatusBadge } from '../submission-parts';

export function PayoutStatusBadge({ status }: { status: string }) {
  const wording = payoutStatusWording(status);
  return <StatusBadge status={status} label={wording.label} tone={wording.tone} />;
}

export function ConnectStatusBadge({ status }: { status: string }) {
  const wording = connectStatusWording(status);
  return <StatusBadge status={status} label={wording.label} tone={wording.tone} />;
}

const count = (value: number) => value.toLocaleString();
const dollars = (cents: number) => (cents / 100).toFixed(2);

const APPROVE_CONSEQUENCE =
  'Approving sends Stripe transfers to every SMD whose payout account is ready. This cannot be undone.';

function ApprovePayoutDialog({
  open,
  report,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  report: PayoutReport;
  loading: boolean;
  onConfirm: (note: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  useEffect(() => {
    if (open) setNote('');
  }, [open]);
  const { totals } = report;

  return (
    <ConfirmationDialog
      open={open}
      title={`Approve the ${formatQuarter(report.quarter)} payout`}
      message={APPROVE_CONSEQUENCE}
      confirmText="Approve and send"
      confirmVariant="default"
      confirmDisabled={!note.trim()}
      loading={loading}
      onConfirm={() => onConfirm(note.trim())}
      onClose={onClose}
    >
      <dl className="wb-pf-summary-list">
        <div>
          <dt>Total</dt>
          <dd>
            {formatMoney(totals.total_cents)} · {count(totals.lines)} SMD{totals.lines === 1 ? '' : 's'}
          </dd>
        </div>
        <div>
          <dt>Payable now</dt>
          <dd>{formatMoney(totals.payable_cents)}</dd>
        </div>
        <div>
          <dt>Held — not onboarded</dt>
          <dd className={totals.held > 0 ? 'wb-pf-warn-text' : undefined}>
            {formatMoney(totals.held_cents)} · {count(totals.held)}
          </dd>
        </div>
      </dl>
      <p className="wb-pf-muted" style={{ margin: 0 }}>
        Every line&apos;s payout account is re-checked on approval; a line whose account is not ready is
        held and its balance carries to next quarter.
      </p>
      <label className="block space-y-1 text-sm">
        <span className="text-slate-700 dark:text-white/80">What did you check? (required)</span>
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          required
          aria-required="true"
          disabled={loading}
        />
      </label>
    </ConfirmationDialog>
  );
}

/**
 * The ledger entries posted in the quarter, preceded by the balance carried in from before
 * it (`opening_balance_cents`, from the backend, contract §7.1), so the column always
 * reconciles to the amount (PF38).
 */
function EntriesTable({ line }: { line: PayoutLine }) {
  const carried = line.opening_balance_cents;
  return (
    <table className="wb-pf-lines">
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Month</th>
          <th scope="col">Entry</th>
          <th scope="col" className="wb-pf-num">
            Amount
          </th>
        </tr>
      </thead>
      <tbody>
        {carried !== 0 ? (
          <tr>
            <td>—</td>
            <td>—</td>
            <td>
              <strong>Balance carried in from before the quarter</strong>
            </td>
            <td className="wb-pf-num">
              <SignedAmount cents={carried} signed />
            </td>
          </tr>
        ) : null}
        {line.entries.map((entry, index) => (
          <tr key={`${entry.posted_at}-${index}`}>
            <td>{formatTimestampDate(entry.posted_at)}</td>
            <td>{formatMonthShort(entry.month)}</td>
            <td>
              <strong>{entry.label || humanize(entry.type)}</strong>
              {entry.memo ? <span className="wb-pf-muted" style={{ display: 'block' }}>{entry.memo}</span> : null}
            </td>
            <td className="wb-pf-num">
              <SignedAmount cents={entry.amount_cents} signed />
            </td>
          </tr>
        ))}
        {!line.entries.length && carried === 0 ? (
          <tr>
            <td colSpan={4} className="wb-pf-muted">
              No entries.
            </td>
          </tr>
        ) : null}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" colSpan={3}>
            Payout amount
          </th>
          <td className="wb-pf-num">
            <strong>{formatMoney(line.amount_cents)}</strong>
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

function LineStatus({ line }: { line: PayoutLine }) {
  const wording = payoutLineWording(line.status);
  return (
    <span className="wb-pf-pay-state">
      <StatusBadge status={line.status} label={wording.label} tone={wording.tone} />
      {line.status === 'sent' ? (
        <span className="wb-pf-pay-headline">
          {formatTimestampDate(line.sent_at)}
          {line.stripe_transfer_id ? (
            <span className="wb-pf-mono" style={{ display: 'block' }}>
              {line.stripe_transfer_id}
            </span>
          ) : null}
        </span>
      ) : null}
      {line.status === 'failed' ? (
        <span className="wb-pf-pay-headline wb-pf-pay-headline--danger">{describePayoutFailure(line.failure)}</span>
      ) : null}
    </span>
  );
}

function exportRows(report: PayoutReport) {
  return [
    [
      'quarter',
      'period_end',
      'line_id',
      'user_id',
      'name',
      'agency_code',
      'email',
      'amount',
      'entries_total',
      'status',
      'connect_status',
      'stripe_transfer_id',
      'sent_at',
      'failure',
    ],
    ...report.lines.map((line) => [
      report.quarter,
      report.period_end,
      line.id,
      line.agent.id,
      line.agent.name,
      line.agent.agency_code,
      line.agent.email,
      dollars(line.amount_cents),
      dollars(line.entries.reduce((sum, entry) => sum + entry.amount_cents, 0)),
      line.status,
      line.connect_status,
      line.stripe_transfer_id,
      line.sent_at,
      line.failure ? describePayoutFailure(line.failure) : '',
    ]),
  ];
}

function LinesTable({
  report,
  canRetry,
  canOpenStatement,
  backTo,
  retryingId,
  onRetry,
}: {
  report: PayoutReport;
  canRetry: boolean;
  canOpenStatement: boolean;
  backTo: string;
  retryingId: number | null;
  onRetry: (line: PayoutLine) => void;
}) {
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const toggle = (id: number) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (!report.lines.length) {
    return <NonIdealState title="No lines" description="No SMD had a positive balance at the end of this quarter." />;
  }

  const showRetry = canRetry && report.lines.some((line) => isLineRetryable(line.status, report.status));
  const columns = showRetry ? 6 : 5;

  return (
    <div className="wb-pf-table-wrap">
      <table className="wb-pf-table wb-pf-table--dense">
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Entries</span>
            </th>
            <th scope="col">SMD</th>
            <th scope="col" className="wb-pf-num">
              Amount
            </th>
            <th scope="col">Line status</th>
            <th scope="col">Payout account</th>
            {showRetry ? (
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {report.lines.map((line) => {
            const expanded = open.has(line.id);
            const panelId = `wb-pf-payout-line-${line.id}`;
            return (
              <Fragment key={line.id}>
                <tr>
                  <td>
                    <ExpandButton
                      expanded={expanded}
                      controls={panelId}
                      label={line.agent.name || `line ${line.id}`}
                      onToggle={() => toggle(line.id)}
                    />
                  </td>
                  <td>
                    {canOpenStatement ? (
                      <Link
                        to={`/admin/plugin-fees/agents/${line.agent.id}/statement`}
                        state={{ backTo, backLabel: 'Payouts' }}
                        className="wb-pf-link"
                      >
                        {line.agent.name || '—'}
                      </Link>
                    ) : (
                      line.agent.name || '—'
                    )}
                    <span className="wb-pf-muted" style={{ display: 'block' }}>
                      {line.agent.agency_code || '—'}
                    </span>
                  </td>
                  <td className="wb-pf-num">{formatMoney(line.amount_cents)}</td>
                  <td>
                    <LineStatus line={line} />
                  </td>
                  <td>
                    <ConnectStatusBadge status={line.connect_status} />
                  </td>
                  {showRetry ? (
                    <td>
                      {isLineRetryable(line.status, report.status) ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onRetry(line)}
                          disabled={retryingId !== null}
                        >
                          {retryingId === line.id ? 'Retrying…' : 'Retry'}
                        </Button>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
                {expanded ? (
                  <tr id={panelId} className="wb-pf-detail-row">
                    <td colSpan={columns}>
                      <div className="wb-pf-detail-inner">
                        <EntriesTable line={line} />
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

export function PayoutReportView({
  report,
  canApprove,
  canRetry,
  canOpenStatement,
  backTo,
  approving,
  retryingId,
  onApprove,
  onRetry,
}: {
  report: PayoutReport;
  canApprove: boolean;
  canRetry: boolean;
  canOpenStatement: boolean;
  /** Where an agent statement's back link returns (this page with the report open). */
  backTo: string;
  approving: boolean;
  retryingId: number | null;
  onApprove: (note: string) => Promise<boolean>;
  onRetry: (line: PayoutLine) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const showApprove = canApprove && report.status === 'draft';
  const { totals } = report;

  return (
    <div className="wb-pf-stack">
      <section className="wb-pf-card" aria-labelledby="wb-pf-payout-heading">
        <div className="wb-pf-card-header">
          <div className="wb-pf-row">
            <h2 id="wb-pf-payout-heading" className="wb-pf-report-title">
              {formatQuarter(report.quarter)}
            </h2>
            <PayoutStatusBadge status={report.status} />
          </div>
          <div className="wb-pf-row">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => downloadCsv(`plugin-fees-payout-${report.quarter}.csv`, toCsv(exportRows(report)))}
              disabled={!report.lines.length}
            >
              Download CSV
            </Button>
            {showApprove ? (
              <Button type="button" onClick={() => setDialogOpen(true)} disabled={approving}>
                Approve…
              </Button>
            ) : null}
          </div>
        </div>
        {report.status === 'draft' ? (
          <div className="wb-pf-callout">
            Draft: nothing has been sent. Lines marked &quot;Not onboarded&quot; are held and carry to next
            quarter; those SMDs were emailed a reminder.
          </div>
        ) : null}
        {isPayoutInFlight(report.status) ? (
          <div className="wb-pf-callout" role="status">
            Transfers are being sent. This report refreshes every few seconds.
          </div>
        ) : null}
        <div className="wb-pf-details">
          <div>
            <span className="wb-pf-detail-label">Period end</span>
            <span className="wb-pf-detail-value">{formatDate(report.period_end)}</span>
          </div>
          <div>
            <span className="wb-pf-detail-label">Approved by</span>
            <span className="wb-pf-detail-value">{report.approved_by || '—'}</span>
          </div>
          <div>
            <span className="wb-pf-detail-label">Approved at</span>
            <span className="wb-pf-detail-value">{formatDateTime(report.approved_at)}</span>
          </div>
          <div>
            <span className="wb-pf-detail-label">Approval note</span>
            <span className="wb-pf-detail-value">{report.note || '—'}</span>
          </div>
        </div>
        <div className="wb-pf-stats">
          <Stat label="Total" value={formatMoney(totals.total_cents)} sub={`${count(totals.lines)} SMDs`} />
          <Stat label="Payable" value={formatMoney(totals.payable_cents)} />
          <Stat
            label="Held"
            value={formatMoney(totals.held_cents)}
            sub={`${count(totals.held)} not onboarded`}
            warning={totals.held > 0}
          />
          <Stat label="Sent" value={formatMoney(totals.sent_cents)} />
          <Stat
            label="Failed"
            value={formatMoney(totals.failed_cents)}
            sub={`${count(totals.failed)} line${totals.failed === 1 ? '' : 's'}`}
            danger={totals.failed > 0}
          />
        </div>
      </section>

      <section className="wb-pf-card" aria-labelledby="wb-pf-payout-lines-heading">
        <h3 id="wb-pf-payout-lines-heading" className="wb-pf-subheading">
          Lines
        </h3>
        <p className="wb-pf-muted" style={{ margin: 0 }}>
          Each amount is the SMD&apos;s ledger balance at the end of {formatDate(report.period_end)} (UTC). Expand
          a line for the ledger entries behind it.
        </p>
        <LinesTable
          report={report}
          canRetry={canRetry}
          canOpenStatement={canOpenStatement}
          backTo={backTo}
          retryingId={retryingId}
          onRetry={onRetry}
        />
      </section>

      {showApprove ? (
        <ApprovePayoutDialog
          open={dialogOpen}
          report={report}
          loading={approving}
          onClose={() => setDialogOpen(false)}
          onConfirm={async (note) => {
            if (await onApprove(note)) setDialogOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
