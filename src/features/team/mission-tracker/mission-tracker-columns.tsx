import { useEffect, useState } from 'react';
import type { TrackerTableColumn } from '@/shared/components';
import { TrackerUserCell } from '@/features/team/components/tracker-user-cell';
import { TrackerNotesCell } from '@/features/team/components/tracker-notes-cell';
import type { TrackerNote } from '@/features/team/services/tracker-notes-service';
import {
  resolveRelatedTrackerUserId,
  resolveTrackerUserIdByName,
} from '@/features/team/services/tracker-user-profile-service';
import { DatePicker } from '@/shared/components/ui/date-picker';
import type { MissionRingProofAttachment, MissionTrackerRecord } from './services/mission-tracker-service';
import { MissionRingProofAttachmentsAction } from './components/mission-ringproof-attachments-action';
import { listMissionRingProofAttachments, uploadMissionRingProofAttachment } from './services/mission-tracker-service';

const MISSION_TRACKER_NOTE_FALLBACK = ['tracker', ['4', 'x4'].join('')].join('_');
const EMPTY_MISSION_RING_PROOF_ATTACHMENTS: MissionRingProofAttachment[] = [];

function asYesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}

interface BuildMissionTrackerColumnsOptions {
  onToggle: (userId: number, field: keyof MissionTrackerRecord, value: boolean) => void;
  onPatch: (userId: number, field: keyof MissionTrackerRecord, value: number | string | boolean | null) => void;
  onSaveAndAddProduction: (row: MissionTrackerRecord, savingsField: SavingsToggleField, amountField: SavingsAmountField, amount: number) => void;
  onOpenUserProfile?: (row: MissionTrackerRecord) => void;
  savingKeySet: Set<string>;
  notesByUserId: Record<number, TrackerNote[]>;
  noteDraftByUserId: Record<number, string>;
  focusedNoteInputId: number | null;
  savingNoteUserIdSet: Set<number>;
  onNoteDraftChange: (userId: number, value: string) => void;
  onNoteFocus: (userId: number) => void;
  onNoteBlur: () => void;
  onAddInlineNote: (userId: number) => Promise<void>;
  onOpenAllNotes: (row: MissionTrackerRecord) => void;

  // For Mission Ring Proof attachments
  listMissionRingProofAttachments: (userId: number) => Promise<MissionRingProofAttachment[]>;
  uploadMissionRingProofAttachment: (userId: number, file: File) => Promise<void>;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function getCountdownFromAma(row: MissionTrackerRecord): {
  hasAma: boolean;
  daysLeft: number | null;
  endDateISO: string | null;
  label: string;
} {
  const amaRaw = (row as unknown as Record<string, unknown>).ama_date
    || (row as unknown as Record<string, unknown>).amaDate
    || (row as unknown as Record<string, unknown>).date;
  const amaIso = typeof amaRaw === 'string' ? amaRaw : null;

  if (!amaIso) {
    return { hasAma: false, daysLeft: null, endDateISO: null, label: '0d' };
  }

  const today = startOfDay(new Date());
  const amaDate = startOfDay(new Date(amaIso));

  if (Number.isNaN(amaDate.getTime())) {
    return { hasAma: false, daysLeft: null, endDateISO: null, label: '0d' };
  }

  const endDate = addDays(amaDate, 30);
  const diffMs = endDate.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffMs / MS_PER_DAY);

  return {
    hasAma: true,
    daysLeft,
    endDateISO: endDate.toISOString(),
    label: `${daysLeft > 0 ? daysLeft : 0}d`,
  };
}

function renderCheckbox(
  row: MissionTrackerRecord,
  field: keyof MissionTrackerRecord,
  options: BuildMissionTrackerColumnsOptions,
  config?: {
    displayChecked?: boolean;
    onChangeChecked?: (checked: boolean) => void;
  }
) {
  const savingKey = `${row.user_id}:${String(field)}`;
  const checked = config?.displayChecked ?? Boolean(row[field]);
  const cd = getCountdownFromAma(row);
  let pillClass = 'count-pill';
  if (cd.hasAma && cd.daysLeft !== null) {
    if (cd.daysLeft <= 0) pillClass += ' due';
    else if (cd.daysLeft <= 10) pillClass += ' warn';
  }
  const endDateTooltip = cd.endDateISO
    ? `30-day window ends: ${new Date(cd.endDateISO).toLocaleDateString()}`
    : 'Missing AMA date';

  return (
    <label className={`tracker-toggle-box ${checked ? 'is-on' : 'is-off'}`}>
      {true || cd.hasAma && !checked ? (
        <span className={pillClass} title={endDateTooltip}>
          {cd.label}
        </span>
      ) : null}
      <input
        className="tracker-checkbox-lg"
        type="checkbox"
        checked={checked}
        disabled={options.savingKeySet.has(savingKey)}
        aria-label={checked ? 'Checked' : 'Unchecked'}
        onChange={(e) => {
          options.onToggle(row.user_id, field, e.target.checked);
          config?.onChangeChecked?.(e.target.checked);
        }}
      />
    </label>
  );
}

