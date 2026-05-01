import { useEffect, useState } from 'react';
import { DatePicker, Modal } from '@/shared/components';
import type { TrackerTableColumn } from '@/shared/components';
import type { ProductionTrackerRecord } from './services/production-tracker-service';
import type { UpdateProductionPayload } from './services/production-tracker-service';
import {
  PRODUCTION_AGENT_SPLIT_OPTIONS,
  PRODUCTION_COMPANY_OPTIONS,
  PRODUCTION_TABLE_DELIVERY_OPTIONS,
  PRODUCTION_TABLE_STATUS_OPTIONS,
  PRODUCTS_BY_COMPANY,
} from './production-constants';

interface ProductionColumnActions {
  onPatch: (row: ProductionTrackerRecord, patch: UpdateProductionPayload) => Promise<void>;
  onEdit: (row: ProductionTrackerRecord) => void;
  onDelete: (row: ProductionTrackerRecord) => void;
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
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

function AgentsCell({
  row,
  onPatch,
}: {
  row: ProductionTrackerRecord;
  onPatch: (row: ProductionTrackerRecord, patch: UpdateProductionPayload) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [agent1, setAgent1] = useState('');
  const [agent2, setAgent2] = useState('');
  const [split, setSplit] = useState('100/0');

  useEffect(() => {
    setAgent1(row.agent_1_name || '');
    setAgent2(row.agent_2_name || '');
    setSplit(row.split_mode === 'split' ? `${row.agent_1_pct || 50}/${row.agent_2_pct || 50}` : '100/0');
  }, [row.agent_1_name, row.agent_1_pct, row.agent_2_name, row.agent_2_pct, row.split_mode]);

  const hasData = Boolean((agent1 || '').trim() || (agent2 || '').trim());

  const save = async () => {
    const [a1Pct, a2Pct] = split.split('/').map((v) => Number(v) || 0);
    await onPatch(row, {
      agent_1_name: agent1,
      agent_2_name: agent2,
      split_mode: split === '100/0' ? 'solo' : 'split',
      agent_1_pct: a1Pct,
      agent_2_pct: a2Pct,
    });
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="h-8 rounded border border-white/15 bg-white/5 px-2 text-xs hover:bg-white/10"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {`Agents${hasData ? ' • set' : ''}`}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Agents" contentClassName="max-w-[520px]">
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
            className="h-9 rounded border border-white/20 bg-white/5 px-3 text-sm"
            value={split}
            onChange={(e) => setSplit(e.target.value)}
          >
            {PRODUCTION_AGENT_SPLIT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className="h-8 rounded border border-white/20 px-3 text-xs" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className="h-8 rounded border border-amber-300/30 bg-amber-500/10 px-3 text-xs" onClick={() => void save()}>
              Save
            </button>
          </div>
        </div>
      </Modal>
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

  const total = toNumber(targetValue);
  const forty = Number((total * 0.4).toFixed(2));
  const sixty = Number((total * 0.6).toFixed(2));

  return (
    <div className="grid w-full grid-cols-3 gap-1 text-[10px]">
      <div>
        <div className="mb-1 text-white/60">Total</div>
        <input
          className="h-8 w-full rounded border border-white/20 bg-white/5 px-2 text-xs"
          type="number"
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
          onBlur={() => void onPatch(row, { points_target: total, points_forty: forty, points_sixty: sixty })}
        />
      </div>
      <div>
        <div className="mb-1 text-white/60">40%</div>
        <input className="h-8 w-full rounded border border-white/20 bg-white/5 px-2 text-xs" value={formatPoint(forty)} readOnly />
      </div>
      <div>
        <div className="mb-1 text-white/60">60%</div>
        <input className="h-8 w-full rounded border border-white/20 bg-white/5 px-2 text-xs" value={formatPoint(sixty)} readOnly />
      </div>
    </div>
  );
}

function PolicyCell({
  row,
  onPatch,
}: {
  row: ProductionTrackerRecord;
  onPatch: (row: ProductionTrackerRecord, patch: UpdateProductionPayload) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState('');
  const [product, setProduct] = useState('');
  const [otherProduct, setOtherProduct] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');

  useEffect(() => {
    setCompany(row.policy_company || '');
    setProduct(row.policy_product || '');
    setOtherProduct(row.policy_other_product || '');
    setPolicyNumber(row.policy_number || '');
  }, [row.policy_company, row.policy_number, row.policy_other_product, row.policy_product]);

  const hasData = Boolean((company || '').trim() || (product || '').trim() || (policyNumber || '').trim());
  const availableProducts = company ? PRODUCTS_BY_COMPANY[company] || [] : [];

  const save = async () => {
    await onPatch(row, {
      policy_company: company,
      policy_product: product,
      policy_other_product: product === 'OTHER' ? otherProduct : '',
      policy_number: policyNumber,
    });
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="h-8 rounded border border-white/15 bg-white/5 px-2 text-xs hover:bg-white/10"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {`Policy${hasData ? ' • set' : ''}`}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Policy Details" contentClassName="max-w-[520px]">
        <div className="grid gap-3">
          <label className="text-xs text-white/80">Company</label>
          <select
            className="h-9 rounded border border-white/20 bg-white/5 px-3 text-sm"
            value={company}
            onChange={(e) => {
              setCompany(e.target.value);
              setProduct('');
              setOtherProduct('');
            }}
          >
            <option value="">Select company</option>
            {PRODUCTION_COMPANY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <label className="text-xs text-white/80">Product</label>
          <select
            className="h-9 rounded border border-white/20 bg-white/5 px-3 text-sm"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            disabled={!company}
          >
            <option value="">Select product</option>
            {availableProducts.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {product === 'OTHER' && (
            <>
              <label className="text-xs text-white/80">Other Product</label>
              <input
                className="h-9 rounded border border-white/20 bg-white/5 px-3 text-sm"
                value={otherProduct}
                onChange={(e) => setOtherProduct(e.target.value)}
              />
            </>
          )}
          <label className="text-xs text-white/80">Policy #</label>
          <input
            className="h-9 rounded border border-white/20 bg-white/5 px-3 text-sm"
            value={policyNumber}
            onChange={(e) => setPolicyNumber(e.target.value)}
          />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className="h-8 rounded border border-white/20 px-3 text-xs" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className="h-8 rounded border border-amber-300/30 bg-amber-500/10 px-3 text-xs" onClick={() => void save()}>
              Save
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function buildProductionColumns(actions: ProductionColumnActions): TrackerTableColumn<ProductionTrackerRecord>[] {
  return [
    {
      key: 'status',
      label: 'POLICY STATUS',
      width: 140,
      sortable: true,
      searchable: true,
      align: 'center',
      value: (row) => row.status,
      render: (row) => (
        <select
          className="h-8 w-full rounded border border-white/15 bg-white/5 px-2 text-xs"
          value={row.status || 'Pending'}
          onChange={(e) => void actions.onPatch(row, { status: e.target.value })}
        >
          {PRODUCTION_TABLE_STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ),
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
      render: (row) => <AgentsCell row={row} onPatch={actions.onPatch} />,
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
      width: 240,
      searchable: true,
      value: (row) => row.advance_first_date || '',
      render: (row) => (
        <div className="text-center text-xs">{`${formatDate(row.advance_first_date)} / -`}</div>
      ),
    },
    {
      key: 'policy',
      label: 'POLICY DETAILS',
      width: 360,
      searchable: true,
      value: (row) =>
        `${row.policy_company || ''} ${row.policy_product || ''} ${row.policy_other_product || ''} ${row.policy_number || ''}`,
      render: (row) => <PolicyCell row={row} onPatch={actions.onPatch} />,
    },
    {
      key: 'delivery',
      label: 'DELIVERY STATUS',
      width: 160,
      sortable: true,
      searchable: true,
      align: 'center',
      value: (row) => row.delivery,
      render: (row) => (
        <select
          className="h-8 w-full rounded border border-white/15 bg-white/5 px-2 text-xs"
          value={row.delivery || 'Pending'}
          onChange={(e) => void actions.onPatch(row, { delivery: e.target.value })}
        >
          {PRODUCTION_TABLE_DELIVERY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'notes',
      label: 'NOTES',
      width: 320,
      searchable: true,
      value: (row) => row.notes,
      render: (row) => (
        <textarea
          className=" w-full rounded border border-white/15 bg-white/5 p-2 text-xs"
          value={row.notes || ''}
          placeholder="Add notes..."
          onChange={(e) => void actions.onPatch(row, { notes: e.target.value })}
        />
      ),
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
              status: e.target.checked ? 'Trial' : row.status,
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
      value: (row) => toYesNo(row.chargeback),
      render: (row) => (
        <input
          type="checkbox"
          checked={row.chargeback}
          onChange={(e) =>
            void actions.onPatch(row, {
              chargeback: e.target.checked,
              status: e.target.checked ? 'Chargeback' : row.status,
            })
          }
        />
      ),
    },
    {
      key: 'actions',
      label: 'ACTION',
      width: 140,
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-2">
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
