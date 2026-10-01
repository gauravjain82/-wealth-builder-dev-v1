/**
 * Read-only lookup of any agent's statement of account, for the Hierarchy Assistant and
 * admins. Route `/admin/plugin-fees/agents/:id/statement`, guarded on `can_review ||
 * can_manage`. Data: `GET agents/{id}/statement/`. Reached from the billing cycle report,
 * the payments dashboard, follow-ups and SMD balances; a link may pass
 * `state: { backTo, backLabel }` so the back link returns there (default: Billing cycles).
 *
 * P6, `:manage` only: "Void…" on a `draft`, `open` or `failed` invoice, and "Adjust
 * ledger" for an SMD, which opens the adjustments page with this SMD prefilled.
 * Screens and states: `docs/plugin-fees/UI.md` §2.7.
 */

import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import { ErrorState, Heading, NonIdealState, Text } from '@/shared/components';

import { useAgentStatement, usePluginFeesAccess } from '../hooks/use-plugin-fees';
import { VoidInvoiceDialog, type VoidTarget } from '../components/invoices/void-invoice-dialog';
import { StatementView } from '../components/statement/statement-view';
import { canManageAdjustments, canVoidInvoices } from '../utils/plugin-fees-access';
import { describeError } from '../utils/plugin-fees-format';
import '../components/plugin-fees.css';

function parseId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Where the back link goes. Only in-app plug-in fees admin paths (the overview included) are honoured. */
function backTarget(state: unknown): { to: string; label: string } {
  const value = (state ?? {}) as { backTo?: unknown; backLabel?: unknown };
  if (typeof value.backTo === 'string' && /^\/admin\/plugin-fees(\/|\?|$)/.test(value.backTo)) {
    return {
      to: value.backTo,
      label: typeof value.backLabel === 'string' && value.backLabel ? value.backLabel : 'Back',
    };
  }
  return { to: '/admin/plugin-fees/cycles', label: 'Billing cycles' };
}

export default function PluginFeesAgentStatementPage() {
  const params = useParams<{ id: string }>();
  const location = useLocation();
  const back = backTarget(location.state);
  const id = parseId(params.id);
  const statement = useAgentStatement(id);
  const agent = statement.data?.agent;
  const { data: access } = usePluginFeesAccess();
  const canVoid = canVoidInvoices(access);
  const [voiding, setVoiding] = useState<VoidTarget | null>(null);
  // An SMD (or anyone holding a ledger); the backend validates `smd_id` either way.
  const canAdjust =
    canManageAdjustments(access) && Boolean(agent && (agent.level_code === 'SMD' || statement.data?.ledger));
  const adjustLink =
    canAdjust && agent ? (
      <Link
        to="/admin/plugin-fees/adjustments"
        state={{
          prefillSmd: { id: agent.id, label: agent.name || `User #${agent.id}` },
          backTo: `${location.pathname}${location.search}`,
          backLabel: 'Statement',
        }}
        className="wb-pf-link"
      >
        Adjust ledger…
      </Link>
    ) : null;

  return (
    <div className="space-y-6">
      <div className="wb-pf-stack" style={{ gap: 6 }}>
        <Link to={back.to} className="wb-pf-link">
          ← {back.label}
        </Link>
        <Heading as="h1" variant="h4" weight="bold">
          Statement of account{agent ? ` — ${agent.name || '—'}` : ''}
        </Heading>
        {agent ? (
          <Text variant="muted">
            {agent.agency_code || '—'} · {agent.level_code || '—'}
            {agent.email ? ` · ${agent.email}` : ''}
            {canVoid ? '' : ' · read-only'}
          </Text>
        ) : null}
        {/* With no ledger card to sit in, the shortcut goes under the heading. */}
        {adjustLink && !statement.data?.ledger ? <div>{adjustLink}</div> : null}
      </div>

      {id === null ? (
        <NonIdealState title="Unknown agent" description="This link does not name an agent." />
      ) : statement.isLoading ? (
        <p className="wb-pf-muted">Loading…</p>
      ) : statement.isError || !statement.data ? (
        <ErrorState
          description={describeError(statement.error, 'Unable to load this statement of account.')}
          onRetry={() => void statement.refetch()}
        />
      ) : (
        <StatementView
          statement={statement.data}
          own={false}
          ledgerAction={statement.data.ledger ? adjustLink : undefined}
          voidInvoice={
            canVoid
              ? {
                  disabled: voiding !== null,
                  onVoid: (invoice) =>
                    setVoiding({
                      id: invoice.id,
                      agentName: agent?.name ?? null,
                      month: invoice.month,
                      amountCents: invoice.amount_cents,
                    }),
                }
              : undefined
          }
        />
      )}

      {canVoid ? <VoidInvoiceDialog target={voiding} onClose={() => setVoiding(null)} /> : null}
    </div>
  );
}
