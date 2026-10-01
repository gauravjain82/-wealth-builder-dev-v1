import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { LoadingState, QrCode } from '@shared/components';
import wbLogo from '@/assets/images/wealthbuilderslogo.png';
import { bpmService, formatOccurrenceTime } from '../services/bpm-service';
import { useBpmSelection } from '../context/bpm-selection-context';
import type { BPMOccurrence, BPMQrToken } from '../types';

interface BpmEventCodeDisplayProps {
  occurrenceId: number;
  /**
   * The occurrence on show, when the caller already has it — the QR dialog's
   * chosen location, which in All-locations mode need not be the selection's
   * anchor. Used only when its id matches `occurrenceId`.
   */
  occurrence?: BPMOccurrence | null;
  onClose: () => void;
}

/** The QR's edge in px: as large as the screen allows, leaving room for the text. */
function qrSizeFor(width: number, height: number): number {
  return Math.floor(Math.max(180, Math.min(width * 0.72, height * 0.4, 520)));
}

function useQrSize(): number {
  const [size, setSize] = useState(() => qrSizeFor(window.innerWidth, window.innerHeight));
  useEffect(() => {
    const onResize = () => setSize(qrSizeFor(window.innerWidth, window.innerHeight));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

/**
 * This date's event code as a poster: the only thing on the screen.
 *
 * It is put on the room's screen, or a phone is held up to a queue, so it takes
 * the whole viewport and is laid out portrait-first — the brief's template
 * (IMG_0387) is a phone held upright. Heading and steps on top, the code in the
 * middle, the BPM and its date *below* the code where somebody reading it off the
 * screen looks next. Nothing here scans: this is the display half only.
 *
 * Name, date and place come from the `occurrence` prop, else the selected
 * occurrence, whichever is the one on show, and fall back to the code's own
 * label when neither is.
 */
export function BpmEventCodeDisplay({
  occurrenceId,
  occurrence: given = null,
  onClose,
}: BpmEventCodeDisplayProps) {
  const { occurrence: selected } = useBpmSelection();
  const [code, setCode] = useState<BPMQrToken | null>(null);
  const [error, setError] = useState<string | null>(null);
  const qrSize = useQrSize();

  useEffect(() => {
    let cancelled = false;
    setCode(null);
    setError(null);
    bpmService
      .occurrenceQr(occurrenceId)
      .then((token) => {
        if (!cancelled) setCode(token);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load this BPM’s QR code');
      });
    return () => {
      cancelled = true;
    };
  }, [occurrenceId]);

  // A poster, not a dialog: Escape closes it, and the page behind must not scroll.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const shown =
    given?.id === occurrenceId ? given : selected?.id === occurrenceId ? selected : null;
  const title = shown?.event_name ?? code?.label ?? '';
  const when = shown
    ? formatOccurrenceTime(shown.start_at, { timeZone: shown.timezone, year: 'numeric' })
    : null;
  const place = shown?.location_detail?.label ?? null;
  const closesAt = shown?.checkin_closes_at
    ? formatOccurrenceTime(shown.checkin_closes_at, { timeZone: shown.timezone })
    : null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Event check-in code"
      className="fixed inset-0 z-[1000] overflow-y-auto bg-[#1f2433] text-[#f2c75c]"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close event code"
        className="fixed right-3 top-3 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f2c75c]"
      >
        <X size={22} />
      </button>

      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center px-5 pb-6 pt-10 sm:px-10">
        <h1 className="text-center font-serif text-[clamp(2rem,8vw,4.5rem)] font-bold uppercase leading-tight">
          Associate Check-In
        </h1>
        {title ? (
          <p className="mt-2 text-center font-serif text-[clamp(1.4rem,5.5vw,3rem)] font-semibold leading-tight text-white">
            {title}
          </p>
        ) : null}

        <p className="mt-6 w-full font-serif text-[clamp(1.05rem,3.6vw,1.9rem)] font-semibold">
          From your phone:
        </p>
        <ol className="mt-1 w-full list-decimal space-y-1 pl-8 font-serif text-[clamp(1.05rem,3.6vw,1.9rem)] font-semibold leading-snug marker:font-bold">
          <li>
            Go to <span className="break-all">{window.location.host}</span> on your browser
          </li>
          <li>Click on your Profile Icon</li>
          <li>Click “Scan QR”</li>
          <li>Click “Use Camera”</li>
        </ol>

        <div className="mt-8 flex flex-1 flex-col items-center justify-center">
          {error ? (
            <p className="rounded-lg bg-red-500/15 px-4 py-3 text-center text-base font-medium text-red-200">
              {error}
            </p>
          ) : code ? (
            <div className="rounded-2xl bg-white p-4">
              <QrCode
                value={code.token}
                size={qrSize}
                alt="Event check-in QR code"
                fallbackText="QR code unavailable — check people in from the list."
              />
            </div>
          ) : (
            <LoadingState />
          )}

          {when ? (
            <p className="mt-5 text-center text-[clamp(1rem,3.4vw,1.6rem)] font-semibold text-white">
              {when}
              {place ? <span className="text-white/80"> · {place}</span> : null}
            </p>
          ) : null}
          <p className="mt-2 max-w-md text-center text-sm text-white/60">
            {closesAt
              ? `Scanning this stops working when check-in closes at ${closesAt}.`
              : 'Scanning this stops working once the BPM has finished.'}{' '}
            Anyone missed after that is checked in from the list.
          </p>
        </div>

        <img src={wbLogo} alt="Wealth Builders" className="mt-6 h-16 w-auto self-end opacity-90" />
      </div>
    </div>,
    document.body,
  );
}
