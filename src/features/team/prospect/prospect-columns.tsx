import type { TrackerTableColumn } from '@/shared/components';
import type { Prospect } from './services/prospect-service';
import type { TrackerNote } from '@/features/team/services/tracker-notes-service';
import { buildProfileSummary } from './prospect-utils';

interface ProspectColumnOptions {
  notesByProspectId: Record<number, TrackerNote[]>;
  noteDraftByProspectId: Record<number, string>;
  focusedNoteInputId: number | null;
  savingNoteProspectIdSet: Set<number>;
  onNoteDraftChange: (prospectId: number, value: string) => void;
  onNoteFocus: (prospectId: number) => void;
  onNoteBlur: () => void;
  onAddInlineNote: (row: Prospect) => Promise<void>;
  onOpenAllNotes: (row: Prospect) => void;
}

function formatNoteDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export function buildProspectColumns(
  onEdit: (row: Prospect) => void,
  onOpenCallLog: (row: Prospect) => void,
  onDelete: (row: Prospect) => void,
  options: ProspectColumnOptions
): TrackerTableColumn<Prospect>[] {
  return [
    {
      key: 'mark',
      label: '',
      width: 48,
      align: 'center',
      sortable: false,
      render: (row) => {
        const mark = row.prospect_meta?.mark || '';
        const bg =
          mark === 'Both'
            ? '#a855f7'
            : mark === 'Client'
            ? '#22c55e'
            : mark === 'Recruit'
            ? '#3b82f6'
            : '#64748b';
        return (
          <span
            title={mark || 'No mark'}
            style={{
              display: 'inline-block',
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: bg,
            }}
          />
        );
      },
    },
    {
      key: 'leader_name',
      label: 'Leader',
      width: 180,
      sortable: true,
      render: (row) => row.leader_name || '-',
      searchable: true,
      searchPlaceholder: 'Search Leader',
    },
    {
      key: 'recruited_by_name',
      label: 'Recruiter Name',
      width: 180,
      sortable: true,
      render: (row) => row.recruited_by_name || '-',
      searchable: true,
      searchPlaceholder: 'Search Recruiter',
    },
    {
      key: 'full_name',
      label: 'Name',
      width: 240,
      sticky: true,
      sortable: true,
      searchable: true,
      searchPlaceholder: 'Search Name',
    },
    {
      key: 'top25',
      label: 'Top 25',
      width: 90,
      align: 'center',
      sortable: true,
      render: (row) => <span style={{ fontSize: '1.2em' }}>{row.prospect_meta?.top25 ? '⭐' : ''}</span>,
    },
    {
      key: 'hot',
      label: 'HOT',
      width: 80,
      align: 'center',
      sortable: true,
      render: (row) => <span style={{ fontSize: '1.2em' }}>{row.prospect_meta?.hot ? '🔥' : ''}</span>,
    },
    {
      key: 'outcome',
      label: 'Outcome',
      width: 150,
      sortable: true,
      render: (row) => row.prospect_meta?.outcome || '-',
    },
    {
      key: 'profile',
      label: 'Profile',
      width: 320,
      sortable: true,
      render: (row) => buildProfileSummary(row),
      value: (row) => buildProfileSummary(row),
    },
    {
      key: 'notes',
      label: 'Notes',
      width: 420,
      render: (row) => {
        const notes = options.notesByProspectId[row.id] || [];
        const lastNote = notes.length > 0 ? notes[notes.length - 1] : null;
        const isFocused = options.focusedNoteInputId === row.id;
        const draft = options.noteDraftByProspectId[row.id] || '';
        const inputValue = isFocused ? draft : draft || lastNote?.text || '';
        const isSaving = options.savingNoteProspectIdSet.has(row.id);

        return (
          <div className="flex w-full flex-col gap-1">
            <div className="flex items-center gap-2">
              <input
                className="h-8 w-full rounded border border-white/15 bg-white/5 px-2 text-xs text-white outline-none focus:border-amber-300/50"
                type="text"
                placeholder="Add a quick note... (Press Enter)"
                value={inputValue}
                disabled={isSaving}
                onChange={(e) => options.onNoteDraftChange(row.id, e.target.value)}
                onFocus={() => options.onNoteFocus(row.id)}
                onBlur={() => options.onNoteBlur()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void options.onAddInlineNote(row);
                  }
                }}
              />
              <button
                type="button"
                className="h-8 w-8 rounded border border-white/20 bg-white/5 text-sm hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  options.onOpenAllNotes(row);
                }}
                title="Open all notes"
                aria-label={`Open all notes for ${row.full_name || row.email}`}
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
      },
      value: (row) => {
        const notes = options.notesByProspectId[row.id] || [];
        return notes.map((note) => note.text).join(' ');
      },
      searchable: true,
      searchPlaceholder: 'Search Notes',
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 150,
      align: 'center',
      sortable: false,
      render: (row) => (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            title="Edit prospect"
            aria-label={`Edit ${row.full_name || row.email}`}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(row);
            }}
            className="h-7 w-7 rounded border border-amber-300/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
          >
            ✎
          </button>
          <button
            type="button"
            title="Invite prospect"
            aria-label={`Invite ${row.full_name || row.email}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpenCallLog(row);
            }}
            className="h-7 w-7 rounded border border-blue-300/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20"
          >
            ✉
          </button>
          <button
            type="button"
            title="Delete prospect"
            aria-label={`Delete ${row.full_name || row.email}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(row);
            }}
            className="h-7 w-7 rounded border border-red-300/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
          >
            🗑
          </button>
        </div>
      ),
    },
  ];
}
