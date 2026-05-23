import { useCallback, useEffect, useState } from 'react';
import { Block, Button, ErrorState, LoadingState } from '@/shared/components';
import { useToastStore } from '@/store';
import {
  fetchTerminatedUsers,
  reactivateUser,
  type TerminatedUser,
} from '../services/terminated-users-service';

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function displayName(user: TerminatedUser): string {
  const full = user.full_name?.trim();
  if (full) return full;
  return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
}

function UserAvatar({ user }: { user: TerminatedUser }) {
  const thumb = user.profile?.photo_url_thumb || user.profile?.photo_url || null;
  const name = displayName(user);
  if (thumb) {
    return (
      <img
        src={thumb}
        alt={name}
        className="h-10 w-10 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white/90">
      {initialsFromName(name)}
    </div>
  );
}

function ActivateToggle({
  userId,
  name,
  onActivated,
}: {
  userId: number;
  name: string;
  onActivated: (id: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const handleActivate = async () => {
    if (loading) return;
    const confirmed = window.confirm(`Reactivate ${name}?`);
    if (!confirmed) return;
    try {
      setLoading(true);
      await reactivateUser(userId);
      addToast({ type: 'success', message: `${name} has been reactivated.` });
      onActivated(userId);
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to reactivate user.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/50 dark:text-white/50 light:text-black/50">
        {loading ? 'Activating…' : ''}
      </span>
      <button
        type="button"
        aria-label={`Reactivate ${name}`}
        disabled={loading}
        onClick={() => void handleActivate()}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 disabled:cursor-not-allowed disabled:opacity-50 ${
          loading ? 'bg-white/10' : 'bg-white/15 hover:bg-white/20'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
            loading
              ? 'translate-x-5 bg-amber-400'
              : 'translate-x-0.5 bg-white/60'
          }`}
        />
      </button>
    </div>
  );
}

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
      <input
        type="search"
        placeholder="Search by name, email or agency…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-white/15 bg-white/5 pl-9 pr-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30 dark:bg-white/5 dark:text-white"
      />
    </div>
  );
}

export default function TerminatedUsersPage() {
  const [users, setUsers] = useState<TerminatedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const addToast = useToastStore((s) => s.addToast);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void fetchTerminatedUsers()
      .then((data) => {
        if (!active) return;
        setUsers(data);
      })
      .catch((err) => {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Failed to load terminated users.';
        setError(msg);
        addToast({ type: 'error', message: msg });
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [addToast]);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load]);

  const handleActivated = useCallback((id: number) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      displayName(u).toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.agency_code || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6">
      <Block
        title="Terminated Users"
        description="Users who have been terminated. Use the toggle to reactivate a user."
        actions={
          <Button type="button" variant="secondary" size="sm" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        }
        className="mb-6"
      />

      {/* Search */}
      {!loading && !error && (
        <div className="mb-4 max-w-sm">
          <SearchInput value={search} onChange={setSearch} />
        </div>
      )}

      {loading ? (
        <LoadingState description="Loading terminated users…" />
      ) : error ? (
        <ErrorState description={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-12 text-center">
          <p className="text-sm text-white/60">
            {search.trim() ? 'No terminated users match your search.' : 'No terminated users found.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
          {/* Table header */}
          <div className="hidden grid-cols-[2.5rem_1fr_1fr_1fr_auto] items-center gap-4 border-b border-white/10 px-4 py-2.5 sm:grid">
            <span />
            <span className="text-xs font-semibold uppercase tracking-wide text-white/50">Name</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-white/50">Agency / Role</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-white/50">Email</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-white/50">Activate</span>
          </div>

          <ul className="divide-y divide-white/8">
            {filtered.map((user) => {
              const name = displayName(user);
              const role = user.roles?.[0] ?? '—';
              return (
                <li
                  key={user.id}
                  className="grid grid-cols-1 gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03] sm:grid-cols-[2.5rem_1fr_1fr_1fr_auto] sm:items-center sm:gap-4"
                >
                  {/* Avatar */}
                  <UserAvatar user={user} />

                  {/* Name */}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-white">{name}</div>
                    <div className="truncate text-xs text-white/50">{user.email}</div>
                  </div>

                  {/* Agency / Role */}
                  <div className="min-w-0">
                    <div className="truncate text-sm text-white/80">
                      {user.agency_code || <span className="text-white/30">—</span>}
                    </div>
                    <div className="truncate text-xs text-white/50">{role}</div>
                  </div>

                  {/* Email (desktop duplicate hidden on mobile, already in Name cell) */}
                  <div className="hidden truncate text-sm text-white/70 sm:block">{user.email}</div>

                  {/* Activate toggle */}
                  <ActivateToggle
                    userId={user.id}
                    name={name}
                    onActivated={handleActivated}
                  />
                </li>
              );
            })}
          </ul>

          {/* Footer count */}
          <div className="border-t border-white/10 px-4 py-2.5 text-xs text-white/40">
            {filtered.length} of {users.length} terminated user{users.length !== 1 ? 's' : ''}
            {search.trim() ? ' matching search' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
