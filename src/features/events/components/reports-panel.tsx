import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, CardContent, Text } from '@shared/components';
import { useToastStore } from '@/store';
import { formatPrice } from '../utils/public-pricing';
import { orderService } from '../services/order-service';
import { postSaleService } from '../services/post-sale-service';
import type { AddOnStatsRow, SmdBreakdownRow } from '../types/reports';
import type { EscrowReport } from '../types/post-sale';

interface ReportsPanelProps {
  eventId: number;
  currency: string;
  shortcut: string;
  onFilterUnassigned: () => void;
  onFilterPending: () => void;
}

/** Render a seller's arrivals as a share of their tickets, or `—` with no tickets. */
function formatCheckInRate(row: SmdBreakdownRow): string {
  if (row.ticket_count === 0) return '—';
  return `${Math.round(((row.checked_in_count ?? 0) / row.ticket_count) * 100)}%`;
}

type SmdSortKey = 'seller' | 'tickets' | 'checked_in' | 'checkin_rate' | 'total';
type SortDirection = 'asc' | 'desc';

/** Sortable SMD breakdown columns; text starts ascending, numbers descending. */
const SMD_COLUMNS: { key: SmdSortKey; label: string; firstDirection: SortDirection }[] = [
  { key: 'seller', label: 'Seller', firstDirection: 'asc' },
  { key: 'tickets', label: 'Tickets', firstDirection: 'desc' },
  { key: 'checked_in', label: 'Checked in', firstDirection: 'desc' },
  { key: 'checkin_rate', label: 'Check-in %', firstDirection: 'desc' },
  { key: 'total', label: 'Total', firstDirection: 'desc' },
];

/** Return a row's attendance as a 0–1 ratio (-1 with no tickets, so they sort below 0%). */
function checkedInRatio(row: SmdBreakdownRow): number {
  return row.ticket_count === 0 ? -1 : (row.checked_in_count ?? 0) / row.ticket_count;
}

/** Compare two rows on one column, ascending; callers break ties by name. */
function compareSmdRows(a: SmdBreakdownRow, b: SmdBreakdownRow, key: SmdSortKey): number {
  switch (key) {
    case 'seller':
      return a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' });
    case 'tickets':
      return a.ticket_count - b.ticket_count;
    case 'checked_in':
      return (a.checked_in_count ?? 0) - (b.checked_in_count ?? 0);
    case 'checkin_rate':
      return (
        checkedInRatio(a) - checkedInRatio(b) ||
        (a.checked_in_count ?? 0) - (b.checked_in_count ?? 0)
      );
    case 'total':
      return Number(a.total) - Number(b.total);
  }
}

/** Sort SMD rows by a column, keeping the Unassigned row last; `null` keeps server order. */
function sortSmdRows(
  rows: SmdBreakdownRow[],
  key: SmdSortKey | null,
  direction: SortDirection,
): SmdBreakdownRow[] {
  if (key === null) return rows;
  const sign = direction === 'asc' ? 1 : -1;
  const assigned = rows.filter((row) => row.seller_id !== null);
  const unassigned = rows.filter((row) => row.seller_id === null);
  const sorted = [...assigned].sort(
    (a, b) =>
      sign * compareSmdRows(a, b, key) ||
      a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' }),
  );
  return [...sorted, ...unassigned];
}

/** Event-wide ticket and arrival totals across every SMD row, Unassigned included. */
interface SmdTotals {
  tickets: number;
  checkedIn: number;
}

/** Sum tickets and arrivals over the SMD rows. */
function sumSmdRows(rows: SmdBreakdownRow[]): SmdTotals {
  return rows.reduce<SmdTotals>(
    (acc, row) => ({
      tickets: acc.tickets + row.ticket_count,
      checkedIn: acc.checkedIn + (row.checked_in_count ?? 0),
    }),
    { tickets: 0, checkedIn: 0 },
  );
}

