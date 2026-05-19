import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface UserAutocompleteOption {
  id: number;
  label: string;
  meta?: string;
  agencyCode?: string;
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
    agency_code?: string;
    roles?: string[];
  }>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const PAGE_SIZE = 10;

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
    agencyCode: user.agency_code || '',
    roles: user.roles || [],
    meta: [user.email, user.agency_code, ...(user.roles || [])].filter(Boolean).join(' | '),
  };
}

async function fetchUsersPage(name: string, url: string | null): Promise<{ options: UserAutocompleteOption[]; next: string | null }> {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');

  const resolvedUrl = url ?? `${API_BASE_URL}/api/accounts/users/?name=${encodeURIComponent(name)}&page_size=${PAGE_SIZE}`;

  const response = await fetch(resolvedUrl, {
    headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`Failed to fetch users: ${response.statusText}`);

  const data = (await response.json()) as UsersResponse;
  return { options: data.results.map(mapUserToOption), next: data.next };
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks which query string the current loaded results belong to
  const loadedQueryRef = useRef<string>('');

  const sourceOptions = fetchFromApi ? apiOptions : (options ?? []);
  const effectiveOptions = useMemo(
    () => sourceOptions.filter((item) => matchesRoleFilter(item, roleFilter)),
    [sourceOptions, roleFilter]
  );

  // For static options mode: filter locally; for API mode: results are already filtered server-side
  const displayed = useMemo(() => {
    if (fetchFromApi) return effectiveOptions;
    const normalized = query.trim().toLowerCase();
    if (!normalized) return effectiveOptions;
    return effectiveOptions.filter((item) => {
      const text = `${item.label} ${item.meta || ''}`.toLowerCase();
      return text.includes(normalized);
    });
  }, [fetchFromApi, effectiveOptions, query]);

  const selectedOption = useMemo(
    () => [...(options ?? []), ...apiOptions].find((item) => item.id === selectedId) || null,
    [options, apiOptions, selectedId]
  );
  const displayLabel = selectedOption?.label || selectedLabel || placeholder;

  const doSearch = useCallback(async (name: string) => {
    if (!fetchFromApi) return;
    loadedQueryRef.current = name;
    setLoading(true);
    setLoadError(null);
    setApiOptions([]);
    setNextUrl(null);
    try {
      const { options: fetched, next } = await fetchUsersPage(name, null);
      // Discard stale responses
      if (loadedQueryRef.current !== name) return;
      setApiOptions(fetched);
      setNextUrl(next);
    } catch (err) {
      if (loadedQueryRef.current !== name) return;
      setLoadError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      if (loadedQueryRef.current === name) setLoading(false);
    }
  }, [fetchFromApi]);

  const loadMore = useCallback(async () => {
    if (!fetchFromApi || !nextUrl || loadingMore) return;
    const nameAtStart = loadedQueryRef.current;
    setLoadingMore(true);
    try {
      const { options: fetched, next } = await fetchUsersPage(nameAtStart, nextUrl);
      if (loadedQueryRef.current !== nameAtStart) return;
      setApiOptions((prev) => [...prev, ...fetched]);
      setNextUrl(next);
    } catch {
      // silently ignore pagination errors
    } finally {
      if (loadedQueryRef.current === nameAtStart) setLoadingMore(false);
    }
  }, [fetchFromApi, loadingMore, nextUrl]);

  // Debounce search: trigger after 1st character, 300 ms delay
  useEffect(() => {
    if (!fetchFromApi || !open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length === 0) {
      setApiOptions([]);
      setNextUrl(null);
      setLoadError(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      void doSearch(query);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchFromApi, open, query, doSearch]);

  // Infinite scroll inside the list
  useEffect(() => {
    const el = listRef.current;
    if (!el || !fetchFromApi) return;

    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
        void loadMore();
      }
    };

    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [fetchFromApi, loadMore]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  // Reset state when dropdown closes
  useEffect(() => {
    if (!open) {
      setQuery('');
      if (fetchFromApi) {
        setApiOptions([]);
        setNextUrl(null);
        setLoadError(null);
      }
    }
  }, [open, fetchFromApi]);

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
            placeholder="Type to search users..."
            className="mb-2 h-9 w-full rounded-md border border-white/20 bg-white/5 px-2 text-sm"
          />
          <div ref={listRef} className="max-h-52 overflow-auto rounded-md border border-white/10">
            {loading && <div className="px-3 py-2 text-sm text-white/60">Loading users...</div>}
            {loadError && <div className="px-3 py-2 text-sm text-red-300">{loadError}</div>}
            {!loading && fetchFromApi && query.length === 0 && (
              <div className="px-3 py-2 text-sm text-white/60">Start typing to search users</div>
            )}
            {!loading && !loadError && query.length > 0 && displayed.length === 0 && (
              <div className="px-3 py-2 text-sm text-white/60">No users found</div>
            )}
            {!loading && !fetchFromApi && displayed.length === 0 && (
              <div className="px-3 py-2 text-sm text-white/60">No users found</div>
            )}
            {displayed.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item);
                  setOpen(false);
                }}
                className="block w-full border-b border-white/10 px-3 py-2 text-left text-sm hover:bg-white/10"
              >
                <div className="truncate">{item.label}</div>
                {item.meta && <div className="truncate text-xs text-white/60">{item.meta}</div>}
              </button>
            ))}
            {loadingMore && (
              <div className="px-3 py-2 text-sm text-white/60">Loading more...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
