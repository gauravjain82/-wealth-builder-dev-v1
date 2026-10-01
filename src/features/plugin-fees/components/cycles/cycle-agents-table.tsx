/**
 * The agents table of a billing cycle report: search and filters (client-side — the
 * report carries every agent), an expandable row per agent showing its invoice lines,
 * and a CSV export of exactly the rows the current filter shows. No request is made.
 */

import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button, Checkbox, Input, NonIdealState, Select } from '@/shared/components';

import type { CycleAgent, CycleMethodStatus } from '../../types';
import { downloadCsv, formatMoney, humanize, toCsv } from '../../utils/plugin-fees-format';
import { ExpandButton, InvoiceStatusBadge, LinesTable } from '../statement/statement-view';

type LevelFilter = 'all' | 'MD' | 'SMD';
type FlagFilter = 'all' | 'no_verified_method' | 'self_pay' | 'rolled_up' | 'no_office' | 'no_assistant';

const FLAG_OPTIONS: { value: FlagFilter; label: string }[] = [
  { value: 'all', label: 'Any flag' },
  { value: 'no_verified_method', label: 'Automatic, no verified method' },
  { value: 'self_pay', label: 'Pays each month themselves' },
  { value: 'rolled_up', label: 'MD credit rolled up' },
  { value: 'no_office', label: 'No approved office' },
  { value: 'no_assistant', label: 'SMD without verified assistant' },
];

const METHOD_LABEL: Record<CycleMethodStatus, string> = {
  none: 'None',
  pending_verification: 'Awaiting bank verification',
  verified: 'Verified',
  failed: 'Failed',
};

const EXCLUDED_REASON_TEXT: Record<string, string> = {
  no_sevc: 'No SEVC on recruiting line — not billed; fix the hierarchy',
};

/** Charged automatically on the 1st, but nothing verified to charge. */
function lacksVerifiedMethod(agent: CycleAgent): boolean {
  return agent.preference === 'automatic' && agent.method_status !== 'verified';
}

function matchesFlag(agent: CycleAgent, flag: FlagFilter): boolean {
  switch (flag) {
    case 'no_verified_method':
      return lacksVerifiedMethod(agent);
    case 'self_pay':
      return agent.preference === 'self_pay';
    case 'rolled_up':
      return agent.md_rolled_up;
    case 'no_office':
      return !agent.office_approved;
    case 'no_assistant':
      return agent.assistant_verified === false;
    default:
      return true;
  }
}

function Tick({ value }: { value: boolean | null }) {
  if (value === null) return <span aria-label="Not applicable">—</span>;
  return value ? (
    <span className="wb-pf-yes" aria-label="Yes">
      ✓
    </span>
  ) : (
    <span className="wb-pf-no" aria-label="No">
      ✗
    </span>
  );
}

function MdCredit({ agent }: { agent: CycleAgent }) {
  if (!agent.md_credit_kind) return <span>—</span>;
  return (
    <span className="wb-pf-row" style={{ gap: 6 }}>
      <span>
        {agent.md_credit_kind}
        {agent.md_credit_recipient_name ? ` · ${agent.md_credit_recipient_name}` : ''}
      </span>
      {agent.md_rolled_up ? <span className="wb-pf-tag">Rolled up</span> : null}
    </span>
  );
}

const dollars = (cents: number) => (cents / 100).toFixed(2);

function exportRows(agents: CycleAgent[]) {
  return [
    [
      'user_id',
      'name',
      'agency_code',
      'level',
      'office_approved',
      'assistant_verified',
      'fee',
      'costs',
      'amount_due',
      'status',
      'payment_choice',
      'method_status',
      'md_credit_kind',
      'md_credit_recipient_id',
      'md_credit_recipient_name',
      'md_rolled_up',
      'closest_sevc_id',
      'closest_sevc_name',
      'excluded_reason',
      'invoice_id',
    ],
    ...agents.map((agent) => [
      agent.user_id,
      agent.name,
      agent.agency_code,
      agent.level_code,
      agent.office_approved ? 'yes' : 'no',
      agent.assistant_verified === null ? '' : agent.assistant_verified ? 'yes' : 'no',
      dollars(agent.fee_cents),
      dollars(agent.costs_cents),
      dollars(agent.amount_cents),
      agent.status,
      agent.preference,
      agent.method_status,
      agent.md_credit_kind,
      agent.md_credit_recipient_id,
      agent.md_credit_recipient_name,
      agent.md_credit_kind ? (agent.md_rolled_up ? 'yes' : 'no') : '',
      agent.closest_sevc_id,
      agent.closest_sevc_name,
      agent.excluded_reason,
      agent.invoice_id,
    ]),
  ];
}

