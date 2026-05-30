interface TrackerUserCellProps {
  fullName: string;
  agencyCode?: string | null;
  amaDate?: string | null;
  avatarUrl?: string | null;
  onAvatarClick?: () => void;
  onNameClick?: () => void;
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

function formatAmaDate(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

export function TrackerUserCell({
  fullName,
  agencyCode,
  amaDate,
  avatarUrl,
  onAvatarClick,
  onNameClick,
}: TrackerUserCellProps) {
  const initials = getInitials(fullName);
  const avatarContent = avatarUrl
    ? <img src={avatarUrl} alt="" className="tracker-user-avatar-img" />
    : <span>{initials}</span>;

  return (
    <div className="tracker-user-cell">
      {onAvatarClick ? (
        <button
          type="button"
          className="tracker-user-avatar tracker-user-avatar-btn"
          title={`Open profile for ${fullName || 'user'}`}
          aria-label={`Open profile for ${fullName || 'user'}`}
          onClick={(event) => {
            event.stopPropagation();
            onAvatarClick();
          }}
        >
          {avatarContent}
        </button>
      ) : (
        <div className="tracker-user-avatar" aria-hidden="true">
          {avatarContent}
        </div>
      )}
      <div className="tracker-user-details">
        {onNameClick ? (
          <button
            type="button"
            className="tracker-user-name w-full text-left"
            title={`Open profile for ${fullName || 'user'}`}
            aria-label={`Open profile for ${fullName || 'user'}`}
            onClick={(event) => {
              event.stopPropagation();
              onNameClick();
            }}
          >
            {fullName || '-'}
          </button>
        ) : (
          <div className="tracker-user-name">{fullName || '-'}</div>
        )}
        <span className="tracker-user-sub"> {formatAmaDate(amaDate)} | {agencyCode || '-'}</span>
      </div>
    </div>
  );
}
