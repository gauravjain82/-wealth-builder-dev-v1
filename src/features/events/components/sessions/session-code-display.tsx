import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { LoadingState, QrCode } from '@shared/components';
import { sessionService } from '../../services/session-service';
import { formatDayLabel, formatTime, formatTimeRange } from '../../utils/zoned-time';
import type { EventSession, SessionQr } from '../../types/session';

interface SessionCodeDisplayProps {
  eventId: number;
  eventName: string;
  session: EventSession;
  timeZone: string;
  onClose: () => void;
}

/** As large as the screen allows while leaving room for the text. */
function qrSizeFor(width: number, height: number): number {
  return Math.floor(Math.max(200, Math.min(width * 0.7, height * 0.5, 560)));
}

/**
 * A session's room code as a poster: put it on the room's screen or a tablet
 * at the door. The code encodes a URL, so attendees just point their phone
 * camera at it — no app navigation to explain. Only staff with check-in access
 * can open this, because holding the code is what proves someone is in the room.
 */
export function SessionCodeDisplay({ eventId, eventName, session, timeZone, onClose }: SessionCodeDisplayProps) {
  const [code, setCode] = useState<SessionQr | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState(() => qrSizeFor(window.innerWidth, window.innerHeight));

  useEffect(() => {
    let cancelled = false;
    sessionService
      .qr(eventId, session.id)
      .then((qr) => !cancelled && setCode(qr))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Could not load the code.'));
    return () => {
      cancelled = true;
    };
  }, [eventId, session.id]);

  useEffect(() => {
    const onResize = () => setSize(qrSizeFor(window.innerWidth, window.innerHeight));
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const closesAt = session.ends_at
    ? formatTime(
        new Date(new Date(session.ends_at).getTime() + session.checkin_closes_minutes_after * 60000).toISOString(),
        timeZone,
      )
    : null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${session.title} check-in code`}
      className="fixed inset-0 z-[1000] overflow-y-auto bg-[#141821] text-white"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close check-in code"
        className="fixed right-3 top-3 z-10 rounded-full bg-white/10 p-2 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      >
        <X size={22} />
      </button>

      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center px-5 pb-8 pt-10 text-center sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">{eventName}</p>
        <h1 className="mt-2 text-[clamp(2rem,7vw,4.25rem)] font-bold leading-tight">{session.title}</h1>
        <p className="mt-2 text-[clamp(1rem,3.2vw,1.6rem)] text-white/80">
          {formatDayLabel(session.local_date)} · {formatTimeRange(session.starts_at, session.ends_at, timeZone)}
          {session.room ? ` · ${session.room}` : ''}
        </p>
        {session.access === 'RESTRICTED' ? (
          <p className="mt-3 rounded-full bg-amber-400/15 px-4 py-1 text-sm font-semibold text-amber-200">
            {session.restriction_label || 'Restricted session'}
          </p>
        ) : null}

        <div className="mt-8 flex flex-1 flex-col items-center justify-center">
          {error ? (
            <p className="rounded-lg bg-red-500/15 px-4 py-3 text-base font-medium text-red-200">{error}</p>
          ) : code ? (
            <div className="rounded-3xl bg-white p-5 shadow-2xl">
              <QrCode
                value={code.url}
                size={size}
                alt={`QR code to check in to ${session.title}`}
                fallbackText="Code unavailable — show your ticket QR to the door staff."
              />
            </div>
          ) : (
            <LoadingState />
          )}
          <p className="mt-6 text-[clamp(1.2rem,4vw,2rem)] font-semibold">
            Point your phone camera here to check in
          </p>
          <p className="mt-2 max-w-md text-sm text-white/60">
            Sign in if asked. No camera or no account? Show your ticket QR to the door staff.
            {closesAt ? ` Self check-in closes at ${closesAt}.` : ''}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
