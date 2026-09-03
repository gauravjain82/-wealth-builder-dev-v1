import { useCallback, useEffect, useState } from 'react';
import type { EventOrder, EventOrderListItem, OrderCreatePayload, OrderFilters, OrderUpdatePayload } from '../types/order';
import type { PaginatedResponse } from '../types/event';
import type { ReportSummary } from '../types/reports';
import { orderService } from '../services/order-service';

/**
 * Loads the nested orders list for an event, plus the dashboard summary.
 *
 * Filters (including page) are held here so table, resend-filtered, and the
 * Unassigned-SMD shortcut all share one query. Mutations call `refetch`.
 */
export function useEventOrders(eventId: number) {
  const [orders, setOrders] = useState<PaginatedResponse<EventOrderListItem> | null>(null);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<OrderFilters>({ page: 1 });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, report] = await Promise.all([
        orderService.listOrders(eventId, filters),
        orderService.getReportSummary(eventId),
      ]);
      setOrders(list);
      setSummary(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [eventId, filters]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const patchFilters = useCallback((patch: Partial<OrderFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  }, []);

  const createOrder = useCallback(
    async (payload: OrderCreatePayload): Promise<EventOrder> => {
      const created = await orderService.createOrder(eventId, payload);
      await fetchOrders();
      return created;
    },
    [eventId, fetchOrders],
  );

  const updateOrder = useCallback(
    async (orderId: number, payload: OrderUpdatePayload): Promise<EventOrder> => {
      const updated = await orderService.updateOrder(orderId, payload);
      await fetchOrders();
      return updated;
    },
    [fetchOrders],
  );

  const refundOrder = useCallback(
    async (orderId: number): Promise<EventOrder> => {
      const updated = await orderService.refundOrder(orderId);
      await fetchOrders();
      return updated;
    },
    [fetchOrders],
  );

  const cancelOrder = useCallback(
    async (orderId: number): Promise<EventOrder> => {
      const updated = await orderService.cancelOrder(orderId);
      await fetchOrders();
      return updated;
    },
    [fetchOrders],
  );

  const resendConfirmation = useCallback(async (orderId: number) => {
    await orderService.resendConfirmation(orderId);
  }, []);

  const resendFiltered = useCallback(async (): Promise<number> => {
    const { queued } = await orderService.resendConfirmations(eventId, filters);
    return queued;
  }, [eventId, filters]);

  return {
    orders,
    summary,
    loading,
    error,
    filters,
    setFilters: patchFilters,
    refetch: fetchOrders,
    createOrder,
    updateOrder,
    refundOrder,
    cancelOrder,
    resendConfirmation,
    resendFiltered,
  };
}
