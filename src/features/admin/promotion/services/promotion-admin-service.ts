import type {
  AdminAILesson,
  AILessonPayload,
  AdminQuizQuestion,
  AdminSkill,
  AdminTrack,
  AdminVideo,
  QuizQuestionPayload,
  ReorderKind,
  SkillPayload,
  VideoPayload,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const BASE = '/api/promotion/admin';

/** Flatten a DRF validation body ({field: [msg]} or {detail}) into one readable line. */
function errorMessage(data: unknown, status: number): string {
  if (data && typeof data === 'object') {
    const body = data as Record<string, unknown>;
    if (typeof body.detail === 'string') return body.detail;
    const first = Object.values(body)[0];
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
    if (typeof first === 'string') return first;
  }
  return `Request failed (${status})`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  const response = await fetch(`${API_BASE_URL}${BASE}/${path}`, {
    ...init,
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(errorMessage(data, response.status));
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const send = <T>(method: 'POST' | 'PATCH', path: string, body: unknown) =>
  request<T>(path, { method, body: JSON.stringify(body) });

/** The whole tree in one request: tracks with skills, videos and quiz questions. */
export const fetchPromotionContent = (signal?: AbortSignal) =>
  request<AdminTrack[]>('tracks/', { signal });

export const createSkill = (payload: SkillPayload) =>
  send<AdminSkill>('POST', 'skills/', payload);
/** Sending a different `track` moves the skill there, appended last. */
export const updateSkill = (id: number, payload: Partial<SkillPayload>) =>
  send<AdminSkill>('PATCH', `skills/${id}/`, payload);
export const deleteSkill = (id: number) =>
  request<void>(`skills/${id}/`, { method: 'DELETE' });

export const createVideo = (payload: VideoPayload) =>
  send<AdminVideo>('POST', 'modules/', payload);
/** Sending a different `skill` moves the video there, appended last. */
export const updateVideo = (id: number, payload: Partial<VideoPayload>) =>
  send<AdminVideo>('PATCH', `modules/${id}/`, payload);
export const deleteVideo = (id: number) =>
  request<void>(`modules/${id}/`, { method: 'DELETE' });

export const createQuizQuestion = (payload: QuizQuestionPayload) =>
  send<AdminQuizQuestion>('POST', 'questions/', payload);
export const updateQuizQuestion = (id: number, payload: Partial<QuizQuestionPayload>) =>
  send<AdminQuizQuestion>('PATCH', `questions/${id}/`, payload);
export const deleteQuizQuestion = (id: number) =>
  request<void>(`questions/${id}/`, { method: 'DELETE' });

/** The module's AI lesson, or null when it has none. */
export const fetchAILesson = async (moduleId: number) =>
  (await request<AdminAILesson[]>(`ai-lessons/?module=${moduleId}`))[0] ?? null;
export const createAILesson = (payload: AILessonPayload) =>
  send<AdminAILesson>('POST', 'ai-lessons/', payload);
export const updateAILesson = (id: number, payload: Partial<AILessonPayload>) =>
  send<AdminAILesson>('PATCH', `ai-lessons/${id}/`, payload);

/** Rewrite `order` for every sibling under one parent, in the order given. */
export const reorder = (kind: ReorderKind, ids: number[]) =>
  send<{ ok: true }>('POST', `${kind}/reorder/`, { ids });
