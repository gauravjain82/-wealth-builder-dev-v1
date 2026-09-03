// API client for the Phase 5 post-sale surface: recognition, email blasts,
// attendee questions, per-event permissions, and the escrow finance report.
// Own auth/request helpers, mirroring the other event services (DIP: pages and
// hooks depend on this service, never on fetch directly).

import type {
  EmailBlast,
  BlastRecipientPreview,
  EscrowReport,
  EventPermissionGrant,
  EventQuestion,
  PermissionScope,
  QuestionStatus,
  RecognitionAward,
  RecognitionCategory,
} from '../types/post-sale';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const eventBase = (id: number) => `/api/events/events/${id}`;

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

export const postSaleService = {
  // --- Recognition categories ---------------------------------------------
  listRecognitionCategories(eventId: number): Promise<RecognitionCategory[]> {
    return request(`${eventBase(eventId)}/recognition-categories/`);
  },
  createRecognitionCategory(
    eventId: number,
    payload: Partial<RecognitionCategory>,
  ): Promise<RecognitionCategory> {
    return request(`${eventBase(eventId)}/recognition-categories/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateRecognitionCategory(
    eventId: number,
    id: number,
    payload: Partial<RecognitionCategory>,
  ): Promise<RecognitionCategory> {
    return request(`${eventBase(eventId)}/recognition-categories/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deleteRecognitionCategory(eventId: number, id: number): Promise<void> {
    return request(`${eventBase(eventId)}/recognition-categories/${id}/`, {
      method: 'DELETE',
    });
  },

  // --- Recognition awards -------------------------------------------------
  listRecognitionAwards(eventId: number, categoryId?: number): Promise<RecognitionAward[]> {
    const q = categoryId ? `?category=${categoryId}` : '';
    return request(`${eventBase(eventId)}/recognition-awards/${q}`);
  },
  createRecognitionAward(
    eventId: number,
    payload: Partial<RecognitionAward>,
  ): Promise<RecognitionAward> {
    return request(`${eventBase(eventId)}/recognition-awards/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateRecognitionAward(
    eventId: number,
    id: number,
    payload: Partial<RecognitionAward>,
  ): Promise<RecognitionAward> {
    return request(`${eventBase(eventId)}/recognition-awards/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deleteRecognitionAward(eventId: number, id: number): Promise<void> {
    return request(`${eventBase(eventId)}/recognition-awards/${id}/`, {
      method: 'DELETE',
    });
  },

  // --- Email blasts -------------------------------------------------------
  listBlasts(eventId: number): Promise<EmailBlast[]> {
    return request(`${eventBase(eventId)}/blasts/`);
  },
  createBlast(eventId: number, payload: Partial<EmailBlast>): Promise<EmailBlast> {
    return request(`${eventBase(eventId)}/blasts/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateBlast(eventId: number, id: number, payload: Partial<EmailBlast>): Promise<EmailBlast> {
    return request(`${eventBase(eventId)}/blasts/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deleteBlast(eventId: number, id: number): Promise<void> {
    return request(`${eventBase(eventId)}/blasts/${id}/`, { method: 'DELETE' });
  },
  previewBlastRecipients(eventId: number, id: number): Promise<BlastRecipientPreview> {
    return request(`${eventBase(eventId)}/blasts/${id}/recipients/`);
  },
  sendBlast(eventId: number, id: number): Promise<{ queued: number; blast: EmailBlast }> {
    return request(`${eventBase(eventId)}/blasts/${id}/send/`, { method: 'POST' });
  },

  // --- Attendee questions -------------------------------------------------
  listQuestions(eventId: number, status?: QuestionStatus): Promise<EventQuestion[]> {
    const q = status ? `?status=${status}` : '';
    return request(`${eventBase(eventId)}/questions/${q}`);
  },
  answerQuestion(eventId: number, id: number, answer: string): Promise<EventQuestion> {
    return request(`${eventBase(eventId)}/questions/${id}/answer/`, {
      method: 'POST',
      body: JSON.stringify({ answer }),
    });
  },
  closeQuestion(eventId: number, id: number): Promise<EventQuestion> {
    return request(`${eventBase(eventId)}/questions/${id}/close/`, { method: 'POST' });
  },

  // --- Per-event permissions ---------------------------------------------
  listPermissions(eventId: number): Promise<EventPermissionGrant[]> {
    return request(`${eventBase(eventId)}/permissions/`);
  },
  createPermission(
    eventId: number,
    user: number,
    scope: PermissionScope,
  ): Promise<EventPermissionGrant> {
    return request(`${eventBase(eventId)}/permissions/`, {
      method: 'POST',
      body: JSON.stringify({ user, scope }),
    });
  },
  deletePermission(eventId: number, id: number): Promise<void> {
    return request(`${eventBase(eventId)}/permissions/${id}/`, { method: 'DELETE' });
  },

  // --- Escrow / finance report -------------------------------------------
  escrowReport(eventId: number): Promise<EscrowReport> {
    return request(`${eventBase(eventId)}/reports/escrow/`);
  },
};
