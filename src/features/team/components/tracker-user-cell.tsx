interface TrackerUserCellProps {
  fullName: string;
  agencyCode?: string | null;
  invitedAt?: string | null;
  avatarUrl?: string | null;
}

function getInitials(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return 'NA';

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatInvitedDate(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

export function TrackerUserCell({
  fullName,
  agencyCode,
  invitedAt,
  avatarUrl,
}: TrackerUserCellProps) {
  const initials = getInitials(fullName);

  return (
    <div className="tracker-user-cell">
      <div className="tracker-user-avatar" aria-hidden="true">
        {avatarUrl
          ? <img src={avatarUrl} alt="" className="tracker-user-avatar-img" />
          : <span>{initials}</span>}
      </div>
      <div className="tracker-user-details">
        <div className="tracker-user-name">{fullName || '-'}</div>
        <span className="tracker-user-sub"> {formatInvitedDate(invitedAt)} • {agencyCode || '-'}</span>
      </div>
    </div>
  );
}
