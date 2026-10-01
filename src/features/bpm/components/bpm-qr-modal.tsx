import { useState } from 'react';
import { Button, Modal, Select, Text } from '@shared/components';
import { formatOccurrenceTime } from '../services/bpm-service';
import { BpmQrScanPanel } from './bpm-qr-scan-panel';
import { BpmEventCodeDisplay } from './bpm-event-code-display';
import type { BPMOccurrence, BPMQrScanResult } from '../types';

interface BpmQrModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * The selected date. Null means the profile menu opened this, where there is
   * no date to display a code for and only scanning is offered.
   */
  occurrenceId?: number | null;
  /**
   * The locations the page's lists span — its `scopeOccurrences`. With two or
   * more (All-locations mode) the dialog asks which one the scanner and the
   * event code are for, defaulting to `occurrenceId`'s (D24). Passed in rather
   * than read from the selection context, because the header mounts this dialog
   * outside the BPM provider.
   */
  locations?: BPMOccurrence[];
  /**
   * Makes the location choice the page's own: the dialog then shows
   * `occurrenceId`'s location and reports a change here instead of keeping it.
   * The check-in pages pass their sticky `useScopeLocation` setter, so the QR
   * lands where "Check in at" / "Add to location" already points.
   */
  onLocationChange?: (occurrenceId: number) => void;
  /** Called after a scan recorded an attendance, so the page can reload its list. */
  onCheckedIn?: (result: BPMQrScanResult) => void;
}

/**
 * BPM's one QR entry point: the scanner, and the way to this date's event code.
 *
 * Both start here because a host at a door needs both within a second of each
 * other — put the code on the room's screen, then scan the people whose phones
 * will not. Showing the code *replaces* this dialog with a full-screen poster
 * (`BpmEventCodeDisplay`) rather than sitting under the scanner: a screen showing
 * the code to a room has no use for a camera box, and the brief asked for the
 * code to be the only thing to look at.
 *
 * With no `occurrenceId` (the profile menu) the event-code option is simply
 * absent rather than disabled: there is no date to show a code *for*, and a
 * greyed button would invite a click that can never work.
 *
 * A code, and an identity scan, belong to one location, so when the page spans
 * several the dialog asks which (D24) instead of guessing. The choice is kept
 * while the page is open — a greeter stays at one door — and falls back to
 * `occurrenceId`'s location, then the first, when it is no longer in scope.
 */
export function BpmQrModal({
  open,
  onClose,
  occurrenceId = null,
  locations,
  onLocationChange,
  onCheckedIn,
}: BpmQrModalProps) {
  const [presenting, setPresenting] = useState(false);
  const [chosenId, setChosenId] = useState<number | null>(null);

  const choices = locations && locations.length > 1 ? locations : null;
  const chosen = choices
    ? ((onLocationChange ? undefined : choices.find((row) => row.id === chosenId)) ??
      choices.find((row) => row.id === occurrenceId) ??
      choices[0])
    : (locations?.find((row) => row.id === occurrenceId) ?? null);
  const targetId = choices ? chosen?.id ?? null : occurrenceId;

  if (open && presenting && targetId) {
    return (
      <BpmEventCodeDisplay
        occurrenceId={targetId}
        occurrence={chosen}
        onClose={() => {
          setPresenting(false);
          onClose();
        }}
      />
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="QR check-in" contentClassName="max-w-[560px]">
      <div className="space-y-5">
        {choices ? (
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-white/80">Location</span>
            <Select
              variant="surface"
              value={chosen?.id ?? ''}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (onLocationChange) onLocationChange(next);
                else setChosenId(next);
              }}
            >
              {choices.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.location_detail?.label || `Location ${row.location ?? row.id}`} ·{' '}
                  {formatOccurrenceTime(row.start_at, {
                    weekday: undefined,
                    month: undefined,
                    day: undefined,
                  })}
                </option>
              ))}
            </Select>
          </label>
        ) : null}

        <section>
          <BpmQrScanPanel occurrenceId={targetId} onCheckedIn={onCheckedIn} />
          <Text variant="muted" className="mt-2 text-xs">
            Scan an associate’s personal code to check them in, a guest’s pass to check
            the guest in, or the event code on a screen to check yourself in.
          </Text>
        </section>

        {targetId ? (
          <section className="border-t border-slate-200 pt-4 dark:border-white/10">
            <Button type="button" variant="outline" onClick={() => setPresenting(true)}>
              Show event code
            </Button>
            <Text variant="muted" className="mt-2 text-xs">
              Opens this date’s code full screen. Put it on the screen in the room and
              associates can check themselves in by scanning it.
            </Text>
          </section>
        ) : null}
      </div>
    </Modal>
  );
}
