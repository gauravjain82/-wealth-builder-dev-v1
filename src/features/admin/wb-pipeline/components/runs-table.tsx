/** Recent run history, newest first, with a row-level detail affordance. */

import { NonIdealState, Text } from '@/shared/components';

import type { PipelineRun } from '../types';
import { JOB_LABELS, formatCount, formatDuration, formatRange, formatTimestamp } from './format';
import { RunStatusBadge } from './run-status-badge';

interface RunsTableProps {
  runs: PipelineRun[];
  onOpenRun: (run: PipelineRun) => void;
}

export function RunsTable({ runs, onOpenRun }: RunsTableProps) {
  if (!runs.length) {
    return (
      <NonIdealState
        title="No runs yet"
        description="Trigger a capability check or a dry run to see activity here."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[46rem] text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Job</th>
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2 pr-3 font-medium">Range</th>
            <th className="py-2 pr-3 font-medium">Written</th>
            <th className="py-2 pr-3 font-medium">Deleted</th>
            <th className="py-2 pr-3 font-medium">Took</th>
            <th className="py-2 pr-3 font-medium">Trigger</th>
            <th className="py-2 pr-3 font-medium">Finished</th>
            <th className="py-2 font-medium">
              <span className="sr-only">Detail</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.run_id} className="border-b last:border-0">
              <td className="py-2 pr-3">{JOB_LABELS[run.job_name] ?? run.job_name}</td>
              <td className="py-2 pr-3">
                <RunStatusBadge status={run.status} />
              </td>
              <td className="py-2 pr-3 whitespace-nowrap">
                {formatRange(run.requested_start, run.requested_end)}
              </td>
              <td className="py-2 pr-3 tabular-nums">{formatCount(run.rows_written)}</td>
              <td className="py-2 pr-3 tabular-nums">{formatCount(run.rows_deleted)}</td>
              <td className="py-2 pr-3 whitespace-nowrap">{formatDuration(run.duration_seconds)}</td>
              <td className="py-2 pr-3 capitalize">{run.trigger_source}</td>
              <td className="py-2 pr-3 whitespace-nowrap">{formatTimestamp(run.finished_at)}</td>
              <td className="py-2">
                <button
                  type="button"
                  onClick={() => onOpenRun(run)}
                  className="font-medium underline underline-offset-2 hover:no-underline"
                  aria-label={`View detail for the ${JOB_LABELS[run.job_name] ?? run.job_name} run started ${formatTimestamp(run.created_at)}`}
                >
                  Detail
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Text variant="muted" className="mt-2 text-xs">
        Runs that exited “already running” declined to overlap another job — that is the
        intended behaviour, not a failure.
      </Text>
    </div>
  );
}
