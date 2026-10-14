/**
 * Attendance-status vocabulary shared by the metrics components: the label and
 * icon for each status, and the sentence that explains it.
 */

import { AlertOctagon, AlertTriangle, CheckCircle2, CircleSlash, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { MemberMetrics, MemberStatus } from '../types';
import { formatDay } from './time';

interface StatusMeta {
  label: string;
  icon: LucideIcon;
  /** Chip classes, both themes. Status colours always travel with the icon and label. */
  chip: string;
}

export const STATUS_META: Record<MemberStatus, StatusMeta> = {
  stopped: {
    label: 'Stopped',
    icon: AlertOctagon,
    chip: 'bg-red-100 text-red-800 ring-red-200 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-400/30',
  },
  never: {
    label: 'Never attended',
    icon: CircleSlash,
    chip: 'bg-white text-red-800 ring-red-300 dark:bg-transparent dark:text-red-200 dark:ring-red-400/50',
  },
  slipping: {
    label: 'Slipping',
    icon: AlertTriangle,
    chip: 'bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-400/15 dark:text-amber-100 dark:ring-amber-300/30',
  },
  on_track: {
    label: 'On track',
    icon: CheckCircle2,
    chip: 'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/30',
  },
  new: {
    label: 'New',
    icon: Sparkles,
    chip: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-white/10 dark:text-white/70 dark:ring-white/15',
  },
};

export const NEEDS_ATTENTION: MemberStatus[] = ['stopped', 'never', 'slipping'];

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** "3 weeks ago", from an ISO instant. */
export function formatAgo(iso: string, now: number = Date.now()): string {
  const days = Math.floor((now - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

/** The sentence that says why a member has their status — so the SMD never has to work it out. */
export function statusReason(member: MemberMetrics, slippingAfter: number): string {
  const lastCame = member.last_attended_at ? ` · last came ${formatDay(member.last_attended_at)}` : '';
  switch (member.status) {
    case 'stopped':
      return `Missed the last ${plural(member.missed_in_row, 'training')}${lastCame}`;
    case 'never':
      return `Hasn’t come to any of ${plural(member.expected_count, 'training')} since joining ${formatDay(member.joined_at)}`;
    case 'slipping':
      return member.missed_in_row >= slippingAfter
        ? `Missed the last ${plural(member.missed_in_row, 'training')}${lastCame}`
        : `Came to ${member.recent_attended} of the last ${plural(member.recent_expected, 'training')}`;
    case 'new':
      return `Joined ${formatDay(member.joined_at)} · ${plural(member.expected_count, 'training')} so far`;
    default:
      return `Came to ${member.recent_attended} of the last ${plural(member.recent_expected, 'training')}`;
  }
}
