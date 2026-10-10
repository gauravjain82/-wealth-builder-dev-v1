/**
 * A scan-to-buy QR code for the inline purchase form.
 *
 * Built for the room: the organizer opens the event page on a projector, clicks
 * the code to enlarge it, and guests scan it to land on the form on their own
 * phones. It encodes this page's `#tickets` URL (`ticketsShareUrl`), which
 * `InlineCheckoutSection` scrolls to on arrival.
 *
 * Hidden below `sm`: a phone cannot scan its own screen, and the form is
 * already right there. The enlarged view is a native `<dialog>` like
 * `VideoModal`, on white so the code reads off a dark theme and a washed-out
 * projector alike.
 */

import { useEffect, useRef, useState } from 'react';
import { Maximize2, X } from 'lucide-react';

import { cn } from '@core/utils';
import { QrCode } from '@shared/components';

import type { PublicEvent } from '../../types/public';
import { ticketsShareUrl } from '../../utils/ticket-links';

const MUTED = 'text-slate-600 dark:text-white/70 [[data-event-surface=tokens]_&]:text-[color:var(--event-muted)]';

/** Share of the shorter viewport side the enlarged code fills. */
const ENLARGED_FRACTION = 0.6;

export function TicketsQr({ event }: { event: Pick<PublicEvent, 'shortcut' | 'name'> }) {
  const ref = useRef<HTMLDialogElement>(null);
  /** Pixel size of the enlarged code; `null` keeps the dialog closed. */
  const [enlargedSize, setEnlargedSize] = useState<number | null>(null);
  const url = ticketsShareUrl(event.shortcut);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (enlargedSize !== null && !dialog.open) dialog.showModal();
    if (enlargedSize === null && dialog.open) dialog.close();
  }, [enlargedSize]);

  const open = () =>
    setEnlargedSize(
      Math.floor(Math.min(window.innerWidth, window.innerHeight) * ENLARGED_FRACTION),
    );
  const close = () => setEnlargedSize(null);

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Enlarge the ticket QR code"
        className={cn(
          'mx-auto mb-6 hidden w-full max-w-xl items-center gap-5 rounded-lg border border-slate-200 p-4 text-left',
          'hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5 sm:flex',
          '[[data-event-surface=tokens]_&]:rounded-sm [[data-event-surface=tokens]_&]:border-[color:var(--event-hairline)]',
        )}
      >
        <QrCode value={url} size={112} alt="QR code to this ticket form" className="shrink-0 !p-2" />
        <span>
          <span className="block text-base font-semibold">Scan to book on your phone</span>
          <span className={cn('mt-1 block text-sm', MUTED)}>
            Point your camera at the code to open this form.
          </span>
          <span
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--event-brand)' }}
          >
            <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
            Enlarge
          </span>
        </span>
      </button>

      <dialog
        ref={ref}
        aria-label="Ticket QR code"
        onClose={close}
        // A click on the backdrop lands on the dialog element itself.
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="overflow-visible bg-transparent p-0 backdrop:bg-black/90"
      >
        {enlargedSize !== null ? (
          <div className="relative rounded-2xl bg-white p-8 text-center text-slate-900 shadow-2xl">
            <button
              type="button"
              onClick={close}
              aria-label="Close QR code"
              className="absolute -top-11 right-0 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="text-2xl font-black tracking-tight sm:text-3xl">Scan to get your ticket</p>
            <p className="mt-1 text-base font-semibold text-slate-600">{event.name}</p>
            <QrCode
              value={url}
              size={enlargedSize}
              alt="QR code to this ticket form"
              className="mx-auto mt-4 !rounded-none !p-0"
            />
            <p className="mt-4 break-all text-sm text-slate-600">{url.replace(/^https?:\/\//, '')}</p>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
