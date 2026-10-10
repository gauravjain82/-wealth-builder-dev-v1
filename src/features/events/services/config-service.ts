import type {
  PricingTier,
  EventSpeaker,
  EventProductPartner,
  EventAddOn,
  EventPromoCode,
  EventTrackedSeller,
  EventCustomField,
  ExternalTeam,
  ExternalTeamMember,
} from '../types/config';
import type {
  ConventionEventSummary,
  ConventionRegistrationPage,
  ConventionStatusFilter,
} from '../types/convention';
import type { LandingLayout, LandingSection } from '../types/landing';

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
  // FormData bodies must not get a JSON Content-Type (the browser sets the
  // multipart boundary itself).
  const isJson = init?.body !== undefined && !(init.body instanceof FormData);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(isJson), ...init?.headers },
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
    /** Upload the row's image (speakers/partners/add-ons); returns the updated row. */
    upload(eventId: number, itemId: number, file: File): Promise<T> {
      const formData = new FormData();
      formData.append('file', file);
      return request(`${base(eventId)}${itemId}/upload/`, {
        method: 'POST',
        body: formData,
      });
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

const landingBase = (id: number) => `${eventBase(id)}/landing-sections/`;

export const configService = {
  // Landing-page layout (whole-layout read / replace / reset + image upload)
  getLandingLayout(eventId: number): Promise<LandingLayout> {
    return request(landingBase(eventId));
  },
  saveLandingLayout(
    eventId: number,
    sections: Pick<LandingSection, 'id' | 'section_type' | 'title' | 'is_enabled' | 'content'>[],
  ): Promise<LandingLayout> {
    return request(landingBase(eventId), {
      method: 'PUT',
      body: JSON.stringify({ sections }),
    });
  },
  resetLandingLayout(eventId: number): Promise<LandingLayout> {
    return request(landingBase(eventId), { method: 'DELETE' });
  },
  uploadLandingImage(eventId: number, file: File): Promise<{ blob_name: string; url: string | null }> {
    const formData = new FormData();
    formData.append('file', file);
    return request(`${landingBase(eventId)}upload/`, { method: 'POST', body: formData });
  },

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
  uploadSpeakerImage: speakers.upload,

  // Partners
  listPartners: partners.list,
  createPartner: partners.create,
  updatePartner: partners.update,
  deletePartner: partners.delete,
  uploadPartnerLogo: partners.upload,

  // Add-Ons
  listAddOns: addOns.list,
  createAddOn: addOns.create,
  updateAddOn: addOns.update,
  deleteAddOn: addOns.delete,
  uploadAddOnImage: addOns.upload,

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

  /** Add leaders from the external teams directory; a team id adds all its members. */
  addExternalSellers(
    eventId: number,
    selection: { team_ids?: number[]; member_ids?: number[] },
  ): Promise<{ created: number; sellers: EventTrackedSeller[] }> {
    return request(`${eventBase(eventId)}/sellers/add-external/`, {
      method: 'POST',
      body: JSON.stringify(selection),
    });
  },

  // External teams directory (shared by every event)
  listExternalTeams(): Promise<ExternalTeam[]> {
    return request('/api/events/external-teams/');
  },
  createExternalTeam(payload: Pick<ExternalTeam, 'name' | 'notes'>): Promise<ExternalTeam> {
    return request('/api/events/external-teams/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateExternalTeam(
    teamId: number,
    payload: Partial<Pick<ExternalTeam, 'name' | 'notes'>>,
  ): Promise<ExternalTeam> {
    return request(`/api/events/external-teams/${teamId}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deleteExternalTeam(teamId: number): Promise<void> {
    return request(`/api/events/external-teams/${teamId}/`, { method: 'DELETE' });
  },
  createExternalMember(
    payload: Pick<ExternalTeamMember, 'team' | 'name' | 'agent_code' | 'level_code'>,
  ): Promise<ExternalTeamMember> {
    return request('/api/events/external-team-members/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateExternalMember(
    memberId: number,
    payload: Partial<Pick<ExternalTeamMember, 'name' | 'agent_code' | 'level_code'>>,
  ): Promise<ExternalTeamMember> {
    return request(`/api/events/external-team-members/${memberId}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deleteExternalMember(memberId: number): Promise<void> {
    return request(`/api/events/external-team-members/${memberId}/`, { method: 'DELETE' });
  },

  // --- Convention tracking (read-only) ---
  conventionSummary(): Promise<ConventionEventSummary[]> {
    return request('/api/events/convention-registrations/summary/');
  },
  listConventionRegistrations(filters: {
    event: number | null;
    status: ConventionStatusFilter;
    search: string;
    page: number;
  }): Promise<ConventionRegistrationPage> {
    const params = new URLSearchParams({ page: String(filters.page) });
    if (filters.event !== null) params.set('event', String(filters.event));
    if (filters.status) params.set('status', filters.status);
    if (filters.search.trim()) params.set('search', filters.search.trim());
    return request(`/api/events/convention-registrations/?${params.toString()}`);
  },
};