function isSaving(
  row: MissionTrackerRecord,
  field: keyof MissionTrackerRecord,
  options: BuildMissionTrackerColumnsOptions
): boolean {
  const savingKey = `${row.user_id}:${String(field)}`;
  return options.savingKeySet.has(savingKey);
}

function getRowNotes(
  row: MissionTrackerRecord,
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
      tracker: row.latest_note_tracker || MISSION_TRACKER_NOTE_FALLBACK,
      created_at: createdAt,
      updated_at: createdAt,
    },
  ];
}

async function openRelatedProfile(
  row: MissionTrackerRecord,
  options: BuildMissionTrackerColumnsOptions,
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

// Defined before BuildMissionTrackerColumnsOptions so the interface can reference them.
export type SavingsToggleField =
  | 'finish_1st_savings'
  | 'finish_2nd_savings'
  | 'finish_3rd_savings'
  | 'finish_4th_savings';

export type SavingsAmountField =
  | 'savings_1st_amount'
  | 'savings_2nd_amount'
  | 'savings_3rd_amount'
  | 'savings_4th_amount';

function SavingsAmountCell({
  row,
  savingsField,
  amountField,
  options,
}: {
  row: MissionTrackerRecord;
  savingsField: SavingsToggleField;
  amountField: SavingsAmountField;
  options: BuildMissionTrackerColumnsOptions;
}) {
  const currentAmount = row[amountField];
  const checked = Boolean(row[savingsField]);
  const saving = isSaving(row, savingsField, options) || isSaving(row, amountField, options);
  const [amountInput, setAmountInput] = useState(currentAmount == null ? '' : String(currentAmount));
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  const normalizedAmount = Number(currentAmount);
  const hasPersistedAmount =
    currentAmount !== null
    && currentAmount !== undefined
    && currentAmount !== ''
    && Number.isFinite(normalizedAmount)
    && normalizedAmount > 0;
  const showAmountInput = hasPersistedAmount || isEditingAmount;

  useEffect(() => {
    setAmountInput(currentAmount == null ? '' : String(currentAmount));
  }, [currentAmount]);

  useEffect(() => {
    if (hasPersistedAmount) {
      setIsEditingAmount(false);
    }
  }, [hasPersistedAmount]);

  const parseCurrentInput = (): number | null => {
    const trimmed = amountInput.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const commitSave = () => {
    const parsed = parseCurrentInput();
    if (parsed === null) {
      options.onPatch(row.user_id, amountField, null);
      if (checked) options.onToggle(row.user_id, savingsField, false);
      setIsEditingAmount(false);
      setShowButtons(false);
      return;
    }
    options.onPatch(row.user_id, amountField, parsed);
    if (!checked) options.onToggle(row.user_id, savingsField, true);
    setShowButtons(false);
  };

  const commitSaveAndAdd = () => {
    const parsed = parseCurrentInput();
    if (parsed === null) return;
    options.onPatch(row.user_id, amountField, parsed);
    if (!checked) options.onToggle(row.user_id, savingsField, true);
    setShowButtons(false);
    options.onSaveAndAddProduction(row, savingsField, amountField, parsed);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const parsed = parseCurrentInput();
      setShowButtons(parsed !== null);
      e.currentTarget.blur();
    }
    if (e.key === 'Escape') {
      setAmountInput(currentAmount == null ? '' : String(currentAmount));
      setShowButtons(false);
      (e.currentTarget as HTMLInputElement).blur();
    }
  };

  // const handleInputBlur = () => {
  //   setShowButtons(false);
  //   if (!hasPersistedAmount) {
  //     setIsEditingAmount(false);
  //   }
  // };

  return (
    <div
      className={`flex flex-col gap-1 items-center ${saving ? 'cursor-wait opacity-75' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`tracker-toggle-box ${showAmountInput ? 'is-on' : 'is-off'}`}
        onClick={() => {
          if (!showAmountInput || saving) return;
          options.onToggle(row.user_id, savingsField, false);
          setIsEditingAmount(false);
          setShowButtons(false);
        }}
      >
        {showAmountInput ? (
          <input
            className="h-7 w-24 rounded border border-white/25 bg-transparent px-2 text-center text-xs text-white placeholder-white/60"
            type="number"
            min={0}
            step="0.01"
            value={amountInput}
            disabled={saving}
            placeholder="Amount"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const val = e.target.value;
              setAmountInput(val);
              setShowButtons(false);
            }}
            onKeyDown={handleInputKeyDown}
            // onBlur={handleInputBlur}
          />
        ) : (
          renderCheckbox(row, savingsField, options, {
            displayChecked: false,
            onChangeChecked: (nextChecked) => {
              setIsEditingAmount(nextChecked);
            },
          })
        )}
      </div>

      {showButtons && !saving && (
        <div className="flex flex-col gap-1 w-full" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="w-full rounded bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-white/20 transition-colors"
            onMouseDown={(e) => { e.preventDefault(); commitSave(); }}
          >
            Save
          </button>
          <button
            type="button"
            className="w-full rounded bg-blue-600/80 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-blue-500 transition-colors"
            onMouseDown={(e) => { e.preventDefault(); commitSaveAndAdd(); }}
          >
            Save + Add to Production
          </button>
        </div>
      )}
    </div>
  );
}

export function buildMissionTrackerColumns(options: BuildMissionTrackerColumnsOptions): TrackerTableColumn<MissionTrackerRecord>[] {
  // Provide default API handlers if not passed in options
  const mergedOptions = {
    ...options,
    listMissionRingProofAttachments: options.listMissionRingProofAttachments || listMissionRingProofAttachments,
    uploadMissionRingProofAttachment: options.uploadMissionRingProofAttachment || uploadMissionRingProofAttachment,
  };
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
      value: (row) => row.serial_no ?? row.id,
      render: (row) => row.serial_no ?? row.id,
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
          amaDate={row.ama_date}
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
      label: '1st Recruit',
      width: 100,
      align: 'center',
      sortable: true,
      searchable: false,
      value: (row) => asYesNo(row.finish_1st_recruit),
      render: (row) => renderCheckbox(row, 'finish_1st_recruit', options),
    },
    {
      key: 'finish_1st_savings',
      label: 'Personal Savings',
      width: 140,
      align: 'center',
      sortable: true,
      searchable: false,
      value: (row) => `${asYesNo(row.finish_1st_savings)} ${row.savings_1st_amount ?? ''}`,
      render: (row) => (
        <SavingsAmountCell
          row={row}
          savingsField="finish_1st_savings"
          amountField="savings_1st_amount"
          options={options}
        />
      ),
    },
    {
      key: 'big_event_1st',
      label: 'Convention',
      width: 100,
      align: 'center',
      sortable: true,
      searchable: false,
      value: (row) => asYesNo(row.big_event_1st),
      render: (row) => renderCheckbox(row, 'big_event_1st', options),
    },
    {
      key: 'mission_ring_proof',
      label: 'Mission Ring Proof',
      width: 170,
      align: 'center',
      sortable: false,
      searchable: false,
      value: () => '',
      render: (row) => (
        <MissionRingProofAttachmentsAction
          userId={row.user_id}
          listAttachments={mergedOptions.listMissionRingProofAttachments}
          uploadAttachment={mergedOptions.uploadMissionRingProofAttachment}
          missionRingProofList={row.mission_ring_proof || EMPTY_MISSION_RING_PROOF_ATTACHMENTS}
        />
      ),
    },
    {
      key: 'promotion_access_approved',
      label: 'Promotions',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: false,
      value: (row) => asYesNo(row.promotion_access_approved),
      render: (row) => renderCheckbox(row, 'promotion_access_approved', options),
    },
    {
      key: 'smd_100k_class',
      label: 'SMD 100K Class',
      width: 140,
      align: 'center',
      sortable: false,
      searchable: false,
      value: (row) => asYesNo((row as any).smd_100k_class),
      render: (row) => renderCheckbox(row as any, 'smd_100k_class', options),
    },
    {
      key: 'pass_exam_date',
      label: 'Pass Exam',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: false,
      value: (row) => row.pass_exam_date || '',
      render: (row) => (
        <DatePicker
          value={row.pass_exam_date || ''}
          onChange={(value) => options.onPatch(row.user_id, 'pass_exam_date', value || null)}
          disabled={isSaving(row, 'pass_exam_date', options)}
          className="h-8"
        />
      ),
    },
    {
      key: 'sircon_nipr_date',
      label: 'Sircon/NIPR',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: false,
      value: (row) => row.sircon_nipr_date || '',
      render: (row) => (
        <DatePicker
          value={row.sircon_nipr_date || ''}
          onChange={(value) => options.onPatch(row.user_id, 'sircon_nipr_date', value || null)}
          disabled={isSaving(row, 'sircon_nipr_date', options)}
          className="h-8"
        />
      ),
    },
    {
      key: 'is_licensed',
      label: 'Licensed',
      width: 100,
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
      key: 'notes',
      label: 'Notes',
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
  ];
}
