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
// 2x2 grid with PR/TR headers and compact 3M/1M labels inside each value box.
function formatPointCellValue(value: number | string | boolean | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return String(value);
  return parsed.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function TwoByTwoInputCell({
  row,
  fields,
  colLabels,
  rowLabels,
  onCellClick,
  fitLargeValues = false,
}: {
  row: AssociateTrackerRecord;
  fields: [keyof AssociateTrackerRecord, keyof AssociateTrackerRecord, keyof AssociateTrackerRecord, keyof AssociateTrackerRecord];
  colLabels: [string, string];
  rowLabels: [string, string];
  onCellClick?: () => void;
  fitLargeValues?: boolean;
}) {
  return (
    <div
      className="inline-block cursor-pointer select-none px-1 py-0.5 rounded border border-white/10 bg-white/5 hover:bg-white/10"
      onClick={onCellClick}
      style={{ textAlign: 'center', minWidth: fitLargeValues ? 136 : 96, maxWidth: fitLargeValues ? 152 : 128 }}
    >
      <div className="mb-0.5 grid grid-cols-2 items-center gap-0.5">
        <span className="text-center text-[10px] font-semibold text-white/70">{colLabels[0]}</span>
        <span className="text-center text-[10px] font-semibold text-white/70">{colLabels[1]}</span>
      </div>
      <div className="grid grid-rows-2 gap-0.5">
        {[0, 1].map((rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-2 items-center gap-0.5">
            {[0, 1].map((colIdx) => {
              const field = fields[rowIdx * 2 + colIdx];
              const value = formatPointCellValue(row[field]);
              const valueTextSize = fitLargeValues && value.length > 8
                ? value.length > 11 ? 'text-[8px]' : 'text-[10px]'
                : 'text-xs';
              return (
                <div key={String(field)} className="relative min-w-0">
                  <input
                    className={`h-8 w-full rounded border border-white/20 bg-white/10 px-0.5 text-center font-semibold tracking-tight text-white placeholder-white/50 outline-none ${valueTextSize}`}
                    type="text"
                    value={value}
                    title={value}
                    disabled
                    readOnly
                    tabIndex={-1}
                    style={{ cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.03)' }}
                  />
                  <span className="pointer-events-none absolute bottom-0.5 right-1 text-[8px] leading-none text-white/50">
                    {rowLabels[rowIdx]}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function TwoInputCell({
  row,
  fields,
  options,
  labels,
  readOnly = false,
  onCellClick,
}: {
  row: AssociateTrackerRecord;
  fields: (keyof AssociateTrackerRecord)[];
  options: BuildAssociateColumnsOptions;
  labels: string[];
  readOnly?: boolean;
  onCellClick?: () => void;
}) {
  return (
    <div
      className={`relative inline-block select-none rounded border border-white/10 bg-white/5 px-1 py-0.5 ${
        onCellClick ? 'hover:bg-white/10' : ''
      }`}
      style={{ textAlign: 'center', minWidth: 96, maxWidth: 128 }}
    >
      <div className="mb-0.5 grid grid-cols-2 items-center gap-0.5">
        {labels.map((label) => (
          <span key={label} className="whitespace-nowrap text-center text-[10px] font-semibold text-white/70">
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 items-center gap-0.5">
        {fields.map((field) => {
          const saving = isSaving(row, field, options);
          const initialValue = row[field] == null ? '' : String(row[field]);
          let committedOnEnter = false;
          return (
            <input
              key={String(field)}
              className="h-8 min-w-0 w-full rounded border border-white/20 bg-white/5 px-1 text-center text-xs font-semibold text-white placeholder-white/50 outline-none focus:border-amber-300/60"
              type="number"
              defaultValue={initialValue}
              disabled={readOnly || saving}
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
        })}
      </div>
      {onCellClick && (
        <button
          type="button"
          className="absolute inset-0 cursor-pointer rounded"
          aria-label="View details"
          onClick={onCellClick}
        />
      )}
    </div>
  );
}
export function buildAssociateColumns(
  options: BuildAssociateColumnsOptions
): TrackerTableColumn<AssociateTrackerRecord>[] {
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
          fullName={`${row.registration_status === 'UNREGISTERED' ? '*' : ''}${row.user_name}`}
          invitedAt={row.invited_at || row.created_at}
          agencyCode={row.agency_code}
          avatarUrl={row.photo_thumb_url || row.avatar_url}
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
      searchable: false,
      value: (row) => asYesNo(row.finish_1st_recruit),
      render: (row) => renderCheckbox(row, 'finish_1st_recruit', options),
    },
    {
      key: 'finish_1st_savings',
      label: '10% -\n3 RULES -\n3 GOALS',
      width: 140,
      align: 'center',
      sortable: true,
      searchable: false,
      value: (row) => asYesNo(row.finish_1st_savings),
      render: (row) => renderCheckbox(row, 'finish_1st_savings', options),
    },
    {
      key: 'big_event_1st',
      label: 'Self-\nImprovement',
      width: 140,
      align: 'center',
      sortable: true,
      searchable: false,
      value: (row) => asYesNo(row.big_event_1st),
      render: (row) => renderCheckbox(row, 'big_event_1st', options),
    },
    {
      key: 'recruits_inputs',
      label: 'Recruits',
      width: 160,
      align: 'center',
      sortable: false,
      searchable: false,
      render: (row) => (
        <TwoByTwoInputCell
          row={row}
          fields={[
            'last_3_month_personal_recruits', 'last_3_month_team_recruits',
            'current_month_personal_recruits', 'current_month_team_recruits',
          ]}
          colLabels={['PR', 'TR']}
          rowLabels={['3M', '1M']}
          onCellClick={() => options.onOpenHotRecruits?.(row)}
        />
      ),
    },
    {
      key: 'points_inputs',
      label: 'Points',
      width: 190,
      align: 'center',
      sortable: false,
      searchable: false,
      render: (row) => (
        <TwoByTwoInputCell
          row={row}
          fields={[
            'last_3_month_personal_points', 'last_3_month_team_points',
            'current_month_personal_points', 'current_month_team_points',
          ]}
          colLabels={['PR', 'TR']}
          rowLabels={['3M', '1M']}
          fitLargeValues
          onCellClick={() => options.onOpenPersonalPoints?.(row)}
        />
      ),
    },
    {
      key: 'licenses_inputs',
      label: 'Licenses',
      width: 120,
      align: 'center',
      sortable: false,
      searchable: false,
      render: (row) => (
        <TwoInputCell
          row={row}
          options={options}
          fields={['current_month_licenses', 'total_licenses']}
          labels={['This Month', 'Total']}
          readOnly
          onCellClick={() => options.onOpenLicensedUsers?.(row)}
        />
      ),
    },
    {
      key: 'registrations_inputs',
      label: 'Registrations',
      width: 140,
      align: 'center',
      sortable: false,
      searchable: false,
      render: (row) => (
        <TwoInputCell
          row={row}
          options={options}
          fields={['current_month_big_event_registrations', 'total_big_event_registrations']}
          labels={['This Month', 'Total']}
        />
      ),
    },
    {
      key: 'is_licensed',
      label: 'Licensed',
      width: 140,
      align: 'center',
      sortable: true,
      searchable: false,
      value: (row) => asYesNo(row.is_licensed),
      render: (row) => (
        <span className={`text-xs font-semibold ${row.is_licensed ? 'text-emerald-400' : 'text-white/40'}`}>
          {row.is_licensed ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'net_license_amount',
      label: 'Net Licensed',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: false,
      value: (row) => String(row.net_license_amount),
      render: (row) => <NetLicenseAmountCell row={row} options={options} />,
    },
    {
      key: 'is_key_player',
      label: 'Key Player',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: false,
      value: (row) => asYesNo(row.is_key_player),
      render: (row) => renderCheckbox(row, 'is_key_player', options),
    },
    {
      key: 'is_training',
      label: 'Training',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: false,
      value: (row) => asYesNo(row.is_training),
      render: (row) => renderCheckbox(row, 'is_training', options),
    },
    {
      key: 'big_event_2nd',
      label: 'Big Event',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: false,
      value: (row) => asYesNo(row.big_event_2nd),
      render: (row) => renderCheckbox(row, 'big_event_2nd', options),
    },
    {
      key: 'why',
      label: 'Why',
      width: 320,
      searchable: false,
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
      searchable: false,
      value: () => '',
      render: () => '-',
    },
  ];
}
