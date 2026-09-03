/**
 * API layer for the unauthenticated public event surface (Phase 2).
 *
 * Deliberately separate from `event-service.ts` and `order-service.ts`: those
 * throw when `wb.authToken` is missing, which is the normal state for a guest
 * on `/event/:shortcut`. Nothing here ever sends an Authorization header.
 *
 * All routes are under `/api/events/public/`. Note the events router is mounted
 * at `/api/events/`, so authenticated event URLs have a doubled segment
 * (`/api/events/events/...`) while these public ones do not.
 */

import type {
  CheckoutPayload,
  CheckoutResult,
  ClaimProof,
  ClaimResult,
  PromoPreview,
  PublicAssignPayload,
  PublicEvent,
  PublicOrderStatus,
  PublicTicket,
  PublicTransferPayload,
} from '../types/public';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const PUBLIC_BASE = '/api/events/public';

/** Thrown for non-2xx responses, carrying the HTTP status for callers to branch on. */
export class PublicApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'PublicApiError';
    this.status = status;
  }
}

/** Extract the most useful message from a DRF error body. */
async function parseError(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status})`;
  const data = (await response.json().catch(() => null)) as unknown;
  if (!data || typeof data !== 'object') return fallback;

  if ('detail' in data) {
    const detail = (data as { detail?: unknown }).detail;
    if (Array.isArray(detail)) return detail.join(', ');
    if (typeof detail === 'string') return detail;
  }

  const firstFieldError = Object.entries(data as Record<string, unknown>).find(
    ([, value]) => Array.isArray(value) || typeof value === 'string',
  );
  if (!firstFieldError) return fallback;
  const [field, value] = firstFieldError;
  return Array.isArray(value) ? `${field}: ${value.join(', ')}` : `${field}: ${value}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw new PublicApiError(await parseError(response), response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export const publicEventService = {
  /** Load a published event's full landing payload. 404s for drafts. */
  getEvent(shortcut: string): Promise<PublicEvent> {
    return request(`${PUBLIC_BASE}/${shortcut}/`);
  },

  /**
   * Preview a promo code's effect.
   *
   * Resolves (not rejects) for an unknown or expired code — check `valid`.
   */
  validatePromo(shortcut: string, code: string, quantity: number): Promise<PromoPreview> {
    return post(`${PUBLIC_BASE}/${shortcut}/validate-promo/`, { code, quantity });
  },

  /**
   * Create a guest order and its Stripe PaymentIntent.
   *
   * The returned `client_secret` must then be confirmed client-side. Tickets are
   * issued by the webhook afterwards, so poll `getOrderStatus`.
   */
  checkout(shortcut: string, payload: CheckoutPayload): Promise<CheckoutResult> {
    return post(`${PUBLIC_BASE}/${shortcut}/checkout/`, payload);
  },

  /** Read an order's payment status and any tickets issued for it. */
  getOrderStatus(shortcut: string, orderUuid: string): Promise<PublicOrderStatus> {
    return request(`${PUBLIC_BASE}/${shortcut}/order/${orderUuid}/`);
  },

  /** Load the hosted ticket page for a QR token. */
  getTicket(qrToken: string): Promise<PublicTicket> {
    return request(`${PUBLIC_BASE}/ticket/${qrToken}/`);
  },

  /** Exchange an email + invoice number for that order's tickets. */
  claimTickets(shortcut: string, proof: ClaimProof): Promise<ClaimResult> {
    return post(`${PUBLIC_BASE}/${shortcut}/claim-tickets/`, proof);
  },

  /** Name the attendee on a claimed ticket. Returns the refreshed claim. */
  assignTicket(shortcut: string, payload: PublicAssignPayload): Promise<ClaimResult> {
    return post(`${PUBLIC_BASE}/${shortcut}/assign-ticket/`, payload);
  },

  /** Hand a claimed ticket to someone else. Returns the refreshed claim. */
  transferTicket(
    shortcut: string,
    payload: PublicTransferPayload,
  ): Promise<ClaimResult> {
    return post(`${PUBLIC_BASE}/${shortcut}/transfer-ticket/`, payload);
  },

  /** Submit an attendee question to the organizer (no login required). */
  submitQuestion(
    shortcut: string,
    payload: { name: string; email: string; phone?: string; subject?: string; message: string },
  ): Promise<{ id: number; uuid: string; status: string }> {
    return post(`${PUBLIC_BASE}/${shortcut}/questions/`, payload);
  },
};
