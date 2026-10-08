import type { CSSProperties, ReactNode } from 'react';
import { Check } from 'lucide-react';

import type { CountMode, MetricsRow, MetricsSection, StepMeta } from '../types';
import { MIN_SAMPLE as MIN_RATED, OUTCOME_LABELS, bestOutcome, outcomeSegment, rate } from './format';

/** Which column the table is sorted by; owned by the page so other panels can set it. */
export interface RowSort {
  key: string;
  descending: boolean;
}

interface Column {
  key: string;
  label: string;
  title?: string;
  /** Sort value; a column without one is not sortable. */
  value?: (row: MetricsRow) => number;
  render: (row: MetricsRow) => ReactNode;
  /** Rows below `MIN_RATED` sort last in either direction (a 3-of-3 row must not top a rate sort). */
  lowLast?: boolean;
  /** Extra cell props (heat shading, alignment). */
  cell?: (row: MetricsRow) => { className?: string; style?: CSSProperties; title?: string };
}

interface RowsTableProps {
  rows: MetricsRow[];
  sort: RowSort;
  onSortChange: (sort: RowSort) => void;
  steps: StepMeta[];
  section: MetricsSection;
  mode: CountMode;
  /** Show the per-step count columns as well as the summary. */
  detailed: boolean;
  title: string;
  onOpen: (row: MetricsRow) => void;
}

const RANK_COUNT = 3;

const count = (value: (row: MetricsRow) => number) => ({ value, render: (row: MetricsRow) => value(row).toLocaleString() });

function rateColumn(key: string, label: string, pick: (row: MetricsRow) => number | null): Column {
  return {
    key,
    label,
    title: `${label} of booked`,
    lowLast: true,
    value: (row) => pick(row) ?? -1,
    render: (row) => rate(pick(row)),
    cell: (row) => {
      const value = pick(row);
      if (row.total < MIN_RATED) return { className: 'mm-lown', title: `Only ${row.total} booked, too few to compare` };
      return { className: 'mm-heat', style: { '--heat': value ?? 0 } as CSSProperties };
    },
  };
}

/** Five bars, each a share of this row's booked: booked, showed, FNA, AMA, sale. */
function MiniFunnel({ row }: { row: MetricsRow }) {
  const values = [row.total, row.showed, row.outcomes.fna, row.outcomes.ama, row.outcomes.sale];
  const top = Math.max(row.total, 1);
  const label = `Booked ${row.total}, showed ${row.showed}, FNA ${row.outcomes.fna}, AMA ${row.outcomes.ama}, sales ${row.outcomes.sale}`;
  return (
    <svg className="mm-spark" viewBox="0 0 54 20" role="img" aria-label={label}>
      <title>{label}</title>
      {values.map((value, index) => {
        const height = value ? Math.max((Math.min(value, top) / top) * 20, 2) : 0;
        return (
          <rect
            key={index}
            x={index * 11}
            y={20 - height}
            width={8}
            height={height}
            rx={1.5}
            className={index === 0 ? 'mm-spark-base' : undefined}
          />
        );
      })}
    </svg>
  );
}

/** One dot per step, filled with that step's best outcome; hollow when not booked. */
function StepDots({ row, steps }: { row: MetricsRow; steps: StepMeta[] }) {
  const shown = steps.filter((step) => !step.historical || row.steps[step.key]?.booked);
  const furthest = steps.find((step) => step.key === row.furthest_step);
  return (
    <span className="mm-dots">
      {shown.map((step) => {
        const outcome = row.steps[step.key] ? bestOutcome(row.steps[step.key]) : null;
        const tip = `${step.label}: ${outcome ? OUTCOME_LABELS[outcome] : 'not booked'}`;
        return <i key={step.key} title={tip} aria-label={tip} className={outcome ? `mm-o--${outcomeSegment(outcome)}` : ''} />;
      })}
      <small>{furthest?.label ?? '—'}</small>
    </span>
  );
}