/** SMD breakdown + add-on stats, with Excel export actions. */
export function ReportsPanel({
  eventId,
  currency,
  shortcut,
  onFilterUnassigned,
  onFilterPending,
}: ReportsPanelProps) {
  const addToast = useToastStore((state) => state.addToast);
  const [smd, setSmd] = useState<SmdBreakdownRow[]>([]);
  const [smdSort, setSmdSort] = useState<{ key: SmdSortKey | null; direction: SortDirection }>({
    key: null,
    direction: 'desc',
  });
  const sortedSmd = useMemo(
    () => sortSmdRows(smd, smdSort.key, smdSort.direction),
    [smd, smdSort],
  );
  const smdTotals = useMemo(() => sumSmdRows(smd), [smd]);
  /** Overall rate (all arrivals / all tickets), so big SMDs weigh more than a mean of row %s. */
  const smdCheckInRate =
    smdTotals.tickets === 0 ? '—' : `${Math.round((smdTotals.checkedIn / smdTotals.tickets) * 100)}%`;

  /** Sort by a column; clicking the active column flips its direction. */
  const sortSmdBy = (key: SmdSortKey) => {
    setSmdSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: SMD_COLUMNS.find((col) => col.key === key)?.firstDirection ?? 'desc' },
    );
  };
  const [addons, setAddons] = useState<AddOnStatsRow[]>([]);
  const [escrow, setEscrow] = useState<EscrowReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [smdRows, addonRows, escrowRow] = await Promise.all([
        orderService.getSmdBreakdown(eventId),
        orderService.getAddonsStats(eventId),
        postSaleService.escrowReport(eventId),
      ]);
      setSmd(smdRows);
      setAddons(addonRows);
      setEscrow(escrowRow);
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to load reports',
      });
    } finally {
      setLoading(false);
    }
  }, [eventId, addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const download = async (kind: 'orders' | 'tickets' | 'smd') => {
    try {
      if (kind === 'orders') await orderService.exportOrders(eventId, shortcut);
      else if (kind === 'tickets') await orderService.exportTickets(eventId, shortcut);
      else await orderService.exportSmdBreakdown(eventId, shortcut);
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Export failed',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Text className="font-medium">Reports</Text>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onFilterPending}>
            Pending transactions
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onFilterUnassigned}>
            Unassigned SMD
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void download('orders')}>
            Export orders
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void download('tickets')}>
            Export tickets
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void download('smd')}>
            Export SMD
          </Button>
        </div>
      </div>

      {loading ? (
        <Text variant="muted">Loading reports…</Text>
      ) : (
        <div className="space-y-4">
        {escrow ? (
          <Card>
            <CardContent className="p-4">
              <Text className="mb-3 font-medium">Escrow &amp; finance (reporting only)</Text>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  { label: 'Escrow balance', value: escrow.escrow_balance },
                  { label: 'Collected', value: escrow.collected },
                  { label: 'Pending', value: escrow.pending },
                  { label: 'Projected', value: escrow.projected },
                  { label: 'Refunded', value: escrow.refunded },
                ].map((cell) => (
                  <div key={cell.label} className="rounded-md border border-slate-200 p-3 dark:border-white/10">
                    <Text variant="muted" className="text-xs uppercase tracking-wide">
                      {cell.label}
                    </Text>
                    <Text className="mt-1 text-lg font-semibold">
                      {formatPrice(cell.value, escrow.currency)}
                    </Text>
                  </div>
                ))}
              </div>
              <Text variant="muted" className="mt-3 text-xs">
                {escrow.pending_count} pending · {escrow.unassigned_smd_count} unassigned-SMD ·{' '}
                {escrow.order_count} orders. Escrow tracks Stripe funds held pending SMD payout — no
                money moves here.
              </Text>
            </CardContent>
          </Card>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <Text className="mb-3 font-medium">SMD breakdown</Text>
              {smd.length === 0 ? (
                <Text variant="muted" className="text-sm">
                  No settled orders yet.
                </Text>
              ) : (
                <>
                  <dl className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    {[
                      { label: 'Total tickets', value: smdTotals.tickets.toLocaleString() },
                      { label: 'Total checked in', value: smdTotals.checkedIn.toLocaleString() },
                      { label: 'Avg check-in %', value: smdCheckInRate },
                    ].map((stat) => (
                      <div key={stat.label} className="flex items-baseline gap-1.5">
                        <dt className="text-slate-500">{stat.label}</dt>
                        <dd className="font-semibold">{stat.value}</dd>
                      </div>
                    ))}
                  </dl>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                      {SMD_COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          scope="col"
                          className="py-1"
                          aria-sort={
                            smdSort.key === col.key
                              ? smdSort.direction === 'asc'
                                ? 'ascending'
                                : 'descending'
                              : 'none'
                          }
                        >
                          <button
                            type="button"
                            className="uppercase tracking-wide hover:text-slate-700 dark:hover:text-white/80"
                            onClick={() => sortSmdBy(col.key)}
                          >
                            {col.label}
                            {smdSort.key === col.key ? (smdSort.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSmd.map((row) => (
                      <tr key={row.seller_id ?? 'unassigned'} className="border-t border-slate-100 dark:border-white/10">
                        <td className="py-1.5">
                          {row.display_name}
                          {row.agent_code ? (
                            <span className="ml-1 text-xs text-slate-500">{row.agent_code}</span>
                          ) : null}
                          {row.team_name ? (
                            <Badge variant="outline" className="ml-2">
                              {row.team_name}
                            </Badge>
                          ) : null}
                        </td>
                        <td className="py-1.5">{row.ticket_count}</td>
                        <td className="py-1.5">{row.checked_in_count ?? 0}</td>
                        <td className="py-1.5">{formatCheckInRate(row)}</td>
                        <td className="py-1.5">{formatPrice(row.total, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <Text className="mb-3 font-medium">Add-ons</Text>
              {addons.length === 0 ? (
                <Text variant="muted" className="text-sm">
                  No add-on sales yet.
                </Text>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-1">Product</th>
                      <th className="py-1">Sold</th>
                      <th className="py-1">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addons.map((row) => (
                      <tr key={row.add_on_id} className="border-t border-slate-100 dark:border-white/10">
                        <td className="py-1.5">{row.product_name}</td>
                        <td className="py-1.5">{row.quantity_sold}</td>
                        <td className="py-1.5">{formatPrice(row.revenue, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      )}
    </div>
  );
}
