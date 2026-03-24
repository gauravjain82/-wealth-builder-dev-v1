import { useEffect, useMemo, useRef, useState } from 'react';

export interface UserAutocompleteOption {
  id: number;
  label: string;
  meta?: string;
  roles?: string[];
}

interface UserAutocompleteDropdownProps {
  options?: UserAutocompleteOption[];
  selectedId: number | null;
  selectedLabel?: string;
  placeholder: string;
  onSelect: (option: UserAutocompleteOption) => void;
  buttonText?: string;
  disabled?: boolean;
  fetchFromApi?: boolean;
  roleFilter?: string[];
}

interface UsersResponse {
  next: string | null;
  results: Array<{
    id: number;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    username?: string;
    email?: string;
    roles?: string[];
  }>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function matchesRoleFilter(option: UserAutocompleteOption, roleFilter?: string[]) {
  if (!roleFilter || roleFilter.length === 0) return true;
  const normalizedFilter = roleFilter.map((role) => role.toUpperCase());
  const roles = (option.roles || []).map((role) => role.toUpperCase());
  return normalizedFilter.some((role) => roles.includes(role));
}

function mapUserToOption(user: UsersResponse['results'][number]): UserAutocompleteOption {
  const label =
    user.full_name ||
    `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
    user.email ||
    user.username ||
    `User #${user.id}`;

  return {
    id: user.id,
    label,
    roles: user.roles || [],
    meta: [user.email, ...(user.roles || [])].filter(Boolean).join(' | '),
  };
}

async function fetchUsersFromApi(): Promise<UserAutocompleteOption[]> {
  const token = localStorage.getItem('wb.authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const headers: HeadersInit = {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };

  const users: UserAutocompleteOption[] = [];
  let nextUrl: string | null = `${API_BASE_URL}/api/accounts/users/?page_size=200`;
  let pageSafety = 0;

  while (nextUrl && pageSafety < 10) {
    const response = await fetch(nextUrl, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.statusText}`);
    }

    const data = (await response.json()) as UsersResponse;
    users.push(...data.results.map(mapUserToOption));
    nextUrl = data.next;
    pageSafety += 1;
  }

  return users;
}

export function UserAutocompleteDropdown({
  options,
  selectedId,
  selectedLabel,
  placeholder,
  onSelect,
  buttonText = 'CHANGE',
  disabled = false,
  fetchFromApi = false,
  roleFilter,
}: UserAutocompleteDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [apiOptions, setApiOptions] = useState<UserAutocompleteOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const sourceOptions = options || apiOptions;
  const effectiveOptions = useMemo(
    () => sourceOptions.filter((item) => matchesRoleFilter(item, roleFilter)),
    [sourceOptions, roleFilter]
  );

  const selectedOption = useMemo(
    () => effectiveOptions.find((item) => item.id === selectedId) || null,
    [effectiveOptions, selectedId]
  );

  const displayLabel = selectedOption?.label || selectedLabel || placeholder;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return effectiveOptions;

    return effectiveOptions.filter((item) => {
      const text = `${item.label} ${item.meta || ''}`.toLowerCase();
      return text.includes(normalized);
    });
  }, [effectiveOptions, query]);

  useEffect(() => {
    if (!fetchFromApi) return;
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const users = await fetchUsersFromApi();
        if (!alive) return;
        setApiOptions(users);
      } catch (error) {
        if (!alive) return;
        setLoadError(error instanceof Error ? error.message : 'Failed to load users');
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [fetchFromApi]);

  useEffect(() => {
    if (!open) return;

    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-11 w-full items-center justify-between rounded-lg border border-white/20 bg-white/5 px-3 text-left disabled:opacity-60"
      >
        <span className="truncate pr-2 text-sm">{displayLabel}</span>
        <span className="rounded-md border border-white/25 bg-white/5 px-2 py-1 text-xs">{buttonText}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[1200] mt-2 w-full rounded-lg border border-white/20 bg-[#1f2430] p-2 shadow-xl">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search user..."
            className="mb-2 h-9 w-full rounded-md border border-white/20 bg-white/5 px-2 text-sm"
          />
          <div className="max-h-52 overflow-auto rounded-md border border-white/10">
            {loading && <div className="px-3 py-2 text-sm text-white/60">Loading users...</div>}
            {loadError && <div className="px-3 py-2 text-sm text-red-300">{loadError}</div>}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-white/60">No users found</div>
            )}
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item);
                  setOpen(false);
                  setQuery('');
                }}
                className="block w-full border-b border-white/10 px-3 py-2 text-left text-sm hover:bg-white/10"
              >
                <div className="truncate">{item.label}</div>
                {item.meta && <div className="truncate text-xs text-white/60">{item.meta}</div>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
