import { useState } from 'react';

import type { MetricsRow, MetricsSection, StepMeta } from '../types';
import { rate } from './format';

interface Column {
  key: string;
  label: string;
  value: (row: MetricsRow) => number;
}

interface RowsTableProps {
  rows: MetricsRow[];
  steps: StepMeta[];
  section: MetricsSection;
  title: string;
  onOpen: (row: MetricsRow) => void;
}

/**
 * The next level down (SMDs, agents or prospects). Click a column header to
 * sort, a row to drill in.
 */
export function RowsTable({ rows, steps, section, title, onOpen }: RowsTableProps) {
  const [sortKey, setSortKey] = useState('total');
  const [descending, setDescending] = useState(true);
  const stepLabel: Record<string, string> = Object.fromEntries(steps.map((step) => [step.key, step.label]));
  const isProspect = rows[0]?.kind === 'prospect';

  const columns: Column[] = [
    { key: 'total', label: 'Total', value: (row) => row.total },
    { key: 's1', label: 'Step 1', value: (row) => row.steps.step_1?.booked ?? 0 },
    { key: 's1_showed', label: 'S1 showed', value: (row) => row.steps.step_1?.showed ?? 0 },
    { key: 'fu1', label: 'FU 1', value: (row) => row.steps.follow_up_1?.booked ?? 0 },
    { key: 'fu1_showed', label: 'FU1 showed', value: (row) => row.steps.follow_up_1?.showed ?? 0 },
    { key: 's2', label: 'Step 2', value: (row) => row.steps.step_2?.booked ?? 0 },
    { key: 's3', label: 'Step 3', value: (row) => row.steps.step_3?.booked ?? 0 },
    { key: 'showed', label: 'Showed', value: (row) => row.showed },
    { key: 'fna', label: 'FNA', value: (row) => row.outcomes.fna },
    { key: 'ama', label: 'AMA', value: (row) => row.outcomes.ama },
    { key: 'sale', label: 'Sale', value: (row) => row.outcomes.sale },
    { key: 'pending', label: 'Form pending', value: (row) => row.overall.result_pending },
    ...(section === 'REQUEST_TRAINER'
      ? [{ key: 'unanswered', label: 'No trainer', value: (row: MetricsRow) => row.overall.no_trainer + row.overall.not_accepted }]
      : []),
  ];

  const sortColumn = columns.find((candidate) => candidate.key === sortKey) ?? columns[0];
  const sorted = [...rows].sort((a, b) => {
    const delta = sortColumn.value(b) - sortColumn.value(a);
    return descending ? delta : -delta;
  });

  function sortBy(key: string) {
    if (key === sortKey) setDescending(!descending);
    else {
      setSortKey(key);
      setDescending(true);
    }
  }

  if (!rows.length) return <p className="mm-empty">No appointments in this window.</p>;

  return (
    <div className="mm-table-wrap">
      <table className="mm-table mm-table--clickable">
        <thead>
          <tr>
            <th>{title}</th>
            {columns.map((column) => (
              <th key={column.key} onClick={() => sortBy(column.key)} className="mm-sortable">
                {column.label}
                {sortKey === column.key ? (descending ? ' ↓' : ' ↑') : ''}
              </th>
            ))}
            <th>{isProspect ? 'Furthest step' : 'AMA rate'}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={`${row.kind}-${row.id ?? 'none'}`} onClick={() => onOpen(row)}>
              <td>
                <strong>{row.name}</strong>
                {row.agency_code && <small className="mm-code">{row.agency_code}</small>}
                {row.kind === 'smd' && <small className="mm-sub">{row.agents} agents</small>}
              </td>
              {columns.map((column) => (
                <td key={column.key}>{column.value(row)}</td>
              ))}
              <td>
                {isProspect
                  ? (row.furthest_step ? stepLabel[row.furthest_step] : '—')
                  : rate(row.rates.ama)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
