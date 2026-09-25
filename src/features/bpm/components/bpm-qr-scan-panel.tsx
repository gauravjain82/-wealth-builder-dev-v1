import { useCallback, useRef, useState } from 'react';
import { Badge, Button, Input, Text } from '@shared/components';
// Imported by path, not through `features/events`' barrel: this panel is reached
// from the profile menu, so it lands in the entry chunk, and the barrel would
// drag the whole events feature in with it.
import { CheckinCameraScanner } from '@/features/events/components/checkin-camera-scanner';
import { isCameraScanSupported } from '@/features/events/utils/checkin-scan';
import { bpmService } from '../services/bpm-service';
import type { BPMQrScanResult } from '../types';

interface BpmQrScanPanelProps {
  /**
   * The date a scanned *identity* code checks somebody into. Null from the
   * profile menu, where no BPM is selected — an event code still works there,
   * because the code names its own room.
   */
  occurrenceId?: number | null;
  /** Called after a scan that actually recorded something, so a page can reload. */
  onCheckedIn?: (result: BPMQrScanResult) => void;
}

type ScanOutcome =
  | { kind: 'ok'; result: BPMQrScanResult }
  | { kind: 'error'; message: string };

function outcomeClass(outcome: ScanOutcome): string {
  if (outcome.kind === 'error') {
    return 'border-red-300 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10';
  }
  return outcome.result.duplicate
    ? 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
    : 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10';
}

/**
 * The scanning half of BPM's QR support: a camera feed, a paste box, and the
 * outcome of the last scan.
 *
 * One panel for all three directions, because the person holding the phone does
 * not choose — the token they scanned decides, and the server says which way it
 * went and who it checked in. Both the profile menu and the two check-in pages
 * mount this, so the door behaviour cannot diverge between them.
 *
 * **Nothing here branches on the kind of person scanned.** The outcome line reads
 * `subject_name`, which the server fills for an associate and a guest alike;
 * `kind` only picks the word in the badge. A panel that dug the name out of
 * whichever record came back would be a panel that shows "Checked in" with no name
 * the first time a guest pass is scanned.
 *
 * The typed box is not only a fallback. Hardware scanners type and send Enter,
 * and it is the way to proceed when the camera cannot be opened at all — which on
 * an insecure origin or inside an iOS in-app webview it cannot. It is also where
 * a pasted pass link goes: a guest is sent a URL, and the server pulls the token
 * out of it. What is *not* available is a person's number to type instead of a
 * code, so the manual path is the searchable list on the check-in page, which is
 * what `CheckinCameraScanner`'s hint points at.
 */
export function BpmQrScanPanel({ occurrenceId = null, onCheckedIn }: BpmQrScanPanelProps) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraSupported = isCameraScanSupported();

  const submit = useCallback(
    async (raw: string) => {
      const scan = raw.trim();
      if (!scan || busy) return;
      setBusy(true);
      try {
        const result = await bpmService.scanQr(scan, occurrenceId);
        setOutcome({ kind: 'ok', result });
        setValue('');
        onCheckedIn?.(result);
      } catch (error) {
        setOutcome({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Scan failed',
        });
      } finally {
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    // `busy` is in the deps so a second scan cannot start mid-flight; the camera
    // is paused for the same reason.
    [busy, occurrenceId, onCheckedIn],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          ref={inputRef}
          variant="surface"
          value={value}
          disabled={busy}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void submit(value);
            }
          }}
          placeholder="Scan a code, or paste one here…"
          className="min-w-[220px] flex-1"
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
        <CheckinCameraScanner
          paused={busy}
          fallbackHint="Find the person in the check-in list instead."
          onDetected={(payload) => void submit(payload)}
        />
      ) : null}

      {!cameraSupported ? (
        <Text variant="muted" className="text-xs">
          This browser cannot open a camera, so scanning is unavailable here. Paste a code
          above, or check people in from the list on the check-in page.
        </Text>
      ) : null}

      {outcome ? (
        <div className={`rounded-lg border px-3 py-2 ${outcomeClass(outcome)}`}>
          {outcome.kind === 'error' ? (
            <Text className="text-sm font-medium">{outcome.message}</Text>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {outcome.result.subject_name || 'Checked in'}
                </p>
                <Text variant="muted" className="text-xs">
                  {/* Named so a host can see at a glance that a pass checked in a
                      guest and not an associate — the two land in different lists,
                      and a mis-scan is otherwise invisible until someone counts. */}
                  {outcome.result.kind === 'guest' ? 'Guest · ' : 'Associate · '}
                  {outcome.result.occurrence_label}
                </Text>
              </div>
              {outcome.result.duplicate ? (
                <Badge variant="warning">Already checked in</Badge>
              ) : (
                <Badge variant="success">Checked in</Badge>
              )}
            </div>
          )}
        </div>
      ) : null}

      {occurrenceId === null ? (
        <Text variant="muted" className="text-xs">
          No BPM is selected, so an event code on a screen will check you in and a guest's
          pass will check them in — both name their own date. To scan an associate's
          personal code, open Associate Check-In and pick the date first.
        </Text>
      ) : null}
    </div>
  );
}
