const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ProductionTrackerRecord {
  id: number;
  prospect: number | null;
  client_name: string;
  date_written: string | null;
  closure_date: string | null;
  delivery: string;
  status: string;
  notes: string;
  trial_app: boolean;
  chargeback: boolean;
  chargeback_deposited_12_months: boolean;
  chargeback_deposited_26_months: boolean;
  policy_company: string;
  policy_number: string;
  policy_product: string;
  policy_other_product: string;
  points_forty: number | string | null;
  points_sixty: number | string | null;
  points_target: number | string | null;
  agent_1: number | null;
  agent_1_name: string;
  agent_1_pct: number;
  agent_2: number | null;
  agent_2_name: string;
  agent_2_pct: number;
  split_mode: 'split' | 'solo';
  advance_first_date: string | null;
  files: string[];
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

interface PaginatedProductionResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProductionTrackerRecord[];
}

export interface ProductionTrackerQuery {
  sort?: string;
  filters?: Record<string, string>;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

function resolveNextUrl(nextUrl: string): string {
  if (nextUrl.startsWith('http://') || nextUrl.startsWith('https://')) {
    return nextUrl;
  }
  return `${API_BASE_URL}${nextUrl}`;
}

export interface CreateProductionPayload {
  prospect?: number | null;
  client_name: string;
  date_written?: string | null;
  closure_date?: string | null;
  delivery?: string;
  status?: string;
  notes?: string;
  trial_app?: boolean;
  chargeback?: boolean;
  chargeback_deposited_12_months?: boolean;
  chargeback_deposited_26_months?: boolean;
  policy_company?: string;
  policy_number?: string;
  policy_product?: string;
  policy_other_product?: string;
  points_target?: number | null;
  points_forty?: number | null;
  points_sixty?: number | null;
  agent_1?: number | null;
  agent_1_name?: string;
  agent_1_pct?: number;
  agent_2?: number | null;
  agent_2_name?: string;
  agent_2_pct?: number;
  split_mode?: 'split' | 'solo';
  advance_first_date?: string | null;
}

export type UpdateProductionPayload = Partial<CreateProductionPayload>;

export async function createProductionRecord(payload: CreateProductionPayload): Promise<ProductionTrackerRecord> {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/tracker/production/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create production record: ${text}`);
  }
  return (await response.json()) as ProductionTrackerRecord;
}

export async function fetchProductionTracker(
  query: ProductionTrackerQuery = {}
): Promise<ProductionTrackerRecord[]> {
  const headers = getAuthHeaders();
  const records: ProductionTrackerRecord[] = [];
  const params = new URLSearchParams();
  params.set('page_size', '200');
  if (query.sort) {
    params.set('sort', query.sort);
  }
  if (query.filters) {
    Object.entries(query.filters).forEach(([key, value]) => {
      const normalized = value?.trim();
      if (!normalized) return;
      params.set(key, normalized);
    });
  }

  let nextUrl: string | null = `${API_BASE_URL}/api/tracker/production/?${params.toString()}`;
  let pageSafety = 0;

  while (nextUrl && pageSafety < 20) {
    const response = await fetch(nextUrl, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch production tracker: ${response.statusText}`);
    }

    const data = (await response.json()) as PaginatedProductionResponse | ProductionTrackerRecord[];

    if (Array.isArray(data)) {
      records.push(...data);
      break;
    }

    records.push(...data.results);
    nextUrl = data.next ? resolveNextUrl(data.next) : null;
    pageSafety += 1;
  }

  return records;
}

export async function updateProductionRecord(
  recordId: number,
  payload: UpdateProductionPayload
): Promise<ProductionTrackerRecord> {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/tracker/production/${recordId}/`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to update production record: ${text}`);
  }

  return (await response.json()) as ProductionTrackerRecord;
}

export async function deleteProductionRecord(recordId: number): Promise<void> {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/tracker/production/${recordId}/`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to delete production record: ${text}`);
  }
}
