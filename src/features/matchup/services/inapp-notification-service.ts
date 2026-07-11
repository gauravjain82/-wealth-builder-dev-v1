const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface InAppNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  payload: {
    appointment_id?: number;
    status?: string;
    kind?: string;
    start_at?: string;
    timezone?: string;
  };
  read_at: string | null;
  created_at: string;
}

interface NotificationListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: InAppNotification[];
}

function headers(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return { Authorization: `Token ${token}`, 'Content-Type': 'application/json' };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { ...headers(), ...init?.headers } });
  if (!response.ok) throw new Error(`Notification request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export const inAppNotificationService = {
  unreadCount: async () => (await request<{ unread: number }>('/api/notifications/inapp/unread-count/')).unread,
  unread: async () => request<NotificationListResponse>('/api/notifications/inapp/?unread=1&page_size=50'),
  markRead: (ids: number[]) => request<{ marked_read: number }>('/api/notifications/inapp/mark-read/', {
    method: 'POST', body: JSON.stringify({ ids }),
  }),
  markAllRead: () => request<{ marked_read: number }>('/api/notifications/inapp/mark-read/', {
    method: 'POST', body: JSON.stringify({ all: true }),
  }),
};
