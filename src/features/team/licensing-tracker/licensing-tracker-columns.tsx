import type { TrackerTableColumn } from '@/shared/components';
import { TrackerUserCell } from '@/features/team/components/tracker-user-cell';
import { TrackerNotesCell } from '@/features/team/components/tracker-notes-cell';
import type { TrackerNote } from '@/features/team/services/tracker-notes-service';
import type { LicensingTrackerRecord } from './services/licensing-tracker-service';

function asYesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}

interface BuildLicensingColumnsOptions {
  onToggle: (userId: number, field: keyof LicensingTrackerRecord, value: boolean) => void;
  savingKeySet: Set<string>;
  notesByUserId: Record<number, TrackerNote[]>;
  noteDraftByUserId: Record<number, string>;
  focusedNoteInputId: number | null;
  savingNoteUserIdSet: Set<number>;
  onNoteDraftChange: (userId: number, value: string) => void;
  onNoteFocus: (userId: number) => void;
  onNoteBlur: () => void;
  onAddInlineNote: (userId: number) => Promise<void>;
  onOpenAllNotes: (row: LicensingTrackerRecord) => void;
}

function renderCheckbox(
  row: LicensingTrackerRecord,
  field: keyof LicensingTrackerRecord,
  options: BuildLicensingColumnsOptions
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

export function buildLicensingColumns(
  options: BuildLicensingColumnsOptions
): TrackerTableColumn<LicensingTrackerRecord>[] {
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
      key: 'xcel',
      label: 'Xcel',
      width: 120,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.xcel),
      render: (row) => renderCheckbox(row, 'xcel', options),
    },
    {
      key: 'test_date',
      label: 'Test Date',
      width: 160,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => row.test_date || '',
      render: (row) => formatDate(row.test_date),
    },
    {
      key: 'test_result',
      label: 'Test Result',
      width: 260,
      align: 'center',
      sortable: true,
      searchable: true,
      render: (row) => row.test_result || '-',
      value: (row) => row.test_result || '',
    },
    {
      key: 'fingerprint',
      label: 'Fingerprint',
      width: 140,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.fingerprint),
      render: (row) => renderCheckbox(row, 'fingerprint', options),
    },
    {
      key: 'sircon_nipr_date',
      label: 'Sircon / NIPR',
      width: 170,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => row.sircon_nipr_date || '',
      render: (row) => formatDate(row.sircon_nipr_date),
    },
    {
      key: 'license_cert',
      label: 'Lic. Certificate',
      width: 160,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.license_cert),
      render: (row) => renderCheckbox(row, 'license_cert', options),
    },
    {
      key: 'launch_direct',
      label: 'Launch / Direct',
      width: 160,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.launch_direct),
      render: (row) => renderCheckbox(row, 'launch_direct', options),
    },
    {
      key: 'agent_agreement',
      label: 'Agent Agreement',
      width: 160,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.agent_agreement),
      render: (row) => renderCheckbox(row, 'agent_agreement', options),
    },
    {
      key: 'agent_approval_date',
      label: 'Agent Approval',
      width: 170,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => row.agent_approval_date || '',
      render: (row) => formatDate(row.agent_approval_date),
    },
    {
      key: 'continuing_ed',
      label: 'Cont. Education',
      width: 160,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.continuing_ed),
      render: (row) => renderCheckbox(row, 'continuing_ed', options),
    },
    {
      key: 'eop_platform',
      label: 'E&O & Platform',
      width: 160,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.eop_platform),
      render: (row) => renderCheckbox(row, 'eop_platform', options),
    },
    {
      key: 'direct_deposit',
      label: 'Direct Deposit',
      width: 160,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => asYesNo(row.direct_deposit),
      render: (row) => renderCheckbox(row, 'direct_deposit', options),
    },
    {
      key: 'licensed',
      label: 'Licensed',
      width: 140,
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
