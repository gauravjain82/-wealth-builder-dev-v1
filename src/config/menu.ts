import { Plan } from '@core/types';
import type { AccountType } from '../features/auth/types';

/**
 * Menu item configuration
 */
export interface MenuItem {
  /** Display label */
  label: string;
  /** Icon (emoji or component) */
  icon?: string;
  /** Route path (if direct link) */
  path?: string;
  /** Child menu items (for nested menus) */
  children?: MenuItem[];
  /** External URL (opens in new tab) */
  externalUrl?: string;
  /** Minimum roles required to see this item */
  roles?: AccountType[];
}

/**
 * Menu item definitions with icons
 */
const MENU_ITEMS = {
  // Core items (all users)
  HOME: { label: 'Home', icon: '🏠', path: '/home' } as MenuItem,
  INSIGHT_CENTER: { label: 'Insight Center', icon: '💡', path: '/insight-center' } as MenuItem,
  ONBOARDING_GAME: { label: 'Onboarding Game', icon: '🎮', path: '/onboarding-game' } as MenuItem,
  PROMOTION: { label: 'Promotion', icon: '🏆', path: '/promotion/dashboard' } as MenuItem,
  
  // Tools
  SYSTEMATIC_TOOLS: { label: '10 Systematic Tools', icon: '🛠️', path: '/systematic-tools' } as MenuItem,
  TRAINING_CENTER: { label: 'Training Center', icon: '🎓', path: '/training-center' } as MenuItem,
  TRAINING_SCHEDULE: { label: 'Training Schedule', icon: '📅', path: '/training-schedule' } as MenuItem,
  CALENDAR: { label: 'Calendar', icon: '📆', path: '/calendar' } as MenuItem,
  FILE_VAULT: { label: 'File Vault', icon: '📁', path: '/file-vault' } as MenuItem,
  HELP_DESK: { label: 'Help Desk', icon: '❓', path: '/helpdesk' } as MenuItem,
  MATCHUP: { label: 'Matchup', icon: '🤝', path: '/matchup' } as MenuItem,

  // BPM (Business Presentation Meetings)
  BPM_OVERVIEW: { label: 'BPM Overview', icon: '📊', path: '/bpm/overview' } as MenuItem,
  BPM_ADD_GUEST: { label: 'Add Guest', icon: '👤', path: '/bpm/add-guest' } as MenuItem,
  BPM_VIEW_INVITES: { label: 'Guest Invites', icon: '📬', path: '/bpm/view-invites' } as MenuItem,
  BPM_ASSOCIATE_INVITES: { label: 'Associate Invites', icon: '📇', path: '/bpm/associate-invites' } as MenuItem,
  BPM_ASSOCIATE_CHECKIN: { label: 'Associate Check-In', icon: '✅', path: '/bpm/associate-checkin' } as MenuItem,
  BPM_GUEST_CHECKIN: { label: 'Guest Check-In', icon: '✔️', path: '/bpm/guest-checkin' } as MenuItem,
  BPM_SCHEDULE: { label: 'BPM Schedule', icon: '📅', path: '/bpm/schedule' } as MenuItem,
  // Last sub-link. Gated per-user by bpm_settings:manage, checked in the page.
  BPM_SETTINGS: { label: 'BPM Settings', icon: '⚙️', path: '/bpm/settings' } as MenuItem,


  // Licensing items
  TRACK_LICENSE: { label: 'Track My License', icon: '📋', path: '/licensing/track' } as MenuItem,
  LICENSING_DOCS: { label: 'Licensing Documents', icon: '📄', path: '/licensing/documents' } as MenuItem,
  CRASH_COURSE: { label: 'Crash Course', icon: '🚀', path: '/licensing/crash-course' } as MenuItem,
  
  // My Team items
  ORG_CHART: { label: 'Org Chart', icon: '📊', path: '/team/org-chart' } as MenuItem,
  PROSPECT_TRACKER: { label: 'Prospect Tracker', icon: '👥', path: '/team/prospect-tracker' } as MenuItem,
  MISSION_TRACKER: { label: 'Mission Tracker', icon: '📈', path: '/team/mission-tracker' } as MenuItem,
  ASSOCIATE_TRACKER: { label: 'Associate Tracker', icon: '👔', path: '/team/associate-tracker' } as MenuItem,
  BUILDERS: { label: 'Builders', icon: '🏗️', path: '/team/builders' } as MenuItem,

  // Builder AI
  BUILDER_AI_HOME: { label: 'Home', icon: '🏠', path: '/builder-ai/home' } as MenuItem,
  BUILDER_AI_COMPANY: { label: 'Company', icon: '🏢', path: '/builder-ai/company' } as MenuItem,
  BUILDER_AI_BASESHOP: { label: 'Baseshop', icon: '🏬', path: '/builder-ai/baseshop' } as MenuItem,
  BUILDER_AI_INVITATIONS: { label: 'Invitations', icon: '✉️', path: '/builder-ai/invitations' } as MenuItem,
  BUILDER_AI_REPORTING: { label: 'Reporting', icon: '📈', path: '/builder-ai/reporting' } as MenuItem,
  BUILDER_AI_BULLETIN: { label: 'Bulletin', icon: '🏆', path: '/builder-ai/bulletin' } as MenuItem,
  // Data Integrity (admin-only diagnostic reports; gated per-user by misalignments:read)
  LEADER_MISALIGNMENTS: {
    label: 'Leader Misalignments',
    icon: '⚠️',
    path: '/admin/data-integrity/leader-misalignments',
  } as MenuItem,
  POLICY_MISALIGNMENTS: {
    label: 'Policy Misalignments',
    icon: '📋',
    path: '/admin/data-integrity/policy-misalignments',
  } as MenuItem,
  // Product catalog management (gated per-user by products:read)
  PRODUCTS: { label: 'Products', icon: '📦', path: '/admin/products' } as MenuItem,
  // WB Leaderboards + Home v2 (gated per-user by homev2:read — a named rollout
  // list, not a role, so no plan grants either of these)
  HOME_V2: { label: 'Home (new)', icon: '✨', path: '/home-v2' } as MenuItem,
  LEADERBOARDS: { label: 'Leaderboards', icon: '🏅', path: '/leaderboards' } as MenuItem,
  // WB reporting pipeline operations (gated per-user by wbreporting:read/manage)
  REPORTING_PIPELINE: {
    label: 'Reporting Pipeline',
    icon: '⚙️',
    path: '/admin/reporting-pipeline',
  } as MenuItem,
  LICENSING_TRACKER: { label: 'Licensing Tracker', icon: '📝', path: '/team/licensing-tracker' } as MenuItem,
  PRODUCTION_TRACKER: { label: 'Production Tracker', icon: '💰', path: '/team/production-tracker' } as MenuItem,
  TEAM_PROMOTION: { label: 'Team Promotion Tracker', icon: '📈', path: '/promotion/team' } as MenuItem,
  INVITE_AGENTS: { label: 'Invite Agents', icon: '📨', path: '/admin/invite-agents' } as MenuItem,
  TERMINATED_USERS: { label: 'Terminated Users', icon: '🚫', path: '/terminated-users' } as MenuItem,
  
  // Big Event items
  BIG_EVENT_BUILDER: { label: 'Big Event Builder', icon: '🎪', path: '/events' } as MenuItem,
  PURCHASES: { label: 'Purchases', icon: '🛒', path: '/events/purchases' } as MenuItem,
  CHECK_IN: { label: 'Check-in', icon: '✅', path: '/events/check-in' } as MenuItem,
  PERMISSIONS: { label: 'Permissions', icon: '🔐', path: '/events/permissions' } as MenuItem,
  RECOGNITION_ORDERS: { label: 'Recognition Orders', icon: '🏆', path: '/events/recognition' } as MenuItem,
  
  // Admin items
  MISSION_RING_PROOF_ADMIN: { label: 'Mission Ring Proof', icon: '💍', path: '/admin/mission-ring-proof' } as MenuItem,
  HELPDESK_ADMIN: { label: 'Helpdesk', icon: '🆘', path: '/admin/helpdesk' } as MenuItem,
  FUNCTIONS: { label: 'Functions', icon: '🧩', path: '/admin/functions' } as MenuItem,
  USER_PERMISSIONS: { label: 'User Permissions', icon: '🔐', path: '/admin/user-permissions' } as MenuItem,
  LEVEL_PERMISSIONS: { label: 'Level Permissions', icon: '📊', path: '/admin/level-permissions' } as MenuItem,
  FILE_VAULT_ADMIN: { label: 'File Vault', icon: '📁', path: '/admin/file-vault' } as MenuItem,
  TRAINING_CENTER_ADMIN: { label: 'Training Center', icon: '🎓', path: '/admin/training-center' } as MenuItem,
  HOME_CONTENT_ADMIN: { label: 'Home Content', icon: '🎬', path: '/admin/home-content' } as MenuItem,
};

