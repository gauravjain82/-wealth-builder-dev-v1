import type { AppointmentStatus, MatchupStatusMeta } from '../types';

interface StatusBadgeProps {
  status: AppointmentStatus | string;
  label?: string | null;
  color?: string | null;
  statuses?: MatchupStatusMeta[];
}

export function StatusBadge({ status, label, color, statuses = [] }: StatusBadgeProps) {
  const meta = statuses.find((item) => item.value === status);
  const resolvedColor = color || meta?.color || '#64748b';
  const resolvedLabel = label || meta?.label || status.replace(/_/g, ' ');

  return (
    <span className="matchup-status-badge" style={{ ['--status-color' as string]: resolvedColor }}>
      {resolvedLabel}
    </span>
  );
}
