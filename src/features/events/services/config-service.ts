import type {
  PricingTier,
  EventSpeaker,
  EventProductPartner,
  EventAddOn,
  EventPromoCode,
  EventTrackedSeller,
  EventCustomField,
} from '../types/config';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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

function crudFor<T>(base: (eventId: number) => string) {
  return {
    list(eventId: number): Promise<T[]> {
      return request(`${base(eventId)}`);
    },
    create(eventId: number, payload: Partial<T>): Promise<T> {
      return request(base(eventId), {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    update(eventId: number, itemId: number, payload: Partial<T>): Promise<T> {
      return request(`${base(eventId)}${itemId}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    delete(eventId: number, itemId: number): Promise<void> {
      return request(`${base(eventId)}${itemId}/`, { method: 'DELETE' });
    },
  };
}

// Nested config resources live under /api/events/events/{eventId}/…/.
const eventBase = (id: number) => `/api/events/events/${id}`;

const pricingTiers = crudFor<PricingTier>((id) => `${eventBase(id)}/pricing-tiers/`);
const speakers = crudFor<EventSpeaker>((id) => `${eventBase(id)}/speakers/`);
const partners = crudFor<EventProductPartner>((id) => `${eventBase(id)}/partners/`);
const addOns = crudFor<EventAddOn>((id) => `${eventBase(id)}/add-ons/`);
const promoCodes = crudFor<EventPromoCode>((id) => `${eventBase(id)}/promo-codes/`);
const customFields = crudFor<EventCustomField>((id) => `${eventBase(id)}/custom-fields/`);
const sellers = crudFor<EventTrackedSeller>((id) => `${eventBase(id)}/sellers/`);

export const configService = {
  // Pricing Tiers
  listPricingTiers: pricingTiers.list,
  createPricingTier: pricingTiers.create,
  updatePricingTier: pricingTiers.update,
  deletePricingTier: pricingTiers.delete,

  // Speakers
  listSpeakers: speakers.list,
  createSpeaker: speakers.create,
  updateSpeaker: speakers.update,
  deleteSpeaker: speakers.delete,

  // Partners
  listPartners: partners.list,
  createPartner: partners.create,
  updatePartner: partners.update,
  deletePartner: partners.delete,

  // Add-Ons
  listAddOns: addOns.list,
  createAddOn: addOns.create,
  updateAddOn: addOns.update,
  deleteAddOn: addOns.delete,

  // Promo Codes
  listPromoCodes: promoCodes.list,
  createPromoCode: promoCodes.create,
  updatePromoCode: promoCodes.update,
  deletePromoCode: promoCodes.delete,

  // Custom Fields
  listCustomFields: customFields.list,
  createCustomField: customFields.create,
  updateCustomField: customFields.update,
  deleteCustomField: customFields.delete,

  // Sellers
  listSellers: sellers.list,
  createSeller: sellers.create,
  updateSeller: sellers.update,
  deleteSeller: sellers.delete,

  populateSellersFromHierarchy(
    eventId: number,
  ): Promise<{ created: number; sellers: EventTrackedSeller[] }> {
    return request(`${eventBase(eventId)}/sellers/populate-from-hierarchy/`, {
      method: 'POST',
    });
  },
};
