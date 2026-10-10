import { useEffect, useState } from 'react';
import { Badge, Button, Card, CardContent, ErrorState, Input, Label, LoadingState, Text } from '@shared/components';
import { useToastStore } from '@/store';
import { useFetchActions, useFetchConfig, useFetchRuns } from '../../hooks/use-external-tickets';
import type { FetchRun, FetchStatus, FetchStepStatus } from '../../types/external-tickets';
import { errorText } from './labels';
import { Pager } from './shared';

interface FetchPanelProps {
  eventId: number;
  /** The WB event's name, offered as the BSCPro name until one is saved (they are usually created alike). */
  eventName: string;
  /** Jump to the review queue (conflicts, holds, missing tickets). */
  onShowReview: () => void;
}

const STATUS_LABEL: Record<FetchStatus, string> = {
  queued: 'Queued',
  running: 'Running…',
  succeeded: 'Updated',
  no_change: 'No change',
  needs_review: 'Needs review',
  failed: 'Failed',
};

const STATUS_VARIANT: Record<FetchStatus, 'success' | 'warning' | 'secondary' | 'outline' | 'info'> = {
  queued: 'info',
  running: 'info',
  succeeded: 'success',
  no_change: 'secondary',
  needs_review: 'warning',
  failed: 'outline',
};

const STEP_MARK: Record<FetchStepStatus, { mark: string; className: string; label: string }> = {
  ok: { mark: '✓', className: 'text-green-600', label: 'Done' },
  failed: { mark: '✕', className: 'text-red-600', label: 'Failed' },
  running: { mark: '…', className: 'text-sky-600', label: 'Running' },
  skipped: { mark: '–', className: 'text-slate-400', label: 'Skipped' },
  pending: { mark: '·', className: 'text-slate-400', label: 'Not reached' },
};

function intervalLabel(minutes: number): string {
  if (minutes === 60) return 'Every hour';
  if (minutes === 1440) return 'Once a day';
  return `Every ${minutes / 60} hours`;
}

/** What a run changed, in the words staff use; absent parts are left out. */
function changeSummary(run: FetchRun): string {
  const t = run.counts.tickets;
  const p = run.counts.transactions;
  const parts = [
    t?.created ? `${t.created} new tickets` : '',
    t?.transferred ? `${t.transferred} transferred` : '',
    t?.renamed ? `${t.renamed} renamed` : '',
    t?.contact_changed ? `${t.contact_changed} contact updates` : '',
    p?.new ? `${p.new} payments added` : '',
    p?.changed ? `${p.changed} payments changed` : '',
  ].filter(Boolean);
  return parts.join(' · ');
}

