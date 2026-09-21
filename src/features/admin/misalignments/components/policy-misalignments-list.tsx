/** Presentational table for policy misalignments. */

import { Badge } from '@/shared/components';

import type { PolicyAgent, PolicyMisalignmentRow } from '../types';

interface PolicyMisalignmentsListProps {
  rows: PolicyMisalignmentRow[];
  onOpenPolicy: (policyId: number) => void;
  /** Click a valid agent / entered-by / updated-by to filter by agency code. */
  onFilterAgent: (value: string) => void;
}

function AgentCell({
  agent,
  index,
  onFilterAgent,
}: {
  agent: PolicyAgent | undefined;
  index: number;
  onFilterAgent: (value: string) => void;
}) {
  if (!agent) {
    return <div className="text-xs text-red-500">Agent {index + 1}: missing</div>;
  }
  if (!agent.valid) {
    return (
      <div className="text-xs text-red-500">
        Agent {index + 1}: invalid reference {agent.agent_id ?? '-'}
      </div>
    );
  }
  const split = agent.split_percentage === null ? '' : ` · ${agent.split_percentage}%`;
  return (
    <button
      type="button"
      onClick={() => onFilterAgent(agent.agency_code || '')}
      className="block text-left text-xs text-emerald-700 hover:underline dark:text-emerald-400"
    >
      Agent {index + 1}: <strong>{agent.name}</strong> [{agent.agency_code}]
      {split}
    </button>
  );
}

function PersonCell({
  name,
  code,
  id,
  onFilterAgent,
}: {
  name: string | null;
  code: string | null;
  id: number | null;
  onFilterAgent: (value: string) => void;
}) {
  if (!id) return <span className="text-xs text-gray-400">Missing</span>;
  return (
    <button
      type="button"
      onClick={() => onFilterAgent(code || String(id))}
      className="text-left text-xs text-emerald-700 hover:underline dark:text-emerald-400"
    >
      {(name || 'Unknown account') + (code ? ` [${code}]` : '') + ` · ID ${id}`}
    </button>
  );
}

export function PolicyMisalignmentsList({
  rows,
  onOpenPolicy,
  onFilterAgent,
}: PolicyMisalignmentsListProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
        <thead className="bg-slate-50 dark:bg-slate-800">
          <tr>
            <th className="px-4 py-2 text-left font-semibold">Policy</th>
            <th className="px-4 py-2 text-left font-semibold">Client</th>
            <th className="px-4 py-2 text-left font-semibold">Issue</th>
            <th className="px-4 py-2 text-left font-semibold">Entered by</th>
            <th className="px-4 py-2 text-left font-semibold">Updated by</th>
            <th className="px-4 py-2 text-left font-semibold">Agent assignments</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row) => (
            <tr key={row.policy_id} className="align-top">
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onOpenPolicy(row.policy_id)}
                  className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                  {row.policy_number || `Policy #${row.policy_id}`}
                </button>
                <div className="text-xs text-gray-500">
                  ID {row.policy_id}
                  {row.date_written ? ` · ${row.date_written}` : ''}
                </div>
              </td>
              <td className="px-4 py-3">
                {row.client_name || '-'}
                <div className="text-xs text-gray-500">{row.policy_status || '-'}</div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  {row.reasons.map((reason) => (
                    <Badge key={reason} variant="destructive">
                      {reason}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <PersonCell
                  name={row.created_by_name}
                  code={row.created_by_agency_code}
                  id={row.created_by_id}
                  onFilterAgent={onFilterAgent}
                />
              </td>
              <td className="px-4 py-3">
                <PersonCell
                  name={row.updated_by_name}
                  code={row.updated_by_agency_code}
                  id={row.updated_by_id}
                  onFilterAgent={onFilterAgent}
                />
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  {[row.agents[0], row.agents[1]].map((agent, index) => (
                    <AgentCell
                      key={index}
                      agent={agent}
                      index={index}
                      onFilterAgent={onFilterAgent}
                    />
                  ))}
                  {row.agents.slice(2).map((agent, index) => (
                    <AgentCell
                      key={index + 2}
                      agent={agent}
                      index={index + 2}
                      onFilterAgent={onFilterAgent}
                    />
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
