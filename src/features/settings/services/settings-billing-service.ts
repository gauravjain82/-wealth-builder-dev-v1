import { fetchCachedReferenceData } from '@/infrastructure/query/reference-data';

export interface CurrentUserDetails {
  id: number;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  old_id?: string | null;
  plan?: string;
  roles?: string[];
  level?: { id?: number | null; code?: string | null; name?: string | null } | string | null;
  agency_code?: string | null;
  polo_size?: string | null;
  spouse_name?: string | null;
  spouse_phone?: string | null;
  spouse_polo_size?: string | null;
  avatar_url?: string | null;
  profile?: {
    photo_url?: string | null;
    photo_url_thumb?: string | null;
    birthday?: string | null;
    state?: string;
    gender?: string;
    home_address?: string;
    home_address2?: string;
    home_city?: string;
    home_zip?: string;
  } | null;
  updated_at?: string;
}

export interface CurrentUserProfileUpdatePayload {
  email?: string;
  polo_size?: string;
  spouse_name?: string;
  spouse_phone?: string;
  spouse_polo_size?: string;
  profile?: {
    birthday?: string | null;
    state?: string;
    gender?: string;
    home_address?: string;
    home_address2?: string;
    home_city?: string;
    home_zip?: string;
  };
}

export interface PaymentProduct {
  id: number;
  stripe_product_id: string;
  default_price_id: string;
  name: string;
  description: string;
  active: boolean;
  currency: string | null;
  unit_amount: number | null;
}

export interface RoleOption {
  id: number;
  name: string;
}

export interface SetupIntentResponse {
  old_id: string;
  customer_link_id: number;
  stripe_customer_id: string;
  setup_intent_id: string;
  client_secret: string;
  status: string;
  payment_method: string;
}

export interface SubscriptionApprovalRequestResponse {
  id: number;
  old_id_snapshot: string;
  buyer_name?: string;
  buyer_role_snapshot_name?: string;
  target_role?: number | null;
  metadata?: { current_plan?: string; target_plan?: string; [key: string]: unknown };
  stripe_product_id: string;
  stripe_price_id: string;
  setup_intent_id: string;
  setup_intent_status: string;
  payment_method_id: string;
  requires_approval: boolean;
  status: string;
  assigned_approver_name?: string;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface TelegramLinkStatus {
  linked: boolean;
  telegram_username?: string | null;
  linked_at?: string | null;
  notification_preferences?: Record<string, boolean>;
}

export interface TelegramLinkTokenResponse {
  deep_link: string;
  qr_code?: string;
  already_linked: boolean;
  expires_in_minutes: number;
}

interface SubscriptionApprovalRequestCreatePayload {
  old_id: string;
  price_id: string;
  product_id?: string;
  setup_intent_id: string;
  payment_method_id: string;
  target_role_id?: number;
  metadata?: Record<string, string>;
}

function asList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (
    payload
    && typeof payload === 'object'
    && 'results' in payload
    && Array.isArray((payload as { results?: unknown }).results)
  ) {
    return ((payload as { results: unknown[] }).results as T[]) || [];
  }

  return [];
}

function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) {
    throw new Error('No authentication token found. Please sign in again.');
  }

  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseError(response: Response, fallbackMessage: string): Promise<string> {
  try {
    const payload = await response.json();
    if (typeof payload?.detail === 'string') return payload.detail;
    if (typeof payload?.message === 'string') return payload.message;
    if (typeof payload?.non_field_errors?.[0] === 'string') return payload.non_field_errors[0];
    return fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

function normalizeCurrentUserDetails(user: CurrentUserDetails): CurrentUserDetails {
  const profileAvatar = user.profile?.photo_url_thumb;
  return {
    ...user,
    avatar_url: user.avatar_url || profileAvatar,
  };
}

export async function fetchCurrentUserDetails(): Promise<CurrentUserDetails> {
  const response = await fetch(`${getApiBaseUrl()}/api/accounts/users/me/`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const message = await parseError(response, 'Failed to load current user profile.');
    throw new Error(message);
  }

  const raw = (await response.json()) as CurrentUserDetails;
  return normalizeCurrentUserDetails(raw);
}

export async function fetchPaymentProducts(): Promise<PaymentProduct[]> {
  return fetchCachedReferenceData('payment-products-active', async () => {
    const response = await fetch(`${getApiBaseUrl()}/api/payments/products/?active=true`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const message = await parseError(response, 'Failed to load payment products.');
      throw new Error(message);
    }

    const payload = await response.json();
    return asList<PaymentProduct>(payload);
  });
}

export async function createSetupIntent(oldId: string): Promise<SetupIntentResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/payments/setup-intents/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      old_id: oldId,
      metadata: {
        source: 'settings_profile_upgrade',
      },
    }),
  });

  if (!response.ok) {
    const message = await parseError(response, 'Failed to create setup intent.');
    throw new Error(message);
  }

  return (await response.json()) as SetupIntentResponse;
}

