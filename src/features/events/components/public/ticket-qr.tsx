/**
 * Renders a ticket's QR code.
 *
 * The QR encodes the ticket's *hosted page URL*, not the bare token, so that
 * scanning it with any phone camera opens the ticket. Check-in staff scanning
 * with the app read the `qr_token` back out of that URL. (BPM's codes
 * deliberately carry the bare token instead — see `bpm/services/qr.py`.)
 *
 * The rendering itself is `shared/components/qr-code`, which this was
 * generalised into when BPM needed the same square. Kept as a named component
 * because "a ticket's QR" carries the wording of its own failure message.
 */

import { QrCode } from '@shared/components';

interface TicketQrProps {
  /** The value to encode — the absolute hosted-ticket URL. */
  value: string;
  /** Rendered pixel size of the square code. */
  size?: number;
  /** Dimmed styling for a cancelled/refunded ticket. */
  muted?: boolean;
}

export function TicketQr({ value, size = 220, muted = false }: TicketQrProps) {
  return (
    <QrCode
      value={value}
      size={size}
      muted={muted}
      alt="Ticket QR code"
      fallbackText="QR code unavailable — show the ticket number at the door."
    />
  );
}
