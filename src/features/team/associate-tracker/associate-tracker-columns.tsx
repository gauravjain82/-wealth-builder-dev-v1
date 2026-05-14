import type { TrackerTableColumn } from '@/shared/components';
import { TrackerUserCell } from '@/features/team/components/tracker-user-cell';
import { TrackerNotesCell } from '@/features/team/components/tracker-notes-cell';
import type { TrackerNote } from '@/features/team/services/tracker-notes-service';
import {
  resolveRelatedTrackerUserId,
  resolveTrackerUserIdByName,
} from '@/features/team/services/tracker-user-profile-service';
import type { AssociateTrackerRecord } from './services/associate-tracker-service';

function asYesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}

interface BuildAssociateColumnsOptions {
  onToggle: (userId: number, field: keyof AssociateTrackerRecord, value: boolean) => void;
  onPatch: (userId: number, field: keyof AssociateTrackerRecord, value: number | string | null) => void;
  onOpenUserProfile?: (row: AssociateTrackerRecord) => void;
  onOpenHotRecruits?: (row: AssociateTrackerRecord) => void;
  onOpenPersonalPoints?: (row: AssociateTrackerRecord) => void;
  onOpenLicensedUsers?: (row: AssociateTrackerRecord) => void;
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

function isSaving(
  row: AssociateTrackerRecord,
  field: keyof AssociateTrackerRecord,
  options: BuildAssociateColumnsOptions
): boolean {
  return options.savingKeySet.has(`${row.user_id}:${String(field)}`);
}

function NetLicenseAmountCell({
  row,
  options,
}: {
  row: AssociateTrackerRecord;
  options: BuildAssociateColumnsOptions;
}) {
  const field: keyof AssociateTrackerRecord = 'net_license_amount';
  const saving = isSaving(row, field, options);
  const initialValue = row.net_license_amount == null ? '' : String(row.net_license_amount);
  let committedOnEnter = false;

  return (
    <input
      className="h-8 w-full rounded border border-white/20 bg-white/5 px-2 text-center text-xs text-white placeholder-white/50 outline-none focus:border-amber-300/60"
      type="text"
      inputMode="decimal"
      defaultValue={initialValue}
      disabled={saving}
      placeholder="0"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const input = e.currentTarget as HTMLInputElement;
          const raw = input.value.trim();
          if (!raw) {
            committedOnEnter = true;
            options.onPatch(row.user_id, field, null);
            input.blur();
            return;
          }

          const parsed = Number(raw);
          if (!Number.isFinite(parsed)) {
            input.value = initialValue;
            input.blur();
            return;
          }

          committedOnEnter = true;
          options.onPatch(row.user_id, field, parsed);
          input.blur();
        }
      }}
      onFocus={(e) => {
        const raw = e.currentTarget.value.trim();
        if (!raw) return;
        const parsed = Number(raw);
        if (Number.isFinite(parsed) && parsed === 0) {
          e.currentTarget.value = '';
        }
      }}
      onBlur={(e) => {
        if (committedOnEnter) {
          committedOnEnter = false;
          return;
        }

        const raw = e.currentTarget.value.trim();
        if (!raw) {
          options.onPatch(row.user_id, field, null);
          return;
        }

        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) {
          e.currentTarget.value = initialValue;
          return;
        }

        options.onPatch(row.user_id, field, parsed);
      }}
    />
  );
}

function RegistrationBase15kCell({
  row,
  options,
}: {
  row: AssociateTrackerRecord;
  options: BuildAssociateColumnsOptions;
}) {
  const field: keyof AssociateTrackerRecord = 'registration_base_15k';
  const saving = isSaving(row, field, options);
  const initialValue = row.registration_base_15k == null ? '' : String(row.registration_base_15k);
  let committedOnEnter = false;

  return (
    <input
      className="h-8 w-full rounded border border-white/20 bg-white/5 px-2 text-center text-xs text-white placeholder-white/50 outline-none focus:border-amber-300/60"
      type="text"
      inputMode="numeric"
      defaultValue={initialValue}
      disabled={saving}
      placeholder="0"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const input = e.currentTarget as HTMLInputElement;
          const raw = input.value.trim();
          if (!raw) {
            committedOnEnter = true;
            options.onPatch(row.user_id, field, null);
            input.blur();
            return;
          }

          const parsed = Number(raw);
          if (!Number.isFinite(parsed)) {
            input.value = initialValue;
            input.blur();
            return;
          }

          committedOnEnter = true;
          options.onPatch(row.user_id, field, parsed);
          input.blur();
        }
      }}
      onFocus={(e) => {
        const raw = e.currentTarget.value.trim();
        if (!raw) return;
        const parsed = Number(raw);
        if (Number.isFinite(parsed) && parsed === 0) {
          e.currentTarget.value = '';
        }
      }}
      onBlur={(e) => {
        if (committedOnEnter) {
          committedOnEnter = false;
          return;
        }

        const raw = e.currentTarget.value.trim();
        if (!raw) {
          options.onPatch(row.user_id, field, null);
          return;
        }

        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) {
          e.currentTarget.value = initialValue;
          return;
        }

        options.onPatch(row.user_id, field, parsed);
      }}
    />
  );
}