export function CycleAgentsTable({
  agents,
  month,
  reportStatus,
  canOpenStatement,
}: {
  agents: CycleAgent[];
  month: string;
  reportStatus: string;
  /** Agent names link to the read-only statement only for `can_review || can_manage`. */
  canOpenStatement: boolean;
}) {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<LevelFilter>('all');
  const [status, setStatus] = useState('all');
  const [flag, setFlag] = useState<FlagFilter>('all');
  const [excludedOnly, setExcludedOnly] = useState(false);
  const [open, setOpen] = useState<Set<number>>(() => new Set());

  const statuses = useMemo(() => Array.from(new Set(agents.map((agent) => agent.status))).sort(), [agents]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return agents.filter((agent) => {
      if (needle && !`${agent.name} ${agent.agency_code ?? ''}`.toLowerCase().includes(needle)) return false;
      if (level !== 'all' && agent.level_code !== level) return false;
      if (status !== 'all' && agent.status !== status) return false;
      if (excludedOnly && !agent.excluded_reason) return false;
      return matchesFlag(agent, flag);
    });
  }, [agents, search, level, status, flag, excludedOnly]);

  const toggle = (id: number) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onDownload = () =>
    downloadCsv(`plugin-fees-${month}-${reportStatus}-agents.csv`, toCsv(exportRows(rows)));

  return (
    <div className="wb-pf-stack">
      <div className="wb-pf-toolbar">
        <div className="wb-pf-search">
          <Input
            type="search"
            aria-label="Search agents"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or agency code"
          />
        </div>
        <Select
          aria-label="Level"
          value={level}
          onChange={(event) => setLevel(event.target.value as LevelFilter)}
          className="w-auto min-w-[7rem]"
        >
          <option value="all">All levels</option>
          <option value="MD">MD</option>
          <option value="SMD">SMD</option>
        </Select>
        <Select
          aria-label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="w-auto min-w-[9rem]"
        >
          <option value="all">All statuses</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {humanize(value)}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Flag"
          value={flag}
          onChange={(event) => setFlag(event.target.value as FlagFilter)}
          className="w-auto min-w-[12rem]"
        >
          {FLAG_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <label className="wb-pf-row" style={{ gap: 6 }}>
          <Checkbox checked={excludedOnly} onChange={(event) => setExcludedOnly(event.target.checked)} />
          <span className="text-sm">Excluded only</span>
        </label>
        <span className="wb-pf-muted">
          {rows.length.toLocaleString()} of {agents.length.toLocaleString()}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={onDownload} disabled={!rows.length}>
          Download CSV
        </Button>
      </div>

      {!rows.length ? (
        <NonIdealState
          title="No agents"
          description={agents.length ? 'No agents match these filters.' : 'This report lists no agents.'}
        />
      ) : (
        <div className="wb-pf-table-wrap">
          <table className="wb-pf-table wb-pf-table--dense">
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Lines</span>
                </th>
                <th scope="col">Name</th>
                <th scope="col">Agency code</th>
                <th scope="col">Level</th>
                <th scope="col">Office</th>
                <th scope="col">Assistant</th>
                <th scope="col" className="wb-pf-num">
                  Fee
                </th>
                <th scope="col" className="wb-pf-num">
                  Costs
                </th>
                <th scope="col" className="wb-pf-num">
                  Amount due
                </th>
                <th scope="col">Status</th>
                <th scope="col">Payment</th>
                <th scope="col">Method</th>
                <th scope="col">MD credit to</th>
                <th scope="col">Excluded</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((agent) => {
                const expanded = open.has(agent.user_id);
                const panelId = `wb-pf-agent-${agent.user_id}`;
                const excluded = Boolean(agent.excluded_reason);
                const noMethod = lacksVerifiedMethod(agent);
                return (
                  <Fragment key={agent.user_id}>
                    <tr className={excluded ? 'wb-pf-row--excluded' : undefined}>
                      <td>
                        <ExpandButton
                          expanded={expanded}
                          controls={panelId}
                          label={agent.name}
                          onToggle={() => toggle(agent.user_id)}
                        />
                      </td>
                      <td>
                        {canOpenStatement ? (
                          <Link to={`/admin/plugin-fees/agents/${agent.user_id}/statement`} className="wb-pf-link">
                            {agent.name || '—'}
                          </Link>
                        ) : (
                          agent.name || '—'
                        )}
                      </td>
                      <td>{agent.agency_code || '—'}</td>
                      <td>{agent.level_code || '—'}</td>
                      <td>
                        <Tick value={agent.office_approved} />
                      </td>
                      <td>
                        <Tick value={agent.assistant_verified} />
                      </td>
                      <td className="wb-pf-num">{formatMoney(agent.fee_cents)}</td>
                      <td className="wb-pf-num">{formatMoney(agent.costs_cents)}</td>
                      <td className="wb-pf-num">
                        <strong>{formatMoney(agent.amount_cents)}</strong>
                      </td>
                      <td>
                        <InvoiceStatusBadge status={agent.status} />
                      </td>
                      <td>{agent.preference === 'self_pay' ? 'Self-pay' : 'Automatic'}</td>
                      <td className={noMethod ? 'wb-pf-warn-text' : undefined}>
                        {METHOD_LABEL[agent.method_status] ?? humanize(agent.method_status)}
                        {noMethod ? <span className="sr-only"> — cannot be charged automatically yet</span> : null}
                      </td>
                      <td>
                        <MdCredit agent={agent} />
                      </td>
                      <td>
                        {agent.excluded_reason ? (
                          <span className="wb-pf-excluded-reason">
                            {EXCLUDED_REASON_TEXT[agent.excluded_reason] ?? humanize(agent.excluded_reason)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                    {expanded ? (
                      <tr id={panelId} className="wb-pf-detail-row">
                        <td colSpan={14}>
                          <div className="wb-pf-detail-inner">
                            <LinesTable lines={agent.lines} totalCents={agent.amount_cents} />
                            <p className="wb-pf-muted" style={{ margin: 0 }}>
                              Closest SEVC: {agent.closest_sevc_name ?? '—'} ·
                              Invoice: {agent.invoice_id !== null ? `#${agent.invoice_id}` : '—'}
                            </p>
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
      )}
    </div>
  );
}
