import { DatePicker, type TrackerTableColumn } from '@/shared/components';
import { TrackerUserCell } from '@/features/team/components/tracker-user-cell';
import { TrackerNotesCell } from '@/features/team/components/tracker-notes-cell';
import type { TrackerNote } from '@/features/team/services/tracker-notes-service';
import type { LicensingTrackerRecord } from './services/licensing-tracker-service';

function asYesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}

interface BuildLicensingColumnsOptions {
  onToggle: (userId: number, field: keyof LicensingTrackerRecord, value: boolean) => void;
  onPatch: (
    userId: number,
    field: keyof LicensingTrackerRecord,
    value: string | boolean | null
  ) => void;
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
  const saving = options.savingKeySet.has(savingKey);
  return (
    <div className="flex h-8 items-center justify-center">
      <button
        type="button"
        className={`tracker-toggle-box ${checked ? 'is-on' : 'is-off'} ${saving ? 'cursor-wait opacity-75' : ''}`}
        disabled={saving}
        aria-label={`${field} ${checked ? 'done' : 'pending'}`}
        onClick={() => options.onToggle(row.user_id, field, !checked)}
      >
        <span className={`text-xs font-semibold ${checked ? 'text-emerald-300' : 'text-rose-300'}`}>
          {checked ? 'Done' : 'Pending'}
        </span>
      </button>
    </div>
  );
}

function isSaving(
  row: LicensingTrackerRecord,
  field: keyof LicensingTrackerRecord,
  options: BuildLicensingColumnsOptions
): boolean {
  return options.savingKeySet.has(`${row.user_id}:${String(field)}`);
}

function getRowNotes(
  row: LicensingTrackerRecord,
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
      tracker: row.latest_note_tracker || 'licensing',
      created_at: createdAt,
      updated_at: createdAt,
    },
  ];
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
      render: (row) => (
        <DatePicker
          value={row.test_date || ''}
          onChange={(value) => options.onPatch(row.user_id, 'test_date', value || null)}
          disabled={isSaving(row, 'test_date', options)}
          className="h-8"
        />
      ),
    },
    {
      key: 'test_result',
      label: 'Test Result',
      width: 260,
      align: 'center',
      sortable: true,
      searchable: true,
      value: (row) => `${row.test_result || ''} ${row.test_result_date || ''}`.trim(),
      render: (row) => (
        <div className="flex w-full flex-row gap-1">
          <DatePicker
            value={row.test_result_date || ''}
            onChange={(value) => options.onPatch(row.user_id, 'test_result_date', value || null)}
            disabled={isSaving(row, 'test_result_date', options)}
            className="h-8"
          />
          <select
            className="h-8 w-full rounded border border-white/15 bg-white/5 px-2 text-xs text-white outline-none focus:border-amber-300/50"
            value={row.test_result || ''}
            disabled={isSaving(row, 'test_result', options)}
            onChange={(e) => options.onPatch(row.user_id, 'test_result', e.target.value)}
          >
            <option value="" style={{ color: '#111827', backgroundColor: '#ffffff' }}></option>
            <option value="Yes" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Yes</option>
            <option value="No" style={{ color: '#111827', backgroundColor: '#ffffff' }}>No</option>
          </select>
        </div>
      ),
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
      render: (row) => (
        <DatePicker
          value={row.agent_approval_date || ''}
          onChange={(value) => options.onPatch(row.user_id, 'agent_approval_date', value || null)}
          disabled={isSaving(row, 'agent_approval_date', options)}
          className="h-8"
        />
      ),
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
