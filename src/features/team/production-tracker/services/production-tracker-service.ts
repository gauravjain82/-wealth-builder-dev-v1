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

export async function fetchProductionTracker(): Promise<ProductionTrackerRecord[]> {
  const headers = getAuthHeaders();
  const records: ProductionTrackerRecord[] = [];
  let nextUrl: string | null = `${API_BASE_URL}/api/tracker/production/?page_size=200`;
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