/**
 * Builder AI group — visibility is not plan-based. It is injected by
 * `getMenuForUser` for any user the backend `/api/builderai/my-access/` endpoint
 * reports `can_view: true` for (owners, active builders, and pending invitees).
 */
const BUILDER_AI_GROUP: MenuItem = {
  label: 'Builder AI',
  icon: '🌱',
  children: [
    MENU_ITEMS.BUILDER_AI_HOME,
    MENU_ITEMS.BUILDER_AI_COMPANY,
    MENU_ITEMS.BUILDER_AI_BASESHOP,
    MENU_ITEMS.BUILDER_AI_INVITATIONS,
    MENU_ITEMS.BUILDER_AI_REPORTING,
    MENU_ITEMS.BUILDER_AI_BULLETIN,
  ],
};

/**
 * Data Integrity group — admin-only diagnostic reports. Like Builder AI, this
 * is NOT plan-based: it is injected by `getMenuForUser` only when the backend
 * `/api/misalignments/my-access/` endpoint reports `can_view: true` (i.e. the
 * user was granted `misalignments:read` in the access console).
 */
const DATA_INTEGRITY_GROUP: MenuItem = {
  label: 'Data Integrity',
  icon: '🩺',
  children: [MENU_ITEMS.LEADER_MISALIGNMENTS, MENU_ITEMS.POLICY_MISALIGNMENTS],
};

