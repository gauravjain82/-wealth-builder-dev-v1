import { useCallback, useRef, useState } from 'react';
import { Badge, Button, Card, CardContent, Input, Text } from '@shared/components';
import { CheckinCameraScanner } from '../checkin-camera-scanner';
import { CheckinSuccessFlash } from '../checkin-success-flash';
import { isCameraScanSupported } from '../../utils/checkin-scan';
import { doorErrorOf } from '../../services/door-service';
import { DoorRefusalPanel } from '../door/door-refusal-panel';
import { DoorSuccessDetails } from '../door/door-success-details';
import { credentialLabel, type DoorErrorBody, type LinkAccountResult } from '../../types/door';
import type { SessionCheckinPayload, SessionScanResult } from '../../types/session';

interface SessionScanBoxProps {
  eventId: number;
  sessionId: number;
  sessionTitle: string;
  onScan: (payload: SessionCheckinPayload) => Promise<SessionScanResult>;
  /** A profile was linked to a ticket and admitted here — refresh the list. */
  onLinked?: () => void;
}

type Outcome =
  | { kind: 'ok'; attendee: SessionScanResult }
  | { kind: 'linked'; result: LinkAccountResult }
  | {
      kind: 'refused';
      id: number;
      message: string;
      overridable: boolean;
      payload: SessionCheckinPayload;
      door: DoorErrorBody | null;
    };

function time(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** A short buzz for success, a longer double for a refusal — for phones at a door. */
function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Not supported (iOS) — the screen still says what happened.
  }
}

function tone(outcome: Outcome): string {
  if (outcome.kind === 'refused') {
    return 'border-red-300 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10';
  }
  const attendee = outcome.kind === 'ok' ? outcome.attendee : outcome.result;
  return attendee.duplicate || attendee.warnings.length > 0
    ? 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
    : 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10';
}

/**
 * The session door's primary control. Same input path as the event desk — a
 * hardware scanner types the payload and presses Enter, the camera feeds it in,
 * or staff type a ticket number — plus the session-only outcomes:
 *
 * - **Refused but overridable** (not eligible, or outside the window): the
 *   reason and an explicit "Admit anyway", so a walk-in is a deliberate act
 *   that is recorded as one — never a silent default.
 * - **Checked in without registration**: still a success, with a note that the
 *   event check-in was done too.
 */
