/**
 * Role Constants
 * Defines valid roles and mappings between backend and frontend representations
 */

import { Plan } from '../types';

/**
 * Valid roles that can be assigned to users.
 * These must match the backend RoleChoices enum.
 */
export const VALID_ROLES = ['NEW_AGENT', 'AGENT', 'LEADER', 'BROKER', 'SENIOR_BROKER', 'ADMIN'] as const;

export type ValidRole = (typeof VALID_ROLES)[number];

/**
 * Mapping from backend role strings to frontend Plan enum values.
 * This is the single source of truth for role mapping.
 */
export const ROLE_TO_PLAN_MAP: Record<ValidRole, Plan> = {
  NEW_AGENT: Plan.NewAgent,
  AGENT: Plan.Agent,
  LEADER: Plan.Leader,
  BROKER: Plan.Broker,
  SENIOR_BROKER: Plan.SeniorBroker,
  ADMIN: Plan.Admin,
};

/**
 * Check if a string is a valid role
 */
export function isValidRole(value: string): value is ValidRole {
  return VALID_ROLES.includes(value as ValidRole);
}

/**
 * Convert a backend role string to a Plan enum value
 * Returns the role if valid, or NewAgent as default
 */
export function roleToPlan(role: unknown): Plan {
  if (typeof role === 'string' && isValidRole(role)) {
    return ROLE_TO_PLAN_MAP[role];
  }
  return Plan.NewAgent;
}
