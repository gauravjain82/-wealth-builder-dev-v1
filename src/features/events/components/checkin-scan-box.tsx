import { useCallback, useRef, useState } from 'react';
import { Badge, Button, Card, CardContent, Input, Text } from '@shared/components';
import { CheckinCameraScanner } from './checkin-camera-scanner';
import { isCameraScanSupported } from '../utils/checkin-scan';
import type { CheckinPayload, CheckinScanResult } from '../types/checkin';

interface CheckinScanBoxProps {
  /** Submits a scan and resolves with the updated attendee row. */
  onScan: (payload: CheckinPayload) => Promise<CheckinScanResult>;
}

type ScanOutcome =
  | { kind: 'ok'; attendee: CheckinScanResult }
  | { kind: 'error'; message: string };

function outcomeClass(outcome: ScanOutcome): string {
  if (outcome.kind === 'error') {
    return 'border-red-300 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10';
  }
  return outcome.attendee.duplicate
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
 * The door's primary control: one field that accepts a QR payload, a bare
 * token, or a typed ticket number, plus optional camera scanning where the
 * browser supports it. Hardware scanners type into the field and send Enter,
 * so keyboard entry and scanning share the same path.
 */
export function CheckinScanBox({ onScan }: CheckinScanBoxProps) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraSupported = isCameraScanSupported();

  const submit = useCallback(
    async (raw: string) => {
      const scan = raw.trim();
      if (!scan || busy) return;
      setBusy(true);
      try {
        setOutcome({ kind: 'ok', attendee: await onScan({ scan }) });
        setValue('');
      } catch (err) {
        setOutcome({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Check-in failed',
        });
      } finally {
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [busy, onScan],
  );

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
                void submit(value);
              }
            }}
            placeholder="Scan a ticket QR or type a ticket number…"
            className="min-w-[260px] flex-1"
          />
          <Button type="button" disabled={busy || !value.trim()} onClick={() => void submit(value)}>
            {busy ? 'Checking in…' : 'Check in'}
          </Button>
          {cameraSupported ? (
            <Button type="button" variant="outline" onClick={() => setCameraOn((on) => !on)}>
              {cameraOn ? 'Stop camera' : 'Use camera'}
            </Button>
          ) : null}
        </div>

        {cameraOn ? (
          <CheckinCameraScanner paused={busy} onDetected={(payload) => void submit(payload)} />
        ) : null}

        {outcome ? (
          <div className={`rounded-lg border px-3 py-2 ${outcomeClass(outcome)}`}>
            {outcome.kind === 'error' ? (
              <Text className="text-sm font-medium">{outcome.message}</Text>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {outcome.attendee.holder_name || '(unassigned ticket)'}
                  </p>
                  <Text variant="muted" className="text-xs">
                    {outcome.attendee.ticket_number} · {outcome.attendee.invoice_number}
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
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
