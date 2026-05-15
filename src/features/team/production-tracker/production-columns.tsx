import { useEffect, useState } from 'react';
import { IconPencil, IconCalendar } from '@tabler/icons-react';
import { DatePicker, Modal } from '@/shared/components';
import type { TrackerTableColumn } from '@/shared/components';
import { TrackerUserProfileModal } from '@/features/team/components/tracker-user-profile-modal';
import type { TrackerNote } from '@/features/team/services/tracker-notes-service';
import {
  type ProductionTrackerRecord,
  type UpdateProductionPayload,
} from './services/production-tracker-service';
import { PolicyAttachmentsAction } from './components/policy-attachments-action';
import { PolicyNotesCell } from './components/policy-notes-cell';

interface ProductionColumnActions {
  onPatch: (row: ProductionTrackerRecord, patch: UpdateProductionPayload) => Promise<void>;
  onEdit: (row: ProductionTrackerRecord) => void;
  onDelete: (row: ProductionTrackerRecord) => void;
  notesByUserId: Record<number, TrackerNote[]>;
  noteDraftByUserId: Record<number, string>;
  focusedNoteInputId: number | null;
  savingNoteUserIdSet: Set<number>;
  onNoteDraftChange: (userId: number, value: string) => void;
  onNoteFocus: (userId: number) => void;
  onNoteBlur: () => void;
  onAddInlineNote: (userId: number) => Promise<void>;
  onOpenAllNotes: (row: ProductionTrackerRecord) => void;
  onChargeback: (row: ProductionTrackerRecord, chargebackType: string | null) => Promise<void>;
  splitOptions?: readonly string[];
  companyOptions?: readonly string[];
  productsByCompany?: Record<string, string[]>;
}

function formatPoint(value: number | string | null): string {
  if (value === null || value === undefined || value === '') return '0';
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return String(value);
  return parsed.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toYesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}

function getRowNotes(
  row: ProductionTrackerRecord,
  notesByUserId: Record<number, TrackerNote[]>
): TrackerNote[] {
  if (row.prospect != null) {
    const loaded = notesByUserId[row.prospect];
    if (loaded) return loaded;
  }

  const latestText = row.latest_note_text?.trim() || row.notes?.trim();
  if (!latestText || row.prospect == null) return [];

  const createdAt = row.latest_note_created_at || row.updated_at || row.created_at;
  return [
    {
      id: -row.id,
      user: row.prospect,
      created_by: null,
      created_by_name: row.latest_note_created_by_name || undefined,
      text: latestText,
      tracker: row.latest_note_tracker || 'production',
      created_at: createdAt,
      updated_at: createdAt,
    },
  ];
}