/**
 * Plan-based menu structures
 * These mirror the old site's getSidebarStructure() function
 */
export const PLAN_MENUS = {
  [Plan.NewAgent]: [
    MENU_ITEMS.HOME,
    MENU_ITEMS.INSIGHT_CENTER,
    MENU_ITEMS.ONBOARDING_GAME,
    MENU_ITEMS.PROMOTION,
    {
      label: 'Licensing',
      icon: '📜',
      children: [
        MENU_ITEMS.TRACK_LICENSE,
        MENU_ITEMS.CRASH_COURSE,
      ],
    },
    MENU_ITEMS.SYSTEMATIC_TOOLS,
    {
      label: 'My Team',
      icon: '👥',
      children: [
        MENU_ITEMS.PROSPECT_TRACKER,
      ],
    },
    MENU_ITEMS.MATCHUP,
    {
      label: 'BPM',
      icon: '📊',
      children: [
        MENU_ITEMS.BPM_OVERVIEW,
        MENU_ITEMS.BPM_ADD_GUEST,
        MENU_ITEMS.BPM_VIEW_INVITES,
        MENU_ITEMS.BPM_ASSOCIATE_INVITES,
        MENU_ITEMS.BPM_ASSOCIATE_CHECKIN,
        MENU_ITEMS.BPM_GUEST_CHECKIN,
        MENU_ITEMS.BPM_SCHEDULE,
        MENU_ITEMS.BPM_SETTINGS,
      ],
    },
    MENU_ITEMS.TRAINING_CENTER,
    MENU_ITEMS.TRAINING_SCHEDULE,
    MENU_ITEMS.FILE_VAULT,
    MENU_ITEMS.HELP_DESK,
  ] as MenuItem[],
  
  [Plan.Agent]: [
    MENU_ITEMS.HOME,
    MENU_ITEMS.INSIGHT_CENTER,
    MENU_ITEMS.ONBOARDING_GAME,
    MENU_ITEMS.PROMOTION,
    {
      label: 'Licensing',
      icon: '📜',
      children: [
        MENU_ITEMS.TRACK_LICENSE,
        MENU_ITEMS.LICENSING_DOCS,
        MENU_ITEMS.CRASH_COURSE,
      ],
    },
    MENU_ITEMS.SYSTEMATIC_TOOLS,
    {
      label: 'My Team',
      icon: '👥',
      children: [
        MENU_ITEMS.PROSPECT_TRACKER,
        MENU_ITEMS.ORG_CHART,
        MENU_ITEMS.PRODUCTION_TRACKER,
      ],
    },
    MENU_ITEMS.MATCHUP,
    {
      label: 'BPM',
      icon: '📊',
      children: [
        MENU_ITEMS.BPM_OVERVIEW,
        MENU_ITEMS.BPM_ADD_GUEST,
        MENU_ITEMS.BPM_VIEW_INVITES,
        MENU_ITEMS.BPM_ASSOCIATE_INVITES,
        MENU_ITEMS.BPM_ASSOCIATE_CHECKIN,
        MENU_ITEMS.BPM_GUEST_CHECKIN,
        MENU_ITEMS.BPM_SCHEDULE,
        MENU_ITEMS.BPM_SETTINGS,
      ],
    },
    MENU_ITEMS.TRAINING_CENTER,
    MENU_ITEMS.TRAINING_SCHEDULE,
    MENU_ITEMS.CALENDAR,
    MENU_ITEMS.FILE_VAULT,
    MENU_ITEMS.HELP_DESK,
  ] as MenuItem[],
  
  [Plan.Leader]: [
    MENU_ITEMS.HOME,
    MENU_ITEMS.INSIGHT_CENTER,
    MENU_ITEMS.ONBOARDING_GAME,
    MENU_ITEMS.PROMOTION,
    {
      label: 'Licensing',
      icon: '📜',
      children: [
        MENU_ITEMS.TRACK_LICENSE,
        MENU_ITEMS.LICENSING_DOCS,
        MENU_ITEMS.CRASH_COURSE,
      ],
    },
    MENU_ITEMS.SYSTEMATIC_TOOLS,
    {
      label: 'My Team',
      icon: '👥',
      children: [
        MENU_ITEMS.ORG_CHART,
        MENU_ITEMS.PROSPECT_TRACKER,
        MENU_ITEMS.MISSION_TRACKER,
        MENU_ITEMS.ASSOCIATE_TRACKER,
        MENU_ITEMS.BUILDERS,
        MENU_ITEMS.LICENSING_TRACKER,
        MENU_ITEMS.PRODUCTION_TRACKER,
        MENU_ITEMS.TEAM_PROMOTION,
      ],
    },
    MENU_ITEMS.MATCHUP,
    {
      label: 'BPM',
      icon: '📊',
      children: [
        MENU_ITEMS.BPM_OVERVIEW,
        MENU_ITEMS.BPM_ADD_GUEST,
        MENU_ITEMS.BPM_VIEW_INVITES,
        MENU_ITEMS.BPM_ASSOCIATE_INVITES,
        MENU_ITEMS.BPM_ASSOCIATE_CHECKIN,
        MENU_ITEMS.BPM_GUEST_CHECKIN,
        MENU_ITEMS.BPM_SCHEDULE,
        MENU_ITEMS.BPM_SETTINGS,
      ],
    },
    MENU_ITEMS.TRAINING_CENTER,
    MENU_ITEMS.TRAINING_SCHEDULE,
    MENU_ITEMS.CALENDAR,
    MENU_ITEMS.FILE_VAULT,
    MENU_ITEMS.HELP_DESK,
    MENU_ITEMS.INVITE_AGENTS,
  ] as MenuItem[],
  
  [Plan.Broker]: [
    MENU_ITEMS.HOME,    MENU_ITEMS.INSIGHT_CENTER,
    MENU_ITEMS.ONBOARDING_GAME,
    MENU_ITEMS.PROMOTION,
    {
      label: 'Licensing',
      icon: '📜',
      children: [
        MENU_ITEMS.TRACK_LICENSE,
        MENU_ITEMS.LICENSING_DOCS,
        MENU_ITEMS.CRASH_COURSE,
      ],
    },
    MENU_ITEMS.SYSTEMATIC_TOOLS,
    {
      label: 'My Team',
      icon: '👥',
      children: [
        MENU_ITEMS.ORG_CHART,
        MENU_ITEMS.PROSPECT_TRACKER,
        MENU_ITEMS.MISSION_TRACKER,
        MENU_ITEMS.ASSOCIATE_TRACKER,
        MENU_ITEMS.BUILDERS,
        MENU_ITEMS.LICENSING_TRACKER,
        MENU_ITEMS.PRODUCTION_TRACKER,
        MENU_ITEMS.TEAM_PROMOTION,
      ],
    },
    MENU_ITEMS.MATCHUP,
    {
      label: 'BPM',
      icon: '📊',
      children: [
        MENU_ITEMS.BPM_OVERVIEW,
        MENU_ITEMS.BPM_ADD_GUEST,
        MENU_ITEMS.BPM_VIEW_INVITES,
        MENU_ITEMS.BPM_ASSOCIATE_INVITES,
        MENU_ITEMS.BPM_ASSOCIATE_CHECKIN,
        MENU_ITEMS.BPM_GUEST_CHECKIN,
        MENU_ITEMS.BPM_SCHEDULE,
        MENU_ITEMS.BPM_SETTINGS,
      ],
    },
    {
      label: 'Big Event',
      icon: '🎪',
      children: [
        MENU_ITEMS.BIG_EVENT_BUILDER,
        MENU_ITEMS.PURCHASES,
        MENU_ITEMS.CHECK_IN,
        MENU_ITEMS.PERMISSIONS,
        MENU_ITEMS.RECOGNITION_ORDERS,
      ],
    },
    MENU_ITEMS.TRAINING_CENTER,
    MENU_ITEMS.TRAINING_SCHEDULE,
    MENU_ITEMS.CALENDAR,
    MENU_ITEMS.FILE_VAULT,
    MENU_ITEMS.HELP_DESK,
    MENU_ITEMS.INVITE_AGENTS,
  ] as MenuItem[],
  
  // Senior Broker uses same menu as Broker
  [Plan.SeniorBroker]: [
    MENU_ITEMS.HOME,    MENU_ITEMS.INSIGHT_CENTER,
    MENU_ITEMS.ONBOARDING_GAME,
    MENU_ITEMS.PROMOTION,
    {
      label: 'Licensing',
      icon: '📜',
      children: [
        MENU_ITEMS.TRACK_LICENSE,
        MENU_ITEMS.LICENSING_DOCS,
        MENU_ITEMS.CRASH_COURSE,
      ],
    },
    MENU_ITEMS.SYSTEMATIC_TOOLS,
    {
      label: 'My Team',
      icon: '👥',
      children: [
        MENU_ITEMS.ORG_CHART,
        MENU_ITEMS.PROSPECT_TRACKER,
        MENU_ITEMS.MISSION_TRACKER,
        MENU_ITEMS.ASSOCIATE_TRACKER,
        MENU_ITEMS.BUILDERS,
        MENU_ITEMS.LICENSING_TRACKER,
        MENU_ITEMS.PRODUCTION_TRACKER,
        MENU_ITEMS.TEAM_PROMOTION,
      ],
    },
    MENU_ITEMS.MATCHUP,
    {
      label: 'BPM',
      icon: '📊',
      children: [
        MENU_ITEMS.BPM_OVERVIEW,
        MENU_ITEMS.BPM_ADD_GUEST,
        MENU_ITEMS.BPM_VIEW_INVITES,
        MENU_ITEMS.BPM_ASSOCIATE_INVITES,
        MENU_ITEMS.BPM_ASSOCIATE_CHECKIN,
        MENU_ITEMS.BPM_GUEST_CHECKIN,
        MENU_ITEMS.BPM_SCHEDULE,
        MENU_ITEMS.BPM_SETTINGS,
      ],
    },
    {
      label: 'Big Event',
      icon: '🎪',
      children: [
        MENU_ITEMS.BIG_EVENT_BUILDER,
        MENU_ITEMS.PURCHASES,
        MENU_ITEMS.CHECK_IN,
        MENU_ITEMS.PERMISSIONS,
        MENU_ITEMS.RECOGNITION_ORDERS,
      ],
    },
    MENU_ITEMS.TRAINING_CENTER,
    MENU_ITEMS.TRAINING_SCHEDULE,
    MENU_ITEMS.CALENDAR,
    MENU_ITEMS.FILE_VAULT,
    MENU_ITEMS.HELP_DESK,
    MENU_ITEMS.INVITE_AGENTS,
  ] as MenuItem[],
  
  [Plan.Admin]: [
    MENU_ITEMS.HOME,    MENU_ITEMS.INSIGHT_CENTER,
    MENU_ITEMS.ONBOARDING_GAME,
    MENU_ITEMS.PROMOTION,
    {
      label: 'Licensing',
      icon: '📜',
      children: [
        MENU_ITEMS.TRACK_LICENSE,
        MENU_ITEMS.LICENSING_DOCS,
        MENU_ITEMS.CRASH_COURSE,
      ],
    },
    MENU_ITEMS.SYSTEMATIC_TOOLS,
    {
      label: 'My Team',
      icon: '👥',
      children: [
        MENU_ITEMS.ORG_CHART,
        MENU_ITEMS.PROSPECT_TRACKER,
        MENU_ITEMS.MISSION_TRACKER,
        MENU_ITEMS.ASSOCIATE_TRACKER,
        MENU_ITEMS.BUILDERS,
        MENU_ITEMS.LICENSING_TRACKER,
        MENU_ITEMS.PRODUCTION_TRACKER,
        MENU_ITEMS.TEAM_PROMOTION,
      ],
    },
    MENU_ITEMS.MATCHUP,
    {
      label: 'BPM',
      icon: '📊',
      children: [
        MENU_ITEMS.BPM_OVERVIEW,
        MENU_ITEMS.BPM_ADD_GUEST,
        MENU_ITEMS.BPM_VIEW_INVITES,
        MENU_ITEMS.BPM_ASSOCIATE_INVITES,
        MENU_ITEMS.BPM_ASSOCIATE_CHECKIN,
        MENU_ITEMS.BPM_GUEST_CHECKIN,
        MENU_ITEMS.BPM_SCHEDULE,
        MENU_ITEMS.BPM_SETTINGS,
      ],
    },
    {
      label: 'Big Event',
      icon: '🎪',
      children: [
        MENU_ITEMS.BIG_EVENT_BUILDER,
        MENU_ITEMS.PURCHASES,
        MENU_ITEMS.CHECK_IN,
        MENU_ITEMS.PERMISSIONS,
        MENU_ITEMS.RECOGNITION_ORDERS,
      ],
    },
    MENU_ITEMS.TRAINING_CENTER,
    MENU_ITEMS.TRAINING_SCHEDULE,
    MENU_ITEMS.CALENDAR,
    MENU_ITEMS.FILE_VAULT,
    MENU_ITEMS.HELP_DESK,
    MENU_ITEMS.INVITE_AGENTS,
    MENU_ITEMS.TERMINATED_USERS,
    {
      label: 'Admin',
      icon: '👨‍💼',
      children: [
        MENU_ITEMS.MISSION_RING_PROOF_ADMIN,
        MENU_ITEMS.HELPDESK_ADMIN,
        MENU_ITEMS.FUNCTIONS,
        MENU_ITEMS.FILE_VAULT_ADMIN,
        MENU_ITEMS.TRAINING_CENTER_ADMIN,
        MENU_ITEMS.HOME_CONTENT_ADMIN,
        MENU_ITEMS.USER_PERMISSIONS,
        MENU_ITEMS.LEVEL_PERMISSIONS,
      ],
    },
  ] as MenuItem[],

  [Plan.SuperAdmin]: [
    MENU_ITEMS.HOME,    MENU_ITEMS.INSIGHT_CENTER,
    MENU_ITEMS.ONBOARDING_GAME,
    MENU_ITEMS.PROMOTION,
    {
      label: 'Licensing',
      icon: '📜',
      children: [
        MENU_ITEMS.TRACK_LICENSE,
        MENU_ITEMS.LICENSING_DOCS,
        MENU_ITEMS.CRASH_COURSE,
      ],
    },
    MENU_ITEMS.SYSTEMATIC_TOOLS,
    {
      label: 'My Team',
      icon: '👥',
      children: [
        MENU_ITEMS.ORG_CHART,
        MENU_ITEMS.PROSPECT_TRACKER,
        MENU_ITEMS.MISSION_TRACKER,
        MENU_ITEMS.ASSOCIATE_TRACKER,
        MENU_ITEMS.BUILDERS,
        MENU_ITEMS.LICENSING_TRACKER,
        MENU_ITEMS.PRODUCTION_TRACKER,
        MENU_ITEMS.TEAM_PROMOTION,
      ],
    },
    MENU_ITEMS.MATCHUP,
    {
      label: 'BPM',
      icon: '📊',
      children: [
        MENU_ITEMS.BPM_OVERVIEW,
        MENU_ITEMS.BPM_ADD_GUEST,
        MENU_ITEMS.BPM_VIEW_INVITES,
        MENU_ITEMS.BPM_ASSOCIATE_INVITES,
        MENU_ITEMS.BPM_ASSOCIATE_CHECKIN,
        MENU_ITEMS.BPM_GUEST_CHECKIN,
        MENU_ITEMS.BPM_SCHEDULE,
        MENU_ITEMS.BPM_SETTINGS,
      ],
    },
    {
      label: 'Big Event',
      icon: '🎪',
      children: [
        MENU_ITEMS.BIG_EVENT_BUILDER,
        MENU_ITEMS.PURCHASES,
        MENU_ITEMS.CHECK_IN,
        MENU_ITEMS.PERMISSIONS,
        MENU_ITEMS.RECOGNITION_ORDERS,
      ],
    },
    MENU_ITEMS.TRAINING_CENTER,
    MENU_ITEMS.TRAINING_SCHEDULE,
    MENU_ITEMS.CALENDAR,
    MENU_ITEMS.FILE_VAULT,
    MENU_ITEMS.HELP_DESK,
    MENU_ITEMS.INVITE_AGENTS,
    MENU_ITEMS.TERMINATED_USERS,
    {
      label: 'Admin',
      icon: '👨‍💼',
      children: [
        MENU_ITEMS.MISSION_RING_PROOF_ADMIN,
        MENU_ITEMS.HELPDESK_ADMIN,
        MENU_ITEMS.FUNCTIONS,
        MENU_ITEMS.FILE_VAULT_ADMIN,
        MENU_ITEMS.TRAINING_CENTER_ADMIN,
        MENU_ITEMS.HOME_CONTENT_ADMIN,
        MENU_ITEMS.USER_PERMISSIONS,
        MENU_ITEMS.LEVEL_PERMISSIONS,
      ],
    },
  ] as MenuItem[],
};

