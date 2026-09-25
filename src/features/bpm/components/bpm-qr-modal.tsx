import { useCallback, useEffect, useState } from 'react';
import { Button, LoadingState, Modal, QrCode, Text } from '@shared/components';
import { BpmQrScanPanel } from './bpm-qr-scan-panel';
import { bpmService } from '../services/bpm-service';
import type { BPMQrScanResult, BPMQrToken } from '../types';

interface BpmQrModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * The selected date. Null means the profile menu opened this, where there is
   * no date to display a code for and only scanning is offered.
   */
  occurrenceId?: number | null;
  /** Called after a scan recorded an attendance, so the page can reload its list. */
  onCheckedIn?: (result: BPMQrScanResult) => void;
}

/**
 * BPM's one QR surface: this date's event code, and the scanner.
 *
 * Both halves live in one modal because a host at a door needs both within a
 * second of each other — put the code on the room's screen, then scan the people
 * whose phones will not. Two buttons on the page would have been two things to
 * find.
 *
 * With no `occurrenceId` (the profile menu) the event-code half is simply absent
 * rather than disabled: there is no date to show a code *for*, and a greyed
 * square would invite a click that can never work.
 *
 * Fetched on open, like everything in a `Modal` — its children unmount on close
 * (§6.6), so a code is re-read rather than remembered.
 */
export function BpmQrModal({
  open,
  onClose,
  occurrenceId = null,
  onCheckedIn,
}: BpmQrModalProps) {
  const [code, setCode] = useState<BPMQrToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);

  const load = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      setCode(await bpmService.occurrenceQr(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this BPM’s QR code');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && showCode && occurrenceId) void load(occurrenceId);
  }, [open, showCode, occurrenceId, load]);

  return (
    <Modal open={open} onClose={onClose} title="QR check-in" contentClassName="max-w-[560px]">
      <div className="space-y-5">
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/60">
            Scan a code
          </h4>
          <BpmQrScanPanel occurrenceId={occurrenceId} onCheckedIn={onCheckedIn} />
          <Text variant="muted" className="mt-2 text-xs">
            Scan an associate’s personal code to check them in, or the event code on a
            screen to check yourself in. Guests do not have codes yet, so take their names
            on the check-in list.
          </Text>
        </section>

        {occurrenceId ? (
          <section className="border-t border-slate-200 pt-4 dark:border-white/10">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/60">
              This BPM’s code
            </h4>
            {!showCode ? (
              <>
                <Button type="button" variant="outline" onClick={() => setShowCode(true)}>
                  Show event code
                </Button>
                <Text variant="muted" className="mt-2 text-xs">
                  Put this on the screen in the room and associates can check themselves in
                  by scanning it.
                </Text>
              </>
            ) : loading ? (
              <LoadingState />
            ) : error ? (
              <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 dark:border-red-500/30 dark:bg-red-500/10">
                <Text className="text-sm font-medium">{error}</Text>
              </div>
            ) : code ? (
              <div className="flex flex-col items-center gap-3">
                <QrCode
                  value={code.token}
                  size={260}
                  alt="Event check-in QR code"
                  fallbackText="QR code unavailable — check people in from the list."
                />
                <p className="text-center text-sm font-semibold text-slate-900 dark:text-white">
                  {code.label}
                </p>
                <Text variant="muted" className="max-w-sm text-center text-xs">
                  Scanning this stops working once the BPM has finished. Anyone missed after
                  that is checked in from the list on this page.
                </Text>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </Modal>
  );
}
