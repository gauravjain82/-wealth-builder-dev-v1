const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export type OrgViewType = 'baseshop' | 'superbase' | 'superteam';

export interface OrgChartLink {
  ancestor_id: number;
  descendant_id: number;
  depth: number;
}

interface LevelPayload {
  code?: string;
  name?: string;
}

interface LevelCountPayload {
  level_id?: number | null;
  level_code?: string | null;
  level_name?: string | null;
  count: number;
}

interface BackendUser {
  id: number;
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  plan?: string;
  agency_code?: string;
  level?: LevelPayload | string | null;
  level_name?: string | null;
  roles?: string[];
  parent?: number | null;
  recruited_by?: number | null;
  leader?: number | null;
  child_count?: number;
  children_count?: number;
  has_children?: boolean;
  bpm_attendance?: boolean;
  big_event?: boolean;
  licensed?: boolean;
  net_licensed?: boolean;
  key_player?: boolean;
  client?: boolean;
  net_license_amount?: number | string | null;
  level_counts?: LevelCountPayload[];
  photo_thumb_url?: string | null;
  profile?: {
    photo_url?: string | null;
    photo_url_thumb?: string | null;
  } | null;
}

export interface LevelCount {
  levelId: string | null;
  levelCode: string | null;
  levelName: string | null;
  count: number;
}

export interface OrgChartUser {
  id: string;
  name: string;
  email: string;
  plan: string;
  level: string;
  agencyCode: string;
  parentId: string | null;
  recruitedById: string | null;
  leaderId: string | null;
  roles: string[];
  training: boolean;
  bigEvent: boolean;
  keyPlayer: boolean;
  netLicenseAmount: number;
  netLicensed: boolean;
  licensed: boolean;
  hasProduction: boolean;
  client: boolean;
  hasChildren: boolean;
  childCount: number;
  levelCounts: LevelCount[];
  avatarUrl: string;
}

interface SmdOption {
  id: string;
  firstName: string;
  lastName: string;
  agentLevel: string;
}

interface OrgChartData {
  users: OrgChartUser[];
  childrenMap: Record<string, string[]>;
  rootId: string | null;
  smd_list: SmdOption[];
  selected_smd: string | null;
  view_type: OrgViewType;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

type UnknownRecord = Record<string, unknown>;

function toRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' ? (value as UnknownRecord) : null;
}

function toId(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'string') return String(value);
  const maybeObj = toRecord(value);
  if (!maybeObj) return null;
  const nested = maybeObj.id;
  if (typeof nested === 'number' || typeof nested === 'string') return String(nested);
  return null;
}

