import type { BPMGuest } from '../types';
import { formatGuestNoteTime, guestNoteAuthor, guestNoteText, latestGuestNote } from './guest-notes';

interface GuestNotesCellProps {
  guest: BPMGuest;
  onOpen: () => void;
}

export function GuestNotesCell({ guest, onOpen }: GuestNotesCellProps) {
  const lastNote = latestGuestNote(guest);
  const text = lastNote ? guestNoteText(lastNote) : '';
  const author = lastNote ? guestNoteAuthor(lastNote) : '';
  const when = lastNote ? formatGuestNoteTime(lastNote.created_at) : '';
  const meta = [author || null, when || null].filter(Boolean).join(' • ');

  return (
    <button
      type="button"
      onClick={onOpen}
      title="Open notes history"
      aria-label={`Open notes history for ${guest.prospect_detail?.name || 'guest'}`}
      className="max-w-[240px] text-left"
    >
      {lastNote && text ? (
        <>
          <span className="block truncate text-sm text-slate-800 underline decoration-slate-300 underline-offset-2 hover:text-amber-600 dark:text-white/90 dark:decoration-white/25 dark:hover:text-amber-300">
            {text}
          </span>
          {meta ? (
            <span className="mt-0.5 block truncate text-[11px] text-slate-500 dark:text-white/50">{meta}</span>
          ) : null}
        </>
      ) : (
        <span className="text-xs text-slate-400 underline decoration-slate-300 underline-offset-2 hover:text-amber-600 dark:text-white/45 dark:decoration-white/20 dark:hover:text-amber-300">
          No notes
        </span>
      )}
    </button>
  );
}
