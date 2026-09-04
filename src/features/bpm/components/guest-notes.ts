import type { BPMGuest, BPMGuestNote } from '../types';

export function guestNoteText(note: BPMGuestNote | string): string {
  return typeof note === 'string' ? note : note?.text || '';
}

export function guestNoteAuthor(note: BPMGuestNote | string): string {
  return typeof note === 'string' ? '' : note?.created_by_name || '';
}

export function guestNoteCreatedAt(note: BPMGuestNote | string): string {
  return typeof note === 'string' ? '' : note?.created_at || '';
}

export function normalizeGuestNotes(guest: BPMGuest | null | undefined): BPMGuestNote[] {
  if (!guest || !Array.isArray(guest.notes)) return [];
  return guest.notes.map((note, index) =>
    typeof note === 'string' ? { id: index, text: note } : note,
  );
}

/** Newest first when timestamps exist; otherwise reverse payload order (last item is latest). */
export function guestNotesHistory(guest: BPMGuest | null | undefined): BPMGuestNote[] {
  const notes = normalizeGuestNotes(guest);
  if (notes.length === 0) return [];
  const allDated = notes.every((note) => Boolean(note.created_at));
  if (allDated) {
    return [...notes].sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
    );
  }
  return [...notes].reverse();
}

export function latestGuestNote(guest: BPMGuest | null | undefined): BPMGuestNote | null {
  return guestNotesHistory(guest)[0] ?? null;
}

export function formatGuestNoteTime(value?: string): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export function mergeGuest(list: BPMGuest[], updated: BPMGuest): BPMGuest[] {
  return list.map((guest) => {
    if (guest.id !== updated.id) return guest;
    return {
      ...guest,
      ...updated,
      notes: Array.isArray(updated.notes) ? updated.notes : guest.notes,
      prospect_detail: updated.prospect_detail ?? guest.prospect_detail,
      followup: updated.followup !== undefined ? updated.followup : guest.followup,
    };
  });
}
