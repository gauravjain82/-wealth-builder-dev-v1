// Delete a mission ring proof attachment by blob_name
export async function deleteMissionRingProofAttachment(userId: number, blobName: string): Promise<void> {
  const token = localStorage.getItem('wb.authToken');
  const headers: Record<string, string> = token ? { Authorization: `Token ${token}` } : {};
  const resp = await fetch(`${API_BASE_URL}/api/tracker/trackers/4X4/${userId}/mission-ring-proof/?blob_name=${encodeURIComponent(blobName)}`, {
    method: 'DELETE',
    headers,
  });
  if (!resp.ok) throw new Error('Failed to delete attachment');
}
// Mission Ring Proof Attachments API
export interface MissionRingProofAttachment {
  id: number;
  file_name: string;
  uploaded_at: string;
  url: string;
  blob_name?: string;
}

export function normalizeMissionRingProofAttachments(value: unknown): MissionRingProofAttachment[] {
  if (!Array.isArray(value)) return [];

  return value.map((item, idx) => {
    const attachment = item as Partial<MissionRingProofAttachment>;
    return {
      id: attachment.id ?? idx,
      file_name: attachment.file_name || '',
      uploaded_at: attachment.uploaded_at || '',
      url: attachment.url || '',
      blob_name: attachment.blob_name,
    };
  });
}

export async function listMissionRingProofAttachments(userId: number): Promise<MissionRingProofAttachment[]> {
  // GET /api/trackers/4X4/{user_id}/
  const response = await fetch(`${API_BASE_URL}/api/tracker/trackers/4X4/${userId}/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch mission ring proof attachments');
  const data = await response.json();
  // The field is mission_ring_proof: Array<{file_name, uploaded_at, url, blob_name, ...}>
  return normalizeMissionRingProofAttachments(data.mission_ring_proof);
}

export async function uploadMissionRingProofAttachment(userId: number, file: File): Promise<void> {
  // POST /api/trackers/4X4/{user_id}/mission-ring-proof/
  const formData = new FormData();
  formData.append('file', file);
  // Only set Authorization header, NOT Content-Type
  const token = localStorage.getItem('wb.authToken');
  const headers: Record<string, string> = token ? { Authorization: `Token ${token}` } : {};
  const response = await fetch(`${API_BASE_URL}/api/tracker/trackers/4X4/${userId}/mission-ring-proof/`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to upload mission ring proof attachment');
}
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const MISSION_TRACKER_API_KEY = ['4', 'X4'].join('');

export interface MissionTrackerRecord {
  id: number;
  serial_no?: number;
  user_id: number;
  user_name: string;
  user_email: string;
  latest_note_text?: string | null;
  latest_note_tracker?: string | null;
  latest_note_created_at?: string | null;
  latest_note_created_by_name?: string | null;
  recruiter_name?: string | null;
  recruiter_id?: number | null;
  leader_name?: string | null;
  leader_id?: number | null;
  agency_code?: string | null;
  invited_at?: string | null;
  avatar_url?: string | null;
  photo_thumb_url?: string | null;
  registration_status?: string | null;
  '1_direct_recruit'?: boolean;
  is_licensed: boolean;
  big_event_1st: boolean;
  pass_exam_date: string | null;
  sircon_nipr_date: string | null;
  finish_1st_savings: boolean;
  savings_1st_amount: number | string | null;
  finish_1st_recruit: boolean;
  finish_2nd_recruit: boolean;
  finish_3rd_recruit: boolean;
  finish_4th_recruit: boolean;
  finish_2nd_savings: boolean;
  savings_2nd_amount: number | string | null;
  finish_3rd_savings: boolean;
  savings_3rd_amount: number | string | null;
  finish_4th_savings: boolean;
  savings_4th_amount: number | string | null;
  created_at: string;
  updated_at: string;
  smd_100k_class: boolean | null;
  mission_ring_proof?: MissionRingProofAttachment[];
}

interface PaginatedTrackerResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface MissionTrackerQuery {
  page?: number;
  pageSize?: number;
  sort?: string;
  filters?: Record<string, string>;
}

function normalizeMissionTrackerRecord(record: MissionTrackerRecord): MissionTrackerRecord {
  return {
    ...record,
    mission_ring_proof: normalizeMissionRingProofAttachments(record.mission_ring_proof),
  };
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function fetchMissionTracker(
  query: MissionTrackerQuery = {}
): Promise<PaginatedTrackerResponse<MissionTrackerRecord>> {
  const params = new URLSearchParams();
  params.set('page', String(query.page ?? 1));
  params.set('page_size', String(query.pageSize ?? 10));
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

  const response = await fetch(`${API_BASE_URL}/api/tracker/trackers/${MISSION_TRACKER_API_KEY}/?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error(`Failed to fetch mission tracker: ${response.statusText}`);

  const data = (await response.json()) as PaginatedTrackerResponse<MissionTrackerRecord> | MissionTrackerRecord[];
  if (Array.isArray(data)) {
    return {
      count: data.length,
      next: null,
      previous: null,
      results: data.map(normalizeMissionTrackerRecord),
    };
  }

  return {
    ...data,
    results: data.results.map(normalizeMissionTrackerRecord),
  };
}

export async function updateMissionTracker(
  userId: number,
  payload: Partial<MissionTrackerRecord>
): Promise<MissionTrackerRecord> {
  const response = await fetch(`${API_BASE_URL}/api/tracker/trackers/${MISSION_TRACKER_API_KEY}/${userId}/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to update mission tracker: ${response.statusText}`);
  }

  return normalizeMissionTrackerRecord((await response.json()) as MissionTrackerRecord);
}
