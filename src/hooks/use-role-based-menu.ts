import { useMemo } from 'react';
import { useAuth } from '../features/auth/hooks/use-auth';
import { useBuilderMyAccess } from '../features/builder-ai/hooks/use-builder-ai';
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

  return useMemo(() => {
    const primaryRole = user?.roles?.[0] || null;
    const hasPromotionAccess = Boolean(user?.hasPromotionAccess);
    if (!primaryRole)
      return getMenuForUser(null, hasPromotionAccess, canAccessBuilderAI, isBuilderAiOwner);
    const normalizedRole = primaryRole.trim().toUpperCase().replace(/[\s-]+/g, '_');
    return getMenuForUser(
      roleToPlan(normalizedRole),
      hasPromotionAccess,
      canAccessBuilderAI,
      isBuilderAiOwner
    );
  }, [user?.hasPromotionAccess, user?.roles, canAccessBuilderAI, isBuilderAiOwner]);
}
