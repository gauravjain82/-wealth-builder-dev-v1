/**
 * Renders any value as a QR code, client-side.
 *
 * Generalised out of `features/events/components/public/ticket-qr.tsx`, which was
 * the only QR renderer in the app and is now a thin wrapper around this. It lives
 * in `shared/` for the same reason the row colours do: BPM needs one, events
 * needs one, and two renderers would be two sets of encoding options to keep in
 * step — a code that a scanner reads at a door is not a place to discover that
 * one of them uses a different error-correction level.
 *
 * Uses the `qrcode` package's browser build (`toDataURL`) rather than a React QR
 * component, because `qrcode` is already a dependency. **No server-side
 * generator is involved**: `events/services/pdf.py` can make one for a PDF, but a
 * code on screen does not need a round trip.
 */

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export interface QrCodeProps {
  /** The value to encode — a token, or a URL carrying one. */
  value: string;
  /** Rendered pixel size of the square code. */
  size?: number;
  /** Dimmed styling, for a code that is no longer current. */
  muted?: boolean;
  /** Alt text. Defaults to a generic description. */
  alt?: string;
  /** Shown in place of the code if encoding fails. */
  fallbackText?: string;
  className?: string;
}

/** A square QR code for `value`. */
export function QrCode({
  value,
  size = 220,
  muted = false,
  alt = 'QR code',
  fallbackText = 'QR code unavailable.',
  className,
}: QrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);

    QRCode.toDataURL(value, {
      width: size * 2, // 2x for crisp rendering on retina and in print
      margin: 1,
      errorCorrectionLevel: 'M',
      // Always black on white, in both themes: a scanner reads contrast, and an
      // inverted code in dark mode is a code that does not scan.
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    // Guards against a stale render writing over a newer token's code — which
    // matters here, because "regenerate my code" replaces `value` in place.
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
        {fallbackText}
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={[
        'flex items-center justify-center rounded-xl bg-white p-3',
        muted ? 'opacity-40' : '',
        className || '',
      ]
        .join(' ')
        .trim()}
    >
      {dataUrl ? (
        <img src={dataUrl} alt={alt} width={size} height={size} className="h-full w-full" />
      ) : null}
    </div>
  );
}
