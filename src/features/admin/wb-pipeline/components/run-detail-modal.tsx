/**
 * Full detail for one run: counts, metric coverage, and any error.
 *
 * The technical traceback is collapsed behind a disclosure so the readable
 * message comes first, as the delivered UI contract asks.
 */

import { Modal, Text } from '@/shared/components';

import type { PipelineRun } from '../types';
import { JOB_LABELS, formatCount, formatDuration, formatRange, formatTimestamp } from './format';
import { RunStatusBadge } from './run-status-badge';

interface RunDetailModalProps {
  run: PipelineRun | null;
  onClose: () => void;
}

export function RunDetailModal({ run, onClose }: RunDetailModalProps) {
  if (!run) return null;

  return (
    <Modal open title={`${JOB_LABELS[run.job_name]} run`} onClose={onClose}>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <RunStatusBadge status={run.status} />
          <Text variant="muted" className="font-mono text-xs">
            {run.run_id}
          </Text>
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="text-muted-foreground">Requested range</dt>
          <dd>{formatRange(run.requested_start, run.requested_end)}</dd>
          <dt className="text-muted-foreground">Triggered by</dt>
          <dd>
            {run.triggered_by || 'unattended'} <span className="capitalize">({run.trigger_source})</span>
          </dd>
          <dt className="text-muted-foreground">Started</dt>
          <dd>{formatTimestamp(run.started_at)}</dd>
          <dt className="text-muted-foreground">Heartbeat</dt>
          <dd>{formatTimestamp(run.heartbeat_at)}</dd>
          <dt className="text-muted-foreground">Finished</dt>
          <dd>{formatTimestamp(run.finished_at)}</dd>
          <dt className="text-muted-foreground">Duration</dt>
          <dd>{formatDuration(run.duration_seconds)}</dd>
          <dt className="text-muted-foreground">Rows read</dt>
          <dd>{formatCount(run.rows_read)}</dd>
          <dt className="text-muted-foreground">Rows written</dt>
          <dd>{formatCount(run.rows_written)}</dd>
          <dt className="text-muted-foreground">Rows deleted</dt>
          <dd>{formatCount(run.rows_deleted)}</dd>
        </dl>

        {run.message ? (
          <div>
            <Text weight="semibold">Message</Text>
            <Text variant="muted">{run.message}</Text>
          </div>
        ) : null}

        {run.implemented_metrics.length ? (
          <div>
            <Text weight="semibold">Metrics written</Text>
            <Text variant="muted" className="font-mono text-xs">
              {run.implemented_metrics.join(', ')}
            </Text>
          </div>
        ) : null}

        {run.skipped_metrics.length ? (
          <div>
            <Text weight="semibold">Skipped (no source mapping)</Text>
            <Text variant="muted" className="font-mono text-xs">
              {run.skipped_metrics.join(', ')}
            </Text>
            <Text variant="muted" className="text-xs">
              These columns are preserved, never overwritten with zeroes.
            </Text>
          </div>
        ) : null}

        {run.error_code ? (
          <details className="rounded border border-destructive/40 p-3">
            <summary className="cursor-pointer font-medium text-destructive">
              {run.error_code} — technical detail
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs">
              {run.error_detail}
            </pre>
          </details>
        ) : null}
      </div>
    </Modal>
  );
}
