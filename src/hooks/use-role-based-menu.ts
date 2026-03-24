import { useMemo } from 'react';
import { useAuth } from '../features/auth/hooks/use-auth';
import { getMenuForPlan, type MenuItem } from '../config/menu';

/**
 * Hook to get plan-based menu structure
 * Returns menu items filtered based on the current user's plan
 */
export function useRoleBasedMenu(): MenuItem[] {
  const { user } = useAuth();
  
  const menuItems = useMemo(() => {
    return getMenuForPlan(user?.plan || null);
  }, [user?.plan]);
  
  return menuItems;
}
