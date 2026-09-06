/**
 * Builder AI — config (dashboard-builder) React Query hooks.
 *
 * Data-access hooks over `builderConfigService` for the Phase 4 dashboard builder.
 * Queries are keyed under `builder-config` so the whole editor can be invalidated at
 * once; mutations invalidate the affected dashboard's sections/widgets and the read
 * dashboards (whose layout just changed). Caching/refetch policy only — no rendering.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { builderConfigService } from '../services/builder-config-service';
import type {
  BuilderProgramWriteInput,
  DashboardWriteInput,
  GoalWriteInput,
  InvitationRuleWriteInput,
  SectionReorderItem,
  SectionWriteInput,
  WidgetReorderItem,
  WidgetWriteInput,
} from '../types';

/** Root query-key namespace for all dashboard-builder config queries. */
const KEY = 'builder-config';
/** The read-dashboard namespace (kept in sync with `use-builder-ai`). */
const READ_KEY = 'builder-ai';

/** List the program's dashboards (Home/Company/BaseShop/Reporting + custom). */
export function useDashboards(program?: number) {
  return useQuery({
    queryKey: [KEY, 'dashboards', program ?? null],
    queryFn: () => builderConfigService.listDashboards(program),
    staleTime: 1000 * 60,
  });
}

/** List the sections belonging to one dashboard. */
export function useSections(dashboardId: number | undefined) {
  return useQuery({
    queryKey: [KEY, 'sections', dashboardId ?? null],
    queryFn: () => builderConfigService.listSections(dashboardId as number),
    enabled: Boolean(dashboardId),
    staleTime: 1000 * 30,
  });
}

/** List every widget under one dashboard (grouped by section in the UI). */
export function useWidgets(dashboardId: number | undefined) {
  return useQuery({
    queryKey: [KEY, 'widgets', dashboardId ?? null],
    queryFn: () => builderConfigService.listWidgets(dashboardId as number),
    enabled: Boolean(dashboardId),
    staleTime: 1000 * 30,
  });
}

/** Metric definitions for the widget metric picker. */
export function useMetricDefinitions(program?: number) {
  return useQuery({
    queryKey: [KEY, 'metrics', program ?? null],
    queryFn: () => builderConfigService.listMetrics(program),
    staleTime: 1000 * 60 * 5,
  });
}

/** The program's configured goals (per-metric, per-level-band targets). */
export function useGoals(program?: number) {
  return useQuery({
    queryKey: [KEY, 'goals', program ?? null],
    queryFn: () => builderConfigService.listGoals(program),
    staleTime: 1000 * 60 * 5,
  });
}

/** The program's single invitation rule (invite caps / depth / expiry). `null` if none. */
export function useInvitationRule(program?: number) {
  return useQuery({
    queryKey: [KEY, 'invitation-rule', program ?? null],
    queryFn: async () =>
      (await builderConfigService.listInvitationRules(program))[0] ?? null,
    enabled: Boolean(program),
    staleTime: 1000 * 60 * 5,
  });
}

/** Update the per-program invitation rule (requires `builder_invitation:manage`). */
export function useInvitationRuleMutation(program?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; payload: InvitationRuleWriteInput }) =>
      builderConfigService.updateInvitationRule(vars.id, vars.payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [KEY, 'invitation-rule', program ?? null] });
    },
  });
}

/** Rank levels (accounts) for the goal "applies to" band picker; rarely change. */
export function useLevels() {
  return useQuery({
    queryKey: [KEY, 'levels'],
    queryFn: () => builderConfigService.listLevels(),
    staleTime: 1000 * 60 * 30,
  });
}

/**
 * Goal create/edit/delete (require `builder_goal:manage`). Each invalidates the goals
 * list and the read dashboard, whose rings/bars resolve their target from these goals.
 */
export function useGoalMutations(program?: number) {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: [KEY, 'goals', program ?? null] });
    void qc.invalidateQueries({ queryKey: [READ_KEY, 'dashboard'] });
  };

  return {
    createGoal: useMutation({
      mutationFn: (payload: GoalWriteInput) => builderConfigService.createGoal(payload),
      onSuccess: invalidate,
    }),
    updateGoal: useMutation({
      mutationFn: (vars: { id: number; payload: Partial<GoalWriteInput> }) =>
        builderConfigService.updateGoal(vars.id, vars.payload),
      onSuccess: invalidate,
    }),
    deleteGoal: useMutation({
      mutationFn: (id: number) => builderConfigService.deleteGoal(id),
      onSuccess: invalidate,
    }),
  };
}

