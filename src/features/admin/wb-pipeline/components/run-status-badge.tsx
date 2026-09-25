/** Colour-coded badge for a pipeline run status. */

import { Badge } from '@/shared/components';

import type { PipelineRunStatus } from '../types';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';

/**
 * `already_running` is deliberately informational, not a failure: a job that
 * declines to overlap did the right thing.
 */
const VARIANTS: Record<PipelineRunStatus, BadgeVariant> = {
  queued: 'secondary',
  running: 'info',
  success: 'success',
  error: 'destructive',
  already_running: 'warning',
  dry_run: 'outline',
};

const LABELS: Record<PipelineRunStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  success: 'Success',
  error: 'Error',
  already_running: 'Already running',
  dry_run: 'Dry run',
};

export function RunStatusBadge({ status }: { status: PipelineRunStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
