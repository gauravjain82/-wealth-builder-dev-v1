import type { TrackerTableColumn } from '@/shared/components';
import { TrackerUserCell } from '@/features/team/components/tracker-user-cell';
import { TrackerNotesCell } from '@/features/team/components/tracker-notes-cell';
import type { TrackerNote } from '@/features/team/services/tracker-notes-service';
import type { Tracker4x4Record } from './services/tracker-4x4-service';

function asYesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}

interface Build4x4ColumnsOptions {
  onToggle: (userId: number, field: keyof Tracker4x4Record, value: boolean) => void;
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

function renderCheckbox(
  row: Tracker4x4Record,
  field: keyof Tracker4x4Record,
  options: Build4x4ColumnsOptions
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

function formatDate(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function formatCurrency(value: number | string | null): string {
  if (value === null || value === undefined || value === '') return '-';
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return String(value);
  return parsed.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function build4x4Columns(options: Build4x4ColumnsOptions): TrackerTableColumn<Tracker4x4Record>[] {
  return [
    {
      key: 'index',
      label: '#',
      width: 40,
      align: 'center',
      sortable: true,
      value: (row) => row.id,
      render: (row) => row.id,
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
      value: () => '',
      render: () => '-',
    },
    {
      key: 'leader',
      label: 'Leader',
      width: 200,
      sortable: true,
      searchable: true,
      value: () => '',
      render: () => '-',
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
      render: (row) =>
        row.personal_savings
          ? (
            <div className="flex items-center justify-center gap-2">
              {renderCheckbox(row, 'personal_savings', options)}
              <span>{formatCurrency(row.personal_savings_amount)}</span>
            </div>
          )
          : renderCheckbox(row, 'personal_savings', options),
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
      render: (row) =>
        row.finish_2nd_savings
          ? (
            <div className="flex items-center justify-center gap-2">
              {renderCheckbox(row, 'finish_2nd_savings', options)}
              <span>{formatCurrency(row.finish_2nd_savings_amount)}</span>
            </div>
          )
          : renderCheckbox(row, 'finish_2nd_savings', options),
    },
    {
      key: 'finish_3rd_savings',
      label: 'Finish 3rd Savings',
      width: 150,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => `${asYesNo(row.finish_3rd_savings)} ${row.finish_3rd_savings_amount ?? ''}`,
      render: (row) =>
        row.finish_3rd_savings
          ? (
            <div className="flex items-center justify-center gap-2">
              {renderCheckbox(row, 'finish_3rd_savings', options)}
              <span>{formatCurrency(row.finish_3rd_savings_amount)}</span>
            </div>
          )
          : renderCheckbox(row, 'finish_3rd_savings', options),
    },
    {
      key: 'finish_4th_savings',
      label: 'Finish 4th Savings',
      width: 150,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => `${asYesNo(row.finish_4th_savings)} ${row.finish_4th_savings_amount ?? ''}`,
      render: (row) =>
        row.finish_4th_savings
          ? (
            <div className="flex items-center justify-center gap-2">
              {renderCheckbox(row, 'finish_4th_savings', options)}
              <span>{formatCurrency(row.finish_4th_savings_amount)}</span>
            </div>
          )
          : renderCheckbox(row, 'finish_4th_savings', options),
    },
    {
      key: 'pass_exam_date',
      label: 'Pass Exam',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => row.pass_exam_date || '',
      render: (row) => formatDate(row.pass_exam_date),
    },
    {
      key: 'sircon_nipr_date',
      label: 'Sircon/NIPR',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => row.sircon_nipr_date || '',
      render: (row) => formatDate(row.sircon_nipr_date),
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
