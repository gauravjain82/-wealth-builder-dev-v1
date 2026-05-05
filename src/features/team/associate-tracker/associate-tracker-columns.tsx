import type { TrackerTableColumn } from '@/shared/components';
import { TrackerUserCell } from '@/features/team/components/tracker-user-cell';
import { TrackerNotesCell } from '@/features/team/components/tracker-notes-cell';
import type { TrackerNote } from '@/features/team/services/tracker-notes-service';
import type { AssociateTrackerRecord } from './services/associate-tracker-service';

function asYesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}

interface BuildAssociateColumnsOptions {
  onToggle: (userId: number, field: keyof AssociateTrackerRecord, value: boolean) => void;
  savingKeySet: Set<string>;
  notesByUserId: Record<number, TrackerNote[]>;
  noteDraftByUserId: Record<number, string>;
  focusedNoteInputId: number | null;
  savingNoteUserIdSet: Set<number>;
  onNoteDraftChange: (userId: number, value: string) => void;
  onNoteFocus: (userId: number) => void;
  onNoteBlur: () => void;
  onAddInlineNote: (userId: number) => Promise<void>;
  onOpenAllNotes: (row: AssociateTrackerRecord) => void;
}

function renderCheckbox(
  row: AssociateTrackerRecord,
  field: keyof AssociateTrackerRecord,
  options: BuildAssociateColumnsOptions
) {
  const savingKey = `${row.user_id}:${String(field)}`;
  const checked = Boolean(row[field]);
  return (
    <label className={`tracker-toggle-box ${checked ? 'is-on' : 'is-off'}`}>
      <input
        className="tracker-checkbox-lg"
        type="checkbox"
        checked={checked}
        disabled={options.savingKeySet.has(savingKey)}
        aria-label={checked ? 'Checked' : 'Unchecked'}
        onChange={(e) => options.onToggle(row.user_id, field, e.target.checked)}
      />
    </label>
  );
}