/**
 * Get menu structure for a specific plan
 */
const DEFAULT_PLAN: AccountType = Plan.NewAgent;

function normalizePlan(plan: unknown): AccountType {
  if (typeof plan !== 'string') return DEFAULT_PLAN;
  const normalized = Object.values(Plan).find((value) => value === plan);
  return normalized ?? DEFAULT_PLAN;
}

export function getMenuForPlan(plan: unknown): MenuItem[] {
  const normalizedPlan = normalizePlan(plan);
  return PLAN_MENUS[normalizedPlan];
}

/** True if `path` appears anywhere in the (possibly nested) menu. */
export function menuContainsPath(items: MenuItem[], path: string): boolean {
  return items.some(
    (item) => item.path === path || (item.children ? menuContainsPath(item.children, path) : false),
  );
}

/** Return a copy of the menu with every item matching `path` removed (recurses into children). */
export function removeMenuItemByPath(items: MenuItem[], path: string): MenuItem[] {
  return items
    .filter((item) => item.path !== path)
    .map((item) =>
      item.children ? { ...item, children: removeMenuItemByPath(item.children, path) } : item,
    );
}

/** Return a copy of the menu with every top-level item matching `label` removed. */
export function removeMenuGroupByLabel(items: MenuItem[], label: string): MenuItem[] {
  return items.filter((item) => item.label !== label);
}

