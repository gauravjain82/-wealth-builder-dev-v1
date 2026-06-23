import type {
  PromotionDashboard,
  QuizQuestion,
  TeamResponse,
  TeamSort,
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

export const promotionService = {
  dashboard: () => request<PromotionDashboard>("my-dashboard/"),
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
  watch: (id: number) => request(`modules/${id}/watch/`, { method: "POST" }),
  submitQuiz: (id: number, answers: Record<string, number>) =>
    request<{ score: number; total: number }>(`modules/${id}/quiz/`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),
};
