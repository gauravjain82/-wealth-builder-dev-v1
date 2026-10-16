/** Session-dismissible "N tickets are overdue" banner for the queue pages. */

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface OverdueBannerProps {
  /** Overdue tickets in the page's section (`counts.<section>.breached`). */
  breached: number;
  /** Distinguishes the staff and team banners in sessionStorage. */
  section: 'staff' | 'team';
  /** Switch to the "At risk" tab; the button is hidden when already there. */
  onShowAtRisk?: () => void;
}

/** sessionStorage key holding the overdue count the user dismissed at. */
function storageKey(section: string): string {
  return `wb.helpdesk.overdueDismissed.${section}`;
}

/** Overdue count the banner was dismissed at this session (0 when never / unavailable). */
function readDismissed(section: string): number {
  try {
    const raw = sessionStorage.getItem(storageKey(section));
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

/** Remember the dismissal for this session; ignored when storage is blocked. */
function writeDismissed(section: string, count: number): void {
  try {
    sessionStorage.setItem(storageKey(section), String(count));
  } catch {
    // Storage unavailable: the dismissal lasts until the page unmounts.
  }
}

/**
 * Red banner shown while the section has overdue tickets. Dismissing hides it for the
 * session; it comes back only if more tickets go overdue than when it was dismissed.
 */
export function OverdueBanner({ breached, section, onShowAtRisk }: OverdueBannerProps) {
  const [dismissedAt, setDismissedAt] = useState<number>(() => readDismissed(section));
  if (breached <= 0 || breached <= dismissedAt) return null;

  const dismiss = () => {
    writeDismissed(section, breached);
    setDismissedAt(breached);
  };

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-400/30 dark:bg-red-500/15 dark:text-red-50"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 font-medium">
        {breached} ticket{breached === 1 ? ' is' : 's are'} overdue
      </span>
      {onShowAtRisk ? (
        <button
          type="button"
          onClick={onShowAtRisk}
          className="rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-semibold text-red-800 hover:bg-red-100 dark:border-red-300/30 dark:bg-transparent dark:text-red-50 dark:hover:bg-red-500/20"
        >
          Show at-risk tickets
        </button>
      ) : null}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss overdue banner"
        className="rounded-md p-1 hover:bg-red-100 dark:hover:bg-red-500/20"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
