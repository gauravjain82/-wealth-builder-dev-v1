import { useEffect, useState } from 'react';
import type { TrackerTableColumn } from '@/shared/components';
import { TrackerUserCell } from '@/features/team/components/tracker-user-cell';
import { TrackerNotesCell } from '@/features/team/components/tracker-notes-cell';
import type { TrackerNote } from '@/features/team/services/tracker-notes-service';
import { DatePicker } from '@/shared/components/ui/date-picker';
import type { Tracker4x4Record } from './services/tracker-4x4-service';

function asYesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}

interface Build4x4ColumnsOptions {
  onToggle: (userId: number, field: keyof Tracker4x4Record, value: boolean) => void;
  onPatch: (userId: number, field: keyof Tracker4x4Record, value: number | string | boolean | null) => void;
  onSaveAndAddProduction: (row: Tracker4x4Record, savingsField: SavingsToggleField, amountField: SavingsAmountField, amount: number) => void;
  savingKeySet: Set<string>;
  notesByUserId: Record<number, TrackerNote[]>;
  noteDraftByUserId: Record<number, string>;
  focusedNoteInputId: number | null;
  savingNoteUserIdSet: Set<number>;
  onNoteDraftChange: (userId: number, value: string) => void;
  onNoteFocus: (userId: number) => void;
  onNoteBlur: () => void;
  onAddInlineNote: (userId: number) => Promise<void>;
  onOpenAllNotes: (row: Tracker4x4Record) => void;
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

function getCountdownFromAma(row: Tracker4x4Record): {
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
  row: Tracker4x4Record,
  field: keyof Tracker4x4Record,
  options: Build4x4ColumnsOptions,
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
  row: Tracker4x4Record,
  field: keyof Tracker4x4Record,
  options: Build4x4ColumnsOptions
): boolean {
  const savingKey = `${row.user_id}:${String(field)}`;
  return options.savingKeySet.has(savingKey);
}

// Defined before Build4x4ColumnsOptions so the interface can reference them.
export type SavingsToggleField =
  | 'personal_savings'
  | 'finish_2nd_savings'
  | 'finish_3rd_savings'
  | 'finish_4th_savings';

export type SavingsAmountField =
  | 'personal_savings_amount'
  | 'finish_2nd_savings_amount'
  | 'finish_3rd_savings_amount'
  | 'finish_4th_savings_amount';

function SavingsAmountCell({
  row,
  savingsField,
  amountField,
  options,
}: {
  row: Tracker4x4Record;
  savingsField: SavingsToggleField;
  amountField: SavingsAmountField;
  options: Build4x4ColumnsOptions;
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

export function build4x4Columns(options: Build4x4ColumnsOptions): TrackerTableColumn<Tracker4x4Record>[] {
  return [
    {
      key: 'index',
      label: '#',
      width: 40,
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
      key: 'finish_1st_recruit',
      label: 'Finish 1st Recruit',
      width: 100,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.finish_1st_recruit),
      render: (row) => renderCheckbox(row, 'finish_1st_recruit', options),
    },
    {
      key: 'personal_savings',
      label: 'Personal Savings',
      width: 140,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => `${asYesNo(row.personal_savings)} ${row.personal_savings_amount ?? ''}`,
      render: (row) => (
        <SavingsAmountCell
          row={row}
          savingsField="personal_savings"
          amountField="personal_savings_amount"
          options={options}
        />
      ),
    },
    {
      key: 'big_event',
      label: 'Big Event',
      width: 100,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.big_event),
      render: (row) => renderCheckbox(row, 'big_event', options),
    },
    {
      key: 'finish_2nd_recruit',
      label: 'Finish 2nd Recruit',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.finish_2nd_recruit),
      render: (row) => renderCheckbox(row, 'finish_2nd_recruit', options),
    },
    {
      key: 'finish_3rd_recruit',
      label: 'Finish 3rd Recruit',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.finish_3rd_recruit),
      render: (row) => renderCheckbox(row, 'finish_3rd_recruit', options),
    },
    {
      key: 'finish_2nd_savings',
      label: 'Finish 2nd Savings',
      width: 150,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => `${asYesNo(row.finish_2nd_savings)} ${row.finish_2nd_savings_amount ?? ''}`,
      render: (row) => (
        <SavingsAmountCell
          row={row}
          savingsField="finish_2nd_savings"
          amountField="finish_2nd_savings_amount"
          options={options}
        />
      ),
    },
    {
      key: 'finish_3rd_savings',
      label: 'Finish 3rd Savings',
      width: 150,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => `${asYesNo(row.finish_3rd_savings)} ${row.finish_3rd_savings_amount ?? ''}`,
      render: (row) => (
        <SavingsAmountCell
          row={row}
          savingsField="finish_3rd_savings"
          amountField="finish_3rd_savings_amount"
          options={options}
        />
      ),
    },
    {
      key: 'finish_4th_savings',
      label: 'Finish 4th Savings',
      width: 150,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => `${asYesNo(row.finish_4th_savings)} ${row.finish_4th_savings_amount ?? ''}`,
      render: (row) => (
        <SavingsAmountCell
          row={row}
          savingsField="finish_4th_savings"
          amountField="finish_4th_savings_amount"
          options={options}
        />
      ),
    },
    {
      key: 'pass_exam_date',
      label: 'Pass Exam',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: true,
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
      searchable: true,
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
      key: 'licensed',
      label: 'Licensed',
      width: 100,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.licensed),
      render: (row) => renderCheckbox(row, 'licensed', options),
    },
    {
      key: 'notes',
      label: 'Notes',
      width: 320,
      searchable: true,
      value: (row) => (options.notesByUserId[row.user_id] || []).map((note) => note.text).join(' '),
      render: (row) => (
        <TrackerNotesCell
          userId={row.user_id}
          userName={row.user_name}
          notes={options.notesByUserId[row.user_id] || []}
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