function getString(record: UnknownRecord, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

function pickList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = toRecord(payload);
  if (!record) return [];

  const candidates = [
    record.results,
    record.users,
    record.data,
    record.direct_team,
    record.downline,
    record.children,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function normalizeName(user: BackendUser | UnknownRecord): string {
  const userRecord = user as UnknownRecord;
  const fromFullName = getString(userRecord, 'full_name').trim();
  if (fromFullName) return fromFullName;

  const fromParts = `${getString(userRecord, 'first_name')} ${getString(userRecord, 'last_name')}`.trim();
  if (fromParts) return fromParts;

  const username = getString(userRecord, 'username');
  if (username) return username;

  const email = getString(userRecord, 'email');
  if (email) return email;

  const id = toId(userRecord.id);
  return id ? `User #${id}` : 'Unknown User';
}

function normalizeLevel(user: BackendUser | UnknownRecord): string {
  const userRecord = user as UnknownRecord;
  const levelValue = userRecord.level;

  if (typeof levelValue === 'string' && levelValue.trim()) {
    return levelValue.trim();
  }

  const levelRecord = toRecord(userRecord.level);
  const levelCode = getString(levelRecord || {}, 'code').trim();
  if (levelCode) return levelCode;

  const levelCodeField = getString(userRecord, 'level_code').trim();
  if (levelCodeField) return levelCodeField;

  const levelNameField = getString(userRecord, 'level_name').trim();
  if (levelNameField) return levelNameField;

  const levelName = getString(levelRecord || {}, 'name').trim();
  if (levelName) return levelName;

  const roles = Array.isArray(userRecord.roles)
    ? userRecord.roles.filter((role): role is string => typeof role === 'string' && role.trim().length > 0)
    : [];
  if (roles.length > 0) {
    return roles[0].trim();
  }

  return 'Agent';
}

function isSmd(user: OrgChartUser): boolean {
  const values = [user.level, user.plan, ...user.roles].map((value) => value.toUpperCase());
  return values.some((value) => value.includes('SMD') || value.includes('SENIOR MARKETING DIRECTOR'));
}

function normalizeRoleLabel(role: string): string {
  return role
    .trim()
    .replace(/[\s-]+/g, '_')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildChildrenMap(users: OrgChartUser[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};

  users.forEach((user) => {
    const parentId = user.recruitedById || user.parentId || user.leaderId;
    if (!parentId || parentId === user.id) return;
    if (!map[parentId]) {
      map[parentId] = [];
    }
    map[parentId].push(user.id);
  });

  Object.keys(map).forEach((parentId) => {
    map[parentId] = Array.from(new Set(map[parentId]));
  });

  return map;
}

function normalizeLevelCounts(raw: UnknownRecord): LevelCount[] {
  const levelCounts = raw.level_counts;
  if (!Array.isArray(levelCounts)) {
    return [];
  }

  return levelCounts
    .map((item) => {
      const itemRecord = toRecord(item);
      if (!itemRecord) return null;
      const count = Number(itemRecord.count);
      if (!Number.isFinite(count)) return null;

      return {
        levelId: toId(itemRecord.level_id) || null,
        levelCode: typeof itemRecord.level_code === 'string' ? itemRecord.level_code : null,
        levelName: typeof itemRecord.level_name === 'string' ? itemRecord.level_name : null,
        count,
      };
    })
    .filter((item): item is LevelCount => Boolean(item));
}

function normalizeOrgUser(raw: UnknownRecord, parentIdFromTree: string | null = null): OrgChartUser | null {
  const id = toId(raw.id ?? raw.user_id ?? raw.account_id);
  if (!id) return null;

  const parentId = toId(raw.parent) || toId(raw.recruited_by) || toId(raw.leader) || parentIdFromTree;
  const recruitedById = toId(raw.recruited_by);
  const leaderId = toId(raw.leader);
  const roles = Array.isArray(raw.roles)
    ? raw.roles.filter((role): role is string => typeof role === 'string')
    : [];
  const primaryRoleLabel = roles.length > 0 ? normalizeRoleLabel(roles[0]) : 'Agent';
  const plan = typeof raw.plan === 'string' && raw.plan.trim().length > 0
    ? raw.plan.trim()
    : primaryRoleLabel;

  const parsedChildCount = Number(raw.children_count ?? raw.child_count);
  const hasChildrenFlag = Boolean(raw.has_children);
  const childCount = Number.isFinite(parsedChildCount)
    ? parsedChildCount
    : 0;

  const netLicensed = Boolean(raw.net_licensed);
  const parsedNetAmount = Number(raw.net_license_amount);
  const netLicenseAmount = Number.isFinite(parsedNetAmount) ? parsedNetAmount : (netLicensed ? 1 : 0);

  const hasChildren = hasChildrenFlag || childCount > 0;
  const client = Boolean(raw.client);

  const profile = toRecord(raw.profile);
  const avatarUrl =
    (typeof raw.photo_thumb_url === 'string' && raw.photo_thumb_url)
    || (typeof raw.avatar_url === 'string' && raw.avatar_url)
    || (typeof profile?.photo_url_thumb === 'string' && profile.photo_url_thumb)
    || (typeof profile?.photo_url === 'string' && profile.photo_url)
    || '';

  return {
    id,
    name: normalizeName(raw),
    email: typeof raw.email === 'string' ? raw.email : '',
    plan,
    level: normalizeLevel(raw),
    agencyCode: typeof raw.agency_code === 'string' ? raw.agency_code : '',
    parentId,
    recruitedById,
    leaderId,
    roles,
    training: Boolean(raw.bpm_attendance),
    bigEvent: Boolean(raw.big_event),
    keyPlayer: Boolean(raw.key_player),
    netLicenseAmount,
    netLicensed,
    licensed: Boolean(raw.licensed),
    hasProduction: client,
    client,
    hasChildren,
    childCount,
    levelCounts: normalizeLevelCounts(raw),
    avatarUrl,
  };
}

function extractChildren(raw: UnknownRecord): unknown[] {
  const candidates = [raw.children, raw.downline, raw.direct_team, raw.descendants, raw.team];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function transformToUsersAndChildrenMap(payload: unknown): {
  users: OrgChartUser[];
  childrenMap: Record<string, string[]>;
  rootId: string | null;
  smdList: SmdOption[];
} {
  const userMap = new Map<string, OrgChartUser>();
  let childrenMap: Record<string, string[]> = {};

  const walk = (item: unknown, parentId: string | null): string | null => {
    const itemRecord = toRecord(item);
    if (!itemRecord) return null;

    const nodeRecord = toRecord(itemRecord.user) || itemRecord;
    const normalized = normalizeOrgUser(nodeRecord, parentId);
    if (!normalized) return null;

    const existing = userMap.get(normalized.id);
    userMap.set(normalized.id, {
      ...(existing || normalized),
      ...normalized,
      childCount: Math.max(existing?.childCount || 0, normalized.childCount || 0),
    });

    const childItems = extractChildren(itemRecord).length > 0
      ? extractChildren(itemRecord)
      : extractChildren(nodeRecord);

    if (childItems.length > 0) {
      const childIds = childItems
        .map((child) => walk(child, normalized.id))
        .filter((childId): childId is string => Boolean(childId));
      childrenMap[normalized.id] = Array.from(new Set(childIds));

      const current = userMap.get(normalized.id);
      if (current) {
        userMap.set(normalized.id, {
          ...current,
          hasChildren: true,
          childCount: Math.max(current.childCount || 0, childIds.length),
        });
      }
    }

    return normalized.id;
  };

  const list = pickList(payload);
  const roots = list
    .map((item) => walk(item, null))
    .filter((rootId): rootId is string => Boolean(rootId));

  const users = Array.from(userMap.values());
  if (!Object.keys(childrenMap).length && users.length) {
    childrenMap = buildChildrenMap(users);
  }

  const payloadRecord = toRecord(payload);
  const rootId = toId(payloadRecord?.root_id)
    || toId(payloadRecord?.current_user_id)
    || toId(toRecord(payloadRecord?.current_user)?.id)
    || roots[0]
    || null;

  const smdListFromPayload = Array.isArray(payloadRecord?.smd_list)
    ? (payloadRecord?.smd_list as unknown[])
        .map((entry) => {
          const record = toRecord(entry);
          if (!record) return null;
          const id = toId(record.id);
          if (!id) return null;
          return {
            id,
            firstName: typeof record.firstName === 'string' ? record.firstName : (typeof record.first_name === 'string' ? record.first_name : ''),
            lastName: typeof record.lastName === 'string' ? record.lastName : (typeof record.last_name === 'string' ? record.last_name : ''),
            agentLevel: typeof record.agentLevel === 'string' ? record.agentLevel : (typeof record.agent_level === 'string' ? record.agent_level : 'SMD'),
          };
        })
        .filter((entry): entry is SmdOption => Boolean(entry))
    : [];

  const smdList = smdListFromPayload.length
    ? smdListFromPayload
    : users
        .filter((user) => isSmd(user))
        .map((user) => {
          const [firstName = '', ...lastNameParts] = user.name.split(' ');
          return {
            id: user.id,
            firstName,
            lastName: lastNameParts.join(' '),
            agentLevel: user.level || user.roles[0] || 'SMD',
          };
        })
        .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));

  return { users, childrenMap, rootId, smdList };
}

class OrgChartService {
  private downlineCache = new Map<string, Promise<{ users: OrgChartUser[]; childrenMap: Record<string, string[]> }>>();

  private async fetchJson<T>(url: string): Promise<T> {
    const headers = getAuthHeaders();
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch org chart data: ${response.statusText}`);
    }
    return (await response.json()) as T;
  }

  /**
   * Initial load: fetches root user + direct children only.
   * - baseshop (no brokerId): GET /api/accounts/users/org-chart/root/
   * - superbase/superteam with brokerId: GET /api/accounts/users/{brokerId}/org-chart/downline/
   */
  async fetchOrgChartInitial(viewType: OrgViewType = 'baseshop', brokerId: string | null = null): Promise<OrgChartData & { fetchedRootId: string | null }> {
    const endpoint = brokerId
      ? `${API_BASE_URL}/api/accounts/users/${encodeURIComponent(brokerId)}/org-chart/downline/`
      : `${API_BASE_URL}/api/accounts/users/org-chart/root/`;

    const payload = await this.fetchJson<unknown>(endpoint);
    const transformed = transformToUsersAndChildrenMap(payload);
    const rootId = brokerId || transformed.rootId || localStorage.getItem('wb.userId') || transformed.users[0]?.id || null;

    if (!transformed.users.length) {
      return {
        users: [],
        childrenMap: {},
        rootId,
        smd_list: [],
        selected_smd: brokerId,
        view_type: viewType,
        fetchedRootId: rootId,
      };
    }

    return {
      users: transformed.users,
      childrenMap: transformed.childrenMap,
      rootId,
      smd_list: transformed.smdList,
      selected_smd: brokerId,
      view_type: viewType,
      fetchedRootId: rootId,
    };
  }

  /**
   * Lazy-loads direct children for a node on demand (called when user clicks expand).
   * Results are cached per userId — a cached promise is reused for concurrent calls,
   * and removed on failure so the next attempt will retry.
   */
  fetchDownline(userId: string): Promise<{ users: OrgChartUser[]; childrenMap: Record<string, string[]> }> {
    if (!this.downlineCache.has(userId)) {
      const params = new URLSearchParams({
        full_tree: 'true',
        max_depth: '5',
      });
      const promise = this.fetchJson<unknown>(
        `${API_BASE_URL}/api/accounts/users/${encodeURIComponent(userId)}/org-chart/downline/?${params.toString()}`
      )
        .then((payload) => {
          const transformed = transformToUsersAndChildrenMap(payload);
          return { users: transformed.users, childrenMap: transformed.childrenMap };
        })
        .catch((error: unknown) => {
          this.downlineCache.delete(userId);
          throw error;
        });
      this.downlineCache.set(userId, promise);
    }
    return this.downlineCache.get(userId)!;
  }

  /** Clear the downline cache — call when the user switches view or SMD. */
  clearDownlineCache(): void {
    this.downlineCache.clear();
  }

  /** @deprecated Use fetchOrgChartInitial instead. */
  async fetchOrgChartData(viewType: OrgViewType = 'baseshop', brokerId: string | null = null): Promise<OrgChartData> {
    const result = await this.fetchOrgChartInitial(viewType, brokerId);
    return result;
  }

}

export async function fetchOrgChart(): Promise<OrgChartLink[]> {
  const response = await fetch(`${API_BASE_URL}/api/network/hierarchy/my_links/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch org chart: ${response.statusText}`);
  }
  const data = (await response.json()) as OrgChartLink[];
  return Array.isArray(data) ? data : [];
}

const orgChartService = new OrgChartService();

export default orgChartService;
