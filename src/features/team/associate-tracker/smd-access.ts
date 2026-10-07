import { hasRoleAtLeast } from '@core/constants/roles';
import { Plan } from '@core/types';
import type { useAuth } from '@/features/auth';

type AuthUser = ReturnType<typeof useAuth>['user'];

/**
 * True when the user ranks at least SMD (the Broker plan) by any of their
 * roles, account type or plan. Gates the SMD-only tracker flags (Producer,
 * Builder) and the Producers page. The backend gates writes separately through
 * access-console field rules.
 */
export function isSmdOrAbove(user: AuthUser): boolean {
  const candidateRoles = [...(user?.roles || []), user?.accountType, user?.plan];
  return hasRoleAtLeast(candidateRoles, Plan.Broker);
}
