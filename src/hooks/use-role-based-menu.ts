import { useMemo } from 'react';
import { useAuth } from '../features/auth/hooks/use-auth';
import { useBuilderMyAccess } from '../features/builder-ai/hooks/use-builder-ai';
import { useMisalignmentsAccess } from '../features/admin/misalignments/hooks/use-misalignments';
import { useProductsAccess } from '../features/admin/products/hooks/use-products';
import { usePipelineAccess } from '../features/admin/wb-pipeline';
import { useLeaderboardAccess } from '../features/leaderboards';
import { roleToPlan } from '../core/constants/roles';
import { getMenuForUser, type MenuItem } from '../config/menu';
import { useGmsAccess } from '@/features/gms';
import { useBpmCapabilities } from '@/features/bpm/hooks/use-bpm-capabilities';
import { usePluginFeesAccess } from '@/features/plugin-fees/hooks/use-plugin-fees';
import { useEventsAccess } from '@/features/events/hooks/use-events-access';
import {
  canManageCosts,
  canSeeCycles,
  canSeeOverview,
  canSeeOwnStatement,
  canSeePayments,
  canSeePayouts,
  canSeeReviews,
} from '@/features/plugin-fees/utils/plugin-fees-access';

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
  // Guidance authoring is its own per-user grant (gms:author), reported by gms.
  const { data: gmsAccess } = useGmsAccess();
  const canAuthorGuidance = Boolean(gmsAccess?.gms_enabled && gmsAccess?.can_author);
  // BPM Settings is for Admin and the named BPM managers (bpm_settings:manage).
  // Hidden while capabilities load, so it never flashes in and out.
  const { data: bpmCapabilities } = useBpmCapabilities();
  const canManageBpmSettings = Boolean(bpmCapabilities?.can_manage_settings);
  // Plug-in fee reviews are for the Hierarchy Assistant (plugin_fees:review).
  const { data: pluginFeesAccess } = usePluginFeesAccess();
  const canReviewPluginFees = canSeeReviews(pluginFeesAccess);
  // The same payload: own statement (active MD/SMD), billing cycles (and fee settings,
  // the same audience: canSeeFeeSettings), costs.
  const isPluginFeesBillable = canSeeOwnStatement(pluginFeesAccess);
  const canViewPluginFeeCycles = canSeeCycles(pluginFeesAccess);
  const canManagePluginFees = canManageCosts(pluginFeesAccess);
  // Payments dashboard: :manage or :review (not :payout_approve, so not the cycles flag).
  const canViewPluginFeePayments = canSeePayments(pluginFeesAccess);
  // Overview (and SEVC totals): :manage or :review. Payouts: also :payout_approve.
  const canViewPluginFeeOverview = canSeeOverview(pluginFeesAccess);
  const canViewPluginFeePayouts = canSeePayouts(pluginFeesAccess);
  // Big Event screens open through a platform-wide grant or a per-event one, so a
  // check-in-only delegate sees Big Event → Check-in whatever their role.
  const { data: eventsAccess } = useEventsAccess();
  const bigEventScreens = eventsAccess?.surfaces;

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
        canManageReporting,
        canAuthorGuidance,
        canManageBpmSettings,
        canReviewPluginFees,
        isPluginFeesBillable,
        canViewPluginFeeCycles,
        canManagePluginFees,
        canViewPluginFeePayments,
        canViewPluginFeeOverview,
        canViewPluginFeePayouts,
        bigEventScreens
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
      canManageReporting,
      canAuthorGuidance,
      canManageBpmSettings,
      canReviewPluginFees,
      isPluginFeesBillable,
      canViewPluginFeeCycles,
      canManagePluginFees,
      canViewPluginFeePayments,
      canViewPluginFeeOverview,
      canViewPluginFeePayouts,
      bigEventScreens
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
    canAuthorGuidance,
    canManageBpmSettings,
    canReviewPluginFees,
    isPluginFeesBillable,
    canViewPluginFeeCycles,
    canManagePluginFees,
    canViewPluginFeePayments,
    canViewPluginFeeOverview,
    canViewPluginFeePayouts,
    bigEventScreens,
  ]);
}
