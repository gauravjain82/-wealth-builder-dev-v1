import { useEffect, useState } from 'react';
import { Button, Card, CardContent, ErrorState, Input, LoadingState, Select, Text } from '@shared/components';
import type { AccountMap, ImportRow, MapRole, Pagination, RowFilters } from '../../types/external-tickets';
import { STATE_LABEL } from './labels';
import { MapCell, Pager } from './shared';

interface TicketRowsTableProps {
  rows: ImportRow[];
  pagination: Pagination | undefined;
  filters: RowFilters;
  loading: boolean;
  error: string | null;
  busyMapId: number | null;
  overrides: Record<number, AccountMap>;
  onFilters: (next: RowFilters) => void;
  onQuickConfirm: (map: AccountMap) => void;
  onReview: (map: AccountMap) => void;
  onOpen: (row: ImportRow) => void;
}

const DEFAULT_FILTERS: RowFilters = { page: 1 };

/**
 * Step 3 — "Individual tickets": confirmation, original holder, transfer
 * recipient, sponsor and each relationship's identity. Filter edits are a
 * draft until Apply; Clear resets to the default view.
 */
export function TicketRowsTable(props: TicketRowsTableProps) {
  const { rows, pagination, filters, loading, error, busyMapId, overrides } = props;
  const [draft, setDraft] = useState<RowFilters>(filters);
  useEffect(() => setDraft(filters), [filters]);
  const dirty = JSON.stringify({ ...draft, page: 1 }) !== JSON.stringify({ ...filters, page: 1 });

  const resolve = (map: AccountMap | null) => (map ? overrides[map.id] ?? map : null);
  const attendeeRole = (row: ImportRow): MapRole => (row.transfer_recipient ? 'transfer_recipient' : 'ticket_holder');

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          props.onFilters({ ...draft, page: 1 });
        }}
      >
        <Input aria-label="Search confirmation or name" placeholder="Confirmation or name" value={draft.q ?? ''} onChange={(e) => setDraft({ ...draft, q: e.target.value })} className="max-w-xs" />
        <Select aria-label="Relationship" value={draft.role ?? ''} onChange={(e) => setDraft({ ...draft, role: e.target.value as MapRole | '' })} className="max-w-[200px]">
          <option value="">Any relationship</option>
          <option value="sponsor">Sponsor</option>
          <option value="ticket_holder">Original holder</option>
          <option value="transfer_recipient">Transfer recipient</option>
        </Select>
        <Select aria-label="Identity state" value={draft.state ?? ''} onChange={(e) => setDraft({ ...draft, state: e.target.value as RowFilters['state'] })} className="max-w-[180px]">
          <option value="">Any identity state</option>
          {Object.entries(STATE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
        <Select aria-label="Planned change" value={draft.action ?? ''} onChange={(e) => setDraft({ ...draft, action: e.target.value as RowFilters['action'] })} className="max-w-[160px]">
          <option value="">Any change</option>
          <option value="create">New</option>
          <option value="update">Changed</option>
          <option value="unchanged">Unchanged</option>
        </Select>
        <Button type="submit" disabled={!dirty}>Apply</Button>
        <Button type="button" variant="outline" onClick={() => props.onFilters(DEFAULT_FILTERS)}>Clear</Button>
      </form>

      {loading && !rows.length ? (
        <LoadingState />
      ) : error ? (
        <ErrorState description={error} />
      ) : rows.length === 0 ? (
        <Text variant="muted">No tickets match these filters.</Text>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead className="sticky top-0 z-10 bg-white text-left dark:bg-slate-900">
                  <tr>
                    <th scope="col" className="px-3 py-2">Confirmation</th>
                    <th scope="col" className="px-3 py-2">Original holder</th>
                    <th scope="col" className="px-3 py-2">Transferred to</th>
                    <th scope="col" className="px-3 py-2">Current attendee identity</th>
                    <th scope="col" className="px-3 py-2">Sponsor</th>
                    <th scope="col" className="px-3 py-2">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100 align-top dark:border-white/5">
                      <td className="px-3 py-2">
                        <button type="button" className="font-mono font-medium underline-offset-4 hover:underline" onClick={() => props.onOpen(row)}>
                          {row.confirmation}
                        </button>
                      </td>
                      <td className="px-3 py-2">{row.original_holder || '—'}</td>
                      <td className="px-3 py-2">{row.transfer_recipient || '—'}</td>
                      <td className="px-3 py-2">
                        <MapCell map={resolve(row.maps[attendeeRole(row)])} busy={busyMapId === row.maps[attendeeRole(row)]?.id} onQuickConfirm={props.onQuickConfirm} onReview={props.onReview} />
                      </td>
                      <td className="px-3 py-2">{row.sponsor || '—'}</td>
                      <td className="px-3 py-2 capitalize">{row.planned_action || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      <Pager pagination={pagination} onPage={(page) => props.onFilters({ ...filters, page })} />
    </div>
  );
}
