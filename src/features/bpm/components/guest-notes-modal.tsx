import { useEffect, useState } from 'react';
import { Button, Modal, Textarea } from '@shared/components';
import { useToastStore } from '@/store';
import { bpmService } from '../services/bpm-service';
import type { BPMGuest } from '../types';
import {
  formatGuestNoteTime,
  guestNoteAuthor,
  guestNoteCreatedAt,
  guestNoteText,
  guestNotesHistory,
} from './guest-notes';

interface GuestNotesModalProps {
  open: boolean;
  guest: BPMGuest | null;
  onClose: () => void;
  onSaved: (updated: BPMGuest) => void;
}

export function GuestNotesModal({ open, guest, onClose, onSaved }: GuestNotesModalProps) {
  const addToast = useToastStore((state) => state.addToast);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) setDraft('');
  }, [open, guest?.id]);

  const history = guestNotesHistory(guest);

  const addNote = async () => {
    const text = draft.trim();
    if (!guest || !text) return;
    setSaving(true);
    try {
      const updated = await bpmService.addGuestNote(guest.occurrence, { guest_id: guest.id, text });
      onSaved(updated);
      setDraft('');
      addToast({ type: 'success', message: 'Note added.' });
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to add note' });
    } finally {
      setSaving(false);
    }
  };

  const name = guest?.prospect_detail?.name || 'guest';

  return (
    <Modal open={open} title={`Notes · ${name}`} onClose={onClose} contentClassName="max-w-[640px]">
      <div className="space-y-3">
        <div className="max-h-[45vh] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
          {history.length === 0 ? (
            <div className="px-2 py-3 text-sm text-slate-600 dark:text-white/70">No notes yet.</div>
          ) : (
            <div className="space-y-2">
              {history.map((note, index) => {
                const author = guestNoteAuthor(note);
                const when = formatGuestNoteTime(guestNoteCreatedAt(note));
                const meta = [author || null, when || null].filter(Boolean).join(' • ');
                return (
                  <div
                    key={note.id || index}
                    className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-black/20"
                  >
                    <div className="whitespace-pre-wrap text-sm text-slate-800 dark:text-white/90">
                      {guestNoteText(note)}
                    </div>
                    {meta ? (
                      <div className="mt-1 text-xs text-slate-500 dark:text-white/60">{meta}</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Textarea
            rows={3}
            placeholder="Add a new note..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button type="button" onClick={() => void addNote()} disabled={saving || !draft.trim()}>
              {saving ? 'Saving...' : 'Add Note'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
