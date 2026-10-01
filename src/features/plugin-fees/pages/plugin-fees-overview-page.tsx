/**
 * Admin plug-in fees overview (P6, contract §8) — the landing entry of the plug-in fees
 * admin menu. Route `/admin/plugin-fees`, guarded on `can_manage || can_review`. One call,
 * `GET dashboard/`, rendered as cards that link to the page holding the detail: payments,
 * follow-ups, verifications (deep-linked to the review queue's tab and filter),
 * recognition costs, this month's SEVC totals, the upcoming payout, and the SMDs whose
 * payout account is not set up. A link is shown only where `my-access/` lets the viewer
 * open its target. Screens and states: `docs/plugin-fees/UI.md` §2.11.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { ErrorState, Heading, NonIdealState, Text } from '@/shared/components';

import { useDashboard, usePluginFeesAccess } from '../hooks/use-plugin-fees';
import { Stat } from '../components/cycles/cycle-report';
import { ConnectStatusBadge } from '../components/payouts/payout-report';
import type { PluginFeesDashboard } from '../types';
import {
  canManageCosts,
  canSeeAgentStatements,
  canSeePayments,
  canSeePayouts,
  canSeeReviews,
  canSeeSevcTotals,
} from '../utils/plugin-fees-access';
import { describeError, formatDate, formatMoney, formatMonth } from '../utils/plugin-fees-format';
import { formatQuarter } from '../utils/plugin-fees-payout';
import '../components/plugin-fees.css';

const count = (value: number) => value.toLocaleString();

const BACK = { backTo: '/admin/plugin-fees', backLabel: 'Plug-in Fees' };

function OverviewCard({
  id,
  title,
  link,
  children,
}: {
  id: string;
  title: string;
  /** Omitted when the viewer cannot open the target page. */
  link?: { to: string; label: string };
  children: ReactNode;
}) {
  return (
    <section className="wb-pf-card" aria-labelledby={id}>
      <div className="wb-pf-card-header">
        <h2 id={id} className="wb-pf-subheading">
          {title}
        </h2>
        {link ? (
          <Link to={link.to} className="wb-pf-link">
            {link.label} →
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** A count that links to a filtered page, or plain text when the viewer cannot open it. */
function CountLink({ to, value, label }: { to: string | null; value: number; label: string }) {
  const body = (
    <>
      <span className="wb-pf-stat-value">{count(value)}</span>
      <span className="wb-pf-detail-label">{label}</span>
    </>
  );
  return to ? (
    <Link to={to} className={`wb-pf-stat wb-pf-stat--link${value > 0 ? ' wb-pf-stat--warning' : ''}`}>
      {body}
    </Link>
  ) : (
    <div className={`wb-pf-stat${value > 0 ? ' wb-pf-stat--warning' : ''}`}>{body}</div>
  );
}

function Overview({ data }: { data: PluginFeesDashboard }) {
  const { data: access } = usePluginFeesAccess();
  const payments = canSeePayments(access);
  const reviews = canSeeReviews(access);
  const costs = canManageCosts(access);
  const sevc = canSeeSevcTotals(access);
  const payouts = canSeePayouts(access);
  const statements = canSeeAgentStatements(access);
  const { counts } = data.payments;
  const review = (tab: string, status: string) =>
    reviews ? `/admin/plugin-fees/review?tab=${tab}&status=${status}` : null;
  const upcoming = data.upcoming_payout;

  return (
    <div className="wb-pf-stack">
      <OverviewCard
        id="wb-pf-ov-payments"
        title={`Payments — ${formatMonth(data.month)}`}
        link={payments ? { to: `/admin/plugin-fees/payments?month=${data.month}`, label: 'Payments' } : undefined}
      >
        <div className="wb-pf-stats">
          <Stat
            label="Outstanding"
            value={formatMoney(data.payments.outstanding_cents)}
            warning={data.payments.outstanding_cents > 0}
          />
          <Stat label="Paid" value={count(counts.paid)} />
          <Stat label="Processing" value={count(counts.processing)} sub="Bank payment, ~4 business days" />
          <Stat label="Retrying" value={count(counts.retrying)} warning={counts.retrying > 0} />
          <Stat label="Self-pay overdue" value={count(counts.self_pay_overdue)} warning={counts.self_pay_overdue > 0} />
          <Stat label="Failed" value={count(counts.failed)} danger={counts.failed > 0} />
          <Stat label="Klarna" value={count(data.payments.klarna_count)} sub="Paid with Klarna" />
          <Stat
            label="Follow-ups open"
            value={count(data.follow_ups_open)}
            sub="All months"
            warning={data.follow_ups_open > 0}
          />
        </div>
      </OverviewCard>

      <OverviewCard
        id="wb-pf-ov-verifications"
        title="Verifications"
        link={reviews ? { to: '/admin/plugin-fees/review', label: 'Reviews' } : undefined}
      >
        <div className="wb-pf-stats">
          <CountLink to={review('offices', 'pending')} value={data.verifications.offices_pending} label="Offices pending" />
          <CountLink
            to={review('assistants', 'pending')}
            value={data.verifications.assistants_pending}
            label="Assistants pending"
          />
          <CountLink
            to={review('assistants', 'reverify_due')}
            value={data.verifications.assistants_reverify_due}
            label="Re-verification due"
          />
          <CountLink
            to={review('assistants', 'reverify_due')}
            value={data.verifications.assistants_expiring_14d}
            label="Expiring within 14 days"
          />
        </div>
      </OverviewCard>

      <div className="wb-pf-overview-grid">
        <OverviewCard
          id="wb-pf-ov-costs"
          title="Recognition costs"
          link={costs ? { to: '/admin/plugin-fees/costs', label: 'Costs' } : undefined}
        >
          <Stat label="This month" value={formatMoney(data.costs_this_month_cents)} sub={formatMonth(data.month)} />
        </OverviewCard>

        <OverviewCard
          id="wb-pf-ov-payout"
          title="Upcoming payout"
          link={payouts ? { to: '/admin/plugin-fees/payouts', label: 'Payouts' } : undefined}
        >
          <div className="wb-pf-stats">
            <Stat
              label={formatQuarter(upcoming.quarter)}
              value={formatMoney(upcoming.positive_balances_cents)}
              sub={`${count(upcoming.smds)} SMDs · period ends ${formatDate(upcoming.period_end)}`}
            />
            <Stat
              label="Not onboarded"
              value={count(upcoming.not_onboarded)}
              sub="Will be held unless they set up payouts"
              warning={upcoming.not_onboarded > 0}
            />
          </div>
        </OverviewCard>
      </div>

      <OverviewCard
        id="wb-pf-ov-sevc"
        title={`SEVC totals — ${formatMonth(data.month)}`}
        link={sevc ? { to: '/admin/plugin-fees/sevc-totals', label: 'SEVC totals by month' } : undefined}
      >
        {!data.sevc_totals_this_month.length ? (
          <p className="wb-pf-muted">Nothing received by an SEVC this month.</p>
        ) : (
          <div className="wb-pf-table-wrap">
            <table className="wb-pf-table wb-pf-table--dense">
              <thead>
                <tr>
                  <th scope="col">SEVC</th>
                  <th scope="col" className="wb-pf-num">
                    SMD fees
                  </th>
                  <th scope="col" className="wb-pf-num">
                    Costs
                  </th>
                  <th scope="col" className="wb-pf-num">
                    MD fees, no SMD assistant
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.sevc_totals_this_month.map((row) => (
                  <tr key={row.sevc_id}>
                    <td>{row.sevc_name || `SEVC #${row.sevc_id}`}</td>
                    <td className="wb-pf-num">{formatMoney(row.smd_fees_cents)}</td>
                    <td className="wb-pf-num">{formatMoney(row.costs_cents)}</td>
                    <td className="wb-pf-num">{formatMoney(row.md_unrouted_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OverviewCard>

      <OverviewCard id="wb-pf-ov-connect" title="Payout accounts not set up">
        {!data.connect_not_onboarded.length ? (
          <p className="wb-pf-muted">Every SMD with a balance has a payout account ready.</p>
        ) : (
          <div className="wb-pf-table-wrap">
            <table className="wb-pf-table wb-pf-table--dense">
              <thead>
                <tr>
                  <th scope="col">SMD</th>
                  <th scope="col">Payout account</th>
                  <th scope="col" className="wb-pf-num">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.connect_not_onboarded.map((row) => (
                  <tr key={row.agent.id}>
                    <td>
                      {statements ? (
                        <Link
                          to={`/admin/plugin-fees/agents/${row.agent.id}/statement`}
                          state={BACK}
                          className="wb-pf-link"
                        >
                          {row.agent.name || '—'}
                        </Link>
                      ) : (
                        row.agent.name || '—'
                      )}
                      <span className="wb-pf-muted" style={{ display: 'block' }}>
                        {row.agent.agency_code || '—'}
                      </span>
                    </td>
                    <td>
                      <ConnectStatusBadge status={row.status} />
                    </td>
                    <td className="wb-pf-num">{formatMoney(row.balance_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OverviewCard>
    </div>
  );
}

export default function PluginFeesOverviewPage() {
  const dashboard = useDashboard();

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h4" weight="bold">
          Plug-in Fees
        </Heading>
        <Text variant="muted">
          This month&apos;s collection, open verifications, costs, SEVC receipts and the next quarterly payout,
          at a glance. Each card links to the page with the detail.
        </Text>
      </div>

      {dashboard.isLoading ? (
        <p className="wb-pf-muted">Loading…</p>
      ) : dashboard.isError ? (
        <ErrorState
          description={describeError(dashboard.error, 'Unable to load the plug-in fees overview.')}
          onRetry={() => void dashboard.refetch()}
        />
      ) : !dashboard.data ? (
        <NonIdealState title="No data" description="The overview returned nothing." />
      ) : (
        <Overview data={dashboard.data} />
      )}
    </div>
  );
}