/** A yes/no outcome for one prospect: a tick, or the count when it happened more than once. */
function Tick({ value }: { value: number }) {
  if (!value) return <span className="mm-tick" aria-label="No">·</span>;
  return (
    <span className="mm-tick is-yes" aria-label={value > 1 ? String(value) : 'Yes'}>
      {value > 1 ? value : <Check size={14} aria-hidden="true" />}
    </span>
  );
}

/**
 * The next level down (SMDs, agents or prospects). Summary columns by
 * default; `detailed` adds the per-step counts. Click a header to sort, a
 * row to drill in.
 */
export function RowsTable({ rows, sort, onSortChange, steps, section, mode, detailed, title, onOpen }: RowsTableProps) {
  const isProspect = rows[0]?.kind === 'prospect';
  const maxTotal = Math.max(...rows.map((row) => row.total), 1);
  const stepIndex = (key?: string | null) => steps.findIndex((step) => step.key === key);

  const problems: Column[] = [
    {
      key: 'pending',
      label: 'Form pending',
      ...count((row) => row.overall.result_pending),
      cell: (row) => (row.overall.result_pending ? { className: 'mm-flagged mm-flagged--pending' } : {}),
    },
    ...(section === 'REQUEST_TRAINER'
      ? [{
          key: 'unanswered',
          label: 'No trainer',
          ...count((row: MetricsRow) => row.overall.no_trainer + row.overall.not_accepted),
          cell: (row: MetricsRow) =>
            row.overall.no_trainer + row.overall.not_accepted ? { className: 'mm-flagged mm-flagged--unanswered' } : {},
        }]
      : []),
  ];

  const booked: Column = {
    key: 'total',
    label: 'Booked',
    value: (row) => row.total,
    render: (row) => (
      <span className="mm-cell-bar">
        <span aria-hidden="true">
          <i style={{ width: `${(row.total / maxTotal) * 100}%` }} />
        </span>
        <b>{row.total.toLocaleString()}</b>
      </span>
    ),
  };

  const summary: Column[] = isProspect
    ? [
        {
          key: 'journey',
          label: 'Steps',
          title: 'Best outcome per step; the label is the furthest step booked',
          value: (row) => stepIndex(row.furthest_step),
          render: (row) => <StepDots row={row} steps={steps} />,
        },
        ...(mode === 'appointments' ? [booked] : []),
        { key: 'showed', label: 'Showed', value: (row) => row.showed, render: (row) => <Tick value={row.showed} /> },
        { key: 'fna', label: 'FNA', value: (row) => row.outcomes.fna, render: (row) => <Tick value={row.outcomes.fna} /> },
        { key: 'ama', label: 'AMA', value: (row) => row.outcomes.ama, render: (row) => <Tick value={row.outcomes.ama} /> },
        { key: 'sale', label: 'Sale', value: (row) => row.outcomes.sale, render: (row) => <Tick value={row.outcomes.sale} /> },
        ...problems,
      ]
    : [
        booked,
        { key: 'shape', label: 'Shape', title: 'Booked → showed → FNA → AMA → sale, as a share of booked', render: (row) => <MiniFunnel row={row} /> },
        rateColumn('show_rate', 'Show %', (row) => row.rates.show),
        rateColumn('fna_rate', 'FNA %', (row) => row.rates.fna),
        rateColumn('ama_rate', 'AMA %', (row) => row.rates.ama),
        { key: 'sale', label: 'Sales', ...count((row) => row.outcomes.sale) },
        ...problems,
      ];

  const detail: Column[] = detailed
    ? [
        { key: 's1', label: 'Step 1', ...count((row) => row.steps.step_1?.booked ?? 0) },
        { key: 's1_showed', label: 'S1 showed', ...count((row) => row.steps.step_1?.showed ?? 0) },
        { key: 'fu1', label: 'FU 1', ...count((row) => row.steps.follow_up_1?.booked ?? 0) },
        { key: 'fu1_showed', label: 'FU1 showed', ...count((row) => row.steps.follow_up_1?.showed ?? 0) },
        { key: 's2', label: 'Step 2', ...count((row) => row.steps.step_2?.booked ?? 0) },
        { key: 's3', label: 'Step 3', ...count((row) => row.steps.step_3?.booked ?? 0) },
        ...(isProspect
          ? []
          : [
              { key: 'showed', label: 'Showed', ...count((row: MetricsRow) => row.showed) },
              { key: 'fna', label: 'FNA', ...count((row: MetricsRow) => row.outcomes.fna) },
              { key: 'ama', label: 'AMA', ...count((row: MetricsRow) => row.outcomes.ama) },
            ]),
      ]
    : [];

  const columns = [...summary, ...detail];
  const sortable = columns.filter((column) => column.value);
  const sortColumn = sortable.find((column) => column.key === sort.key) ?? sortable[0];
  const sortValue = sortColumn.value as (row: MetricsRow) => number;
  const sorted = [...rows].sort((a, b) => {
    if (sortColumn.lowLast) {
      const small = Number(a.total < MIN_RATED) - Number(b.total < MIN_RATED);
      if (small) return small;
    }
    const delta = sortValue(b) - sortValue(a);
    return sort.descending ? delta : -delta;
  });

  // Top AMA rates among rows big enough to compare; only worth showing in a real field.
  const ranks = new Map<MetricsRow, number>();
  if (!isProspect) {
    rows
      .filter((row) => row.total >= MIN_RATED && (row.rates.ama ?? 0) > 0)
      .sort((a, b) => (b.rates.ama ?? 0) - (a.rates.ama ?? 0))
      .slice(0, rows.length > RANK_COUNT ? RANK_COUNT : 0)
      .forEach((row, index) => ranks.set(row, index + 1));
  }

  function sortBy(key: string) {
    onSortChange(key === sortColumn.key ? { key, descending: !sort.descending } : { key, descending: true });
  }

  if (!rows.length) return <p className="mm-empty">No appointments in this window.</p>;

  return (
    <div className="mm-table-wrap">
      <table className="mm-table mm-table--clickable mm-rows">
        <thead>
          <tr>
            <th>{title}</th>
            {columns.map((column) => {
              const active = column.value && sortColumn.key === column.key;
              return (
                <th
                  key={column.key}
                  title={column.title}
                  onClick={column.value ? () => sortBy(column.key) : undefined}
                  aria-sort={active ? (sort.descending ? 'descending' : 'ascending') : undefined}
                  className={[column.value && 'mm-sortable', active && 'is-sorted', detail.includes(column) && 'mm-detail']
                    .filter(Boolean)
                    .join(' ')}
                >
                  {column.label}
                  {active ? (sort.descending ? ' ↓' : ' ↑') : ''}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const rank = ranks.get(row);
            return (
              <tr key={`${row.kind}-${row.id ?? 'none'}`} onClick={() => onOpen(row)}>
                <td>
                  <span className="mm-name">
                    {rank && (
                      <span className={`mm-rank mm-rank--${rank}`} title={`#${rank} AMA rate`}>
                        {rank}
                      </span>
                    )}
                    <span>
                      <strong>{row.name}</strong>
                      {row.agency_code && <small className="mm-code">{row.agency_code}</small>}
                      {row.kind === 'smd' && <small className="mm-sub">{row.agents} agents</small>}
                    </span>
                  </span>
                </td>
                {columns.map((column) => {
                  const extra = column.cell?.(row) ?? {};
                  const classes = [
                    extra.className,
                    column.value && sortColumn.key === column.key && 'is-sorted',
                    detail.includes(column) && 'mm-detail',
                  ].filter(Boolean);
                  return (
                    <td key={column.key} className={classes.join(' ') || undefined} style={extra.style} title={extra.title}>
                      {column.render(row)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
