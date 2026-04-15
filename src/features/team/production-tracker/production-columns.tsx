import type { TrackerTableColumn } from '@/shared/components';
import type { ProductionTrackerRecord } from './services/production-tracker-service';

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

function toYesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}

function renderCheckbox(value: boolean) {
  return <input type="checkbox" checked={value} readOnly disabled aria-label={value ? 'Checked' : 'Unchecked'} />;
}

function compactText(value: string, maxLength = 70): string {
  if (!value) return '-';
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

export function buildProductionColumns(): TrackerTableColumn<ProductionTrackerRecord>[] {
  return [
    {
      key: 'status',
      label: 'POLICY STATUS',
      width: 140,
      sortable: true,
      searchable: true,
      align: 'center',
      value: (row) => row.status,
    },
    {
      key: 'date_written',
      label: 'DATE WRITTEN',
      width: 140,
      sortable: true,
      searchable: true,
      align: 'center',
      value: (row) => row.date_written || '',
      render: (row) => formatDate(row.date_written),
    },
    {
      key: 'closure_date',
      label: 'CLOSURE DATE',
      width: 140,
      sortable: true,
      searchable: true,
      align: 'center',
      value: (row) => row.closure_date || '',
      render: (row) => formatDate(row.closure_date),
    },
    {
      key: 'client_name',
      label: 'CLIENT',
      width: 220,
      sortable: true,
      searchable: true,
      value: (row) => row.client_name,
    },
    {
      key: 'agents',
      label: 'AGENTS',
      width: 260,
      searchable: true,
      value: (row) => `${row.agent_1_name || ''} ${row.agent_2_name || ''}`.trim(),
      render: (row) => {
        const primary = row.agent_1_name || '-';
        const splitLabel = row.split_mode === 'split' ? 'split' : 'solo';
        if (!row.agent_2_name) {
          return `${primary} (${row.agent_1_pct}%, ${splitLabel})`;
        }
        return `${row.agent_1_name} (${row.agent_1_pct}%) / ${row.agent_2_name} (${row.agent_2_pct}%)`;
      },
    },
    {
      key: 'points',
      label: 'POINTS / 40% / 60%',
      width: 240,
      searchable: true,
      value: (row) => `${row.points_target ?? ''} ${row.points_forty ?? ''} ${row.points_sixty ?? ''}`,
      render: (row) =>
        `${formatPoint(row.points_target)} / ${formatPoint(row.points_forty)} / ${formatPoint(row.points_sixty)}`,
    },
    {
      key: 'advances',
      label: 'ADVANCES (1st / 2nd)',
      width: 240,
      searchable: true,
      value: (row) => row.advance_first_date || '',
      render: (row) => `${formatDate(row.advance_first_date)} / -`,
    },
    {
      key: 'policy',
      label: 'POLICY DETAILS',
      width: 360,
      searchable: true,
      value: (row) =>
        `${row.policy_company || ''} ${row.policy_product || ''} ${row.policy_other_product || ''} ${row.policy_number || ''}`,
      render: (row) => {
        const product = row.policy_product || row.policy_other_product || '-';
        const company = row.policy_company || '-';
        const number = row.policy_number || '-';
        return `${company} | ${product} | #${number}`;
      },
    },
    {
      key: 'delivery',
      label: 'DELIVERY STATUS',
      width: 160,
      sortable: true,
      searchable: true,
      align: 'center',
      value: (row) => row.delivery,
      render: (row) => row.delivery || '-',
    },
    {
      key: 'notes',
      label: 'NOTES',
      width: 320,
      searchable: true,
      value: (row) => row.notes,
      render: (row) => compactText(row.notes),
    },
    {
      key: 'trial_app',
      label: 'TRIAL APP',
      width: 120,
      sortable: true,
      searchable: true,
      align: 'center',
      value: (row) => toYesNo(row.trial_app),
      render: (row) => renderCheckbox(row.trial_app),
    },
    {
      key: 'chargeback',
      label: 'CHARGE BACK',
      width: 140,
      sortable: true,
      searchable: true,
      align: 'center',
      value: (row) => toYesNo(row.chargeback),
      render: (row) => renderCheckbox(row.chargeback),
    },
    {
      key: 'actions',
      label: 'ACTION',
      width: 140,
      align: 'center',
      render: () => '-',
    },
  ];
}
