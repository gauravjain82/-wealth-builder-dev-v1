export interface CurrentUserDetails {
  id: number;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  old_id?: string | null;
  plan?: string;
  roles?: string[];
  agency_code?: string | null;
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

export async function fetchCurrentUserDetails(): Promise<CurrentUserDetails> {
  const response = await fetch(`${getApiBaseUrl()}/api/accounts/users/me/`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const message = await parseError(response, 'Failed to load current user profile.');
    throw new Error(message);
  }

  return (await response.json()) as CurrentUserDetails;
}

export async function fetchPaymentProducts(): Promise<PaymentProduct[]> {
  const response = await fetch(`${getApiBaseUrl()}/api/payments/products/?active=true`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const message = await parseError(response, 'Failed to load payment products.');
    throw new Error(message);
  }

  const payload = await response.json();
  return asList<PaymentProduct>(payload);
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
  const response = await fetch(`${getApiBaseUrl()}/api/authz/roles/`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const message = await parseError(response, 'Failed to load role options.');
    throw new Error(message);
  }

  const payload = await response.json();
  return asList<RoleOption>(payload);
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