/**
 * Program create/edit/delete (require `builder_program:manage`). Creating a program
 * also bootstraps its default template server-side, so on success we invalidate the
 * program list, the capability flags, and the read dashboards/my-access that gate the
 * Builder AI menu — the group and its pages appear/populate without a reload.
 */
export function useProgramMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: [READ_KEY, 'programs'] });
    void qc.invalidateQueries({ queryKey: [READ_KEY, 'my-access'] });
    void qc.invalidateQueries({ queryKey: [READ_KEY, 'dashboard'] });
    void qc.invalidateQueries({ queryKey: [KEY, 'dashboards'] });
  };

  return {
    createProgram: useMutation({
      mutationFn: (payload: BuilderProgramWriteInput) => builderConfigService.createProgram(payload),
      onSuccess: invalidate,
    }),
    updateProgram: useMutation({
      mutationFn: (vars: { id: number; payload: Partial<BuilderProgramWriteInput> }) =>
        builderConfigService.updateProgram(vars.id, vars.payload),
      onSuccess: invalidate,
    }),
    deleteProgram: useMutation({
      mutationFn: (id: number) => builderConfigService.deleteProgram(id),
      onSuccess: invalidate,
    }),
  };
}

/**
 * All config mutations for the dashboard builder. Each invalidates the editor
 * queries for the affected dashboard plus the read dashboards (whose layout the
 * edit just changed), so both the builder and the live pages reflect the new state.
 */
export function useDashboardBuilderMutations(dashboardId: number | undefined) {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: [KEY, 'sections', dashboardId ?? null] });
    void qc.invalidateQueries({ queryKey: [KEY, 'widgets', dashboardId ?? null] });
    void qc.invalidateQueries({ queryKey: [KEY, 'dashboards'] });
    void qc.invalidateQueries({ queryKey: [READ_KEY, 'dashboard'] });
  };

  return {
    // dashboards
    createDashboard: useMutation({
      mutationFn: (payload: DashboardWriteInput) =>
        builderConfigService.createDashboard(payload),
      onSuccess: invalidate,
    }),
    updateDashboard: useMutation({
      mutationFn: (vars: { id: number; payload: DashboardWriteInput }) =>
        builderConfigService.updateDashboard(vars.id, vars.payload),
      onSuccess: invalidate,
    }),
    deleteDashboard: useMutation({
      mutationFn: (id: number) => builderConfigService.deleteDashboard(id),
      onSuccess: invalidate,
    }),

    // sections
    createSection: useMutation({
      mutationFn: (payload: SectionWriteInput) =>
        builderConfigService.createSection(payload),
      onSuccess: invalidate,
    }),
    updateSection: useMutation({
      mutationFn: (vars: { id: number; payload: SectionWriteInput }) =>
        builderConfigService.updateSection(vars.id, vars.payload),
      onSuccess: invalidate,
    }),
    deleteSection: useMutation({
      mutationFn: (id: number) => builderConfigService.deleteSection(id),
      onSuccess: invalidate,
    }),
    reorderSections: useMutation({
      mutationFn: (items: SectionReorderItem[]) =>
        builderConfigService.reorderSections(items),
      onSuccess: invalidate,
    }),

    // widgets
    createWidget: useMutation({
      mutationFn: (payload: WidgetWriteInput) => builderConfigService.createWidget(payload),
      onSuccess: invalidate,
    }),
    updateWidget: useMutation({
      mutationFn: (vars: { id: number; payload: WidgetWriteInput }) =>
        builderConfigService.updateWidget(vars.id, vars.payload),
      onSuccess: invalidate,
    }),
    deleteWidget: useMutation({
      mutationFn: (id: number) => builderConfigService.deleteWidget(id),
      onSuccess: invalidate,
    }),
    reorderWidgets: useMutation({
      mutationFn: (items: WidgetReorderItem[]) =>
        builderConfigService.reorderWidgets(items),
      onSuccess: invalidate,
    }),
  };
}
