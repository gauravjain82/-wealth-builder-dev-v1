import type { ReactNode } from 'react';
import {
  IconBolt,
  IconCalendar,
  IconCalendarEvent,
  IconChecklist,
  IconChartBar,
  IconChartDots,
  IconCertificate,
  IconDeviceGamepad2,
  IconFileAnalytics,
  IconFileDescription,
  IconFileText,
  IconFolder,
  IconHelp,
  IconHome,
  IconId,
  IconLock,
  IconMovie,
  IconPhoto,
  IconRocket,
  IconSettings,
  IconSitemap,
  IconTarget,
  IconTicket,
  IconTool,
  IconTrophy,
  IconUpload,
  IconUserCog,
  IconUserSearch,
  IconUsers,
  IconVideo,
} from '@tabler/icons-react';

interface IconSpec {
  icon?: (props: { size?: number; style?: Record<string, string> }) => ReactNode;
  color?: string;
  imageSrc?: string;
}

const ICON_MAP: Record<string, IconSpec> = {
  Home: { icon: IconHome, color: '#FFD700' },
  'Insight Center': { icon: IconBolt, color: '#1E90FF' },
  'Onboarding Game': { icon: IconDeviceGamepad2, color: '#FF4500' },
  Licensing: { icon: IconId, color: '#1E90FF' },
  'Track My License': { icon: IconChecklist, color: '#1E90FF' },
  'Licensing Documents': { icon: IconFileDescription, color: '#C0C0C0' },
  'Crash Course': { icon: IconRocket, color: '#FFA500' },
  '10 Systematic Tools': { icon: IconTool, color: '#1E90FF' },
  'My Team': { icon: IconUsers, color: '#F4A7B9' },
  'Org Chart': { icon: IconSitemap, color: '#F4A7B9' },
  'Prospect Tracker': { icon: IconUserSearch, color: '#1E90FF' },
  '4x4 Tracker': {
    imageSrc:
      'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/4x4logo.png?alt=media&token=4867ff8e-efdd-4933-805d-01f193837337',
  },
  'Associate Tracker': { icon: IconUsers, color: '#F4A7B9' },
  'Licensing Tracker': { icon: IconCertificate, color: '#F5F5F5' },
  'Production Tracker': {
    imageSrc:
      'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/ChatGPT%20Image%20Sep%2014%2C%202025%2C%2010_07_20%20PM.png?alt=media&token=8bcac8b2-de4a-4e19-83c6-f3beb8d82362',
  },
  Matchup: { icon: IconUsers, color: '#32CD32' },
  'Training Center': { icon: IconTarget, color: '#32CD32' },
  'Training Schedule': { icon: IconCalendarEvent, color: '#32CD32' },
  Calendar: { icon: IconCalendar, color: '#1E90FF' },
  'File Vault': { icon: IconFolder, color: '#C0C0C0' },
  'Help Desk': { icon: IconHelp, color: '#F4A7B9' },
  'Big Event': { icon: IconTicket, color: '#FFA500' },
  'Big Event Builder': { icon: IconTicket, color: '#FFA500' },
  Purchases: { icon: IconFileText, color: '#FFD700' },
  'Check-in': { icon: IconChecklist, color: '#32CD32' },
  Permissions: { icon: IconLock, color: '#1E90FF' },
  'Recognition Orders': { icon: IconTrophy, color: '#FFD700' },
  Reports: { icon: IconChartBar, color: '#1E90FF' },
  Admin: { icon: IconUserCog, color: '#FFD700' },
  'User Management': { icon: IconUsers, color: '#FFD700' },
  'Unified Video Manager': { icon: IconVideo, color: '#1E90FF' },
  'Video Management': { icon: IconMovie, color: '#C0C0C0' },
  'Carousel Manager': { icon: IconPhoto, color: '#FFA500' },
  'Page Builder (Beta)': { icon: IconTool, color: '#FFD700' },
  'Site Settings': { icon: IconSettings, color: '#C0C0C0' },
  'Analytics Dashboard': { icon: IconChartDots, color: '#1E90FF' },
  'Event Signup': { icon: IconFileText, color: '#32CD32' },
  'Onboarding Video Manager': { icon: IconVideo, color: '#FF4500' },
  'Upgrade Requests': { icon: IconUpload, color: '#1E90FF' },
};

export function getSidebarMenuIcon(
  label: string,
  fallbackIcon?: ReactNode,
  size = 20
): ReactNode {
  const spec = ICON_MAP[label];

  if (spec?.imageSrc) {
    return (
      <img
        src={spec.imageSrc}
        alt={label}
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    );
  }

  if (spec?.icon) {
    const IconComponent = spec.icon;
    return <IconComponent size={size} style={{ color: spec.color ?? '#ffffff' }} />;
  }

  if (fallbackIcon) {
    return fallbackIcon;
  }

  return <IconFileAnalytics size={size} style={{ color: '#ffffff' }} />;
}
