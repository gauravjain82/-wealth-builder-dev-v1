import { Card, CardContent, ErrorState, LoadingState, Text } from '@shared/components';
import type { AccountMap, SponsorFilters, SponsorRow, SponsorSummary, Pagination } from '../../types/external-tickets';
import { MapCell, Pager } from './shared';

type SortKey = NonNullable<SponsorFilters['sort']>;

interface SponsorTableProps {
  rows: SponsorRow[];
  summary: SponsorSummary | undefined;
  pagination: Pagination | undefined;
  filters: SponsorFilters;
  loading: boolean;
  error: string | null;
  busyMapId: number | null;
  overrides: Record<number, AccountMap>;
  onFilters: (patch: SponsorFilters) => void;
  onQuickConfirm: (map: AccountMap) => void;
  onReview: (map: AccountMap) => void;
  onOpenSponsor: (name: string) => void;
}

const COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: 'name', label: 'Sponsor (as exported)' },
  { key: 'total', label: 'Tickets' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'agents', label: 'Agents' },
  { key: 'residual', label: 'Not linked to an agent' },
];

/**
 * Step 2 — "Just sponsors": one row per exported sponsor name, analyzed before
 * the repeated ticket rows. Cards sort the ranking; a sponsor opens its tickets.
 */
export function SponsorTable(props: SponsorTableProps) {
  const { rows, summary, pagination, filters, loading, error, busyMapId, overrides } = props;
  const sortBy = (key: SortKey) =>
    props.onFilters({ sort: key, direction: filters.sort === key && filters.direction === 'desc' ? 'asc' : 'desc' });

  const cards: Array<{ label: string; value: string | number; sort: SortKey; help: string }> = [
    { label: 'Top sponsor', value: summary?.top_sponsor ?? '—', sort: 'total', help: 'Most tickets (distinct confirmations).' },
    { label: 'Assigned tickets', value: summary?.assigned_tickets ?? 0, sort: 'assigned', help: 'A person is named in the export — not necessarily a WB account.' },
    { label: 'Assigned agents', value: summary?.assigned_agents ?? 0, sort: 'agents', help: 'Attendee confirmed to a WB account that has an Associate Tracker record.' },
    { label: 'Not linked to an agent', value: summary?.assigned_not_linked_agents ?? 0, sort: 'residual', help: 'Assigned minus agents. Includes people not yet linked — this is not proof they are prospects.' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <button key={card.label} type="button" onClick={() => props.onFilters({ sort: card.sort, direction: 'desc' })} className="text-left" title={card.help}>
            <Card>
              <CardContent className="p-4">
                <Text variant="muted" className="text-xs uppercase tracking-wide">{card.label}</Text>
                <p className="mt-1 truncate text-xl font-semibold">{card.value}</p>
                <Text variant="muted" className="mt-1 text-xs">{card.help}</Text>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {loading && !rows.length ? (
        <LoadingState />
      ) : error ? (
        <ErrorState description={error} />
      ) : rows.length === 0 ? (
        <Text variant="muted">No sponsors in this export.</Text>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="sticky top-0 z-10 bg-white text-left dark:bg-slate-900">
                  <tr>
                    {COLUMNS.map((col) => (
                      <th key={col.key} scope="col" className="px-3 py-2" aria-sort={filters.sort === col.key ? (filters.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                        <button type="button" className="font-semibold" onClick={() => sortBy(col.key)}>
                          {col.label}
                          {filters.sort === col.key ? (filters.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                        </button>
                      </th>
                    ))}
                    <th scope="col" className="px-3 py-2">WB account</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const map = row.sponsor ? overrides[row.sponsor.id] ?? row.sponsor : null;
                    return (
                      <tr key={row.name} className="border-t border-slate-100 align-top dark:border-white/5">
                        <td className="px-3 py-2">
                          <button type="button" className="font-medium underline-offset-4 hover:underline" onClick={() => props.onOpenSponsor(row.name)}>
                            {row.name}
                          </button>
                        </td>
                        <td className="px-3 py-2">{row.total}</td>
                        <td className="px-3 py-2">{row.assigned}</td>
                        <td className="px-3 py-2">{row.agents}</td>
                        <td className="px-3 py-2">{row.residual}</td>
                        <td className="px-3 py-2">
                          <MapCell map={map} busy={busyMapId === map?.id} onQuickConfirm={props.onQuickConfirm} onReview={props.onReview} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      <Pager pagination={pagination} onPage={(page) => props.onFilters({ page })} />
    </div>
  );
}
