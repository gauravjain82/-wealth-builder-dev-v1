/**
 * WB reporting pipeline operations screen.
 *
 * Shows the latest outcome per job, the capability check, manual triggers, and the
 * recent activity log. Every mutating control is additionally enforced server-side;
 * `canManage` only decides what is offered.
 */

import { useState } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  Heading,
  LoadingState,
  Select,
  Text,
} from '@/shared/components';

import { CapabilityPanel } from '../components/capability-panel';
import { JobStatusCards } from '../components/job-status-cards';
import { ManualRebuildPanel } from '../components/manual-rebuild-panel';
import { RunDetailModal } from '../components/run-detail-modal';
import { RunsTable } from '../components/runs-table';
import { usePipelineAccess, usePipelineRuns, usePipelineStatus } from '../hooks/use-wb-pipeline';
import type { PipelineJobName, PipelineRun, PipelineRunStatus } from '../types';

const PAGE_HEADING = 'Reporting Pipeline';
const PAGE_DESCRIPTION =
  'Job status, source capability, and manual rebuilds for the WB-owned reporting tables.';

const JOB_OPTIONS: Array<{ value: PipelineJobName | ''; label: string }> = [
  { value: '', label: 'All jobs' },
  { value: 'recalculate_daily', label: 'Daily recalculation' },
  { value: 'rebuild_monthly', label: 'Monthly snapshot' },
  { value: 'pipeline_check', label: 'Capability check' },
];

const STATUS_OPTIONS: Array<{ value: PipelineRunStatus | ''; label: string }> = [
  { value: '', label: 'Any status' },
  { value: 'success', label: 'Success' },
  { value: 'error', label: 'Error' },
  { value: 'running', label: 'Running' },
  { value: 'queued', label: 'Queued' },
  { value: 'dry_run', label: 'Dry run' },
  { value: 'already_running', label: 'Already running' },
];

export default function WbPipelinePage() {
  const access = usePipelineAccess();
  const status = usePipelineStatus();

  const [job, setJob] = useState<PipelineJobName | ''>('');
  const [runStatus, setRunStatus] = useState<PipelineRunStatus | ''>('');
  const runs = usePipelineRuns({ job, status: runStatus, limit: 50 });

  const [openRun, setOpenRun] = useState<PipelineRun | null>(null);

  if (status.isLoading || access.isLoading) {
    return <LoadingState pageHeading={PAGE_HEADING} pageDescription={PAGE_DESCRIPTION} />;
  }
  if (status.isError) {
    return (
      <ErrorState
        pageHeading={PAGE_HEADING}
        description="Unable to load the pipeline status."
        onRetry={() => status.refetch()}
      />
    );
  }

  const canManage = access.data?.can_manage ?? false;
  const running = status.data?.running ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Heading as="h1" variant="h4" weight="bold">
            {PAGE_HEADING}
          </Heading>
          <Text variant="muted">{PAGE_DESCRIPTION}</Text>
        </div>
        <Button variant="outline" onClick={() => status.refetch()}>
          Refresh
        </Button>
      </div>

      {running.length ? (
        <Text className="text-blue-600 dark:text-blue-400">
          {running.length === 1 ? 'A job is' : `${running.length} jobs are`} in flight. A second
          rebuild will exit as “already running” rather than overlap.
        </Text>
      ) : null}

      {status.data ? <JobStatusCards status={status.data} onOpenRun={setOpenRun} /> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CapabilityPanel canManage={canManage} />
        <ManualRebuildPanel canManage={canManage} />
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">Recent activity</CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={job}
              onChange={(event) => setJob(event.target.value as PipelineJobName | '')}
              aria-label="Filter by job"
            >
              {JOB_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select
              value={runStatus}
              onChange={(event) => setRunStatus(event.target.value as PipelineRunStatus | '')}
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {runs.data ? (
              <Text variant="muted" className="text-sm">
                {runs.data.count.toLocaleString()} shown
              </Text>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {runs.isError ? (
            <Text className="text-destructive">{(runs.error as Error).message}</Text>
          ) : (
            <RunsTable runs={runs.data?.results ?? []} onOpenRun={setOpenRun} />
          )}
        </CardContent>
      </Card>

      <RunDetailModal run={openRun} onClose={() => setOpenRun(null)} />
    </div>
  );
}
