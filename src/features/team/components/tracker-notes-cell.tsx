import type { TrackerNote } from '@/features/team/services/tracker-notes-service';

interface TrackerNotesCellProps {
  userId: number;
  userName: string;
  notes: TrackerNote[];
  draft: string;
  focusedNoteInputId: number | null;
  saving: boolean;
  onDraftChange: (userId: number, value: string) => void;
  onFocus: (userId: number) => void;
  onBlur: () => void;
  onAddInlineNote: (userId: number) => Promise<void>;
  onOpenAllNotes: () => void;
}

function formatNoteDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export function TrackerNotesCell({
  userId,
  userName,
  notes,
  draft,
  focusedNoteInputId,
  saving,
  onDraftChange,
  onFocus,
  onBlur,
  onAddInlineNote,
  onOpenAllNotes,
}: TrackerNotesCellProps) {
  const lastNote = notes.length > 0 ? notes[notes.length - 1] : null;
  const isFocused = focusedNoteInputId === userId;
  const inputValue = isFocused ? draft : draft || lastNote?.text || '';

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          className="h-8 w-full rounded border border-white/15 bg-white/5 px-2 text-xs text-white outline-none focus:border-amber-300/50"
          type="text"
          placeholder="Add a quick note... (Press Enter)"
          value={inputValue}
          disabled={saving}
          onChange={(e) => onDraftChange(userId, e.target.value)}
          onFocus={() => onFocus(userId)}
          onBlur={onBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void onAddInlineNote(userId);
            }
          }}
          aria-label={`Add note for ${userName}`}
        />
        <button
          type="button"
          className="h-8 w-8 rounded border border-white/20 bg-white/5 text-sm hover:bg-white/10"
          onClick={(e) => {
            e.stopPropagation();
            onOpenAllNotes();
          }}
          title="Open all notes"
          aria-label={`Open all notes for ${userName}`}
        >
          ✏
        </button>
      </div>
      {lastNote && !isFocused && !draft && (
        <div className="truncate text-[11px] text-white/70">
          {(lastNote.created_by_name || '—') + ' • ' + formatNoteDate(lastNote.created_at)}
        </div>
      )}
    </div>
  );
}