export function SessionScanBox({
  eventId,
  sessionId,
  sessionTitle,
  onScan,
  onLinked,
}: SessionScanBoxProps) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [flash, setFlash] = useState({ n: 0, caption: '' });
  const inputRef = useRef<HTMLInputElement>(null);
  // Remounts the refusal panel per refusal so a stale link error never lingers.
  const refusalSeq = useRef(0);
  const cameraSupported = isCameraScanSupported();

  const run = useCallback(
    async (payload: SessionCheckinPayload, fromCamera = false) => {
      if (busy) return;
      setBusy(true);
      try {
        const attendee = await onScan(payload);
        setOutcome({ kind: 'ok', attendee });
        setValue('');
        if (!attendee.duplicate) {
          buzz(60);
          // A warning keeps the amber line on screen instead of a green flash.
          if (fromCamera && !attendee.warnings?.length) {
            setFlash((f) => ({ n: f.n + 1, caption: credentialLabel(attendee.credential) }));
          }
        } else {
          buzz([40, 60, 40]);
        }
      } catch (err) {
        buzz([120, 80, 120]);
        setOutcome({
          kind: 'refused',
          id: (refusalSeq.current += 1),
          message: err instanceof Error ? err.message : 'Check-in failed',
          overridable: doorErrorOf(err)?.overridable === true,
          payload,
          door: doorErrorOf(err),
        });
      } finally {
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [busy, onScan],
  );

  const submit = (raw: string, fromCamera = false) => {
    const scan = raw.trim();
    if (scan) void run({ scan }, fromCamera);
  };

  const handleLinked = (result: LinkAccountResult) => {
    buzz(60);
    setOutcome({ kind: 'linked', result });
    setValue('');
    onLinked?.();
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <label htmlFor="session-scan" className="sr-only">
          Scan a ticket into {sessionTitle}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="session-scan"
            ref={inputRef}
            autoFocus
            value={value}
            disabled={busy}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit(value);
              }
            }}
            placeholder="Scan a ticket, profile or BSCPro QR, or type a ticket number…"
            className="min-w-[240px] flex-1"
            autoComplete="off"
          />
          <Button type="button" disabled={busy || !value.trim()} onClick={() => submit(value)}>
            {busy ? 'Checking in…' : 'Check in'}
          </Button>
          {cameraSupported ? (
            <Button type="button" variant="outline" onClick={() => setCameraOn((on) => !on)}>
              {cameraOn ? 'Stop camera' : 'Use camera'}
            </Button>
          ) : null}
        </div>

        {cameraOn ? (
          <CheckinCameraScanner
            paused={busy || outcome?.kind === 'refused'}
            fallbackHint="Type the ticket number instead."
            onDetected={(payload) => submit(payload, true)}
          />
        ) : null}
        <CheckinSuccessFlash trigger={flash.n} caption={flash.caption} />

        <div aria-live="polite" aria-atomic="true">
          {outcome ? (
            <div className={`rounded-lg border px-3 py-2 ${tone(outcome)}`}>
              {outcome.kind === 'refused' ? (
                <DoorRefusalPanel
                  key={outcome.id}
                  eventId={eventId}
                  sessionId={sessionId}
                  message={outcome.message}
                  door={outcome.door}
                  busy={busy}
                  onPickCandidate={(candidate) =>
                    void run({
                      ticket_id: candidate.ticket_id,
                      credential: outcome.door?.credential,
                      ...(outcome.payload.override ? { override: true } : {}),
                    })
                  }
                  onLinked={handleLinked}
                  onDismiss={() => setOutcome(null)}
                  dismissLabel={outcome.overridable ? 'Turn away' : 'Dismiss'}
                  actions={
                    outcome.overridable ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void run({ ...outcome.payload, override: true })}
                      >
                        Admit anyway
                      </Button>
                    ) : null
                  }
                />
              ) : outcome.kind === 'linked' ? (
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {outcome.result.holder_name || '(unassigned ticket)'}
                      </p>
                      <Text variant="muted" className="text-xs">
                        {outcome.result.ticket_number}
                        {time(outcome.result.checked_in_at) ? ` · ${time(outcome.result.checked_in_at)}` : ''}
                      </Text>
                    </div>
                    <div className="flex gap-1.5">
                      <Badge variant="info">Profile linked</Badge>
                      {outcome.result.duplicate ? (
                        <Badge variant="warning">Already in this session</Badge>
                      ) : (
                        <Badge variant="success">Checked in</Badge>
                      )}
                    </div>
                  </div>
                  <DoorSuccessDetails
                    credential={outcome.result.credential}
                    warnings={outcome.result.warnings}
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {outcome.attendee.holder_name || '(unassigned ticket)'}
                      </p>
                      <Text variant="muted" className="text-xs">
                        {outcome.attendee.ticket_number}
                        {outcome.attendee.seller_name ? ` · ${outcome.attendee.seller_name}` : ''}
                        {time(outcome.attendee.checked_in_at) ? ` · ${time(outcome.attendee.checked_in_at)}` : ''}
                      </Text>
                    </div>
                    <div className="flex gap-1.5">
                      {outcome.attendee.override ? <Badge variant="outline">Admitted by override</Badge> : null}
                      {outcome.attendee.duplicate ? (
                        <Badge variant="warning">Already in this session</Badge>
                      ) : (
                        <Badge variant="success">Checked in</Badge>
                      )}
                    </div>
                  </div>
                  {outcome.attendee.event_checkin_created ? (
                    <p className="text-xs text-sky-800 dark:text-sky-200">
                      Hadn’t checked in at registration — checked in to the event as well.
                    </p>
                  ) : null}
                  <DoorSuccessDetails
                    credential={outcome.attendee.credential}
                    warnings={outcome.attendee.warnings}
                  />
                </div>
              )}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
