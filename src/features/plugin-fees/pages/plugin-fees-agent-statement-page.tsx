/**
 * Read-only lookup of any agent's statement of account, for the Hierarchy Assistant and
 * admins. Route `/admin/plugin-fees/agents/:id/statement`, guarded on `can_review ||
 * can_manage`. Data: `GET agents/{id}/statement/`. Reached from the billing cycle report,
 * the payments dashboard, follow-ups and SMD balances; a link may pass
 * `state: { backTo, backLabel }` so the back link returns there (default: Billing cycles).
 * Screens and states: `docs/plugin-fees/UI.md` §2.7.
 */

import { Link, useLocation, useParams } from 'react-router-dom';

import { ErrorState, Heading, NonIdealState, Text } from '@/shared/components';

import { useAgentStatement } from '../hooks/use-plugin-fees';
import { StatementView } from '../components/statement/statement-view';
import { describeError } from '../utils/plugin-fees-format';
import '../components/plugin-fees.css';

function parseId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Where the back link goes. Only in-app admin paths are honoured. */
function backTarget(state: unknown): { to: string; label: string } {
  const value = (state ?? {}) as { backTo?: unknown; backLabel?: unknown };
  if (typeof value.backTo === 'string' && value.backTo.startsWith('/admin/plugin-fees/')) {
    return {
      to: value.backTo,
      label: typeof value.backLabel === 'string' && value.backLabel ? value.backLabel : 'Back',
    };
  }
  return { to: '/admin/plugin-fees/cycles', label: 'Billing cycles' };
}

export default function PluginFeesAgentStatementPage() {
  const params = useParams<{ id: string }>();
  const back = backTarget(useLocation().state);
  const id = parseId(params.id);
  const statement = useAgentStatement(id);
  const agent = statement.data?.agent;

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
            {agent.email ? ` · ${agent.email}` : ''} · read-only
          </Text>
        ) : null}
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
        <StatementView statement={statement.data} own={false} />
      )}
    </div>
  );
}
