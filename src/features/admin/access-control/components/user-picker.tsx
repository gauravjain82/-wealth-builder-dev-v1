import { useEffect, useRef, useState } from 'react';
import { Input } from '@/shared/components';
import { useToastStore } from '@/store';
import { searchUsers, toArray } from '../services/access-control-service';
import { userDisplayName } from '../utils';
import type { UserSearchResult } from '../types';

interface UserPickerProps {
  selectedUser: UserSearchResult | null;
  onSelect: (user: UserSearchResult) => void;
  onClear: () => void;
}

/**
 * Debounced user search box. On selecting a result it collapses to a summary
 * chip; clearing it reopens the search field. Reused by both admin pages.
 */
export function UserPicker({ selectedUser, onSelect, onClear }: UserPickerProps) {
  const { addToast } = useToastStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (selectedUser) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const data = await searchUsers(trimmed);
        if (!cancelled) {
          setResults(toArray(data).slice(0, 20));
          setOpen(true);
        }
      } catch (err) {
        if (!cancelled) {
          addToast({
            message: err instanceof Error ? err.message : 'Failed to search users',
            type: 'error',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, selectedUser, addToast]);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  if (selectedUser) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 dark:border-white/15 dark:bg-white/5">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {userDisplayName(selectedUser)}
          </span>
          <span className="text-xs text-slate-500 dark:text-white/50">
            {selectedUser.email || `ID ${selectedUser.id}`}
            {selectedUser.agency_code ? ` · ${selectedUser.agency_code}` : ''}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setQuery('');
            setResults([]);
            onClear();
          }}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder="Search users by name, email, phone, or agency code…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-white/15 dark:bg-[#1e2431]">
          {loading && (
            <div className="px-3 py-2 text-sm text-slate-500 dark:text-white/50">Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500 dark:text-white/50">No users found</div>
          )}
          {results.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => {
                onSelect(user);
                setOpen(false);
              }}
              className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {userDisplayName(user)}
              </span>
              <span className="text-xs text-slate-500 dark:text-white/50">
                {user.email || `ID ${user.id}`}
                {user.agency_code ? ` · ${user.agency_code}` : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
