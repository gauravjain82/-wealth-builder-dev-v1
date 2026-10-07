import { CONTENT_ROLES, type RoleOption } from '../types';

/**
 * "Visible to" presets for CMS content.
 *
 * An empty role list means everyone. "X and up" includes every role ranked at
 * or above X in {@link CONTENT_ROLES}, which ends with ADMIN and SUPER_ADMIN.
 */
export type VisibleToPresetId =
  | 'everyone'
  | 'agent-up'
  | 'leader-up'
  | 'broker-up'
  | 'senior-broker-up'
  | 'custom';

export type VisibleToPreset = {
  id: Exclude<VisibleToPresetId, 'custom'>;
  label: string;
  roles: string[];
};

/** Roles from `minimum` to the top of the rank order. */
function rolesFrom(minimum: (typeof CONTENT_ROLES)[number]): string[] {
  return CONTENT_ROLES.slice(CONTENT_ROLES.indexOf(minimum));
}

export const VISIBLE_TO_PRESETS: VisibleToPreset[] = [
  { id: 'everyone', label: 'Everyone', roles: [] },
  { id: 'agent-up', label: 'Agent and up', roles: rolesFrom('AGENT') },
  { id: 'leader-up', label: 'Leader and up', roles: rolesFrom('LEADER') },
  { id: 'broker-up', label: 'Broker and up', roles: rolesFrom('BROKER') },
  { id: 'senior-broker-up', label: 'Senior Broker and up', roles: rolesFrom('SENIOR_BROKER') },
];

function sameRoleSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const set = new Set(left);
  return right.every((role) => set.has(role));
}

/** The preset that exactly matches `roles`, or `null` when it is a custom set. */
export function matchVisibleToPreset(roles: string[]): VisibleToPreset | null {
  return VISIBLE_TO_PRESETS.find((preset) => sameRoleSet(preset.roles, roles)) ?? null;
}

/** "NEW_AGENT" -> "New Agent", used when the server sent no label. */
export function humanizeRole(role: string): string {
  return role
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Default role options when the page has no roles endpoint. */
export const DEFAULT_ROLE_OPTIONS: RoleOption[] = CONTENT_ROLES.map((name) => ({
  name,
  label: humanizeRole(name),
}));

/** Human summary of a role list, e.g. "Everyone", "Broker and up", "Leader, Broker". */
export function describeVisibleTo(roles: string[], options?: RoleOption[]): string {
  const preset = matchVisibleToPreset(roles);
  if (preset) return preset.label;
  const labels = new Map((options ?? DEFAULT_ROLE_OPTIONS).map((o) => [o.name, o.label]));
  return roles.map((role) => labels.get(role) ?? humanizeRole(role)).join(', ');
}
