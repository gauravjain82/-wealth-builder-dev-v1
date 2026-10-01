/**
 * A billing cycle report — the dry-run preview or a stored (generated / approved) month:
 * header, totals, SEVC totals, the agents table, and Approve for the go-live month.
 * P4: an approved report shows its `sending` progress.
 * Renders the payload it is given; the page owns fetching.
 *
 * Screens and states: `docs/plugin-fees/UI.md` §2.6.
 */

import { useEffect, useState } from 'react';

import { Button, ConfirmationDialog, Textarea } from '@/shared/components';

import type { CycleReport, CycleTotals } from '../../types';
import { formatDateTime, formatMoney, formatMonth, humanize } from '../../utils/plugin-fees-format';
import { StatusBadge } from '../submission-parts';
import { SendingProgress } from '../payments/sending-progress';
import { CycleAgentsTable } from './cycle-agents-table';

const REPORT_STATUS: Record<string, { label: string; tone: string }> = {
  preview: { label: 'Preview', tone: 'info' },
  generating: { label: 'Generating', tone: 'neutral' },
  generated: { label: 'Awaiting approval', tone: 'pending' },
  approved: { label: 'Approved', tone: 'approved' },
};

export function CycleStatusBadge({ status }: { status: string }) {
  const known = REPORT_STATUS[status];
  return <StatusBadge status={status} label={known?.label ?? humanize(status)} tone={known?.tone ?? 'neutral'} />;
}

/** A totals card. `warning` is amber, `danger` red (P4 failed payments). */
export function Stat({
  label,
  value,
  sub,
  warning = false,
  danger = false,
}: {
  label: string;
  value: string;
  sub?: string;
  warning?: boolean;
  danger?: boolean;
}) {
  return (
    <div className={`wb-pf-stat${danger ? ' wb-pf-stat--danger' : warning ? ' wb-pf-stat--warning' : ''}`}>
      <span className="wb-pf-detail-label">{label}</span>
      <span className="wb-pf-stat-value">{value}</span>
      {sub ? <span className="wb-pf-stat-sub">{sub}</span> : null}
    </div>
  );
}

const count = (value: number) => value.toLocaleString();

export function TotalsGrid({ totals }: { totals: CycleTotals }) {
  return (
    <div className="wb-pf-stats">
      <Stat label="Agents billed" value={count(totals.agents_billed)} />
      <Stat
        label="Agents excluded"
        value={count(totals.agents_excluded)}
        sub={totals.agents_excluded > 0 ? 'Not billed — see the agents table' : undefined}
        warning={totals.agents_excluded > 0}
      />
      <Stat label="MDs" value={count(totals.md_count)} sub={`${formatMoney(totals.md_charges_cents)} total`} />
      <Stat label="SMDs" value={count(totals.smd_count)} sub={`${formatMoney(totals.smd_charges_cents)} total`} />
      <Stat label="Nothing to pay" value={count(totals.no_charge_count)} />
      <Stat label="Self-pay" value={count(totals.self_pay_count)} />
      {totals.automatic_without_verified_method > 0 ? (
        <div className="wb-pf-stat wb-pf-stat--warning wb-pf-stat--wide" role="alert">
          <span className="wb-pf-detail-label">Warning</span>
          <span className="wb-pf-stat-value">{count(totals.automatic_without_verified_method)}</span>
          <span className="wb-pf-stat-sub">
            will be charged automatically but have no verified payment method. Chase them before the 1st.
          </span>
        </div>
      ) : null}
    </div>
  );
}

