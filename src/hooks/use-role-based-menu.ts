import { useMemo } from 'react';
import { useAuth } from '../features/auth/hooks/use-auth';
import { useBuilderMyAccess } from '../features/builder-ai/hooks/use-builder-ai';
import { useMisalignmentsAccess } from '../features/admin/misalignments/hooks/use-misalignments';
import { useProductsAccess } from '../features/admin/products/hooks/use-products';
import { usePipelineAccess } from '../features/admin/wb-pipeline';
import { useLeaderboardAccess } from '../features/leaderboards';
import { roleToPlan } from '../core/constants/roles';
import { getMenuForUser, type MenuItem } from '../config/menu';

/**
 * Hook to get plan-based menu structure
 * Returns menu items filtered based on the current user's plan. The Builder AI
 * group is additionally injected whenever the backend reports the user may view
 * it (owner, active builder, or pending invitee), independent of plan/role.
 */
export function useRoleBasedMenu(): MenuItem[] {
  const { user } = useAuth();
  const { data: builderAccess } = useBuilderMyAccess();
  const canAccessBuilderAI = Boolean(builderAccess?.can_view);
  // Company Owner & Builder are separate things: owners get the full Builder AI
  // group, Builders get a trimmed one (Baseshop + Invitations). `is_owner`
  // distinguishes the two.
  const isBuilderAiOwner = Boolean(builderAccess?.is_owner);
  // Data Integrity reports are gated per-user by the backend, independent of plan.
  const { data: misalignmentsAccess } = useMisalignmentsAccess();
  const canAccessMisalignments = Boolean(misalignmentsAccess?.can_view);
  // Product Management is gated per-user by the backend, independent of plan.
  const { data: productsAccess } = useProductsAccess();
  const canAccessProducts = Boolean(productsAccess?.can_view);
  // The reporting pipeline screen is gated per-user by the backend too.
  const { data: pipelineAccess } = usePipelineAccess();
  const canAccessReportingPipeline = Boolean(pipelineAccess?.can_view);
  // Home v2 and Leaderboards ride the same limited rollout, gated by homev2:read.
  const { data: leaderboardAccess } = useLeaderboardAccess();
  const canAccessLeaderboards = Boolean(leaderboardAccess?.can_view_leaderboards);
  // Contest configuration needs wbreporting:manage, which the same payload reports.
  const canManageReporting = Boolean(pipelineAccess?.can_manage);

  return useMemo(() => {
    const primaryRole = user?.roles?.[0] || null;
    const hasPromotionAccess = Boolean(user?.hasPromotionAccess);
    if (!primaryRole)
      return getMenuForUser(
        null,
        hasPromotionAccess,
        canAccessBuilderAI,
        isBuilderAiOwner,
        canAccessMisalignments,
        canAccessProducts,
        canAccessReportingPipeline,
        canAccessLeaderboards,
        canManageReporting
      );
    const normalizedRole = primaryRole.trim().toUpperCase().replace(/[\s-]+/g, '_');
    return getMenuForUser(
      roleToPlan(normalizedRole),
      hasPromotionAccess,
      canAccessBuilderAI,
      isBuilderAiOwner,
      canAccessMisalignments,
      canAccessProducts,
      canAccessReportingPipeline,
      canAccessLeaderboards,
      canManageReporting
    );
  }, [
    user?.hasPromotionAccess,
    user?.roles,
    canAccessBuilderAI,
    isBuilderAiOwner,
    canAccessMisalignments,
    canAccessProducts,
    canAccessReportingPipeline,
    canAccessLeaderboards,
    canManageReporting,
  ]);
}
