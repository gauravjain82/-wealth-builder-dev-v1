import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, Loader2, Lock, MapPin, QrCode, Ticket } from 'lucide-react';
import { Button } from '@shared/components';
import { sessionService, SessionApiError } from '../services/session-service';
import type { SelfCheckinPreview, SelfCheckinResult } from '../types/session';

type State =
  | { kind: 'loading' }
  | { kind: 'checking-in'; preview: SelfCheckinPreview }
  | { kind: 'done'; preview: SelfCheckinPreview; result: SelfCheckinResult | null }
  | { kind: 'blocked'; preview: SelfCheckinPreview }
  | { kind: 'invalid' }
  | { kind: 'error'; message: string };

function localTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function SessionSummary({ preview }: { preview: SelfCheckinPreview }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3 text-left dark:bg-white/5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
        {preview.event_name}
      </p>
      <p className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-white">{preview.title}</p>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-white/70">
        <span className="inline-flex items-center gap-1">
          <Clock size={14} aria-hidden />
          {localTime(preview.starts_at)}
          {preview.ends_at ? ` – ${localTime(preview.ends_at)}` : ''}
        </span>
        {preview.room ? (
          <span className="inline-flex items-center gap-1">
            <MapPin size={14} aria-hidden />
            {preview.room}
          </span>
        ) : null}
      </p>
      {preview.ticket_number ? (
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500 dark:text-white/50">
          <Ticket size={13} aria-hidden />
          {preview.holder_name ? `${preview.holder_name} · ` : ''}
          {preview.ticket_number}
        </p>
      ) : null}
    </div>
  );
}

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

/** Why a self check-in can't happen, and what to do instead. */
function blockedCopy(p: SelfCheckinPreview): { title: string; body: string; icon: ReactNode; tone: 'warning' | 'danger' } {
  if (!p.has_ticket) {
    return {
      title: 'No ticket on your account',
      body: 'We couldn’t find a ticket for this event assigned to you. If someone bought your ticket, ask them to assign it to your email — or show your ticket QR to the door staff.',
      icon: <Ticket size={40} aria-hidden />,
      tone: 'warning',
    };
  }
  if (!p.eligible) {
    return {
      title: `${p.restriction_label || 'Restricted'} session`,
      body: `This session is for ${p.restriction_label ? p.restriction_label.toLowerCase() : 'invited attendees'} only, and your ticket isn’t on the list. If you think that’s wrong, please speak to the door staff.`,
      icon: <Lock size={40} aria-hidden />,
      tone: 'danger',
    };
  }
  if (!p.self_checkin_enabled) {
    return {
      title: 'Check in at the door',
      body: 'Self check-in is off for this session. Show your ticket QR to the door staff.',
      icon: <QrCode size={40} aria-hidden />,
      tone: 'warning',
    };
  }
  const notYet = Date.now() < new Date(p.starts_at).getTime();
  return notYet
    ? {
        title: 'Check-in isn’t open yet',
        body: `This session starts at ${localTime(p.starts_at)}. Scan again a little before then.`,
        icon: <Clock size={40} aria-hidden />,
        tone: 'warning',
      }
    : {
        title: 'Check-in has closed',
        body: 'Self check-in for this session has closed. Please speak to the door staff.',
        icon: <Clock size={40} aria-hidden />,
        tone: 'warning',
      };
}

/**
 * Where a phone lands after scanning a session room's QR code. Signed-in only
 * (the route sends anyone else through login and back here). Checks the
 * attendee in straight away when it can — the scan *was* the intent — and
 * otherwise explains exactly why not and what to do next.
 */
export default function SessionSelfCheckinPage() {
  const { token = '' } = useParams<{ token: string }>();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const started = useRef(false);

  const run = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const preview = await sessionService.selfPreview(token);
      if (preview.already_checked_in) {
        setState({ kind: 'done', preview, result: null });
        return;
      }
      if (!preview.can_check_in) {
        setState({ kind: 'blocked', preview });
        return;
      }
      setState({ kind: 'checking-in', preview });
      const result = await sessionService.selfCheckIn(token);
      try {
        navigator.vibrate?.(60);
      } catch {
        // Unsupported — the screen says it all.
      }
      setState({ kind: 'done', preview, result });
    } catch (err) {
      if (err instanceof SessionApiError && err.status === 404) {
        setState({ kind: 'invalid' });
      } else {
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Something went wrong.',
        });
      }
    }
  }, [token]);

  useEffect(() => {
    // Strict Mode mounts twice in development; check in once.
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  let body: ReactNode;
  switch (state.kind) {
    case 'loading':
    case 'checking-in':
      body = (
        <Panel icon={<Loader2 size={40} className="animate-spin" aria-hidden />} tone="neutral" title={state.kind === 'loading' ? 'Finding your session…' : 'Checking you in…'}>
          {state.kind === 'checking-in' ? <SessionSummary preview={state.preview} /> : null}
        </Panel>
      );
      break;
    case 'done':
      body = (
        <Panel
          icon={<CheckCircle2 size={44} aria-hidden />}
          tone="success"
          title={state.result && !state.result.duplicate ? 'You’re checked in!' : 'You’re already checked in'}
        >
          <SessionSummary preview={state.preview} />
          {state.result?.event_checkin_created ? (
            <p className="text-sm text-slate-600 dark:text-white/70">
              You’re also checked in to {state.preview.event_name}.
            </p>
          ) : null}
          <p className="text-sm text-slate-500 dark:text-white/60">Enjoy the session. You can close this page.</p>
        </Panel>
      );
      break;
    case 'blocked': {
      const copy = blockedCopy(state.preview);
      body = (
        <Panel icon={copy.icon} tone={copy.tone} title={copy.title}>
          <SessionSummary preview={state.preview} />
          <p className="text-sm leading-relaxed text-slate-600 dark:text-white/70">{copy.body}</p>
          <Button type="button" variant="outline" onClick={() => void run()}>
            Try again
          </Button>
        </Panel>
      );
      break;
    }
    case 'invalid':
      body = (
        <Panel icon={<AlertTriangle size={40} aria-hidden />} tone="warning" title="This code isn’t valid">
          <p className="text-sm leading-relaxed text-slate-600 dark:text-white/70">
            The session may have been removed, or the code on screen was replaced. Scan the code
            currently shown in the room, or show your ticket QR to the door staff.
          </p>
        </Panel>
      );
      break;
    case 'error':
      body = (
        <Panel icon={<AlertTriangle size={40} aria-hidden />} tone="danger" title="Couldn’t check you in">
          <p className="text-sm text-slate-600 dark:text-white/70">{state.message}</p>
          <Button type="button" onClick={() => void run()}>
            Try again
          </Button>
        </Panel>
      );
      break;
  }

  return (
    <main className="flex min-h-screen items-start justify-center bg-slate-100 px-4 py-10 dark:bg-[#0f131b] sm:items-center">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm dark:bg-white/[0.04]"
        aria-live="polite"
        aria-busy={state.kind === 'loading' || state.kind === 'checking-in'}
      >
        {body}
        <div className="mt-6 border-t border-slate-100 pt-4 text-center dark:border-white/10">
          <Link to="/home" className="text-sm font-medium text-primary hover:underline">
            Go to Wealth Builders
          </Link>
        </div>
      </div>
    </main>
  );
}