function formatNumber(value: number | string): string {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return String(value);
  return parsed.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

async function openRelatedProfile(
  row: AssociateTrackerRecord,
  options: BuildAssociateColumnsOptions,
  kind: 'recruiter' | 'leader'
) {
  if (!options.onOpenUserProfile) return;

  const relatedName = kind === 'recruiter' ? row.recruiter_name : row.leader_name;
  let userId = kind === 'recruiter' ? row.recruiter_id : row.leader_id;

  if (!userId) {
    userId = await resolveRelatedTrackerUserId(row.user_id, kind);
  }

  if (!userId) {
    userId = await resolveTrackerUserIdByName(relatedName || '');
  }

  if (!userId) return;

  options.onOpenUserProfile({
    ...row,
    user_id: userId,
    user_name: kind === 'recruiter' ? row.recruiter_name || row.user_name : row.leader_name || row.user_name,
    avatar_url: null,
  });
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
          onAvatarClick={options.onOpenUserProfile ? () => options.onOpenUserProfile?.(row) : undefined}
          onNameClick={options.onOpenUserProfile ? () => options.onOpenUserProfile?.(row) : undefined}
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
      render: (row) =>
        options.onOpenUserProfile ? (
          <button
            type="button"
            className="w-full text-left text-white/80 hover:text-white hover:underline"
            onClick={(event) => {
              event.stopPropagation();
              void openRelatedProfile(row, options, 'recruiter');
            }}
          >
            {row.recruiter_name || '-'}
          </button>
        ) : (
          row.recruiter_name || '-'
        ),
    },
    {
      key: 'leader',
      label: 'Leader',
      width: 200,
      sortable: true,
      searchable: true,
      value: (row) => row.leader_name || '',
      render: (row) =>
        options.onOpenUserProfile ? (
          <button
            type="button"
            className="w-full text-left text-white/80 hover:text-white hover:underline"
            onClick={(event) => {
              event.stopPropagation();
              void openRelatedProfile(row, options, 'leader');
            }}
          >
            {row.leader_name || '-'}
          </button>
        ) : (
          row.leader_name || '-'
        ),
    },
    {
      key: 'finish_1st_recruit',
      label: 'Multi-\nhanded',
      width: 140,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.finish_1st_recruit),
      render: (row) => renderCheckbox(row, 'finish_1st_recruit', options),
    },
    {
      key: 'finish_1st_savings',
      label: '10% -\n3 RULES -\n3 GOALS',
      width: 140,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.finish_1st_savings),
      render: (row) => renderCheckbox(row, 'finish_1st_savings', options),
    },
    {
      key: 'big_event_1st',
      label: 'Self-\nImprovement',
      width: 140,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.big_event_1st),
      render: (row) => renderCheckbox(row, 'big_event_1st', options),
    },
    {
      key: 'observe_4_recruits',
      label: 'Observe 4\nrecruits',
      width: 140,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.observe_4_recruits),
      render: (row) => (
        <span className={`text-xs font-semibold ${row.observe_4_recruits ? 'text-emerald-400' : 'text-white/40'}`}>
          {row.observe_4_recruits ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'observe_4_clients',
      label: 'Observe 4\nclients',
      width: 140,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.observe_4_clients),
      render: (row) => renderCheckbox(row, 'observe_4_clients', options),
    },
    {
      key: 'is_licensed',
      label: 'Get licensed',
      width: 140,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.is_licensed),
      render: (row) => (
        <span className={`text-xs font-semibold ${row.is_licensed ? 'text-emerald-400' : 'text-white/40'}`}>
          {row.is_licensed ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'direct_registration_1st',
      label: '1 Direct\nRegistration',
      width: 140,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.direct_registration_1st),
      render: (row) => renderCheckbox(row, 'direct_registration_1st', options),
    },
    {
      key: 'recruit_9',
      label: '9 Recruits',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => String(row.recruit_9),
      render: (row) => (
        <button
          type="button"
          className="rounded border border-white/15 bg-white/5 px-2 py-1 text-xs font-semibold text-amber-200 hover:bg-white/10"
          title="View hot recruits"
          onClick={(event) => {
            event.stopPropagation();
            options.onOpenHotRecruits?.(row);
          }}
        >
          {formatNumber(row.recruit_9)}
        </button>
      ),
    },
    {
      key: 'personal_points_45k',
      label: '45k Personal\nPoints',
      width: 140,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => String(row.personal_points_45k),
      render: (row) => (
        <button
          type="button"
          className="rounded border border-white/15 bg-white/5 px-2 py-1 text-xs font-semibold text-emerald-200 hover:bg-white/10"
          title="View client users"
          onClick={(event) => {
            event.stopPropagation();
            options.onOpenPersonalPoints?.(row);
          }}
        >
          {formatNumber(row.personal_points_45k)}
        </button>
      ),
    },
    {
      key: 'registration_base_15k',
      label: '3 Licenses',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => String(row.personal_points_45k),
      render: (row) => (
        <button
          type="button"
          className="rounded border border-white/15 bg-white/5 px-2 py-1 text-xs font-semibold text-sky-200 hover:bg-white/10"
          title="View licensed users"
          onClick={(event) => {
            event.stopPropagation();
            options.onOpenLicensedUsers?.(row);
          }}
        >
          {formatNumber(row.personal_points_45k)}
        </button>
      ),
    },
    {
      key: 'registrationsBase',
      label: '15 Registration\nbase',
      width: 140,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => String(row.registration_base_15k),
      render: (row) => <RegistrationBase15kCell row={row} options={options} />,
    },
    {
      key: 'net_license_amount',
      label: 'Net Licensed',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => String(row.net_license_amount),
      render: (row) => <NetLicenseAmountCell row={row} options={options} />,
    },
    {
      key: 'is_key_player',
      label: 'Key Player',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.is_key_player),
      render: (row) => renderCheckbox(row, 'is_key_player', options),
    },
    {
      key: 'is_training',
      label: 'Training',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.is_training),
      render: (row) => renderCheckbox(row, 'is_training', options),
    },
    {
      key: 'big_event_2nd',
      label: 'Big Event',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.big_event_2nd),
      render: (row) => renderCheckbox(row, 'big_event_2nd', options),
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
