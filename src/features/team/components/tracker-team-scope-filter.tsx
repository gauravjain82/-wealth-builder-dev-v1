import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchTeamSegmentSummary } from '@/features/team/services/team-segment-service';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export type TrackerTeamScope = 'baseshop' | 'superbase' | 'superteam';

interface TeamUserOption {
  id: string;
  name: string;
  level: string;
}

interface TrackerTeamScopeChange {
  scope: TrackerTeamScope;
  user: TeamUserOption | null;
}

interface TrackerTeamScopeFilterProps {
  value: TrackerTeamScope;
  selectedUserId: string | null;
  onChange: (next: TrackerTeamScopeChange) => void;
}

interface BrokerResponseItem {
  id?: number | string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  username?: string;
  level?: {
    code?: string;
    name?: string;
  } | null;
}

const ALL_SCOPE_OPTIONS: Array<{ id: TrackerTeamScope; label: string }> = [
  { id: 'baseshop', label: 'BaseShop' },
  { id: 'superbase', label: 'SuperBase' },
  { id: 'superteam', label: 'SuperTeam' },
];

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

function normalizeScope(value: string): TrackerTeamScope | null {
  const normalized = value.trim().toLowerCase();

  if (normalized === 'baseshop' || normalized === 'superbase' || normalized === 'superteam') {
    return normalized;
  }

  return null;
}

async function fetchAvailableScopes(): Promise<TrackerTeamScope[]> {
  const payload = await fetchTeamSegmentSummary();
  const accessibleScopes = (payload.accessible_segments || [])
    .map((segment) => normalizeScope(segment))
    .filter((segment): segment is TrackerTeamScope => Boolean(segment));

  if (accessibleScopes.length > 0) {
    return ALL_SCOPE_OPTIONS
      .map((option) => option.id)
      .filter((option) => accessibleScopes.includes(option));
  }

  const visibleScopes = (payload.segments || [])
    .filter((segment) => Boolean(segment.visible))
    .map((segment) => normalizeScope(segment.segment || ''))
    .filter((segment): segment is TrackerTeamScope => Boolean(segment));

  if (visibleScopes.length > 0) {
    return ALL_SCOPE_OPTIONS
      .map((option) => option.id)
      .filter((option) => visibleScopes.includes(option));
  }

  return ['baseshop'];
}

function toSegmentParam(scope: TrackerTeamScope): string {
  return scope.toUpperCase();
}

function toBrokerOption(item: BrokerResponseItem): TeamUserOption | null {
  if (item.id === undefined || item.id === null) {
    return null;
  }

  const fullName = item.full_name?.trim();
  const firstLast = `${item.first_name || ''} ${item.last_name || ''}`.trim();
  const name = fullName || firstLast || item.username || '';

  return {
    id: String(item.id),
    name: name || String(item.id),
    level: item.level?.code || item.level?.name || 'BROKER',
  };
}

async function fetchBrokerOptions(scope: TrackerTeamScope): Promise<TeamUserOption[]> {
  const params = new URLSearchParams({ segment: toSegmentParam(scope) });
  const response = await fetch(`${API_BASE_URL}/api/accounts/users/brokers/?${params.toString()}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch brokers: ${response.statusText}`);
  }

  const payload = (await response.json()) as BrokerResponseItem[];
  return payload
    .map((item) => toBrokerOption(item))
    .filter((item): item is TeamUserOption => Boolean(item));
}

