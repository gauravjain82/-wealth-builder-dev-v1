import type { TrackerTableColumn } from '@/shared/components';
import type { Prospect } from './services/prospect-service';
import type { TrackerNote } from '@/features/team/services/tracker-notes-service';
import { buildProfileSummary } from './prospect-utils';

type ProspectMark = 'default' | 'client' | 'recruit' | 'both';

interface ProspectColumnOptions {
  notesByProspectId: Record<number, TrackerNote[]>;
  noteDraftByProspectId: Record<number, string>;
  focusedNoteInputId: number | null;
  savingNoteProspectIdSet: Set<number>;
  savingMetaProspectIdSet: Set<number>;
  onNoteDraftChange: (prospectId: number, value: string) => void;
  onNoteFocus: (prospectId: number) => void;
  onNoteBlur: () => void;
  onAddInlineNote: (row: Prospect) => Promise<void>;
  onOpenAllNotes: (row: Prospect) => void;
  onToggleProspectMeta: (row: Prospect, field: 'top25' | 'hot', value: boolean) => void;
  onChangeProspectMark: (row: Prospect, mark: ProspectMark) => void;
  onChangeProspectOutcome: (row: Prospect, outcome: '' | 'Client' | 'Recruit' | 'Both') => void;
  onOpenLeaderProfile?: (row: Prospect) => void;
  onOpenProspectProfile?: (row: Prospect) => void;
  onOpenRecruiterProfile?: (row: Prospect) => void;
  editingProfileProspectId: number | null;
  profileDraftByProspectId: Record<
    number,
    {
      howKnown: string;
      relationship: string;
      occupation: string;
      age: string;
      whatTold: string;
      married: boolean;
      dependentKids: boolean;
    }
  >;
  onStartProfileEdit: (row: Prospect) => void;
  onProfileDraftFieldChange: (
    prospectId: number,
    field: 'howKnown' | 'relationship' | 'occupation' | 'age' | 'whatTold',
    value: string
  ) => void;
  onProfileDraftFlagChange: (prospectId: number, field: 'married' | 'dependentKids', value: boolean) => void;
  onSaveProfileEdit: (row: Prospect) => Promise<void>;
  onCancelProfileEdit: () => void;
  getRowIndex: (row: Prospect) => number;
}

function ClickableName({
  value,
  onClick,
}: {
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="w-full text-left text-white/80 hover:text-white hover:underline"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {value || '-'}
    </button>
  );
}

function normalizeMarkValue(row: Prospect): ProspectMark {
  const raw = (row.prospect_meta?.mark || '').toLowerCase();
  if (raw === 'client' || raw === 'green') return 'client';
  if (raw === 'recruit' || raw === 'yellow' || raw === 'orange') return 'recruit';
  if (raw === 'both' || raw === 'combined') return 'both';
  return 'default';
}

function formatNoteDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function getRowNotes(
  row: Prospect,
  notesByProspectId: Record<number, TrackerNote[]>
): TrackerNote[] {
  const loaded = notesByProspectId[row.id];
  if (loaded && loaded.length > 0) return loaded;

  const latestText = row.latest_note_text?.trim();
  if (!latestText) return [];

  const createdAt = row.latest_note_created_at || row.updated_at || row.created_at;
  return [
    {
      id: -row.id,
      user: row.id,
      created_by: null,
      created_by_name: row.latest_note_created_by_name || undefined,
      text: latestText,
      tracker: row.latest_note_tracker || 'prospect',
      created_at: createdAt,
      updated_at: createdAt,
    },
  ];
}

