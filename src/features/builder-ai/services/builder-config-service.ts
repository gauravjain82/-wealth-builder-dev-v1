/**
 * Builder AI — config write service (Phase 4 dashboard builder).
 *
 * Typed wrappers over `/api/builder/config/*` — the staff-only CRUD + reorder that
 * backs the in-app dashboard builder. All writes require `builder_dashboard:manage`
 * (metrics/goals require their own resources); the backend enforces this and returns
 * 403 otherwise (Decision 11/17). Reordering is a single bulk call per list so a
 * drag-drop stays within the latency budget (Decision 27).
 *
 * HTTP only — no React, no business logic (Decision 24 SRP).
 */

import { buildQuery, request, unwrapList } from './http';
import type {
  BuilderProgram,
  BuilderProgramWriteInput,
  DashboardConfig,
  DashboardWriteInput,
  GoalConfig,
  MetricDefinitionConfig,
  Paginated,
  SectionConfig,
  SectionReorderItem,
  SectionWriteInput,
  WidgetConfig,
  WidgetReorderItem,
  WidgetWriteInput,
} from '../types';

const CONFIG = '/api/builder/config';
/** Programs are config, but live at `/api/builder/programs/` (not under `/config/`). */
const PROGRAMS = '/api/builder/programs';

/** List helper that unwraps DRF pagination for a config resource. */
function list<T>(resource: string, params: Record<string, string | number | undefined>) {
  return request<Paginated<T> | T[]>(`${CONFIG}/${resource}/${buildQuery(params)}`).then(
    unwrapList,
  );
}

export const builderConfigService = {
  // -- programs (create/edit require builder_program:manage) -----------------
  // Creating a program server-side also bootstraps its default template
  // (invitation rule, metrics, goals, dashboards, leaderboards).
  createProgram: (payload: BuilderProgramWriteInput) =>
    request<BuilderProgram>(`${PROGRAMS}/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateProgram: (id: number, payload: Partial<BuilderProgramWriteInput>) =>
    request<BuilderProgram>(`${PROGRAMS}/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteProgram: (id: number) =>
    request<void>(`${PROGRAMS}/${id}/`, { method: 'DELETE' }),

  // -- dashboards -----------------------------------------------------------
  listDashboards: (program?: number) =>
    list<DashboardConfig>('dashboards', { program }),

  createDashboard: (payload: DashboardWriteInput) =>
    request<DashboardConfig>(`${CONFIG}/dashboards/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateDashboard: (id: number, payload: DashboardWriteInput) =>
    request<DashboardConfig>(`${CONFIG}/dashboards/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteDashboard: (id: number) =>
    request<void>(`${CONFIG}/dashboards/${id}/`, { method: 'DELETE' }),

  // -- sections -------------------------------------------------------------
  listSections: (dashboardId: number) =>
    list<SectionConfig>('sections', { dashboard: dashboardId }),

  createSection: (payload: SectionWriteInput) =>
    request<SectionConfig>(`${CONFIG}/sections/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateSection: (id: number, payload: SectionWriteInput) =>
    request<SectionConfig>(`${CONFIG}/sections/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteSection: (id: number) =>
    request<void>(`${CONFIG}/sections/${id}/`, { method: 'DELETE' }),

  reorderSections: (items: SectionReorderItem[]) =>
    request<{ updated: number }>(`${CONFIG}/sections/reorder/`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  // -- widgets --------------------------------------------------------------
  listWidgets: (dashboardId: number) =>
    list<WidgetConfig>('widgets', { dashboard: dashboardId }),

  createWidget: (payload: WidgetWriteInput) =>
    request<WidgetConfig>(`${CONFIG}/widgets/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateWidget: (id: number, payload: WidgetWriteInput) =>
    request<WidgetConfig>(`${CONFIG}/widgets/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteWidget: (id: number) =>
    request<void>(`${CONFIG}/widgets/${id}/`, { method: 'DELETE' }),

  reorderWidgets: (items: WidgetReorderItem[]) =>
    request<{ updated: number }>(`${CONFIG}/widgets/reorder/`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  // -- metrics / goals (read — populate the widget pickers) -----------------
  listMetrics: (program?: number) =>
    list<MetricDefinitionConfig>('metrics', { program }),

  listGoals: (program?: number) => list<GoalConfig>('goals', { program }),
};
