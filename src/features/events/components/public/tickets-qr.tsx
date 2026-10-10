/**
 * A scan-to-buy QR code for the landing page's top bar, beside "Get Tickets".
 *
 * Built for the room: the organizer has the event page on a projector, clicks
 * the code to enlarge it, and guests scan it to land on the purchase form on
 * their own phones. It sits in the sticky header so it is one click away from
 * anywhere on the page. It encodes this page's `#tickets` URL
 * (`ticketsShareUrl`), which `InlineCheckoutSection` scrolls to on arrival.
 *
 * Hidden below `sm`: a phone cannot scan its own screen. The enlarged view is
 * a native `<dialog>` like `VideoModal`, on white so the code reads off a dark
 * theme and a washed-out projector alike.
 */

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

import { QrCode } from '@shared/components';

import type { PublicEvent } from '../../types/public';
import { ticketsShareUrl } from '../../utils/ticket-links';

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
        aria-label="Show the ticket QR code"
        title="Show the QR code to book on a phone"
        className="hidden items-center gap-2.5 rounded-md text-left hover:opacity-80 sm:flex"
      >
        <QrCode
          value={url}
          size={40}
          alt=""
          className="shrink-0 !rounded-md !p-1"
        />
        <span className="text-xs font-bold uppercase leading-tight tracking-[0.12em]">
          Scan to
          <br />
          book
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
