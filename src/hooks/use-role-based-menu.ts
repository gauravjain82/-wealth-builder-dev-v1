import { useMemo } from 'react';
import { useAuth } from '../features/auth/hooks/use-auth';
import { roleToPlan } from '../core/constants/roles';
import { getMenuForUser, type MenuItem } from '../config/menu';

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
  
  return menuItems;
}