function AgentsCell({
  row,
  onPatch,
  splitOptions = [],
}: {
  row: ProductionTrackerRecord;
  onPatch: (row: ProductionTrackerRecord, patch: UpdateProductionPayload) => Promise<void>;
  splitOptions?: readonly string[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [profileUserId, setProfileUserId] = useState<number | null>(null);
  const [profileName, setProfileName] = useState<string>('');
  const [agent1, setAgent1] = useState('');
  const [agent2, setAgent2] = useState('');
  const [split, setSplit] = useState('100/0');

  useEffect(() => {
    setAgent1(row.agent_1_name || '');
    setAgent2(row.agent_2_name || '');
    setSplit(row.split_mode === 'split' ? `${row.agent_1_pct || 50}/${row.agent_2_pct || 50}` : '100/0');
  }, [row.agent_1_name, row.agent_1_pct, row.agent_2_name, row.agent_2_pct, row.split_mode]);

  const resolvedSplitOptions = splitOptions.length > 0 ? splitOptions : [split];

  const save = async () => {
    const [a1Pct, a2Pct] = split.split('/').map((v) => Number(v) || 0);
    await onPatch(row, {
      agent_1_name: agent1,
      agent_2_name: agent2,
      split_mode: split === '100/0' ? 'solo' : 'split',
      agent_1_pct: a1Pct,
      agent_2_pct: a2Pct,
    });
    setEditOpen(false);
  };

  const openProfile = (userId: number | null, name: string) => {
    if (!userId) return;
    setProfileUserId(userId);
    setProfileName(name);
  };

  const agent1Name = row.agent_1_name || '';
  const agent2Name = row.split_mode === 'split' ? (row.agent_2_name || '') : '';

  return (
    <>
      {/* Agent name chips + edit button */}
      <div className="flex min-w-0 items-center gap-1.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {agent1Name ? (
            <button
              type="button"
              className="truncate text-left text-xs text-amber-200 underline-offset-2 hover:underline"
              title={`View profile: ${agent1Name}`}
              onClick={(e) => { e.stopPropagation(); openProfile(row.agent_1, agent1Name); }}
            >
              {agent1Name}
              {row.split_mode === 'split' && (
                <span className="ml-1 text-white/50">{row.agent_1_pct}%</span>
              )}
            </button>
          ) : (
            <span className="text-xs text-white/40">No agent</span>
          )}
          {agent2Name && (
            <button
              type="button"
              className="truncate text-left text-xs text-sky-200 underline-offset-2 hover:underline"
              title={`View profile: ${agent2Name}`}
              onClick={(e) => { e.stopPropagation(); openProfile(row.agent_2, agent2Name); }}
            >
              {agent2Name}
              <span className="ml-1 text-white/50">{row.agent_2_pct}%</span>
            </button>
          )}
        </div>
        <button
          type="button"
          className="h-6 w-6 flex-shrink-0 rounded border border-white/15 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
          title="Edit agents & split"
          onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}
        >
          <IconPencil size={12} className="mx-auto" />
        </button>
      </div>

      {/* Edit agents modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Agents" contentClassName="max-w-[520px]">
        <div className="grid gap-3">
          <label className="text-xs text-white/80">Agent 1</label>
          <input
            className="h-9 rounded border border-white/20 bg-white/5 px-3 text-sm"
            value={agent1}
            onChange={(e) => setAgent1(e.target.value)}
            placeholder="Agent 1"
          />
          <label className="text-xs text-white/80">Agent 2</label>
          <input
            className="h-9 rounded border border-white/20 bg-white/5 px-3 text-sm"
            value={agent2}
            onChange={(e) => setAgent2(e.target.value)}
            placeholder="Agent 2"
          />
          <label className="text-xs text-white/80">Split</label>
          <select
            className="h-9 rounded border border-white/20 bg-white/5 px-3 text-sm text-white"
            style={{ colorScheme: 'dark' }}
            value={split}
            onChange={(e) => setSplit(e.target.value)}
          >
            {resolvedSplitOptions.map((opt) => (
              <option key={opt} value={opt} style={{ backgroundColor: '#1e2431', color: '#ffffff' }}>
                {opt}
              </option>
            ))}
          </select>
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className="h-8 rounded border border-white/20 px-3 text-xs" onClick={() => setEditOpen(false)}>
              Cancel
            </button>
            <button type="button" className="h-8 rounded border border-amber-300/30 bg-amber-500/10 px-3 text-xs" onClick={() => void save()}>
              Save
            </button>
          </div>
        </div>
      </Modal>

      {/* Agent profile modal */}
      <TrackerUserProfileModal
        open={profileUserId !== null}
        userId={profileUserId}
        fallbackName={profileName}
        onClose={() => { setProfileUserId(null); setProfileName(''); }}
      />
    </>
  );
}

