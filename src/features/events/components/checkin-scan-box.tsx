import { useCallback, useRef, useState } from 'react';
import { Badge, Button, Card, CardContent, Input, Text } from '@shared/components';
import { CheckinCameraScanner } from './checkin-camera-scanner';
import { CheckinSuccessFlash } from './checkin-success-flash';
import { DoorRefusalPanel } from './door/door-refusal-panel';
import { DoorSuccessDetails } from './door/door-success-details';
import { LinkProfilePanel } from './door/link-profile-panel';
import { isCameraScanSupported } from '../utils/checkin-scan';
import { doorErrorOf } from '../services/door-service';
import { credentialLabel, type DoorErrorBody, type LinkAccountResult } from '../types/door';
import type { CheckinPayload, CheckinScanResult } from '../types/checkin';

interface CheckinScanBoxProps {
  eventId: number;
  /** Submits a scan and resolves with the updated attendee row. */
  onScan: (payload: CheckinPayload) => Promise<CheckinScanResult>;
  /** A ticket was linked to a profile (and admitted) — refresh the list. */
  onLinked?: () => void;
}

type ScanOutcome =
  | { kind: 'ok'; attendee: CheckinScanResult }
  | { kind: 'linked'; result: LinkAccountResult }
  | { kind: 'error'; id: number; message: string; door: DoorErrorBody | null };

/** Refusals that wait for staff to pick or link something before the next scan. */
function needsStaff(outcome: ScanOutcome | null): boolean {
  if (outcome?.kind !== 'error' || !outcome.door) return false;
  return outcome.door.code === 'ambiguous' || outcome.door.code === 'no_linked_ticket';
}

function outcomeClass(outcome: ScanOutcome): string {
  if (outcome.kind === 'error') {
    return 'border-red-300 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10';
  }
  const attendee = outcome.kind === 'ok' ? outcome.attendee : outcome.result;
  return attendee.duplicate || (attendee.warnings?.length ?? 0) > 0
    ? 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
    : 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10';
}

function arrivalTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/**
 * The door's primary control: one field that accepts whatever the attendee
 * shows — our ticket QR, their profile QR, a BSCPro QR / confirmation, or a
 * typed ticket number — plus optional camera scanning. Hardware scanners type
 * into the field and send Enter, so keyboard entry and scanning share one path.
 *
 * The server works out what the scan was; refusals that need a decision
 * (several possible tickets, a profile with no linked ticket) open
 * `DoorRefusalPanel`, and an admitted ticket with no account offers
 * "Link profile QR".
 */
export function CheckinScanBox({ eventId, onScan, onLinked }: CheckinScanBoxProps) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [linking, setLinking] = useState<CheckinScanResult | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [flash, setFlash] = useState({ n: 0, caption: '' });
  const inputRef = useRef<HTMLInputElement>(null);
  // Remounts the refusal panel per refusal so a stale link error never lingers.
  const refusalSeq = useRef(0);
  const cameraSupported = isCameraScanSupported();

  const run = useCallback(
    async (payload: CheckinPayload, fromCamera = false) => {
      if (busy) return;
      setBusy(true);
      setLinking(null);
      try {
        const attendee = await onScan(payload);
        setOutcome({ kind: 'ok', attendee });
        // Green only for a clean new arrival — a duplicate or a warning keeps
        // the amber line visible instead of hiding it behind the flash.
        if (fromCamera && !attendee.duplicate && !attendee.warnings?.length) {
          setFlash((f) => ({ n: f.n + 1, caption: credentialLabel(attendee.credential) }));
        }
        setValue('');
      } catch (err) {
        setOutcome({
          kind: 'error',
          id: (refusalSeq.current += 1),
          message: err instanceof Error ? err.message : 'Check-in failed',
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
    setLinking(null);
    setOutcome({ kind: 'linked', result });
    setValue('');
    onLinked?.();
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
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

        {/* One camera at a time: the link panel opens its own for the profile QR. */}
        {cameraOn && !linking ? (
          <CheckinCameraScanner
            paused={busy || needsStaff(outcome)}
            fallbackHint="Type the ticket number instead."
            onDetected={(payload) => submit(payload, true)}
          />
        ) : null}
        <CheckinSuccessFlash trigger={flash.n} caption={flash.caption} />

        <div aria-live="polite" aria-atomic="true">
          {outcome ? (
            <div className={`rounded-lg border px-3 py-2 ${outcomeClass(outcome)}`}>
              {outcome.kind === 'error' ? (
                <DoorRefusalPanel
                  key={outcome.id}
                  eventId={eventId}
                  message={outcome.message}
                  door={outcome.door}
                  busy={busy}
                  onPickCandidate={(candidate) =>
                    void run({ ticket_id: candidate.ticket_id, credential: outcome.door?.credential })
                  }
                  onLinked={handleLinked}
                  onDismiss={() => setOutcome(null)}
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
                        {arrivalTime(outcome.result.checked_in_at)
                          ? ` · ${arrivalTime(outcome.result.checked_in_at)}`
                          : ''}
                      </Text>
                    </div>
                    <div className="flex gap-1.5">
                      <Badge variant="info">Profile linked</Badge>
                      {outcome.result.duplicate ? (
                        <Badge variant="warning">Already checked in</Badge>
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
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {outcome.attendee.holder_name || '(unassigned ticket)'}
                      </p>
                      <Text variant="muted" className="text-xs">
                        {outcome.attendee.ticket_number}
                        {outcome.attendee.invoice_number ? ` · ${outcome.attendee.invoice_number}` : ''}
                        {outcome.attendee.source === 'BSCPRO'
                          ? ` · BSCPro${outcome.attendee.external_reference ? ` ${outcome.attendee.external_reference}` : ''}`
                          : ''}
                        {arrivalTime(outcome.attendee.checked_in_at)
                          ? ` · ${arrivalTime(outcome.attendee.checked_in_at)}`
                          : ''}
                      </Text>
                    </div>
                    {outcome.attendee.duplicate ? (
                      <Badge variant="warning">Already checked in</Badge>
                    ) : (
                      <Badge variant="success">Checked in</Badge>
                    )}
                  </div>
                  <DoorSuccessDetails
                    credential={outcome.attendee.credential}
                    warnings={outcome.attendee.warnings}
                  />
                  {outcome.attendee.can_link_account && linking?.id !== outcome.attendee.id ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setLinking(outcome.attendee)}
                    >
                      Link profile QR
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {linking ? (
          <LinkProfilePanel
            eventId={eventId}
            ticketId={linking.id}
            holderName={linking.holder_name}
            onLinked={handleLinked}
            onCancel={() => setLinking(null)}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
