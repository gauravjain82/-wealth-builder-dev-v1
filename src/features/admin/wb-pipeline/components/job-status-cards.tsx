/**
 * One card per pipeline job showing its most recent outcome.
 *
 * Compact by design: at phone card width this stacks to a single column, and the
 * technical detail lives behind the run-detail modal rather than on the card.
 */

import { Card, CardContent, CardHeader, CardTitle, Text } from '@/shared/components';

import type { PipelineRun, PipelineStatus } from '../types';
import { JOB_LABELS, formatCount, formatDuration, formatRange, formatTimestamp } from './format';
import { RunStatusBadge } from './run-status-badge';

interface JobStatusCardsProps {
  status: PipelineStatus;
  onOpenRun: (run: PipelineRun) => void;
}

export function JobStatusCards({ status, onOpenRun }: JobStatusCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {status.known_jobs.map((jobName) => {
        const run = status.jobs[jobName];
        return (
          <Card key={jobName}>
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
              <CardTitle className="text-base">{JOB_LABELS[jobName]}</CardTitle>
              {run ? <RunStatusBadge status={run.status} /> : null}
            </CardHeader>
            <CardContent>
              {!run ? (
                <Text variant="muted" className="text-sm">
                  Never run.
                </Text>
              ) : (
                <div className="space-y-2 text-sm">
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                    <dt className="text-muted-foreground">Range</dt>
                    <dd>{formatRange(run.requested_start, run.requested_end)}</dd>
                    <dt className="text-muted-foreground">Finished</dt>
                    <dd>{formatTimestamp(run.finished_at)}</dd>
                    <dt className="text-muted-foreground">Took</dt>
                    <dd>{formatDuration(run.duration_seconds)}</dd>
                    <dt className="text-muted-foreground">Rows</dt>
                    <dd>
                      {formatCount(run.rows_written)} written · {formatCount(run.rows_deleted)}{' '}
                      deleted
                    </dd>
                    <dt className="text-muted-foreground">Trigger</dt>
                    <dd className="capitalize">{run.trigger_source}</dd>
                  </dl>
                  <button
                    type="button"
                    onClick={() => onOpenRun(run)}
                    className="text-sm font-medium underline underline-offset-2 hover:no-underline"
                  >
                    View detail
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
