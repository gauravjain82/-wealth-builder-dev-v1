import type { TrackerTableColumn } from '@/shared/components';
import type { Prospect } from './services/prospect-service';
import type { TrackerNote } from '@/features/team/services/tracker-notes-service';
import { buildProfileSummary } from './prospect-utils';

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
  onChangeProspectMark: (row: Prospect, mark: 'default' | 'client' | 'recruiter' | 'both') => void;
  onChangeProspectOutcome: (row: Prospect, outcome: 'Client' | 'Recruit' | 'Both') => void;
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

type ProspectMark = 'default' | 'client' | 'recruiter' | 'both';

function normalizeMarkValue(row: Prospect): ProspectMark {
  const raw = (row.prospect_meta?.mark || '').toLowerCase();
  if (raw === 'client' || raw === 'green') return 'client';
  if (raw === 'recruiter' || raw === 'recruit' || raw === 'yellow') return 'recruiter';
  if (raw === 'both' || raw === 'combined') return 'both';
  return 'default';
}

function markVisual(mark: ProspectMark): { label: string; background: string; border: string } {
  if (mark === 'client') {
    return {
      label: 'Client',
      background: '#22c55e',
      border: '#22c55e',
    };
  }
  if (mark === 'recruiter') {
    return {
      label: 'Recruiter',
      background: '#f59e0b',
      border: '#f59e0b',
    };
  }
  if (mark === 'both') {
    return {
      label: 'Both',
      background: '#4f7df3',
      border: '#4f7df3',
    };
  }
  return {
    label: 'Default',
    background: '#9ca3af',
    border: '#9ca3af',
  };
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
      key: 'index',
      label: '#',
      width: 40,
      align: 'center',
      sortable: false,
      value: (row) => options.getRowIndex(row),
      render: (row) => options.getRowIndex(row),
    },
    {
      key: 'mark',
      label: '',
      width: 60,
      align: 'center',
      sortable: false,
      render: (row) => {
        const current = normalizeMarkValue(row);
        const visual = markVisual(current);
        return (
          <div className="relative inline-flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <select
              title={`Marker: ${visual.label}`}
              aria-label={`Marker for ${row.full_name || row.email}`}
              value={current}
              disabled={options.savingMetaProspectIdSet.has(row.id)}
              onChange={(e) =>
                options.onChangeProspectMark(
                  row,
                  (e.target.value as 'default' | 'client' | 'recruiter' | 'both') || 'default'
                )
              }
              style={{
                position: 'absolute',
                inset: 0,
                width: 14,
                height: 14,
                opacity: 0,
                cursor: options.savingMetaProspectIdSet.has(row.id) ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="default">Default</option>
              <option value="client">Client</option>
              <option value="recruiter">Recruiter</option>
              <option value="both">Both</option>
            </select>
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: 14,
                height: 14,
                borderRadius: '50%',
                border: `1px solid ${visual.border}`,
                background: visual.background,
              }}
            />
          </div>
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
      value: (row) => (row.prospect_meta?.top25 ? 'Yes' : 'No'),
      render: (row) => (
        <label className={`tracker-toggle-box ${row.prospect_meta?.top25 ? 'is-on' : 'is-off'}`}>
          <input
            className="tracker-checkbox-lg"
            type="checkbox"
            checked={Boolean(row.prospect_meta?.top25)}
            disabled={options.savingMetaProspectIdSet.has(row.id)}
            aria-label={`Top 25 for ${row.full_name || row.email}`}
            onChange={(e) => options.onToggleProspectMeta(row, 'top25', e.target.checked)}
          />
        </label>
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
        <label className={`tracker-toggle-box ${row.prospect_meta?.hot ? 'is-on' : 'is-off'}`}>
          <input
            className="tracker-checkbox-lg"
            type="checkbox"
            checked={Boolean(row.prospect_meta?.hot)}
            disabled={options.savingMetaProspectIdSet.has(row.id)}
            aria-label={`Hot lead for ${row.full_name || row.email}`}
            onChange={(e) => options.onToggleProspectMeta(row, 'hot', e.target.checked)}
          />
        </label>
      ),
    },
    {
      key: 'outcome',
      label: 'Outcome',
      width: 150,
      sortable: true,
      value: (row) => row.prospect_meta?.outcome || '',
      render: (row) => {
        const current = row.prospect_meta?.outcome || 'Both';
        return (
          <select
            className="h-8 w-full rounded border border-white/15 bg-white/5 px-2 text-xs text-white outline-none focus:border-amber-300/50"
            value={current}
            disabled={options.savingMetaProspectIdSet.has(row.id)}
            onChange={(e) =>
              options.onChangeProspectOutcome(
                row,
                (e.target.value as 'Client' | 'Recruit' | 'Both') || '-'
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