function PointsCell({
  row,
  onPatch,
}: {
  row: ProductionTrackerRecord;
  onPatch: (row: ProductionTrackerRecord, patch: UpdateProductionPayload) => Promise<void>;
}) {
  const [targetValue, setTargetValue] = useState<string>('');

  useEffect(() => {
    setTargetValue(row.points_target !== null && row.points_target !== undefined ? String(row.points_target) : '');
  }, [row.points_target]);
  const normalizedTarget = targetValue.trim() === '' ? null : toNumber(targetValue);
  const basePointsLabel = row.base_points ? `${formatPoint(row.base_points)} Pts` : null;
  const forty = row.points_forty;
  const sixty = row.points_sixty;
  const isSplit = row.split_mode === 'split' && Boolean(row.agent_2);

  const splitCards = [
    {
      key: 'agent-1',
      name: row.agent_1_name || 'Agent 1',
      percentage: row.agent_1_pct,
      total: row.agent_1_points_target,
      forty: row.agent_1_points_forty,
      sixty: row.agent_1_points_sixty,
    },
    {
      key: 'agent-2',
      name: row.agent_2_name || 'Agent 2',
      percentage: row.agent_2_pct,
      total: row.agent_2_points_target,
      forty: row.agent_2_points_forty,
      sixty: row.agent_2_points_sixty,
    },
  ];

  return (
    <div className="space-y-1">
      {/* Badges row: Total on left, Base Points on right */}
      <div className="flex items-center justify-between gap-2">
        {targetValue && (
          <span className="inline-flex items-center rounded-full border border-amber-300/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-100">
            {formatPoint(targetValue)} Pts
          </span>
        )}
        {basePointsLabel && (
          <span className="inline-flex items-center rounded-full border border-amber-300/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-100">
            {basePointsLabel}
          </span>
        )}
      </div>

      {/* Single agent: Total/40/60 inputs; Split agents: hidden */}
      {!isSplit && (
        <div className="grid w-full grid-cols-3 gap-1 text-[10px]">
          <div>
            <div className="mb-1 text-white/60">Total</div>
            <input
              className="h-8 w-full rounded border border-white/20 bg-white/5 px-2 text-xs"
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              onBlur={() => void onPatch(row, { points_target: normalizedTarget })}
            />
          </div>
          <div>
            <div className="mb-1 text-white/60">40%</div>
            <input
              className="h-8 w-full rounded border border-white/20 bg-white/5 px-2 text-xs"
              type="number"
              value={forty !== null && forty !== undefined ? String(forty) : ''}
              readOnly
            />
          </div>
          <div>
            <div className="mb-1 text-white/60">60%</div>
            <input
              className="h-8 w-full rounded border border-white/20 bg-white/5 px-2 text-xs"
              type="number"
              value={sixty !== null && sixty !== undefined ? String(sixty) : ''}
              readOnly
            />
          </div>
        </div>
      )}

      {/* Split agents: point values only, no agent names */}
      {isSplit && (
        <div className="rounded border border-white/10 bg-white/5 p-1.5">
          <div className="mb-1 grid grid-cols-3 gap-1 text-[10px] text-white/50">
            <div>Points</div>
            <div>40%</div>
            <div>60%</div>
          </div>
          <div className="grid gap-1">
            {splitCards.map((agent) => (
              <div key={agent.key} className="grid grid-cols-3 gap-1">
                <input className="h-7 w-full rounded border border-white/15 bg-black/20 px-2 text-[11px]" value={formatPoint(agent.total ?? 0)} readOnly />
                <input className="h-7 w-full rounded border border-white/15 bg-black/20 px-2 text-[11px]" value={formatPoint(agent.forty ?? 0)} readOnly />
                <input className="h-7 w-full rounded border border-white/15 bg-black/20 px-2 text-[11px]" value={formatPoint(agent.sixty ?? 0)} readOnly />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PolicyCell({
  row,
}: {
  row: ProductionTrackerRecord;
}) {
  const company = row.policy_company?.trim() || '—';
  const product = (row.policy_product === 'OTHER' ? row.policy_other_product : row.policy_product)?.trim() || '—';
  const policyNumber = row.policy_number?.trim() || '—';

  return (
    <div className="grid gap-1 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] leading-4">
      <div className="text-white/60">Company: {company}</div>
      {/* <div className="truncate text-white" title={company}>{company}</div> */}
      <div className="mt-1 text-white/60">Product: {product}</div>
      {/* <div className="truncate text-white" title={product}>{product}</div> */}
      <div className="mt-1 text-white/60">Policy #: {policyNumber}</div>
      {/* <div className="truncate font-medium text-white" title={policyNumber}>{policyNumber}</div> */}
    </div>
  );
}

function AdvancesCell({
  row,
  onPatch,
}: {
  row: ProductionTrackerRecord;
  onPatch: (row: ProductionTrackerRecord, patch: UpdateProductionPayload) => Promise<void>;
}) {
  return (
    <div className="grid w-full grid-cols-2 gap-1 text-[10px]">
      <div>
        <div className="mb-1 text-white/60">1st Advance</div>
        <DatePicker
          value={row.advance_first_date || ''}
          onChange={(v) => void onPatch(row, { advance_first_date: v || null })}
        />
      </div>
      <div>
        <div className="mb-1 text-white/60">2nd Advance</div>
        <DatePicker
          value={row.advance_second_date || ''}
          onChange={(v) => void onPatch(row, { advance_second_date: v || null })}
        />
      </div>
    </div>
  );
}

function ChargebackCell({
  row,
  onChargeback,
}: {
  row: ProductionTrackerRecord;
  onChargeback: (row: ProductionTrackerRecord, chargebackType: string | null) => Promise<void>;
}) {
  const chargebackInfo = row.chargeback_info;
  
  if (!chargebackInfo || !chargebackInfo.eligible_options || chargebackInfo.eligible_options.length === 0) {
    return <div className="text-[10px] text-white/50">No options</div>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {chargebackInfo.eligible_options.map((option) => (
        <label key={option.type} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 px-1.5 py-0.5 rounded">
          <input
            type="radio"
            name={`chargeback-${row.id}`}
            value={option.type}
            checked={chargebackInfo.selection === option.type}
            onClick={(e) => {
              if (chargebackInfo.selection === option.type) {
                e.preventDefault();
                void onChargeback(row, null);
              }
            }}
            onChange={() => {
              if (chargebackInfo.selection !== option.type) {
                void onChargeback(row, option.type);
              }
            }}
            className="cursor-pointer"
          />
          <span className="text-[10px] text-white/80">{option.label}</span>
        </label>
      ))}
    </div>
  );
}

function DeliveryStatusCell({
  row,
  deliveryFields,
  onPatch,
}: {
  row: ProductionTrackerRecord;
  deliveryFields: Array<{ label: string; fieldKey: keyof UpdateProductionPayload; value: string | null | undefined }>;
  onPatch: (row: ProductionTrackerRecord, patch: UpdateProductionPayload) => Promise<void>;
}) {
  const [openPickerIndex, setOpenPickerIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-0.5">
      {deliveryFields.map((field, index) => (
        <div key={field.fieldKey} className="flex flex-col gap-0">
          <div
            className="grid grid-cols-[1fr_auto_auto] items-center gap-1 px-1.5 py-0 rounded transition-colors"
            title={field.label}
          >
            <span className="text-[10px] leading-tight text-white/70 text-left truncate">
              {field.label}
            </span>
            <span className="text-[10px] leading-tight font-medium text-white/80 text-center min-w-[72px]">
              {field.value || '—'}
            </span>
            <button
              type="button"
              className="flex-shrink-0 p-0.5 hover:bg-white/10 rounded transition-colors"
              onClick={() => setOpenPickerIndex(openPickerIndex === index ? null : index)}
              title={`Edit ${field.label}`}
            >
              <IconCalendar size={12} className="text-white/60 hover:text-amber-400" />
            </button>
          </div>
          
          {openPickerIndex === index && (
            <div className="pl-1.5">
              <DatePicker
                value={field.value || ''}
                onChange={(v) => {
                  void onPatch(row, { [field.fieldKey]: v || null });
                  setOpenPickerIndex(null);
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  complete:    { bg: '#145131', text: '#6ee7b7' },
  completed:   { bg: '#145131', text: '#6ee7b7' },
  issued:      { bg: '#145131', text: '#6ee7b7' },
  approved:    { bg: '#1e3a8a', text: '#93c5fd' },
  submitted:   { bg: '#1e3a8a', text: '#93c5fd' },
  pending:     { bg: '#78350f', text: '#fcd34d' },
  'in progress': { bg: '#78350f', text: '#fcd34d' },
  trial:       { bg: '#78350f', text: '#fcd34d' },
  chargeback:  { bg: '#5c2121', text: '#fca5a5' },
  declined:    { bg: '#5c2121', text: '#fca5a5' },
  cancelled:   { bg: '#5c2121', text: '#fca5a5' },
  issue:       { bg: '#5c2121', text: '#fca5a5' },
  incomplete:  { bg: '#374151', text: '#d1d5db' },
  lead:        { bg: '#4a1d96', text: '#c4b5fd' },
};

function getStatusStyle(status: string) {
  const key = (status || '').trim().toLowerCase();
  return STATUS_STYLES[key] ?? { bg: '#374151', text: '#d1d5db' };
}

export function buildProductionColumns(actions: ProductionColumnActions): TrackerTableColumn<ProductionTrackerRecord>[] {
  return [
    {
      key: 'status',
      label: '',
      width: 40,
      minWidth: 40,
      resizable: false,
      sortable: true,
      searchable: true,
      align: 'center',
      className: 'tracker-col-narrow',
      value: (row) => row.status,
      render: (row) => {
        const label = row.status_display || row.status || 'Pending';
        const { bg, text } = getStatusStyle(label);
        return (
          <div className="relative flex h-full min-h-[60px] w-full items-stretch">
            {/* Vertical badge */}
            <div
              className="flex items-center justify-center"
              style={{ backgroundColor: bg, padding: '4px 4px', borderRadius: '2px'}}
            >
              <span
                className="select-none whitespace-nowrap text-[10px] font-bold uppercase tracking-widest"
                style={{
                  color: text,
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                }}
              >
                {label}
              </span>
            </div>
            {/* Invisible full-area select for editing */}
            {/* <select
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              value={row.status || 'Pending'}
              onChange={(e) => void actions.onPatch(row, { status: e.target.value })}
              title={`Status: ${label} — click to change`}
            >
              {PRODUCTION_TABLE_STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select> */}
          </div>
        );
      },
    },
    {
      key: 'date_written',
      label: 'DATE WRITTEN',
      width: 140,
      sortable: true,
      searchable: true,
      align: 'center',
      value: (row) => row.date_written || '',
      render: (row) => (
        <DatePicker
          value={row.date_written || ''}
          onChange={(v) => void actions.onPatch(row, { date_written: v || null })}
        />
      ),
    },
    {
      key: 'closure_date',
      label: 'CLOSURE DATE',
      width: 140,
      sortable: true,
      searchable: true,
      align: 'center',
      value: (row) => row.closure_date || '',
      render: (row) => (
        <DatePicker
          value={row.closure_date || ''}
          onChange={(v) => void actions.onPatch(row, { closure_date: v || null })}
        />
      ),
    },
    {
      key: 'client_name',
      label: 'CLIENT',
      width: 220,
      sortable: true,
      searchable: true,
      value: (row) => row.client_name,
      render: (row) => (
        <input
          className="h-8 w-full rounded border border-white/15 bg-white/5 px-2 text-xs"
          value={row.client_name || ''}
          onChange={(e) => void actions.onPatch(row, { client_name: e.target.value })}
        />
      ),
    },
    {
      key: 'agents',
      label: 'AGENTS',
      width: 260,
      searchable: true,
      value: (row) => {
        const splitLabel = row.split_mode === 'split' ? `${row.agent_1_pct || 50}/${row.agent_2_pct || 50}` : '100/0';
        return `${row.agent_1_name || ''} ${row.agent_2_name || ''} ${splitLabel}`.trim();
      },
      render: (row) => <AgentsCell row={row} onPatch={actions.onPatch} splitOptions={actions.splitOptions} />,
    },
    {
      key: 'points',
      label: 'POINTS / 40% / 60%',
      width: 240,
      searchable: true,
      value: (row) => {
        const total = toNumber(row.points_target);
        const forty = total * 0.4;
        const sixty = total * 0.6;
        return `${total} ${forty} ${sixty}`;
      },
      render: (row) => <PointsCell row={row} onPatch={actions.onPatch} />,
    },
    {
      key: 'advances',
      label: 'ADVANCES (1st / 2nd)',
      width: 280,
      searchable: true,
      value: (row) => `${row.advance_first_date || ''} ${row.advance_second_date || ''}`.trim(),
      render: (row) => <AdvancesCell row={row} onPatch={actions.onPatch} />,
    },
    {
      key: 'policy',
      label: 'POLICY DETAILS',
      width: 360,
      searchable: true,
      value: (row) =>
        `${row.policy_company || ''} ${row.policy_product || ''} ${row.policy_other_product || ''} ${row.policy_number || ''}`,
      render: (row) => <PolicyCell row={row} />,
    },
    {
      key: 'policy_status',
      label: 'POLICY STATUS',
      width: 160,
      sortable: true,
      searchable: true,
      align: 'center',
      value: (row) => row.policy_status || '',
      render: (row) => (
        <div className="flex flex-col gap-2">
          {['Cancelled', 'Declined', 'Incomplete'].map((status) => (
            <label key={status} className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="radio"
                name={`policy-status-${row.id}`}
                value={status}
                checked={row.status.toLowerCase() === status.toLowerCase()}
                onChange={(e) => void actions.onPatch(row, { status: e.target.value.toUpperCase() })}
                className="cursor-pointer"
              />
              <span className="text-white/80">{status}</span>
            </label>
          ))}
        </div>
      ),
    },
    {
      key: 'delivery',
      label: 'DELIVERY STATUS',
      width: 180,
      sortable: true,
      searchable: true,
      align: 'center',
      value: (row) => row.delivery,
      render: (row) => {
        const deliveryFields = [
          { label: 'Issued',     fieldKey: 'issued_date' as const, value: row.issued_date },
          { label: 'Approved',   fieldKey: 'approved_date' as const, value: row.approved_date },
          { label: 'Delivered',  fieldKey: 'delivery_date' as const, value: row.delivery_date },
          { label: 'PDR',        fieldKey: 'pdr_date' as const, value: row.pdr_date },
          { label: 'Sent to TFA', fieldKey: 'sent_to_tfa_date' as const, value: row.sent_to_tfa_date },
        ] satisfies Array<{ label: string; fieldKey: keyof UpdateProductionPayload; value: string | null | undefined }>;

        return (
          <DeliveryStatusCell
            row={row}
            deliveryFields={deliveryFields}
            onPatch={actions.onPatch}
          />
        );
      },
    },
    {
      key: 'notes',
      label: 'NOTES',
      width: 320,
      searchable: true,
      value: (row) => getRowNotes(row, actions.notesByUserId).map((note) => note.text).join(' '),
      render: (row) => {
        const notes = getRowNotes(row, actions.notesByUserId);
        const userId = row.prospect;

        return (
          <PolicyNotesCell
            userId={userId}
            userName={row.client_name || 'Client'}
            notes={notes}
            draft={userId != null ? (actions.noteDraftByUserId[userId] || '') : ''}
            focusedNoteInputId={actions.focusedNoteInputId}
            saving={userId != null && actions.savingNoteUserIdSet.has(userId)}
            onDraftChange={actions.onNoteDraftChange}
            onFocus={actions.onNoteFocus}
            onBlur={actions.onNoteBlur}
            onAddInlineNote={actions.onAddInlineNote}
            onOpenAllNotes={() => actions.onOpenAllNotes(row)}
          />
        );
      },
    },
    {
      key: 'trial_app',
      label: 'TRIAL APP',
      width: 120,
      sortable: true,
      searchable: true,
      align: 'center',
      value: (row) => toYesNo(row.trial_app),
      render: (row) => (
        <input
          type="checkbox"
          checked={row.trial_app}
          onChange={(e) =>
            void actions.onPatch(row, {
              trial_app: e.target.checked,
              // status: e.target.checked ? 'Trial' : row.status,
            })
          }
        />
      ),
    },
    {
      key: 'chargeback',
      label: 'CHARGE BACK',
      width: 140,
      sortable: true,
      searchable: true,
      align: 'center',
      value: (row) => row.chargeback_info?.selection || 'None',
      render: (row) => <ChargebackCell row={row} onChargeback={actions.onChargeback} />,
    },
    {
      key: 'actions',
      label: 'ACTION',
      width: 140,
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-2">
          <PolicyAttachmentsAction policyId={row.id} policyLabel={row.client_name} />
          <button
            type="button"
            className="h-7 w-7 rounded border border-amber-300/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
            title="Edit production"
            onClick={(e) => {
              e.stopPropagation();
              actions.onEdit(row);
            }}
          >
            ✎
          </button>
          <button
            type="button"
            className="h-7 w-7 rounded border border-red-300/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
            title="Delete production"
            onClick={(e) => {
              e.stopPropagation();
              actions.onDelete(row);
            }}
          >
            🗑
          </button>
        </div>
      ),
    },
  ];
}
