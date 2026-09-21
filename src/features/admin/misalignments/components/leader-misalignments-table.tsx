/** Presentational table for leader (hierarchy) misalignments. */

import { Badge } from '@/shared/components';

import type { LeaderMisalignmentRow, RecruitingTrailNode } from '../types';

interface LeaderMisalignmentsTableProps {
  rows: LeaderMisalignmentRow[];
  /** Click a recruiting-trail node to filter the list by that agency code. */
  onFilterAgent: (value: string) => void;
}

function RecruitingTrail({
  nodes,
  onFilterAgent,
}: {
  nodes: RecruitingTrailNode[];
  onFilterAgent: (value: string) => void;
}) {
  if (!nodes.length) {
    return <span className="text-sm text-gray-400">No recruiting trail found.</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
      {nodes.map((node, index) => (
        <span key={node.id} className="flex items-center gap-1">
          {index > 0 && <span className="text-gray-400">→</span>}
          <button
            type="button"
            onClick={() => onFilterAgent(String(node.agent_id || node.id || ''))}
            className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200"
          >
            {node.name || '-'} [{node.agent_id || node.id || '-'}]
            {node.level_code ? ` · ${node.level_code}` : ''}
          </button>
        </span>
      ))}
    </div>
  );
}

export function LeaderMisalignmentsTable({ rows, onFilterAgent }: LeaderMisalignmentsTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
        <thead className="bg-slate-50 dark:bg-slate-800">
          <tr>
            <th className="px-4 py-2 text-left font-semibold">Account</th>
            <th className="px-4 py-2 text-left font-semibold">Issues</th>
            <th className="px-4 py-2 text-left font-semibold">Current leader</th>
            <th className="px-4 py-2 text-left font-semibold">Recruiting trail toward SMD</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row) => (
            <tr key={row.id} className="align-top">
              <td className="px-4 py-3">
                <div className="font-semibold">{row.name}</div>
                <div className="text-xs text-gray-500">
                  {row.agent_id} · {row.level_code || 'No level'} · User {row.id}
                </div>
                {row.email && <div className="text-xs text-gray-400">{row.email}</div>}
                {row.phone && <div className="text-xs text-gray-400">{row.phone}</div>}
                {row.last_login && (
                  <div className="text-xs text-gray-400">Last login: {row.last_login}</div>
                )}
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
                {row.leader_name ? (
                  <>
                    <div className="font-semibold">{row.leader_name}</div>
                    <div className="text-xs text-gray-500">
                      {row.leader_agent_id || '-'} · {row.leader_level_code || 'No level'}
                    </div>
                  </>
                ) : (
                  <span className="text-sm text-gray-400">No valid leader account</span>
                )}
              </td>
              <td className="px-4 py-3">
                <RecruitingTrail nodes={row.recruiting_trail} onFilterAgent={onFilterAgent} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
