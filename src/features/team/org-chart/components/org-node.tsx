import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { LevelCount } from '../services/org-chart-service';

const avatarCache: Record<string, string> = {};

function getInitialsAvatar(fullName: string) {
  if (!fullName) return '';
  if (avatarCache[fullName]) return avatarCache[fullName];

  const initials = fullName
    .split(' ')
    .map((token) => token[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <rect width="100%" height="100%" fill="#d4af37" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="80" fill="#ffffff">${initials}</text>
    </svg>`;

  const base64 = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  avatarCache[fullName] = base64;
  return base64;
}

export interface OrgNodeData {
  [key: string]: unknown;
  name: string;
  plan: string;
  agencyCode: string;
  email: string;
  profilePicture: string;
  photoURL: string;
  level: string;
  isBrokerSubRoot: boolean;
  isFocused: boolean;
  training: boolean;
  bigEvent: boolean;
  keyPlayer: boolean;
  netLicenseAmount: number;
  netLicensed?: boolean;
  licensed: boolean;
  hasProduction: boolean;
  client?: boolean;
  highlightColor?: string | null;
  isDimmed?: boolean;
  isCollapsed?: boolean;
  hasChildren?: boolean;
  isExpanding?: boolean;
  onToggleCollapse?: () => void;
  onClick?: () => void;
  onOpenProfile?: () => void;
  childrenCount?: number;
  filterBackground?: Record<string, string>;
  levelCounts?: LevelCount[];
}

const OrgNode = memo(function OrgNode({ data, selected }: NodeProps) {
  const nodeData = data as OrgNodeData;

  const {
    name = 'Unknown',
    plan = '',
    agencyCode = '',
    profilePicture = '',
    photoURL = '',
    level = '',
    isBrokerSubRoot = false,
    isFocused = false,
    highlightColor = null,
    isDimmed = false,
    isCollapsed = false,
    hasChildren = false,
    isExpanding = false,
    onToggleCollapse,
    onClick,
    onOpenProfile,
    childrenCount = 0,
    levelCounts = [],
  } = nodeData;

  const isBroker = plan === 'Broker';
  const profileImg = profilePicture || photoURL;
  const initialsAvatar = getInitialsAvatar(name);

  const classes = [
    'org-node',
    isBroker ? 'org-node-broker' : 'org-node-regular',
    isBrokerSubRoot ? 'org-node-subroot' : '',
    selected ? 'org-node-selected' : '',
    isFocused ? 'org-node-focused' : '',
    highlightColor ? 'highlight' : '',
    isDimmed ? 'dimmed' : '',
    isCollapsed ? 'collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const baseStyle: Record<string, string> = {
    width: '170px',
    height: '215px',
    border: '2px solid #d9dde6',
    borderRadius: '10px',
    background: '#ffffff',
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.12)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px 10px 14px',
    position: 'relative',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
  };

  const nodeStyle = {
    ...baseStyle,
    ...(nodeData.filterBackground || {}),
  };

  return (
    <div className={classes} style={nodeStyle} onClick={onClick}>
      <Handle type="target" position={Position.Top} style={{ background: '#94a3b8', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#94a3b8', width: 8, height: 8 }} />

      {isCollapsed && childrenCount > 0 && <div className="collapsed-count-badge">{childrenCount}</div>}

      {profileImg ? (
        <button
          type="button"
          className="org-node-avatar org-node-avatar-photo"
          title={`Open profile for ${name}`}
          onClick={(event) => {
            event.stopPropagation();
            onOpenProfile?.();
          }}
        >
          <img
            src={profileImg}
            className="org-node-avatar-img"
            alt={name}
            onError={(event) => {
              const image = event.currentTarget;
              image.onerror = null;
              image.src = initialsAvatar;
              image.parentElement?.classList.remove('org-node-avatar-photo');
              image.parentElement?.classList.add('org-node-avatar-initials');
            }}
          />
        </button>
      ) : (
        <button
          type="button"
          className="org-node-avatar org-node-avatar-initials"
          title={`Open profile for ${name}`}
          onClick={(event) => {
            event.stopPropagation();
            onOpenProfile?.();
          }}
        >
          <img src={initialsAvatar} className="org-node-avatar-img" alt={name} />
        </button>
      )}

      <div className="org-chart-node-name">{name}</div>
      <div className="org-node-agencycode">
        {agencyCode}
        {level ? ` (${level})` : ''}
      </div>

      {levelCounts && levelCounts.length > 0 && (
        <div className="org-node-level-counts">
          <div className="level-counts-codes">
            {levelCounts.map((lc) => (
              <span key={lc.levelCode || lc.levelId} className="level-code">
                {lc.levelCode || lc.levelName?.charAt(0) || ''}({lc.count})
              </span>
            ))}
          </div>
          {/* <div className="level-counts-values">
            {levelCounts.map((lc) => (
              <span key={lc.levelCode || lc.levelId} className="level-count">
                {lc.count}
              </span>
            ))}
          </div> */}
        </div>
      )}

      {hasChildren && (
        <button
          className="org-node-expand-btn"
          onClick={(event) => {
            event.stopPropagation();
            if (!isExpanding) onToggleCollapse?.();
          }}
          title={isExpanding ? 'Loading...' : isCollapsed ? 'Expand' : 'Collapse'}
          type="button"
          disabled={isExpanding}
        >
          {isExpanding ? '…' : isCollapsed ? '+' : '-'}
        </button>
      )}
    </div>
  );
});

export default OrgNode;
