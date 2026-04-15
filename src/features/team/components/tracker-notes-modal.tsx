import { Button, Modal, Textarea } from '@/shared/components';
import type { TrackerNote } from '@/features/team/services/tracker-notes-service';

interface TrackerNotesModalProps {
  open: boolean;
  title: string;
  notes: TrackerNote[];
  draft: string;
  saving: boolean;
  onClose: () => void;
  onDraftChange: (value: string) => void;
  onAddNote: () => Promise<void>;
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export function TrackerNotesModal({
  open,
  title,
  notes,
  draft,
  saving,
  onClose,
  onDraftChange,
  onAddNote,
}: TrackerNotesModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      contentClassName="max-w-[760px]"
    >
      <div className="space-y-3">
        <div className="max-h-[45vh] overflow-auto rounded-xl border border-white/10 bg-white/5 p-3">
          {notes.length === 0 ? (
            <div className="px-2 py-3 text-sm text-white/70">No notes yet.</div>
          ) : (
            <div className="space-y-2">
              {notes.map((note) => (
                <div key={note.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="whitespace-pre-wrap text-sm text-white/90">{note.text}</div>
                  <div className="mt-1 text-xs text-white/70">
                    {(note.created_by_name || '—') + ' • ' + (note.tracker || 'unknown') + ' • ' + formatDateTime(note.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Textarea
            rows={3}
            placeholder="Add a new note..."
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
          />
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button type="button" onClick={() => void onAddNote()} disabled={saving}>
              {saving ? 'Saving...' : 'Add Note'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