function SevcTotalsTable({ report }: { report: CycleReport }) {
  if (!report.sevc_totals.length) return <p className="wb-pf-muted">No SEVC totals.</p>;
  return (
    <div className="wb-pf-table-wrap">
      <table className="wb-pf-table">
        <thead>
          <tr>
            <th scope="col">SEVC</th>
            <th scope="col" className="wb-pf-num">
              SMD fees
            </th>
            <th scope="col" className="wb-pf-num">
              Costs
            </th>
          </tr>
        </thead>
        <tbody>
          {report.sevc_totals.map((row) => (
            <tr key={row.sevc_id}>
              <td>{row.sevc_name ?? `SEVC #${row.sevc_id}`}</td>
              <td className="wb-pf-num">{formatMoney(row.smd_fees_cents)}</td>
              <td className="wb-pf-num">{formatMoney(row.costs_cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Approve requires a note saying what was checked; the confirm stays disabled while blank. */
export function ApproveCycleDialog({
  open,
  report,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  report: CycleReport;
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
      title={`Approve ${formatMonth(report.month)} billing`}
      message="Approving releases these invoices to be charged. This cannot be undone."
      confirmText="Approve"
      confirmVariant="default"
      confirmDisabled={!note.trim()}
      loading={loading}
      onConfirm={() => onConfirm(note.trim())}
      onClose={onClose}
    >
      <dl className="wb-pf-summary-list">
        <div>
          <dt>Agents billed</dt>
          <dd>{count(totals.agents_billed)}</dd>
        </div>
        <div>
          <dt>Agents excluded</dt>
          <dd>{count(totals.agents_excluded)}</dd>
        </div>
        <div>
          <dt>MDs</dt>
          <dd>
            {count(totals.md_count)} · {formatMoney(totals.md_charges_cents)}
          </dd>
        </div>
        <div>
          <dt>SMDs</dt>
          <dd>
            {count(totals.smd_count)} · {formatMoney(totals.smd_charges_cents)}
          </dd>
        </div>
        <div>
          <dt>Nothing to pay</dt>
          <dd>{count(totals.no_charge_count)}</dd>
        </div>
        <div>
          <dt>Self-pay</dt>
          <dd>{count(totals.self_pay_count)}</dd>
        </div>
        <div>
          <dt>Automatic, no verified method</dt>
          <dd className={totals.automatic_without_verified_method > 0 ? 'wb-pf-warn-text' : undefined}>
            {count(totals.automatic_without_verified_method)}
          </dd>
        </div>
      </dl>
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

export function CycleReportView({
  report,
  canApprove,
  canOpenStatement,
  approving,
  onApprove,
}: {
  report: CycleReport;
  canApprove: boolean;
  canOpenStatement: boolean;
  approving: boolean;
  onApprove: (note: string) => Promise<boolean>;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const showApprove = canApprove && report.status === 'generated';

  return (
    <div className="wb-pf-stack">
      <section className="wb-pf-card" aria-labelledby="wb-pf-report-heading">
        <div className="wb-pf-card-header">
          <div className="wb-pf-row">
            <h2 id="wb-pf-report-heading" className="wb-pf-report-title">
              {formatMonth(report.month)}
            </h2>
            <CycleStatusBadge status={report.status} />
          </div>
          {showApprove ? (
            <Button type="button" onClick={() => setDialogOpen(true)} disabled={approving}>
              Approve…
            </Button>
          ) : null}
        </div>
        {report.status === 'preview' ? (
          <div className="wb-pf-callout">
            Dry run: nothing was saved. The numbers reflect offices, assistants, payment methods and
            costs as they stand now.
          </div>
        ) : null}
        <div className="wb-pf-details">
          <div>
            <span className="wb-pf-detail-label">Approved by</span>
            <span className="wb-pf-detail-value">{report.approved_by || '—'}</span>
          </div>
          <div>
            <span className="wb-pf-detail-label">Approved at</span>
            <span className="wb-pf-detail-value">{formatDateTime(report.approved_at)}</span>
          </div>
          <div>
            <span className="wb-pf-detail-label">Requires approval</span>
            <span className="wb-pf-detail-value">{report.requires_approval ? 'Yes (go-live month)' : 'No'}</span>
          </div>
          <div>
            <span className="wb-pf-detail-label">Snapshot</span>
            <span className="wb-pf-detail-value wb-pf-mono" title={report.snapshot_digest}>
              {report.snapshot_digest ? `${report.snapshot_digest.slice(0, 16)}…` : '—'}
            </span>
          </div>
        </div>
        {report.status === 'approved' && report.sending ? <SendingProgress sending={report.sending} /> : null}
        <TotalsGrid totals={report.totals} />
      </section>

      <section className="wb-pf-card" aria-labelledby="wb-pf-sevc-heading">
        <h3 id="wb-pf-sevc-heading" className="wb-pf-subheading">
          By SEVC
        </h3>
        <SevcTotalsTable report={report} />
      </section>

      <section className="wb-pf-card" aria-labelledby="wb-pf-agents-heading">
        <h3 id="wb-pf-agents-heading" className="wb-pf-subheading">
          Agents
        </h3>
        <CycleAgentsTable
          agents={report.agents}
          month={report.month}
          reportStatus={report.status}
          canOpenStatement={canOpenStatement}
        />
      </section>

      {showApprove ? (
        <ApproveCycleDialog
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
