import { TrackerNotesCell } from '@/features/team/components/tracker-notes-cell';
import type { TrackerNote } from '@/features/team/services/tracker-notes-service';

interface PolicyNotesCellProps {
	userId: number | null;
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

export function PolicyNotesCell({
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
}: PolicyNotesCellProps) {
	if (userId == null) {
		const preview = notes.length > 0 ? notes[notes.length - 1]?.text || '' : '';

		return (
			<div className="flex w-full flex-col gap-1">
				<div className="flex items-center gap-2">
					<input
						className="h-8 w-full rounded border border-white/15 bg-white/5 px-2 text-xs text-white/60"
						type="text"
						value={preview}
						placeholder="Notes unavailable"
						disabled
						aria-label={`Notes unavailable for ${userName}`}
					/>
					<button
						type="button"
						className="h-8 w-8 rounded border border-white/10 bg-white/5 text-sm text-white/40"
						disabled
						title="This policy is not linked to a user yet"
						aria-label={`Notes unavailable for ${userName}`}
					>
						✏
					</button>
				</div>
			</div>
		);
	}

	return (
		<TrackerNotesCell
			userId={userId}
			userName={userName}
			notes={notes}
			draft={draft}
			focusedNoteInputId={focusedNoteInputId}
			saving={saving}
			onDraftChange={onDraftChange}
			onFocus={onFocus}
			onBlur={onBlur}
			onAddInlineNote={onAddInlineNote}
			onOpenAllNotes={onOpenAllNotes}
		/>
	);
}
