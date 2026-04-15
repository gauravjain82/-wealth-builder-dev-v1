const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface TrackerNote {
  id: number;
  user: number;
  created_by: number | null;
  created_by_name?: string;
  text: string;
  tracker: string;
  created_at: string;
  updated_at: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
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

async function fetchAllNotesForUser(userId: number, tracker?: string): Promise<TrackerNote[]> {
  const headers = getAuthHeaders();
  const notes: TrackerNote[] = [];
  const trackerParam = tracker ? `&tracker=${encodeURIComponent(tracker)}` : '';
  let nextUrl: string | null = `${API_BASE_URL}/api/tracker/notes/?user=${userId}${trackerParam}&page_size=200`;
  let pageSafety = 0;

  while (nextUrl && pageSafety < 20) {
    const response = await fetch(nextUrl, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch notes: ${response.statusText}`);
    }

    const data = (await response.json()) as PaginatedResponse<TrackerNote> | TrackerNote[];
    if (Array.isArray(data)) {
      notes.push(...data);
      break;
    }

    notes.push(...data.results);
    nextUrl = data.next ? resolveNextUrl(data.next) : null;
    pageSafety += 1;
  }

  notes.sort((a, b) => {
    const at = new Date(a.created_at).getTime();
    const bt = new Date(b.created_at).getTime();
    return at - bt;
  });

  return notes;
}

export async function fetchTrackerNotesForUser(userId: number, tracker?: string): Promise<TrackerNote[]> {
  return fetchAllNotesForUser(userId, tracker);
}

export async function fetchTrackerNotesForUsers(
  userIds: number[],
  tracker?: string
): Promise<Record<number, TrackerNote[]>> {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  const entries = await Promise.all(
    uniqueUserIds.map(async (userId) => {
      const notes = await fetchAllNotesForUser(userId, tracker);
      return [userId, notes] as const;
    })
  );

  return Object.fromEntries(entries);
}

export async function createTrackerNote(
  userId: number,
  text: string,
  tracker: string
): Promise<TrackerNote> {
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error('Note text cannot be empty.');
  }

  const response = await fetch(`${API_BASE_URL}/api/tracker/notes/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      user: userId,
      text: trimmedText,
      tracker,
    }),
  });

  if (!response.ok) {
    let message = `Failed to save note: ${response.statusText}`;
    try {
      const data = await response.json();
      message = data?.detail || data?.message || data?.text?.[0] || message;
    } catch {
      // Keep fallback message.
    }
    throw new Error(message);
  }

  return (await response.json()) as TrackerNote;
}
