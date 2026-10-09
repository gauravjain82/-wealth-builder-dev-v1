const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
  };
}

export interface MissionRingProofSubmission {
  user_id: number;
  user_name: string;
  user_email: string;
  agency_code: string;
  agency_code_assigned_at: string | null;
  recruiter_name: string | null;
  leader_name: string | null;
  total_attachments_uploaded: number;
  first_attachment_uploaded_at: string | null;
  last_attachment_uploaded_at: string | null;
  days_count: number | null;
  attachment_url: string | null;
  latest_attachment: Record<string, unknown>;
  attachments: Array<{
    file_name: string;
    /** ISO timestamp of when this file was uploaded (may be missing on old records). */
    uploaded_at?: string | null;
    uploaded_by_name?: string | null;
    url: string;
  }>;
}

export interface MissionRingProofPage {
  count: number;
  results: MissionRingProofSubmission[];
}

export interface MissionRingMonthlyCount {
  /** Month bucket as YYYY-MM. */
  month: string;
  /** People whose FIRST proof upload fell in this month. */
  submitters: number;
  /** Every proof file uploaded in this month. */
  proofs: number;
}

export interface MissionRingProofSummary {
  total_submitters: number;
  total_proofs: number;
  undated_submitters: number;
  monthly: MissionRingMonthlyCount[];
}

const SUBMISSIONS_URL = `${API_BASE_URL}/api/tracker/trackers/4X4/mission-ring-proof-submissions`;

/** Fetch one server-side page of submitters (search covers name, email, agency code, recruiter, leader). */
export async function fetchMissionRingProofSubmissions(
  page: number,
  pageSize: number,
  search = '',
): Promise<MissionRingProofPage> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (search) params.set('search', search);
  const response = await fetch(`${SUBMISSIONS_URL}/?${params}`, { headers: getAuthHeaders() });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch submissions: ${response.status} ${text}`);
  }
  const data = await response.json();
  if (Array.isArray(data)) return { count: data.length, results: data };
  return { count: data.count ?? 0, results: Array.isArray(data.results) ? data.results : [] };
}

/** Fetch the to-date total and per-month counts of Mission Ring submitters. */
export async function fetchMissionRingProofSummary(): Promise<MissionRingProofSummary> {
  const response = await fetch(`${SUBMISSIONS_URL}/summary/`, { headers: getAuthHeaders() });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch summary: ${response.status} ${text}`);
  }
  return response.json();
}

/**
 * Download every Mission Ring proof submitter as an .xlsx file.
 * The backend builds the full (unpaginated) list, so the file is complete
 * even though the on-screen table is paged.
 */
export async function downloadMissionRingProofSubmissionsExcel(search = ''): Promise<void> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  const query = params.toString();
  const response = await fetch(
    `${SUBMISSIONS_URL}/export/${query ? `?${query}` : ''}`,
    { headers: getAuthHeaders() },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to export submissions: ${response.status} ${text}`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mission-ring-submissions-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
