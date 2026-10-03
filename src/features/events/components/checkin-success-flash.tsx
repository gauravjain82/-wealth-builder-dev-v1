import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/** How long the green screen stays up. Long enough to register, short enough not to slow a queue. */
const FLASH_MS = 300;

interface CheckinSuccessFlashProps {
  /**
   * Bump to flash. A counter, not a boolean, so two people checked in back to
   * back flash twice; 0 never flashes.
   */
  trigger: number;
}

/**
 * A full-screen green with a check mark, shown for a moment after a camera scan
 * checks somebody in.
 *
 * The outcome line under the scanner was the only sign a scan had worked, and
 * people holding a phone up to a code were not seeing it. This is for them: it
 * covers the viewfinder they are looking at. It fires only for a *new* check-in
 * — a duplicate keeps its amber "Already checked in" line, which a green screen
 * would hide.
 *
 * Portalled to `body` above the modal (`z-[1100]`) and the toasts (`z-[1300]`),
 * since the BPM scanner lives in a dialog. It takes no pointer events, so a tap
 * during the flash reaches whatever is under it. The outcome line stays the
 * accessible announcement; this is decoration and is hidden from assistive tech.
 */
export function CheckinSuccessFlash({ trigger }: CheckinSuccessFlashProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger === 0) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [trigger]);

  if (!visible) return null;

  return createPortal(
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1400] flex items-center justify-center bg-emerald-500"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-40 w-40 text-white drop-shadow-lg"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" strokeWidth={2} />
        <path d="M7 12.5l3.5 3.5L17 9" />
      </svg>
    </div>,
    document.body,
  );
}
