/**
 * Types for the WB reporting pipeline admin screen.
 *
 * Mirrors the Django `wbreporting` app's plain DRF payloads — this codebase has no
 * `{ok, data, meta}` envelope, so responses are read directly.
 */

/** Terminal and in-flight states a pipeline run can be in. */
export type PipelineRunStatus =
  | 'queued'
  | 'running'
  | 'success'
  | 'error'
  | 'already_running'
  | 'dry_run';

/** What caused a run to start. */
export type PipelineTriggerSource = 'cron' | 'manual' | 'deployment' | 'repair';

/** Jobs the backend knows about. */
export type PipelineJobName = 'recalculate_daily' | 'rebuild_monthly' | 'pipeline_check';

/** One row of run history. */
export interface PipelineRun {
  run_id: string;
  job_name: PipelineJobName;
  status: PipelineRunStatus;
  triggered_by: string;
  trigger_source: PipelineTriggerSource;
  requested_start: string | null;
  requested_end: string | null;
  rows_read: number;
  rows_written: number;
  rows_deleted: number;
  implemented_metrics: string[];
  skipped_metrics: string[];
  message: string;
  error_code: string;
  error_detail: string;
  started_at: string | null;
  heartbeat_at: string | null;
  finished_at: string | null;
  created_at: string;
  duration_seconds: number | null;
}

/** Latest run per job plus anything still in flight. */
export interface PipelineStatus {
  jobs: Partial<Record<PipelineJobName, PipelineRun>>;
  running: PipelineRun[];
  known_jobs: PipelineJobName[];
}

/** A page of run history. */
export interface PipelineRunsResponse {
  count: number;
  results: PipelineRun[];
}

/** A source table that is missing, or missing columns the jobs read. */
export interface SourceIssue {
  table: string;
  table_missing: boolean;
  missing_columns: string[];
}

/** Result of the capability check. */
export interface CapabilityReport {
  ok: boolean;
  source_issues: SourceIssue[];
  missing_owned_tables: string[];
}

/** What the current user may do, from `my-access/`. */
export interface PipelineAccess {
  can_view: boolean;
  can_manage: boolean;
}

/** Acknowledgement of a queued job. */
export interface EnqueuedJob {
  task_id: string;
  status: 'queued';
}

/** Request body for a manual daily rebuild. */
export interface RecalculateDailyRequest {
  start?: string;
  end?: string;
  days_back?: number;
  dry_run?: boolean;
}

/** Request body for a manual monthly rebuild. */
export interface RebuildMonthlyRequest {
  month?: string;
  previous_month?: boolean;
  dry_run?: boolean;
}
