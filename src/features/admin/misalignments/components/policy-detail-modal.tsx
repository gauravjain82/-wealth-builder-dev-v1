/** Modal showing a policy's linked records (agents, ledger, advances, chargebacks). */

import { Modal, LoadingState, ErrorState } from '@/shared/components';

import { usePolicyDetail } from '../hooks/use-misalignments';
import type { PolicyDetail } from '../types';

interface PolicyDetailModalProps {
  policyId: number | null;
  onClose: () => void;
}

function DetailGrid({ items }: { items: [string, unknown][] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded bg-slate-50 p-2 dark:bg-slate-800">
          <div className="text-xs text-gray-500">{label}</div>
          <div className="text-sm font-semibold">{value == null || value === '' ? '-' : String(value)}</div>
        </div>
      ))}
    </div>
  );
}

function MiniTable({
  title,
  fields,
  items,
}: {
  title: string;
  fields: [string, string][];
  items: Record<string, unknown>[];
}) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {items.length ? (
        <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-700">
          <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                {fields.map(([label]) => (
                  <th key={label} className="px-3 py-1.5 text-left font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item, index) => (
                <tr key={index}>
                  {fields.map(([, key]) => (
                    <td key={key} className="px-3 py-1.5">
                      {item[key] == null || item[key] === '' ? '-' : String(item[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-xs text-gray-400">No related records.</div>
      )}
    </section>
  );
}

function DetailBody({ detail }: { detail: PolicyDetail }) {
  const { policy } = detail;
  const agentRows = detail.agents.map((item) => ({
    name: item.full_name || 'Invalid / missing account',
    agency: item.agency_code || `User ID ${item.agent_id ?? '-'}`,
    split: item.split_percentage === null ? '-' : `${item.split_percentage}%`,
    active: item.is_active ? 'Active' : 'Inactive',
  }));

  return (
    <div>
      <section>
        <h3 className="mb-2 text-sm font-semibold">Basic info</h3>
        <DetailGrid
          items={[
            ['Status', policy.status],
            ['Date written', policy.date_written],
            ['Closure date', policy.closure_date],
            ['Issued date', policy.issued_date],
            ['Client', policy.client_name],
            [
              'Client account',
              policy.client_account_name
                ? `${policy.client_account_name} [${policy.client_account_code || '-'}]`
                : '-',
            ],
            ['Delivery', policy.policy_delivery_mode],
            ['Delivery status', policy.policy_delivery_status],
            ['Trial app', policy.is_trial_app ? 'Yes' : 'No'],
            ['Multiplier', policy.multiplier_snapshot],
            ['Base points', policy.base_points],
          ]}
        />
      </section>
      <MiniTable
        title="Agents & share"
        fields={[
          ['Agent', 'name'],
          ['Agency code', 'agency'],
          ['Share', 'split'],
          ['Account', 'active'],
        ]}
        items={agentRows}
      />
      <MiniTable
        title="Point ledger"
        fields={[
          ['Date', 'effective_date'],
          ['Type', 'entry_type'],
          ['Points', 'points'],
          ['Advance payment', 'advance_payment_id'],
          ['User', 'user_id'],
        ]}
        items={detail.ledger as unknown as Record<string, unknown>[]}
      />
      <MiniTable
        title="Advance payments"
        fields={[
          ['Type', 'advance_type'],
          ['Percent', 'percentage'],
          ['Paid date', 'paid_date'],
          ['Created', 'created_at'],
        ]}
        items={detail.advances as unknown as Record<string, unknown>[]}
      />
      <MiniTable
        title="Chargebacks"
        fields={[
          ['Type', 'chargeback_type'],
          ['Date', 'chargeback_date'],
          ['Months', 'months_completed'],
          ['Percent', 'calculated_percentage'],
        ]}
        items={detail.chargebacks as unknown as Record<string, unknown>[]}
      />
    </div>
  );
}

export function PolicyDetailModal({ policyId, onClose }: PolicyDetailModalProps) {
  const { data, isLoading, isError } = usePolicyDetail(policyId);
  const policy = data?.detail.policy;
  const title = policy ? policy.policy_number || `Policy #${policy.id}` : 'Policy details';

  return (
    <Modal open={policyId != null} onClose={onClose} title={title}>
      {isLoading && <LoadingState title="Loading policy details" description="Please wait..." />}
      {isError && <ErrorState description="Unable to load policy details." />}
      {data?.detail && (
        <>
          <p className="mb-3 text-sm text-gray-500">
            {(policy?.client_name || '-') + ` · Policy ID ${policy?.id}`}
          </p>
          <DetailBody detail={data.detail} />
        </>
      )}
    </Modal>
  );
}
