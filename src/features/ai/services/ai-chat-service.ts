const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const SESSION_STORAGE_KEY = 'wb.aiChatSessionId';

export interface AIChatResponse {
  assistantMessage: string;
  shouldShowBooking: boolean;
  metadata: Record<string, unknown>;
}

function getSessionId(): string {
  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;

  const generated =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `ai-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  window.localStorage.setItem(SESSION_STORAGE_KEY, generated);
  return generated;
}

function getHeaders(): HeadersInit {
  const token = window.localStorage.getItem('wb.authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Token ${token}` } : {}),
  };
}

async function parseError(response: Response, fallback: string): Promise<string> {
  try {
    const text = await response.text();
    return text || fallback;
  } catch {
    return fallback;
  }
}

export async function sendAIChatMessage(message: string, currentPage: string): Promise<AIChatResponse> {
  const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      message,
      currentPage,
      sessionId: getSessionId(),
    }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to send chat message.'));
  }

  return (await response.json()) as AIChatResponse;
}

export async function clearAIChat(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/ai/chat/clear`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to clear chat.'));
  }
}
