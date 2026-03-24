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
  
  // Tools
  SYSTEMATIC_TOOLS: { label: '10 Systematic Tools', icon: '🛠️', path: '/systematic-tools' } as MenuItem,
  TRAINING_CENTER: { label: 'Training Center', icon: '🎓', path: '/training-center' } as MenuItem,
  TRAINING_SCHEDULE: { label: 'Training Schedule', icon: '📅', path: '/training-schedule' } as MenuItem,
  CALENDAR: { label: 'Calendar', icon: '📆', path: '/calendar' } as MenuItem,
  FILE_VAULT: { label: 'File Vault', icon: '📁', path: '/file-vault' } as MenuItem,
  HELP_DESK: { 
    label: 'Help Desk', 
    icon: '❓', 
    externalUrl: 'https://wbhelpdesk.netlify.app' 
  } as MenuItem,
  MATCHUP: { label: 'Matchup', icon: '🤝', path: '/matchup' } as MenuItem,
  
  // Licensing items
  TRACK_LICENSE: { label: 'Track My License', icon: '📋', path: '/licensing/track' } as MenuItem,
  LICENSING_DOCS: { label: 'Licensing Documents', icon: '📄', path: '/licensing/documents' } as MenuItem,
  CRASH_COURSE: { label: 'Crash Course', icon: '🚀', path: '/licensing/crash-course' } as MenuItem,
  
  // My Team items
  ORG_CHART: { label: 'Org Chart', icon: '📊', path: '/team/org-chart' } as MenuItem,
  PROSPECT_TRACKER: { label: 'Prospect Tracker', icon: '👥', path: '/team/prospect-tracker' } as MenuItem,
  TRACKER_4X4: { label: '4x4 Tracker', icon: '📈', path: '/team/4x4-tracker' } as MenuItem,
  ASSOCIATE_TRACKER: { label: 'Associate Tracker', icon: '👔', path: '/team/associate-tracker' } as MenuItem,
  LICENSING_TRACKER: { label: 'Licensing Tracker', icon: '📝', path: '/team/licensing-tracker' } as MenuItem,
  PRODUCTION_TRACKER: { label: 'Production Tracker', icon: '💰', path: '/team/production-tracker' } as MenuItem,
  
  // Big Event items
  BIG_EVENT_BUILDER: { label: 'Big Event Builder', icon: '🎪', path: '/events/builder' } as MenuItem,
  PURCHASES: { label: 'Purchases', icon: '🛒', path: '/events/purchases' } as MenuItem,
  CHECK_IN: { label: 'Check-in', icon: '✅', path: '/events/check-in' } as MenuItem,
  PERMISSIONS: { label: 'Permissions', icon: '🔐', path: '/events/permissions' } as MenuItem,
  RECOGNITION_ORDERS: { label: 'Recognition Orders', icon: '🏆', path: '/events/recognition' } as MenuItem,
  EVENT_REPORTS: { label: 'Reports', icon: '📊', path: '/events/reports' } as MenuItem,
  
  // Admin items
  USER_MANAGEMENT: { label: 'User Management', icon: '👨‍💼', path: '/admin/users' } as MenuItem,
  UNIFIED_VIDEO_MANAGER: { label: 'Unified Video Manager', icon: '🎬', path: '/admin/unified-videos' } as MenuItem,
  VIDEO_MANAGEMENT: { label: 'Video Management', icon: '📹', path: '/admin/videos' } as MenuItem,
  CAROUSEL_MANAGER: { label: 'Carousel Manager', icon: '🎠', path: '/admin/carousel' } as MenuItem,
  PAGE_BUILDER: { label: 'Page Builder (Beta)', icon: '🏗️', path: '/admin/page-builder' } as MenuItem,
  SITE_SETTINGS: { label: 'Site Settings', icon: '⚙️', path: '/admin/settings' } as MenuItem,
  ANALYTICS_DASHBOARD: { label: 'Analytics Dashboard', icon: '📈', path: '/admin/analytics' } as MenuItem,
  EVENT_SIGNUP_ADMIN: { label: 'Event Signup', icon: '✍️', path: '/admin/event-signup' } as MenuItem,
  ONBOARDING_VIDEO_MANAGER: { label: 'Onboarding Video Manager', icon: '🎥', path: '/admin/onboarding-videos' } as MenuItem,
  UPGRADE_REQUESTS: { label: 'Upgrade Requests', icon: '⬆️', path: '/admin/upgrade-requests' } as MenuItem,
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
    MENU_ITEMS.TRAINING_CENTER,
    MENU_ITEMS.TRAINING_SCHEDULE,
    MENU_ITEMS.FILE_VAULT,
    MENU_ITEMS.HELP_DESK,
  ] as MenuItem[],
  
  [Plan.Agent]: [
    MENU_ITEMS.HOME,
    MENU_ITEMS.INSIGHT_CENTER,
    MENU_ITEMS.ONBOARDING_GAME,
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
        MENU_ITEMS.TRACKER_4X4,
        MENU_ITEMS.ASSOCIATE_TRACKER,
        MENU_ITEMS.LICENSING_TRACKER,
        MENU_ITEMS.PRODUCTION_TRACKER,
      ],
    },
    MENU_ITEMS.MATCHUP,
    MENU_ITEMS.TRAINING_CENTER,
    MENU_ITEMS.TRAINING_SCHEDULE,
    MENU_ITEMS.CALENDAR,
    MENU_ITEMS.FILE_VAULT,
    MENU_ITEMS.HELP_DESK,
  ] as MenuItem[],
  
  [Plan.Broker]: [
    MENU_ITEMS.HOME,
    MENU_ITEMS.INSIGHT_CENTER,
    MENU_ITEMS.ONBOARDING_GAME,
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
        MENU_ITEMS.TRACKER_4X4,
        MENU_ITEMS.ASSOCIATE_TRACKER,
        MENU_ITEMS.LICENSING_TRACKER,
        MENU_ITEMS.PRODUCTION_TRACKER,
      ],
    },
    MENU_ITEMS.MATCHUP,
    {
      label: 'Big Event',
      icon: '🎪',
      children: [
        MENU_ITEMS.BIG_EVENT_BUILDER,
        MENU_ITEMS.PURCHASES,
        MENU_ITEMS.CHECK_IN,
        MENU_ITEMS.PERMISSIONS,
        MENU_ITEMS.RECOGNITION_ORDERS,
        MENU_ITEMS.EVENT_REPORTS,
      ],
    },
    MENU_ITEMS.TRAINING_CENTER,
    MENU_ITEMS.TRAINING_SCHEDULE,
    MENU_ITEMS.CALENDAR,
    MENU_ITEMS.FILE_VAULT,
    MENU_ITEMS.HELP_DESK,
  ] as MenuItem[],
  
  // Senior Broker uses same menu as Broker
  [Plan.SeniorBroker]: [
    MENU_ITEMS.HOME,
    MENU_ITEMS.INSIGHT_CENTER,
    MENU_ITEMS.ONBOARDING_GAME,
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
        MENU_ITEMS.TRACKER_4X4,
        MENU_ITEMS.ASSOCIATE_TRACKER,
        MENU_ITEMS.LICENSING_TRACKER,
        MENU_ITEMS.PRODUCTION_TRACKER,
      ],
    },
    MENU_ITEMS.MATCHUP,
    {
      label: 'Big Event',
      icon: '🎪',
      children: [
        MENU_ITEMS.BIG_EVENT_BUILDER,
        MENU_ITEMS.PURCHASES,
        MENU_ITEMS.CHECK_IN,
        MENU_ITEMS.PERMISSIONS,
        MENU_ITEMS.RECOGNITION_ORDERS,
        MENU_ITEMS.EVENT_REPORTS,
      ],
    },
    MENU_ITEMS.TRAINING_CENTER,
    MENU_ITEMS.TRAINING_SCHEDULE,
    MENU_ITEMS.CALENDAR,
    MENU_ITEMS.FILE_VAULT,
    MENU_ITEMS.HELP_DESK,
  ] as MenuItem[],
  
  [Plan.Admin]: [
    MENU_ITEMS.HOME,
    MENU_ITEMS.INSIGHT_CENTER,
    MENU_ITEMS.ONBOARDING_GAME,
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
        MENU_ITEMS.TRACKER_4X4,
        MENU_ITEMS.ASSOCIATE_TRACKER,
        MENU_ITEMS.LICENSING_TRACKER,
        MENU_ITEMS.PRODUCTION_TRACKER,
      ],
    },
    MENU_ITEMS.MATCHUP,
    {
      label: 'Big Event',
      icon: '🎪',
      children: [
        MENU_ITEMS.BIG_EVENT_BUILDER,
        MENU_ITEMS.PURCHASES,
        MENU_ITEMS.CHECK_IN,
        MENU_ITEMS.PERMISSIONS,
        MENU_ITEMS.RECOGNITION_ORDERS,
        MENU_ITEMS.EVENT_REPORTS,
      ],
    },
    MENU_ITEMS.TRAINING_CENTER,
    MENU_ITEMS.TRAINING_SCHEDULE,
    MENU_ITEMS.CALENDAR,
    MENU_ITEMS.FILE_VAULT,
    MENU_ITEMS.HELP_DESK,
    {
      label: 'Admin',
      icon: '👨‍💼',
      children: [
        MENU_ITEMS.USER_MANAGEMENT,
        MENU_ITEMS.UNIFIED_VIDEO_MANAGER,
        MENU_ITEMS.VIDEO_MANAGEMENT,
        MENU_ITEMS.CAROUSEL_MANAGER,
        MENU_ITEMS.PAGE_BUILDER,
        MENU_ITEMS.SITE_SETTINGS,
        MENU_ITEMS.ANALYTICS_DASHBOARD,
        MENU_ITEMS.EVENT_SIGNUP_ADMIN,
        MENU_ITEMS.ONBOARDING_VIDEO_MANAGER,
        MENU_ITEMS.UPGRADE_REQUESTS,
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