function formatNumber(value: number | string): string {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return String(value);
  return parsed.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function getRowNotes(
  row: AssociateTrackerRecord,
  notesByUserId: Record<number, TrackerNote[]>
): TrackerNote[] {
  const loaded = notesByUserId[row.user_id];
  if (loaded && loaded.length > 0) return loaded;

  const latestText = row.latest_note_text?.trim();
  if (!latestText) return [];

  const createdAt = row.latest_note_created_at || row.updated_at || row.created_at;
  return [
    {
      id: -row.user_id,
      user: row.user_id,
      created_by: null,
      created_by_name: row.latest_note_created_by_name || undefined,
      text: latestText,
      tracker: row.latest_note_tracker || 'associate',
      created_at: createdAt,
      updated_at: createdAt,
    },
  ];
}

export function buildAssociateColumns(
  options: BuildAssociateColumnsOptions
): TrackerTableColumn<AssociateTrackerRecord>[] {
  return [
    {
      key: 'index',
      label: '#',
      width: 40,
      align: 'center',
      sortable: false,
      value: (row) => row.user_id,
      render: (row) => row.user_id,
    },
    {
      key: 'user_name',
      label: 'Name',
      width: 260,
      sortable: true,
      searchable: true,
      render: (row) => (
        <TrackerUserCell
          fullName={row.user_name}
          invitedAt={row.invited_at || row.created_at}
          agencyCode={row.agency_code}
          avatarUrl={row.avatar_url}
        />
      ),
    },
    {
      key: 'recruiter',
      label: 'Recruiter',
      width: 200,
      sortable: true,
      searchable: true,
      value: (row) => row.recruiter_name || '',
      render: (row) => row.recruiter_name || '-',
    },
    {
      key: 'leader',
      label: 'Leader',
      width: 200,
      sortable: true,
      searchable: true,
      value: (row) => row.leader_name || '',
      render: (row) => row.leader_name || '-',
    },
    {
      key: 'milestone_multi_handed',
      label: 'Multi-\nhanded',
      width: 140,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.milestone_multi_handed),
      render: (row) => renderCheckbox(row, 'milestone_multi_handed', options),
    },
    {
      key: 'ten_thre_results_goals',
      label: '10% -\n3 RULES -\n3 GOALS',
      width: 140,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.ten_thre_results_goals),
      render: (row) => renderCheckbox(row, 'ten_thre_results_goals', options),
    },
    {
      key: 'self_improvement',
      label: 'Self-\nImprovement',
      width: 140,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.self_improvement),
      render: (row) => renderCheckbox(row, 'self_improvement', options),
    },
    {
      key: 'milestone_observe_4_recruits',
      label: 'Observe 4\nrecruits',
      width: 140,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.milestone_observe_4_recruits),
      render: (row) => renderCheckbox(row, 'milestone_observe_4_recruits', options),
    },
    {
      key: 'milestone_observe_4_clients',
      label: 'Observe 4\nclients',
      width: 140,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.milestone_observe_4_clients),
      render: (row) => renderCheckbox(row, 'milestone_observe_4_clients', options),
    },
    {
      key: 'get_license',
      label: 'Get licensed',
      width: 140,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.get_license || row.milestone_get_licensed),
      render: (row) => renderCheckbox(row, 'get_license', options),
    },
    {
      key: 'registration_convention',
      label: '1 Direct\nRegistration',
      width: 140,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.registration_convention),
      render: (row) => renderCheckbox(row, 'registration_convention', options),
    },
    {
      key: 'recruit_ttl',
      label: '9 Recruits',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => String(row.recruit_ttl),
      render: (row) => formatNumber(row.recruit_ttl),
    },
    {
      key: 'personal_points',
      label: '45k Personal\nPoints',
      width: 140,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => String(row.personal_points),
      render: (row) => formatNumber(row.personal_points),
    },
    {
      key: 'licenses_in_ttl',
      label: '3 Licenses',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => String(row.licenses_in_ttl),
      render: (row) => formatNumber(row.licenses_in_ttl),
    },
    {
      key: 'registrationsBase',
      label: '15 Registration\nbase',
      width: 140,
      align: 'center',
      sortable: true,
      searchable: true,
      value: () => '',
      render: () => '-',
    },
    {
      key: 'net_license_amount',
      label: 'Net Licensed',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => String(row.net_license_amount),
      render: (row) => formatNumber(row.net_license_amount),
    },
    {
      key: 'key_player',
      label: 'Key Player',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.key_player),
      render: (row) => renderCheckbox(row, 'key_player', options),
    },
    {
      key: 'training',
      label: 'Training',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.training),
      render: (row) => renderCheckbox(row, 'training', options),
    },
    {
      key: 'big_event',
      label: 'Big Event',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.big_event),
      render: (row) => renderCheckbox(row, 'big_event', options),
    },
    {
      key: 'why',
      label: 'Why',
      width: 320,
      searchable: true,
      value: (row) => getRowNotes(row, options.notesByUserId).map((note) => note.text).join(' '),
      render: (row) => (
        <TrackerNotesCell
          userId={row.user_id}
          userName={row.user_name}
          notes={getRowNotes(row, options.notesByUserId)}
          draft={options.noteDraftByUserId[row.user_id] || ''}
          focusedNoteInputId={options.focusedNoteInputId}
          saving={options.savingNoteUserIdSet.has(row.user_id)}
          onDraftChange={options.onNoteDraftChange}
          onFocus={options.onNoteFocus}
          onBlur={options.onNoteBlur}
          onAddInlineNote={options.onAddInlineNote}
          onOpenAllNotes={() => options.onOpenAllNotes(row)}
        />
      ),
    },
    {
      key: 'goal',
      label: 'Goal',
      width: 320,
      searchable: true,
      value: () => '',
      render: () => '-',
    },
  ];
}
