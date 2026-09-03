import { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardContent, Text } from '@shared/components';
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
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-1">Seller</th>
                      <th className="py-1">Tickets</th>
                      <th className="py-1">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {smd.map((row) => (
                      <tr key={row.seller_id ?? 'unassigned'} className="border-t border-slate-100 dark:border-white/10">
                        <td className="py-1.5">
                          {row.display_name}
                          {row.agent_code ? (
                            <span className="ml-1 text-xs text-slate-500">{row.agent_code}</span>
                          ) : null}
                        </td>
                        <td className="py-1.5">{row.ticket_count}</td>
                        <td className="py-1.5">{formatPrice(row.total, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
