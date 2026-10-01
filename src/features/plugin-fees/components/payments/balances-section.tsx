/**
 * SMD ledger balances (`GET balances/`, highest first): what is owed to each SMD, paid
 * out quarterly (P5). Shown on the billing cycles page, whose audience (`:manage`,
 * `:review`, `:payout_approve`) is exactly this endpoint's (PF29).
 * Screens: `docs/plugin-fees/UI.md` §2.6.
 */

import { Link } from 'react-router-dom';

import { ErrorState } from '@/shared/components';

import { useBalances } from '../../hooks/use-plugin-fees';
import { describeError, formatMoney } from '../../utils/plugin-fees-format';
import { SignedAmount } from '../statement/statement-view';

export function BalancesSection({
  canOpenStatement,
  backTo,
}: {
  canOpenStatement: boolean;
  /** Where the agent statement's back link returns (the cycles page with its open report). */
  backTo: string;
}) {
  const balances = useBalances();
  const rows = balances.data ?? [];
  // Only positive balances are owed to SMDs; a negative one is what the SMD owes.
  const owed = rows.reduce((sum, row) => sum + (row.balance_cents > 0 ? row.balance_cents : 0), 0);

  return (
    <section className="wb-pf-card" aria-labelledby="wb-pf-balances-heading">
      <div className="wb-pf-card-header">
        <h2 id="wb-pf-balances-heading" className="wb-pf-subheading">
          SMD ledger balances — owed to SMDs, paid quarterly
        </h2>
        {balances.data ? (
          <span className="wb-pf-detail-value">Total owed {formatMoney(owed)}</span>
        ) : null}
      </div>

      {balances.isLoading ? (
        <p className="wb-pf-muted">Loading…</p>
      ) : balances.isError ? (
        <ErrorState
          description={describeError(balances.error, 'Unable to load SMD balances.')}
          onRetry={() => void balances.refetch()}
        />
      ) : !rows.length ? (
        <p className="wb-pf-muted">No SMD has a ledger balance yet.</p>
      ) : (
        <div className="wb-pf-table-wrap">
          <table className="wb-pf-table wb-pf-table--dense">
            <thead>
              <tr>
                <th scope="col">SMD</th>
                <th scope="col">Agency code</th>
                <th scope="col" className="wb-pf-num">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.agent.id}>
                  <td>
                    {canOpenStatement ? (
                      <Link
                        to={`/admin/plugin-fees/agents/${row.agent.id}/statement`}
                        state={{ backTo, backLabel: 'Billing cycles' }}
                        className="wb-pf-link"
                      >
                        {row.agent.name || '—'}
                      </Link>
                    ) : (
                      row.agent.name || '—'
                    )}
                  </td>
                  <td>{row.agent.agency_code || '—'}</td>
                  <td className="wb-pf-num">
                    <SignedAmount cents={row.balance_cents} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