function reviewSummary(run: FetchRun): string {
  const t = run.counts.tickets;
  const p = run.counts.transactions;
  return [
    t?.conflicts ? `${t.conflicts} conflicts` : '',
    t?.holds ? `${t.holds} identity holds` : '',
    t?.missing_review ? `${t.missing_review} tickets missing from the export` : '',
    p?.unmatched ? `${p.unmatched} payments with no purchase` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Fetch from BSCPro — the backend signs in to the partner, selects the event
 * named here, downloads both exports and applies them. By default this happens
 * only when someone presses "Run now"; the schedule controls appear only on a
 * deployment that has scheduling switched on (`schedule_available`). Every run is listed with its
 * step log; a failed or needs-review run is highlighted. The partner login is held by the server and is never shown or
 * entered here.
 */
export function FetchPanel({ eventId, eventName, onShowReview }: FetchPanelProps) {
  const addToast = useToastStore((state) => state.addToast);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);
  const [externalId, setExternalId] = useState('');
  const [externalName, setExternalName] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [interval, setIntervalMinutes] = useState(60);
  const [error, setError] = useState<string | null>(null);

  const config = useFetchConfig(eventId);
  const runs = useFetchRuns(eventId, page);
  const actions = useFetchActions(eventId);

  const saved = config.data?.config ?? null;
  const scheduling = config.data?.schedule_available ?? false;
  useEffect(() => {
    if (!saved) {
      // Nothing saved yet: suggest the WB event's own name; the user corrects it if BSCPro differs.
      if (config.isSuccess && eventName) setExternalName((current) => current || eventName);
      return;
    }
    setExternalId(saved.external_event_id);
    setExternalName(saved.external_event_name);
    setEnabled(saved.enabled);
    setIntervalMinutes(saved.interval_minutes);
  }, [saved, config.isSuccess, eventName]);

  const save = async () => {
    setError(null);
    try {
      await actions.save.mutateAsync({
        external_event_id: externalId.trim(),
        external_event_name: externalName.trim(),
        enabled: scheduling && enabled,
        interval_minutes: interval,
      });
      addToast({
        type: 'success',
        message: !scheduling ? 'Saved. Press “Run now” to fetch.' : enabled ? 'Schedule saved.' : 'Saved. Auto-fetch is off.',
      });
    } catch (err) {
      setError(errorText(err));
    }
  };

  const runNow = async () => {
    setError(null);
    try {
      const run = await actions.runNow.mutateAsync();
      setOpenId(run.id);
      setPage(1);
    } catch (err) {
      setError(errorText(err));
    }
  };

  const list = runs.data?.rows ?? [];
  const active = list.some((run) => run.status === 'queued' || run.status === 'running');
  const attention = list.filter((run) => run.status === 'failed' || run.status === 'needs_review').length;

  if (config.isLoading) return <LoadingState />;
  if (config.isError) return <ErrorState description={errorText(config.error)} onRetry={() => void config.refetch()} />;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">
          {saved?.paused_reason ? (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300" role="alert">
              {saved.paused_reason} Fix the cause, then tick “Fetch automatically” and save to start it again.
            </div>
          ) : null}
          <div>
            <Label htmlFor="fetch-external-name">BSCPro event name</Label>
            <Input
              id="fetch-external-name"
              placeholder="Exactly as it appears on BSCPro’s Purchases page"
              value={externalName}
              onChange={(e) => setExternalName(e.target.value)}
            />
            <Text variant="muted" className="mt-1 text-xs">
              Copy it from BSCPro. The fetcher selects the event by this exact name, including punctuation and quotes.
            </Text>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="fetch-external-id">BSCPro event number</Label>
              <Input
                id="fetch-external-id"
                inputMode="numeric"
                placeholder="e.g. 1550"
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
              />
              <Text variant="muted" className="mt-1 text-xs">
                The number after “c” in its confirmations (c1550-…). A file for any other event is refused.
              </Text>
            </div>
            {scheduling ? (
              <>
            <div>
              <Label htmlFor="fetch-interval">How often</Label>
              <select
                id="fetch-interval"
                className="h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 text-sm dark:border-white/10"
                value={interval}
                onChange={(e) => setIntervalMinutes(Number(e.target.value))}
              >
                {(config.data?.intervals ?? [60]).map((minutes) => (
                  <option key={minutes} value={minutes}>{intervalLabel(minutes)}</option>
                ))}
              </select>
              <Text variant="muted" className="mt-1 text-xs">At a different, random minute each time.</Text>
            </div>
            <div className="flex flex-col justify-between gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                Fetch automatically
              </label>
              <Text variant="muted" className="text-xs" aria-live="polite">
                {saved?.enabled && saved.next_run_at
                  ? `Next run ${new Date(saved.next_run_at).toLocaleString()}`
                  : 'Auto-fetch is off.'}
              </Text>
            </div>
              </>
            ) : (
              <Text variant="muted" className="text-sm md:col-span-2 md:self-center">
                Nothing is fetched automatically. Save these details once, then press “Run now” whenever you want the
                latest tickets and payments from BSCPro.
              </Text>
            )}
          </div>
          {error ? <Text className="text-sm text-red-600" role="alert">{error}</Text> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={!saved || active || actions.runNow.isPending} onClick={() => void runNow()}>
              {active ? 'Run in progress…' : 'Run now'}
            </Button>
            <Button disabled={!externalId.trim() || !externalName.trim() || actions.save.isPending} onClick={() => void save()}>
              {actions.save.isPending ? 'Saving…' : scheduling ? 'Save schedule' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Run history</p>
            {attention ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-400/20 dark:text-amber-300">
                {attention} on this page need attention
              </span>
            ) : null}
          </div>
          {runs.isLoading ? <LoadingState /> : null}
          {runs.isError ? <ErrorState description={errorText(runs.error)} onRetry={() => void runs.refetch()} /> : null}
          {!runs.isLoading && !runs.isError && !list.length ? <Text variant="muted">No runs yet.</Text> : null}
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {list.map((run) => {
              const open = openId === run.id;
              const flagged = run.status === 'failed' || run.status === 'needs_review';
              const changes = changeSummary(run);
              const review = reviewSummary(run);
              return (
                <li
                  key={run.id}
                  className={`py-2 ${flagged ? 'border-l-4 pl-3 ' + (run.status === 'failed' ? 'border-l-red-500' : 'border-l-amber-400') : ''}`}
                >
                  <button
                    type="button"
                    className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : run.id)}
                  >
                    <span className="text-sm">
                      <span className="font-medium">{new Date(run.started_at ?? run.created_at).toLocaleString()}</span>
                      <span className="text-slate-500"> · {run.trigger === 'manual' ? 'Run now' : 'Scheduled'}</span>
                      {changes ? <span className="block text-xs text-slate-600 dark:text-white/70">{changes}</span> : null}
                      {review ? <span className="block text-xs text-amber-700 dark:text-amber-400">{review}</span> : null}
                      {run.status === 'failed' && run.error ? (
                        <span className="block text-xs text-red-600">{run.error}</span>
                      ) : null}
                    </span>
                    <Badge
                      variant={STATUS_VARIANT[run.status]}
                      className={run.status === 'failed' ? 'border-red-500 text-red-600' : undefined}
                    >
                      {STATUS_LABEL[run.status]}
                    </Badge>
                  </button>
                  {open ? (
                    <div className="mt-2 space-y-2">
                      {run.status === 'needs_review' && run.error ? (
                        <Text className="text-sm text-amber-700 dark:text-amber-400">{run.error}</Text>
                      ) : null}
                      <ol className="space-y-1 text-sm">
                        {run.steps.map((step) => (
                          <li key={step.key} className="flex gap-2">
                            <span className={`w-4 shrink-0 text-center font-semibold ${STEP_MARK[step.status].className}`} aria-hidden>
                              {STEP_MARK[step.status].mark}
                            </span>
                            <span>
                              {step.label}
                              <span className="sr-only"> — {STEP_MARK[step.status].label}</span>
                              {step.detail ? (
                                <span className={`block text-xs ${step.status === 'failed' ? 'text-red-600' : 'text-slate-500'}`}>
                                  {step.detail}
                                </span>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ol>
                      {review ? (
                        <Button size="sm" variant="outline" onClick={onShowReview}>
                          Open conflicts &amp; review
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <Pager pagination={runs.data?.pagination} onPage={setPage} />
        </CardContent>
      </Card>
    </div>
  );
}
