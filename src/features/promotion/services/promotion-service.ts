import type {
  AIPracticeStartResult,
  AITestAnswer,
  AITestAttemptReview,
  AITestFinishResult,
  AITestMode,
  AITestStartResult,
  AITestState,
  ConversationTurn,
  MemberAITests,
  PromotionDashboard,
  PromotionDashboardResponse,
  QuizQuestion,
  QuizSubmitResult,
  TeamResponse,
  TeamSort,
  WatchProgress,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("wb.authToken");
  if (!token) throw new Error("No authentication token found");
  const response = await fetch(`${API_BASE_URL}/api/promotion/${path}`, {
    ...init,
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    throw new Error(data?.detail || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

/** Admin previews of the AI test skip the learner gates; the backend checks promotion:manage. */
const previewQuery = (preview: boolean) => (preview ? "?preview=1" : "");

export const promotionService = {
  dashboard: async (): Promise<PromotionDashboard[]> => {
    const data = await request<PromotionDashboardResponse>("my-dashboard/");
    return Array.isArray(data) ? data : [data];
  },
  team: (rank: string, search: string, sort: TeamSort) => {
    const params = new URLSearchParams({ sort });
    if (rank) params.set("rank", rank);
    if (search) params.set("search", search);
    return request<TeamResponse>(`team/?${params}`);
  },
  toggleSkill: (id: number) =>
    request<{ is_checked: boolean }>(`skills/${id}/toggle/`, {
      method: "POST",
    }),
  selectRoute: (id: number) =>
    request<{ selected: boolean; route_id: number | null }>(
      `routes/${id}/select/`,
      { method: "POST" },
    ),
  updateRouteItem: (id: number, value?: number) =>
    request(`route-items/${id}/progress/`, {
      method: "POST",
      body: value === undefined ? undefined : JSON.stringify({ value }),
    }),
  questions: (id: number) =>
    request<QuizQuestion[]>(`modules/${id}/questions/`),
  watchProgress: (id: number, watchedSeconds: number, duration: number) =>
    request<WatchProgress>(`modules/${id}/watch-progress/`, {
      method: "POST",
      body: JSON.stringify({ watched_seconds: watchedSeconds, duration }),
    }),
  submitQuiz: (id: number, answers: Record<string, number>) =>
    request<QuizSubmitResult>(`modules/${id}/quiz/`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),
  teamMemberAITests: (userId: number) =>
    request<MemberAITests>(`team/${userId}/ai-tests/`),
  teamAIAttempt: (attemptId: number) =>
    request<AITestAttemptReview>(`team/ai-attempts/${attemptId}/`),
  aiPracticeStart: (id: number, preview = false) =>
    request<AIPracticeStartResult>(
      `modules/${id}/ai-practice/start/${previewQuery(preview)}`,
      { method: "POST" },
    ),
  aiPracticeEnd: (sessionId: number, conversation: ConversationTurn[]) =>
    request<{ session_id: number; ended_at: string }>(
      `ai-practice/${sessionId}/end/`,
      { method: "POST", body: JSON.stringify({ conversation }) },
    ),
  aiTestState: (id: number, preview = false) =>
    request<AITestState>(`modules/${id}/ai-test/${previewQuery(preview)}`),
  aiTestStart: (id: number, mode: AITestMode, preview = false) =>
    request<AITestStartResult>(`modules/${id}/ai-test/start/${previewQuery(preview)}`, {
      method: "POST",
      body: JSON.stringify({ mode }),
    }),
  aiTestGrade: (
    attemptId: number,
    body: { question: string; answer: string; speech_transcript?: string },
  ) =>
    request<AITestAnswer & { pass_threshold: number }>(
      `ai-test/attempts/${attemptId}/grade/`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  aiTestFinish: (attemptId: number, conversation: ConversationTurn[]) =>
    request<AITestFinishResult>(`ai-test/attempts/${attemptId}/finish/`, {
      method: "POST",
      body: JSON.stringify({ conversation }),
    }),
};
