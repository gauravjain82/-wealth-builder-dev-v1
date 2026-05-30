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
  last_attachment_uploaded_at: string | null;
  days_count: number | null;
  attachment_url: string | null;
  latest_attachment: any;
  attachments: Array<{
    file_name: string;
    uploaded_at: string;
    url: string;
  }>;
}

export async function fetchMissionRingProofSubmissions(): Promise<MissionRingProofSubmission[]> {
  const response = await fetch(`${API_BASE_URL}/api/tracker/trackers/4X4/mission-ring-proof-submissions/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch submissions: ${response.status} ${text}`);
  }
  const data = await response.json();
  // Defensive: handle paginated or non-paginated response
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}
