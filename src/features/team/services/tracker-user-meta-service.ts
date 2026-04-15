const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface TrackerUserMeta {
  agency_code?: string | null;
  invited_at?: string | null;
  avatar_url?: string | null;
}

interface UserMetaResponse {
  id: number;
  agency_code?: string | null;
  invited_at?: string | null;
  profile?: {
    photo_url?: string | null;
  } | null;
}

const userMetaCache = new Map<number, TrackerUserMeta>();
const inflightByUserId = new Map<number, Promise<TrackerUserMeta>>();

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

async function fetchUserMeta(userId: number): Promise<TrackerUserMeta> {
  const cached = userMetaCache.get(userId);
  if (cached) return cached;

  const inflight = inflightByUserId.get(userId);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/accounts/users/${userId}/`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        return {
          agency_code: null,
          invited_at: null,
          avatar_url: null,
        };
      }

      const data = (await response.json()) as UserMetaResponse;
      const mapped: TrackerUserMeta = {
        agency_code: data.agency_code ?? null,
        invited_at: data.invited_at ?? null,
        avatar_url: data.profile?.photo_url ?? null,
      };
      userMetaCache.set(userId, mapped);
      return mapped;
    } finally {
      inflightByUserId.delete(userId);
    }
  })();

  inflightByUserId.set(userId, promise);
  return promise;
}

export async function fetchTrackerUsersMeta(userIds: number[]): Promise<Map<number, TrackerUserMeta>> {
  const uniqueIds = Array.from(new Set(userIds));
  const results = await Promise.all(uniqueIds.map((id) => fetchUserMeta(id)));

  const metaByUserId = new Map<number, TrackerUserMeta>();
  uniqueIds.forEach((id, index) => {
    metaByUserId.set(id, results[index]);
  });

  return metaByUserId;
}