export function buildProspectColumns(
  onEdit: (row: Prospect) => void,
  onOpenCallLog: (row: Prospect) => void,
  onDelete: (row: Prospect) => void,
  options: ProspectColumnOptions
): TrackerTableColumn<Prospect>[] {
  return [
    {
      key: 'index',
      label: '#',
      width: 50,
      minWidth: 50,
      resizable: false,
      className: 'tracker-col-narrow',
      align: 'center',
      sortable: false,
      value: (row) => options.getRowIndex(row),
      render: (row) => {
        const current = normalizeMarkValue(row);
        return (
          <div className="relative inline-flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <span className="select-none">{options.getRowIndex(row)}</span>
            <select
              title={`Marker for ${row.full_name || row.email}`}
              aria-label={`Marker for ${row.full_name || row.email}`}
              value={current}
              disabled={options.savingMetaProspectIdSet.has(row.id)}
              onChange={(e) =>
                options.onChangeProspectMark(
                  row,
                  (e.target.value as ProspectMark) || 'default'
                )
              }
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                color: '#111827',
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                cursor: options.savingMetaProspectIdSet.has(row.id) ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="default" style={{ backgroundColor: '#ffffff', color: '#111827' }}>Default</option>
              <option value="client" style={{ backgroundColor: '#ffffff', color: '#111827' }}>🟢 Client</option>
              <option value="recruit" style={{ backgroundColor: '#ffffff', color: '#111827' }}>🟡 Recruit</option>
              <option value="both" style={{ backgroundColor: '#ffffff', color: '#111827' }}>🔵 Both</option>
            </select>
          </div>
        );
      },
    },
    {
      key: 'leader_name',
      label: 'Leader',
      width: 180,
      sortable: true,
      render: (row) => (
        <ClickableName
          value={row.leader_name || ''}
          onClick={() => {
            if (options.onOpenLeaderProfile) {
              options.onOpenLeaderProfile(row);
              return;
            }
            options.onStartProfileEdit(row);
          }}
        />
      ),
      searchable: true,
      searchPlaceholder: 'Search Leader',
    },
    {
      key: 'recruited_by_name',
      label: 'Associate',
      width: 180,
      sortable: true,
      render: (row) => (
        <ClickableName
          value={row.recruited_by_name || ''}
          onClick={() => {
            if (options.onOpenRecruiterProfile) {
              options.onOpenRecruiterProfile(row);
              return;
            }
            options.onStartProfileEdit(row);
          }}
        />
      ),
      searchable: true,
      searchPlaceholder: 'Search Recruiter',
    },
    {
      key: 'full_name',
      label: 'Name',
      width: 240,
      sticky: true,
      sortable: true,
      render: (row) => (
        <ClickableName
          value={row.full_name || ''}
          onClick={() => {
            onEdit(row);
          }}
        />
      ),
      searchable: true,
      searchPlaceholder: 'Search Name',
    },
    {
      key: 'top25',
      label: 'Top 25',
      width: 90,
      align: 'center',
      sortable: true,
      value: (row) => (row.prospect_meta?.top25 ? 'Yes' : 'No'),
      render: (row) => (
        <input
          className="tracker-checkbox-lg prospect-checkbox-neutral"
          type="checkbox"
          checked={Boolean(row.prospect_meta?.top25)}
          disabled={options.savingMetaProspectIdSet.has(row.id)}
          aria-label={`Top 25 for ${row.full_name || row.email}`}
          onChange={(e) => options.onToggleProspectMeta(row, 'top25', e.target.checked)}
        />
      ),
    },
    {
      key: 'hot',
      label: 'HOT',
      width: 80,
      align: 'center',
      sortable: true,
      value: (row) => (row.prospect_meta?.hot ? 'Yes' : 'No'),
      render: (row) => (
        <input
          className="tracker-checkbox-lg prospect-checkbox-neutral"
          type="checkbox"
          checked={Boolean(row.prospect_meta?.hot)}
          disabled={options.savingMetaProspectIdSet.has(row.id)}
          aria-label={`Hot lead for ${row.full_name || row.email}`}
          onChange={(e) => options.onToggleProspectMeta(row, 'hot', e.target.checked)}
        />
      ),
    },
    {
      key: 'outcome',
      label: 'Outcome',
      width: 150,
      sortable: true,
      value: (row) => row.prospect_meta?.outcome || '',
      render: (row) => {
        const current = row.prospect_meta?.outcome || '';
        return (
          <select
            className="h-8 w-full rounded border border-white/15 bg-white/5 px-2 text-xs text-white outline-none focus:border-amber-300/50"
            value={current}
            disabled={options.savingMetaProspectIdSet.has(row.id)}
            onChange={(e) =>
              options.onChangeProspectOutcome(
                row,
                e.target.value as '' | 'Client' | 'Recruit' | 'Both'
              )
            }
          >
            <option/>
            <option value="Client">Client</option>
            <option value="Recruit">Recruit</option>
            <option value="Both">Both</option>
          </select>
        );
      },
    },
    {
      key: 'profile',
      label: 'Profile',
      width: 320,
      className: 'prospect-profile-cell',
      sortable: true,
      render: (row) => {
        const isEditing = options.editingProfileProspectId === row.id;
        const draft = options.profileDraftByProspectId[row.id];
        if (!isEditing || !draft) {
          const summary = buildProfileSummary(row);
          return (
            <div
              className="cursor-pointer rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/90 hover:border-amber-300/35 hover:bg-white/10"
              title="Click to edit profile"
              onClick={(e) => {
                e.stopPropagation();
                options.onStartProfileEdit(row);
              }}
            >
              {summary}
            </div>
          );
        }

        return (
          <div className="flex min-w-[300px] flex-col gap-2 rounded border border-amber-300/30 bg-black/30 p-2" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="h-8 rounded border border-white/15 bg-white/5 px-2 text-xs text-white outline-none"
                placeholder="Relationship"
                value={draft.howKnown}
                onChange={(e) => options.onProfileDraftFieldChange(row.id, 'howKnown', e.target.value)}
              />
              <input
                className="h-8 rounded border border-white/15 bg-white/5 px-2 text-xs text-white outline-none"
                type="number"
                min="1"
                max="10"
                placeholder="Rel. scale"
                value={draft.relationship}
                onChange={(e) => options.onProfileDraftFieldChange(row.id, 'relationship', e.target.value)}
              />
              <input
                className="h-8 rounded border border-white/15 bg-white/5 px-2 text-xs text-white outline-none"
                placeholder="Occupation"
                value={draft.occupation}
                onChange={(e) => options.onProfileDraftFieldChange(row.id, 'occupation', e.target.value)}
              />
              <input
                className="h-8 rounded border border-white/15 bg-white/5 px-2 text-xs text-white outline-none"
                type="number"
                min="1"
                max="100"
                placeholder="Age"
                value={draft.age}
                onChange={(e) => options.onProfileDraftFieldChange(row.id, 'age', e.target.value)}
              />
            </div>
            <input
              className="h-8 rounded border border-white/15 bg-white/5 px-2 text-xs text-white outline-none"
              placeholder="What told"
              value={draft.whatTold}
              onChange={(e) => options.onProfileDraftFieldChange(row.id, 'whatTold', e.target.value)}
            />
            <div className="flex items-center gap-3 text-xs text-white/90">
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={draft.married}
                  onChange={(e) => options.onProfileDraftFlagChange(row.id, 'married', e.target.checked)}
                />
                Married
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={draft.dependentKids}
                  onChange={(e) => options.onProfileDraftFlagChange(row.id, 'dependentKids', e.target.checked)}
                />
                Dependent Kids
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="h-7 rounded border border-emerald-300/50 bg-emerald-500/20 px-2 text-xs text-emerald-200"
                onClick={() => {
                  void options.onSaveProfileEdit(row);
                }}
              >
                Save
              </button>
              <button
                type="button"
                className="h-7 rounded border border-white/25 bg-white/5 px-2 text-xs text-white/90"
                onClick={() => options.onCancelProfileEdit()}
              >
                Cancel
              </button>
            </div>
          </div>
        );
      },
      value: (row) => buildProfileSummary(row),
    },
    {
      key: 'notes',
      label: 'Notes',
      width: 420,
      render: (row) => {
        const notes = getRowNotes(row, options.notesByProspectId);
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
                    e.currentTarget.blur();
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
        const notes = getRowNotes(row, options.notesByProspectId);
        return notes.map((note) => note.text).join(' ');
      },
      searchable: false,
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
            📝
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
            📞
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
