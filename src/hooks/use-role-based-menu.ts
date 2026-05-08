import { useMemo } from 'react';
import { useAuth } from '../features/auth/hooks/use-auth';
import { roleToPlan } from '../core/constants/roles';
import { getMenuForPlan, type MenuItem } from '../config/menu';

/**
 * Hook to get plan-based menu structure
 * Returns menu items filtered based on the current user's plan
 */
export function useRoleBasedMenu(): MenuItem[] {
  const { user } = useAuth();
  
  const menuItems = useMemo(() => {
    const primaryRole = user?.roles?.[0] || null;
    if (!primaryRole) return getMenuForPlan(null);
    const normalizedRole = primaryRole.trim().toUpperCase().replace(/[\s-]+/g, '_');
    return getMenuForPlan(roleToPlan(normalizedRole));
  }, [user?.roles]);
  
  return menuItems;
}