export function TrackerTeamScopeFilter({
  value,
  selectedUserId,
  onChange,
}: TrackerTeamScopeFilterProps) {
  const [scopeOptions, setScopeOptions] = useState<Array<{ id: TrackerTeamScope; label: string }>>([
    ALL_SCOPE_OPTIONS[0],
  ]);
  const [users, setUsers] = useState<TeamUserOption[]>([]);
  const [loadingScopes, setLoadingScopes] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [openUsers, setOpenUsers] = useState(false);
  const [scope, setScope] = useState<TrackerTeamScope>(value);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setScope(value);
  }, [value]);

  useEffect(() => {
    let alive = true;

    const loadScopes = async () => {
      setLoadingScopes(true);
      try {
        const availableScopes = await fetchAvailableScopes();
        if (!alive) return;

        const nextOptions = ALL_SCOPE_OPTIONS.filter((option) => availableScopes.includes(option.id));
        const resolvedOptions = nextOptions.length > 0 ? nextOptions : [ALL_SCOPE_OPTIONS[0]];
        setScopeOptions(resolvedOptions);

        if (!resolvedOptions.some((option) => option.id === value)) {
          const nextScope = resolvedOptions[0].id;
          setScope(nextScope);
          setSearchTerm('');
          setOpenUsers(false);
          onChange({ scope: nextScope, user: null });
        }
      } catch {
        if (!alive) return;
        setScopeOptions([ALL_SCOPE_OPTIONS[0]]);
        if (value !== 'baseshop') {
          setScope('baseshop');
          setSearchTerm('');
          setOpenUsers(false);
          onChange({ scope: 'baseshop', user: null });
        }
      } finally {
        if (alive) {
          setLoadingScopes(false);
        }
      }
    };

    void loadScopes();

    return () => {
      alive = false;
    };
  }, [onChange, value]);

  useEffect(() => {
    const onWindowClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setOpen(false);
      setOpenUsers(false);
    };

    window.addEventListener('mousedown', onWindowClick);
    return () => window.removeEventListener('mousedown', onWindowClick);
  }, []);

  useEffect(() => {
    if (scope === 'baseshop') {
      setUsers([]);
      setLoadingUsers(false);
      return;
    }

    let alive = true;
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const options = await fetchBrokerOptions(scope);
        if (!alive) return;

        setUsers(options);
      } catch {
        if (!alive) return;
        setUsers([]);
      } finally {
        if (alive) {
          setLoadingUsers(false);
        }
      }
    };

    void fetchUsers();

    return () => {
      alive = false;
    };
  }, [scope]);

  const selectedUser = useMemo(
    () => users.find((item) => item.id === selectedUserId) || null,
    [selectedUserId, users]
  );

  const filteredUsers = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter((item) => item.name.toLowerCase().includes(normalized));
  }, [searchTerm, users]);

  const selectedScopeLabel = scopeOptions.find((item) => item.id === scope)?.label || 'BaseShop';

  return (
    <div ref={rootRef} className="relative flex items-center gap-2">
      <div className="relative">
        <button
          type="button"
          className="inline-flex h-9 items-center rounded-md border border-gray-300 bg-gray-100 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-200 dark:border-white/15 dark:bg-white/5 dark:text-white/85 dark:hover:bg-white/10"
          disabled={loadingScopes}
          onClick={() => setOpen((prev) => !prev)}
        >
          {loadingScopes ? 'Loading scopes...' : selectedScopeLabel}
        </button>

        {open && (
          <div className="absolute left-0 z-[1200] mt-2 w-[220px] rounded-xl border border-gray-200 bg-white p-2 text-gray-800 shadow-2xl dark:border-white/15 dark:bg-[#1b2433] dark:text-white">
            {scopeOptions.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/10 ${
                  scope === item.id ? 'bg-gray-100 font-semibold text-amber-700 dark:bg-white/10 dark:text-amber-200' : 'text-gray-700 dark:text-white/85'
                }`}
                onClick={() => {
                  setScope(item.id);
                  setSearchTerm('');
                  setOpen(false);
                  setOpenUsers(false);
                  onChange({ scope: item.id, user: null });
                }}
              >
                <span>{item.label}</span>
                {scope === item.id ? <span className="text-amber-700 dark:text-amber-200">✓</span> : null}
              </button>
            ))}
          </div>
        )}
      </div>

      {scope !== 'baseshop' && (
        <div className="relative w-[260px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onFocus={() => setOpenUsers(true)}
            placeholder={loadingUsers ? 'Loading users...' : selectedUser ? selectedUser.name : 'Search user'}
            className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-800 outline-none placeholder:text-gray-400 focus:border-amber-500/60 dark:border-white/15 dark:bg-black/20 dark:text-white/90 dark:placeholder:text-white/45 dark:focus:border-amber-300/60"
          />
          {openUsers && (
            <div className="absolute left-0 right-0 z-[1200] mt-1 max-h-[220px] overflow-auto rounded-lg border border-gray-200 bg-white p-1 shadow-2xl dark:border-white/15 dark:bg-[#1b2433]">
              {filteredUsers.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/10 ${
                    selectedUserId === item.id ? 'bg-gray-100 text-amber-700 dark:bg-white/10 dark:text-amber-200' : 'text-gray-700 dark:text-white/85'
                  }`}
                  onClick={() => {
                    setSearchTerm(item.name);
                    setOpenUsers(false);
                    onChange({ scope, user: item });
                  }}
                >
                  <span>{item.name}</span>
                  <span className="text-[11px] text-gray-400 dark:text-white/60">{item.level}</span>
                </button>
              ))}
              {!loadingUsers && filteredUsers.length === 0 && (
                <div className="px-2 py-2 text-xs text-gray-400 dark:text-white/60">No users found.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
