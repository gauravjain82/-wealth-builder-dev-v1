/** Display labels shared by the helpdesk pages and the "Report a problem" dialog. */

import type { HelpdeskCategory } from './services/helpdesk-service';

/** Ticket categories with human labels (same set as the public form). */
export const HELPDESK_CATEGORY_OPTIONS: Array<{ value: HelpdeskCategory; label: string }> = [
  { value: 'login', label: 'Cannot Login' },
  { value: 'access', label: 'Access Denied' },
  { value: 'password_reset', label: 'Password Reset' },
  { value: 'team_visibility', label: 'Cannot See Correct Team' },
  { value: 'file_visibility', label: 'Cannot See Correct Files' },
  { value: 'other', label: 'Other' },
];

/** Status value → label. */
export const HELPDESK_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  waiting_on_user: 'Waiting on user',
  resolved: 'Resolved',
  closed: 'Closed',
};

/** Tier value → short label. */
export const HELPDESK_TIER_LABELS: Record<string, string> = {
  l1: 'L1',
  l2: 'L2',
  l3: 'L3',
};

/** Tier value → who works it (tooltips, dialogs). */
export const HELPDESK_TIER_DESCRIPTIONS: Record<string, string> = {
  l1: 'SMD office (L1)',
  l2: 'Central support (L2)',
  l3: 'Engineering (L3)',
};

/** Queue state → label shown to the worker. */
export const HELPDESK_QUEUE_STATE_LABELS: Record<string, string> = {
  new: 'New',
  user_replied: 'User replied',
  received: 'Received',
  waiting_on_user: 'Waiting on user',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

/** Source value → label. */
export const HELPDESK_SOURCE_LABELS: Record<string, string> = {
  widget: 'Report button',
  public_form: 'Public form',
  telegram: 'Telegram',
};

/** Label for a category value, falling back to the raw value. */
export function categoryLabel(value: string): string {
  return HELPDESK_CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

/** Locale date-time for an ISO string, or the input when unparseable. */
export function formatHelpdeskDate(value: string | null | undefined): string {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}