/**
 * Within the top-level group `label`, drop every child except the one at `keepPath`.
 * Used to show only the Program entry when no program exists yet, so a manager's
 * clear next action is to create one instead of a list of empty dashboards.
 */
export function keepOnlyGroupChild(
  items: MenuItem[],
  label: string,
  keepPath: string,
): MenuItem[] {
  return items.map((item) =>
    item.label === label && item.children
      ? { ...item, children: item.children.filter((child) => child.path === keepPath) }
      : item,
  );
}

function cloneMenuItems(items: MenuItem[]): MenuItem[] {
  return items.map((item) => ({
    ...item,
    children: item.children ? cloneMenuItems(item.children) : undefined,
  }));
}

export function getMenuForUser(
  plan: unknown,
  hasPromotionAccess: boolean,
  canAccessBuilderAI: boolean = false,
  // Company Owner & Builder are separate things. Defaults to `true` so any
  // caller that doesn't distinguish the two keeps the full owner menu.
  isBuilderAiOwner: boolean = true,
  canAccessMisalignments: boolean = false,
  canAccessProducts: boolean = false,
  canAccessReportingPipeline: boolean = false,
  canAccessLeaderboards: boolean = false
): MenuItem[] {
  const normalizedPlan = normalizePlan(plan);
  let menuItems = cloneMenuItems(PLAN_MENUS[normalizedPlan]);

  // Builder AI is gated by backend access (owner / active builder / pending
  // invitee), not by plan — inject it just under Home for anyone allowed.
  if (canAccessBuilderAI && !menuItems.some((item) => item.label === BUILDER_AI_GROUP.label)) {
    const builderAiGroup = cloneMenuItems([BUILDER_AI_GROUP])[0];

    // Company Owner & Builder are separate things: a Company Owner sees the
    // full Builder AI group (unchanged from today), but a Builder is only part
    // of a baseshop and just needs to accept their invitation — so trim their
    // group down to Baseshop + Invitations only.
    if (!isBuilderAiOwner) {
      builderAiGroup.children = builderAiGroup.children?.filter(
        (child) =>
          child.path === MENU_ITEMS.BUILDER_AI_BASESHOP.path ||
          child.path === MENU_ITEMS.BUILDER_AI_INVITATIONS.path
      );
    }

    const homeIdx = menuItems.findIndex((item) => item.label === MENU_ITEMS.HOME.label);
    menuItems.splice(homeIdx >= 0 ? homeIdx + 1 : 0, 0, builderAiGroup);
  }

  // Data Integrity is gated by backend access (misalignments:read), not by
  // plan — inject it only for users the backend authorizes.
  if (
    canAccessMisalignments &&
    !menuItems.some((item) => item.label === DATA_INTEGRITY_GROUP.label)
  ) {
    menuItems.push(cloneMenuItems([DATA_INTEGRITY_GROUP])[0]);
  }

  // Product Management is gated by backend access (products:read), not by plan —
  // inject it only for users the backend authorizes.
  if (
    canAccessProducts &&
    !menuItems.some((item) => item.label === MENU_ITEMS.PRODUCTS.label)
  ) {
    menuItems.push(cloneMenuItems([MENU_ITEMS.PRODUCTS])[0]);
  }

  // Reporting Pipeline is gated by backend access (wbreporting:read or :manage),
  // not by plan — inject it only for users the backend authorizes.
  if (
    canAccessReportingPipeline &&
    !menuItems.some((item) => item.label === MENU_ITEMS.REPORTING_PIPELINE.label)
  ) {
    menuItems.push(cloneMenuItems([MENU_ITEMS.REPORTING_PIPELINE])[0]);
  }

  // Home v2 and Leaderboards are gated by backend access (homev2:read), not by
  // plan. They are injected at the top because Home v2 is a home page: burying it
  // under the admin entries would read as an admin tool, which it is not.
  if (canAccessLeaderboards) {
    const newEntries = [MENU_ITEMS.HOME_V2, MENU_ITEMS.LEADERBOARDS].filter(
      (entry) => !menuItems.some((item) => item.label === entry.label)
    );
    menuItems = [...cloneMenuItems(newEntries), ...menuItems];
  }

  if (normalizedPlan === Plan.NewAgent && !hasPromotionAccess) {
    menuItems = menuItems.filter((item) => item.label !== MENU_ITEMS.PROMOTION.label);
  }

  return menuItems;
}
