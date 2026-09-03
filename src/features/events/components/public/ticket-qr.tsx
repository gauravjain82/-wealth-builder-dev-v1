/**
 * Renders a ticket's QR code.
 *
 * The QR encodes the ticket's *hosted page URL*, not the bare token, so that
 * scanning it with any phone camera opens the ticket. Check-in staff scanning
 * with the app read the `qr_token` back out of that URL.
 *
 * Uses the `qrcode` package's browser build (`toDataURL`) rather than a React
 * QR component, since `qrcode` is already a dependency here.
 */

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface TicketQrProps {
  /** The value to encode — the absolute hosted-ticket URL. */
  value: string;
  /** Rendered pixel size of the square code. */
  size?: number;
  /** Dimmed styling for a cancelled/refunded ticket. */
  muted?: boolean;
}

export function TicketQr({ value, size = 220, muted = false }: TicketQrProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);

    QRCode.toDataURL(value, {
      width: size * 2, // 2x for crisp rendering on retina and in print
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    // Guards against a stale render writing over a newer token's code.
    return () => {
      active = false;
    };
  }, [value, size]);

  if (failed) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-xl bg-slate-100 p-4 text-center text-xs text-slate-500"
      >
        QR code unavailable — show the ticket number at the door.
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`flex items-center justify-center rounded-xl bg-white p-3 ${
        muted ? 'opacity-40' : ''
      }`}
    >
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="Ticket QR code"
          width={size}
          height={size}
          className="h-full w-full"
        />
      ) : null}
    </div>
  );
}