export async function createSubscriptionApprovalRequest(
  payload: SubscriptionApprovalRequestCreatePayload
): Promise<SubscriptionApprovalRequestResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/payments/subscription-requests/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await parseError(response, 'Failed to create subscription approval request.');
    throw new Error(message);
  }

  return (await response.json()) as SubscriptionApprovalRequestResponse;
}

export async function fetchRoles(): Promise<RoleOption[]> {
  return fetchCachedReferenceData('authz-roles', async () => {
    const response = await fetch(`${getApiBaseUrl()}/api/authz/roles/`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const message = await parseError(response, 'Failed to load role options.');
      throw new Error(message);
    }

    const payload = await response.json();
    return asList<RoleOption>(payload);
  });
}

export async function fetchMySubscriptionApprovalRequests(
  oldId: string
): Promise<SubscriptionApprovalRequestResponse[]> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/payments/subscription-requests/?old_id=${encodeURIComponent(oldId)}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const message = await parseError(response, 'Failed to load subscription requests.');
    throw new Error(message);
  }

  const payload = await response.json();
  return asList<SubscriptionApprovalRequestResponse>(payload);
}

export async function fetchMyApprovalRequests(): Promise<SubscriptionApprovalRequestResponse[]> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/payments/subscription-requests/?assigned_to_me=true`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const message = await parseError(
      response,
      'Failed to load subscription approval requests.'
    );
    throw new Error(message);
  }

  const payload = await response.json();
  return asList<SubscriptionApprovalRequestResponse>(payload);
}

export async function approveRequest(
  requestId: number,
  note?: string
): Promise<SubscriptionApprovalRequestResponse> {
  const payload: Record<string, string> = {};
  if (note?.trim()) {
    payload.note = note.trim();
  }

  const response = await fetch(
    `${getApiBaseUrl()}/api/payments/subscription-requests/${requestId}/approve/`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const message = await parseError(response, 'Failed to approve subscription request.');
    throw new Error(message);
  }

  return (await response.json()) as SubscriptionApprovalRequestResponse;
}

export async function rejectRequest(
  requestId: number,
  reason: string
): Promise<SubscriptionApprovalRequestResponse> {
  if (!reason?.trim()) {
    throw new Error('Rejection reason is required.');
  }

  const payload = {
    rejection_reason: reason.trim(),
  };

  const response = await fetch(
    `${getApiBaseUrl()}/api/payments/subscription-requests/${requestId}/reject/`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const message = await parseError(response, 'Failed to reject subscription request.');
    throw new Error(message);
  }

  return (await response.json()) as SubscriptionApprovalRequestResponse;
}

function getMultipartAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) {
    throw new Error('No authentication token found. Please sign in again.');
  }

  return {
    Authorization: `Token ${token}`,
  };
}

export async function uploadCurrentUserPhoto(userId: number, photo: File): Promise<CurrentUserDetails> {
  const formData = new FormData();
  formData.append('photo', photo);

  const response = await fetch(`${getApiBaseUrl()}/api/accounts/users/${userId}/upload-photo/`, {
    method: 'POST',
    headers: getMultipartAuthHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const message = await parseError(response, 'Failed to upload profile photo.');
    throw new Error(message);
  }

  const raw = (await response.json()) as CurrentUserDetails;
  return normalizeCurrentUserDetails(raw);
}

export async function updateCurrentUserDetails(
  userId: number,
  payload: CurrentUserProfileUpdatePayload
): Promise<CurrentUserDetails> {
  const response = await fetch(`${getApiBaseUrl()}/api/accounts/users/${userId}/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await parseError(response, 'Failed to update profile settings.');
    throw new Error(message);
  }

  const raw = (await response.json()) as CurrentUserDetails;
  return normalizeCurrentUserDetails(raw);
}

export async function fetchTelegramLinkStatus(): Promise<TelegramLinkStatus> {
  const response = await fetch(`${getApiBaseUrl()}/api/telegram/link-token/`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const message = await parseError(response, 'Failed to load Telegram connection status.');
    throw new Error(message);
  }

  return (await response.json()) as TelegramLinkStatus;
}

export async function createTelegramLinkToken(): Promise<TelegramLinkTokenResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/telegram/link-token/`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const message = await parseError(response, 'Failed to create Telegram connection link.');
    throw new Error(message);
  }

  return (await response.json()) as TelegramLinkTokenResponse;
}

export async function unlinkTelegramAccount(): Promise<{ unlinked: boolean }> {
  const response = await fetch(`${getApiBaseUrl()}/api/telegram/link-token/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const message = await parseError(response, 'Failed to disconnect Telegram account.');
    throw new Error(message);
  }

  return (await response.json()) as { unlinked: boolean };
}
