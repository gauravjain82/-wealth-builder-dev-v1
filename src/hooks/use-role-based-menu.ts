import { useMemo } from 'react';
import { useAuth } from '../features/auth/hooks/use-auth';
import { useBuilderAiAccess, useMyBuilderAccess } from '../features/builder-ai/hooks/use-builder-ai';
import { roleToPlan } from '../core/constants/roles';
import {
  BUILDER_AI_GROUP_LABEL,
  BUILDER_DASHBOARD_PATH,
  BUILDER_PROGRAM_PATH,
  getMenuForUser,
  keepOnlyGroupChild,
  menuContainsPath,
  removeMenuGroupByLabel,
  removeMenuItemByPath,
  type MenuItem,
} from '../config/menu';

/**
 * Hook to get plan-based menu structure
 * Returns menu items filtered based on the current user's plan
 */
export function useRoleBasedMenu(): MenuItem[] {
  const { user } = useAuth();

  const menuItems = useMemo(() => {
    const primaryRole = user?.roles?.[0] || null;
    const hasPromotionAccess = Boolean(user?.hasPromotionAccess);
    if (!primaryRole) return getMenuForUser(null, hasPromotionAccess);
    const normalizedRole = primaryRole.trim().toUpperCase().replace(/[\s-]+/g, '_');
    return getMenuForUser(roleToPlan(normalizedRole), hasPromotionAccess);
  }, [user?.hasPromotionAccess, user?.roles]);

  // The Builder AI group is backend-gated. Only probe when the plan has the group at
  // all, then prune. Two cheap cached reads: capability flags (who can manage a
  // program) and a dashboard probe (does a program exist). BaseShop is always available
  // on the single Dashboard now (Decision 31) — the segment toggle self-gates tiers —
  // so there is no per-tier menu pruning.
  const hasBuilderGroup = useMemo(
    () => menuContainsPath(menuItems, BUILDER_DASHBOARD_PATH),
    [menuItems],
  );
  const { data: access } = useMyBuilderAccess(hasBuilderGroup);
  const { noProgram } = useBuilderAiAccess(hasBuilderGroup);
  const canManageProgram = Boolean(access?.program.manage);

  return useMemo(() => {
    let result = menuItems;

    // The Program page needs `builder_program:manage` (create/edit the program).
    if (!canManageProgram) result = removeMenuItemByPath(result, BUILDER_PROGRAM_PATH);

    if (noProgram) {
      // No program seeded yet. Managers keep the group but only the Program entry —
      // their next action is to create one; everyone else loses the group entirely.
      result = canManageProgram
        ? keepOnlyGroupChild(result, BUILDER_AI_GROUP_LABEL, BUILDER_PROGRAM_PATH)
        : removeMenuGroupByLabel(result, BUILDER_AI_GROUP_LABEL);
    }

    return result;
  }, [menuItems, canManageProgram, noProgram]);
}
