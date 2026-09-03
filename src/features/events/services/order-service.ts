import type {
  EventOrder,
  EventOrderListItem,
  OrderCreatePayload,
  OrderFilters,
  OrderUpdatePayload,
} from '../types/order';
import type {
  EventTicket,
  AssignHolderPayload,
  TransferPayload,
  TicketHistory,
  MyTicketsResponse,
} from '../types/ticket';
import type { PaginatedResponse } from '../types/event';
import type { AddOnStatsRow, ReportSummary, SmdBreakdownRow, TicketSummary } from '../types/reports';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Nested collection lives under the events resource; flat detail/actions live
// under /api/events/orders/ and /api/events/tickets/.
const EVENTS_BASE = '/api/events/events';
const ORDERS_BASE = '/api/events/orders';
const TICKETS_BASE = '/api/events/tickets';

function authHeaders(isJson = true): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
    ...(isJson ? { 'Content-Type': 'application/json' } : {}),
  };
}

async function parseError(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status})`;
  const data = (await response.json().catch(() => null)) as unknown;
  if (!data || typeof data !== 'object') return fallback;
  if ('detail' in data) {
    const detail = (data as { detail?: unknown }).detail;
    if (Array.isArray(detail)) return detail.join(', ');
    if (typeof detail === 'string') return detail;
  }
  const firstFieldError = Object.entries(data as Record<string, unknown>).find(([, value]) => {
    return Array.isArray(value) || typeof value === 'string';
  });
  if (!firstFieldError) return fallback;
  const [field, value] = firstFieldError;
  return Array.isArray(value) ? `${field}: ${value.join(', ')}` : `${field}: ${value}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(init?.body !== undefined), ...init?.headers },
  });
  if (!response.ok) throw new Error(await parseError(response));
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function buildQuery(
  params: Record<string, string | number | boolean | undefined | null> | object,
): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  return entries.length
    ? '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()
    : '';
}

async function downloadBlob(path: string, fallbackName: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: authHeaders(false) });
  if (!response.ok) throw new Error(await parseError(response));
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function openPdf(path: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: authHeaders(false) });
  if (!response.ok) throw new Error(await parseError(response));
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
}

export const orderService = {
  listOrders(
    eventId: number,
    filters: OrderFilters = {},
  ): Promise<PaginatedResponse<EventOrderListItem>> {
    return request(`${EVENTS_BASE}/${eventId}/orders/${buildQuery(filters)}`);
  },

  getOrder(orderId: number): Promise<EventOrder> {
    return request(`${ORDERS_BASE}/${orderId}/`);
  },

  createOrder(eventId: number, payload: OrderCreatePayload): Promise<EventOrder> {
    return request(`${EVENTS_BASE}/${eventId}/orders/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateOrder(orderId: number, payload: OrderUpdatePayload): Promise<EventOrder> {
    return request(`${ORDERS_BASE}/${orderId}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  refundOrder(orderId: number): Promise<EventOrder> {
    return request(`${ORDERS_BASE}/${orderId}/refund/`, { method: 'POST' });
  },

  cancelOrder(orderId: number): Promise<EventOrder> {
    return request(`${ORDERS_BASE}/${orderId}/cancel/`, { method: 'POST' });
  },

  resendConfirmation(orderId: number): Promise<{ detail: string }> {
    return request(`${ORDERS_BASE}/${orderId}/resend-confirmation/`, { method: 'POST' });
  },

  resendConfirmations(
    eventId: number,
    filters: OrderFilters = {},
  ): Promise<{ queued: number }> {
    return request(
      `${EVENTS_BASE}/${eventId}/orders/resend-confirmations/${buildQuery(filters)}`,
      { method: 'POST' },
    );
  },

  openOrderPdf(orderId: number): Promise<void> {
    return openPdf(`${ORDERS_BASE}/${orderId}/pdf/`);
  },

  assignTicket(ticketId: number, payload: AssignHolderPayload): Promise<EventTicket> {
    return request(`${TICKETS_BASE}/${ticketId}/assign/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  transferTicket(ticketId: number, payload: TransferPayload): Promise<EventTicket> {
    return request(`${TICKETS_BASE}/${ticketId}/transfer/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getTicketHistory(ticketId: number): Promise<TicketHistory> {
    return request(`${TICKETS_BASE}/${ticketId}/history/`);
  },

  openTicketPdf(ticketId: number): Promise<void> {
    return openPdf(`${TICKETS_BASE}/${ticketId}/pdf/`);
  },

  getMyTickets(eventId: number): Promise<MyTicketsResponse> {
    return request(`${EVENTS_BASE}/${eventId}/my-tickets/`);
  },

  getTicketSummary(eventId: number): Promise<TicketSummary> {
    return request(`${EVENTS_BASE}/${eventId}/ticket-summary/`);
  },

  getReportSummary(eventId: number): Promise<ReportSummary> {
    return request(`${EVENTS_BASE}/${eventId}/reports/summary/`);
  },

  getSmdBreakdown(eventId: number): Promise<SmdBreakdownRow[]> {
    return request(`${EVENTS_BASE}/${eventId}/reports/smd-breakdown/`);
  },

  getAddonsStats(eventId: number): Promise<AddOnStatsRow[]> {
    return request(`${EVENTS_BASE}/${eventId}/reports/addons-stats/`);
  },

  exportOrders(eventId: number, shortcut: string): Promise<void> {
    return downloadBlob(`${EVENTS_BASE}/${eventId}/exports/orders/`, `${shortcut}-orders.xlsx`);
  },

  exportTickets(eventId: number, shortcut: string): Promise<void> {
    return downloadBlob(`${EVENTS_BASE}/${eventId}/exports/tickets/`, `${shortcut}-tickets.xlsx`);
  },

  exportSmdBreakdown(eventId: number, shortcut: string): Promise<void> {
    return downloadBlob(
      `${EVENTS_BASE}/${eventId}/exports/smd-breakdown/`,
      `${shortcut}-smd-breakdown.xlsx`,
    );
  },
};
