import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, Loader2, Video } from 'lucide-react';

import { Button } from '@/shared/components';

import { useAttend } from '../hooks/use-training-schedule';
import { TrainingScheduleError } from '../services/training-schedule-service';
import type { AttendanceSummary } from '../types';
import { differsFromViewer, formatDay, formatTimeRange, zoneAbbreviation } from '../utils/time';

function Panel({
  icon,
  tone,
  title,
  children,
}: {
  icon: ReactNode;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
  title: string;
  children?: ReactNode;
}) {
  const ring = {
    success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
    danger: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300',
    neutral: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/60',
  }[tone];
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className={`flex h-20 w-20 items-center justify-center rounded-full ${ring}`}>{icon}</div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
      {children}
    </div>
  );
}

function TrainingSummary({ summary }: { summary: AttendanceSummary }) {
  const otherZone = summary.start_at ? differsFromViewer(summary.timezone, summary.start_at) : false;
  return (
    <div className="w-full rounded-xl bg-slate-50 px-4 py-3 text-left dark:bg-white/5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
        Hosted by {summary.host_name}
      </p>
      <p className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-white">{summary.title}</p>
      {summary.start_at && summary.end_at ? (
        <p className="mt-1 flex items-center gap-1 text-sm text-slate-600 dark:text-white/70">
          <Clock size={14} aria-hidden />
          {formatDay(summary.start_at)} · {formatTimeRange(summary.start_at, summary.end_at)} your time
        </p>
      ) : null}
      {otherZone && summary.start_at && summary.end_at ? (
        <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-200">
          {formatTimeRange(summary.start_at, summary.end_at, summary.timezone)}{' '}
          {zoneAbbreviation(summary.timezone, summary.start_at)} where it is hosted
        </p>
      ) : null}
    </div>
  );
}

/** The fields `attendance_not_open` carries in its `detail`. */
function summaryFrom(error: TrainingScheduleError): AttendanceSummary | null {
  return typeof error.detail.title === 'string' ? (error.detail as unknown as AttendanceSummary) : null;
}

/**
 * Where the attendance link in a meeting chat lands. Signed-in only — the route
 * sends anyone else through login and back here — and opening it *is* the
 * intent, so attendance is recorded straight away with nothing to press.
 */
export default function TrainingAttendancePage() {
  const { token = '' } = useParams<{ token: string }>();
  const { mutate, data, error, isError, isSuccess } = useAttend();
  const started = useRef(false);

  useEffect(() => {
    // Strict Mode mounts twice in development; record once.
    if (started.current) return;
    started.current = true;
    mutate(token);
  }, [mutate, token]);

  let body: ReactNode;
  if (isSuccess) {
    body = (
      <Panel
        icon={<CheckCircle2 size={44} aria-hidden />}
        tone="success"
        title={data.status === 'recorded' ? 'Thanks for joining!' : 'You’re already marked as attended'}
      >
        <TrainingSummary summary={data} />
        <p className="text-sm text-slate-600 dark:text-white/70">Your attendance is recorded.</p>
        {data.meeting_url ? (
          <a
            href={data.meeting_url}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Video size={16} aria-hidden />
            Back to the meeting
          </a>
        ) : null}
      </Panel>
    );
  } else if (isError) {
    const known = error instanceof TrainingScheduleError ? error : null;
    const summary = known ? summaryFrom(known) : null;
    if (known?.code === 'attendance_not_open') {
      body = (
        <Panel icon={<Clock size={40} aria-hidden />} tone="warning" title="Attendance isn’t open right now">
          {summary ? <TrainingSummary summary={summary} /> : null}
          <p className="text-sm leading-relaxed text-slate-600 dark:text-white/70">
            {summary?.start_at
              ? 'That is the next date. Open this link again when the training starts.'
              : 'This training has no upcoming dates.'}
          </p>
          <Button type="button" variant="outline" onClick={() => mutate(token)}>
            Try again
          </Button>
        </Panel>
      );
    } else if (known?.status === 404) {
      body = (
        <Panel icon={<AlertTriangle size={40} aria-hidden />} tone="warning" title="This link isn’t valid">
          <p className="text-sm leading-relaxed text-slate-600 dark:text-white/70">
            The training may have been deleted. Ask your trainer for the current attendance link.
          </p>
        </Panel>
      );
    } else {
      body = (
        <Panel icon={<AlertTriangle size={40} aria-hidden />} tone="danger" title="Couldn’t record your attendance">
          <p className="text-sm text-slate-600 dark:text-white/70">{error.message}</p>
          <Button type="button" onClick={() => mutate(token)}>
            Try again
          </Button>
        </Panel>
      );
    }
  } else {
    body = (
      <Panel icon={<Loader2 size={40} className="animate-spin" aria-hidden />} tone="neutral" title="Recording your attendance…" />
    );
  }

  return (
    <main className="flex min-h-screen items-start justify-center bg-slate-100 px-4 py-10 dark:bg-[#0f131b] sm:items-center">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm dark:bg-white/[0.04]"
        aria-live="polite"
        aria-busy={!isSuccess && !isError}
      >
        {body}
        <div className="mt-6 border-t border-slate-100 pt-4 text-center dark:border-white/10">
          <Link to="/training-schedule" className="text-sm font-medium text-primary hover:underline">
            Open the training schedule
          </Link>
        </div>
      </div>
    </main>
  );
}
