import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { promotionService } from "../services/promotion-service";
import type { PromotionDashboard } from "../types";

const DASHBOARD_QUERY_KEY = ["promotion-dashboard"] as const;

interface UpdateItemVariables {
  id: number;
  value?: number;
}

function updateNumericItem(
  dashboard: PromotionDashboard,
  itemId: number,
  value: number,
): PromotionDashboard {
  const routes = dashboard.routes.map((route) => {
    const items = route.items.map((item) => {
      if (item.id !== itemId) return item;

      return {
        ...item,
        numeric_value: value,
        is_done: item.target_value !== null && value >= item.target_value,
      };
    });
    const doneItems = items.filter((item) => item.is_done).length;

    return {
      ...route,
      items,
      done_items: doneItems,
      route_pct: items.length
        ? Math.round((doneItems / items.length) * 100)
        : 0,
    };
  });

  const selectedRoute = routes.find(
    (route) => route.id === dashboard.selected_route_id,
  );
  const routeTotal = selectedRoute?.total_items ?? 0;
  const routeDone = selectedRoute?.done_items ?? 0;
  const total = dashboard.total_skills + (routeTotal || 1);
  const done = dashboard.done_skills + routeDone;
  const overallPct = total ? Math.round((done / total) * 100) : 0;
  const skillsComplete = dashboard.done_skills === dashboard.total_skills;
  const routeComplete = Boolean(
    selectedRoute && routeTotal > 0 && routeDone === routeTotal,
  );

  return {
    ...dashboard,
    routes,
    overall_pct: overallPct,
    promotion_status:
      skillsComplete && routeComplete
        ? "ready"
        : overallPct >= 60
          ? "close"
          : "not_ready",
  };
}

function updateNumericItemInDashboards(
  dashboards: PromotionDashboard[],
  itemId: number,
  value: number,
): PromotionDashboard[] {
  return dashboards.map((dashboard) => {
    const hasItem = dashboard.routes.some((route) =>
      route.items.some((item) => item.id === itemId),
    );

    return hasItem ? updateNumericItem(dashboard, itemId, value) : dashboard;
  });
}

export function usePromotionDashboard() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: promotionService.dashboard,
  });
  const refresh = () =>
    client.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });

  return {
    ...query,
    toggleSkill: useMutation({
      mutationFn: promotionService.toggleSkill,
      onSuccess: refresh,
    }),
    selectRoute: useMutation({
      mutationFn: promotionService.selectRoute,
      onSuccess: refresh,
    }),
    updateItem: useMutation({
      mutationFn: ({ id, value }: UpdateItemVariables) =>
        promotionService.updateRouteItem(id, value),
      onMutate: async ({ id, value }) => {
        if (value === undefined) return undefined;

        await client.cancelQueries({ queryKey: DASHBOARD_QUERY_KEY });
        const previous =
          client.getQueryData<PromotionDashboard[]>(DASHBOARD_QUERY_KEY);
        client.setQueryData<PromotionDashboard[]>(
          DASHBOARD_QUERY_KEY,
          (current) =>
            current ? updateNumericItemInDashboards(current, id, value) : current,
        );
        return { previous };
      },
      onError: (_error, variables, context) => {
        if (variables.value !== undefined && context?.previous) {
          client.setQueryData(DASHBOARD_QUERY_KEY, context.previous);
        }
      },
      onSuccess: (_response, variables) => {
        if (variables.value === undefined) void refresh();
      },
    }),
    refresh,
  };
}
