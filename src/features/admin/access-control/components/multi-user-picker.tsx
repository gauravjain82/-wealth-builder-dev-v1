import { useEffect, useRef, useState } from 'react';
import { Input } from '@/shared/components';
import { useToastStore } from '@/store';
import { searchUsers, toArray } from '../services/access-control-service';
import { userDisplayName } from '../utils';
import type { UserSearchResult } from '../types';

interface MultiUserPickerProps {
  value: UserSearchResult[];
  onChange: (users: UserSearchResult[]) => void;
}

/** Splits pasted text into agency-code-looking tokens (comma, space or newline separated). */
function parseCodes(text: string): string[] {
  return [...new Set(text.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean))];
}

/**
 * Agent-only multi-select. Search adds one agent at a time as a chip; pasting a
 * list of agency codes resolves and adds them in bulk. Prospects (no agency
 * code) are never offered.
 */
export function MultiUserPicker({ value, onChange }: MultiUserPickerProps) {
  const { addToast } = useToastStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [resolving, setResolving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedIds = new Set(value.map((u) => u.id));

  useEffect(() => {
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
        const data = await searchUsers(trimmed, { agentsOnly: true });
        if (!cancelled) {
          setResults(toArray(data).slice(0, 20));
          setOpen(true);
        }
      } catch (err) {
        if (!cancelled) {
          addToast({
            message: err instanceof Error ? err.message : 'Failed to search agents',
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
  }, [query, addToast]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function add(user: UserSearchResult) {
    if (selectedIds.has(user.id)) return;
    onChange([...value, user]);
  }

  function remove(id: number) {
    onChange(value.filter((u) => u.id !== id));
  }

  /** Resolves each pasted agency code to exactly one agent; reports the misses. */
  async function resolvePasted() {
    const codes = parseCodes(pasteText);
    if (!codes.length) return;
    setResolving(true);
    const found: UserSearchResult[] = [];
    const missing: string[] = [];
    try {
      for (const code of codes) {
        const data = toArray(await searchUsers(code, { agentsOnly: true }));
        const match = data.find((u) => u.agency_code?.toLowerCase() === code.toLowerCase());
        if (match) found.push(match);
        else missing.push(code);
      }
      const merged = [...value];
      for (const user of found) {
        if (!merged.some((u) => u.id === user.id)) merged.push(user);
      }
      onChange(merged);
      setPasteText('');
      setPasteOpen(false);
      addToast({
        message: missing.length
          ? `Added ${found.length}. Not found: ${missing.join(', ')}`
          : `Added ${found.length} agent${found.length === 1 ? '' : 's'}`,
        type: missing.length ? 'error' : 'success',
      });
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : 'Failed to look up agency codes',
        type: 'error',
      });
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="relative">
        <Input
          placeholder="Search agents by name, email or agency code…"
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
              <div className="px-3 py-2 text-sm text-slate-500 dark:text-white/50">
                No agents found
              </div>
            )}
            {results.map((user) => {
              const already = selectedIds.has(user.id);
              return (
                <button
                  key={user.id}
                  type="button"
                  disabled={already}
                  onClick={() => add(user)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-white/10"
                >
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {userDisplayName(user)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-white/50">
                      {user.agency_code}
                      {user.email ? ` · ${user.email}` : ''}
                    </span>
                  </span>
                  <span className="text-xs text-slate-400">{already ? 'Added' : '+ Add'}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs">
        <button
          type="button"
          className="text-indigo-600 hover:underline dark:text-indigo-300"
          onClick={() => setPasteOpen((v) => !v)}
        >
          {pasteOpen ? 'Hide paste box' : 'Paste agency codes'}
        </button>
        {value.length > 0 && (
          <button
            type="button"
            className="text-slate-500 hover:underline dark:text-white/50"
            onClick={() => onChange([])}
          >
            Clear all ({value.length})
          </button>
        )}
      </div>

      {pasteOpen && (
        <div className="space-y-2">
          <textarea
            className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-white/15 dark:bg-white/5 dark:text-white"
            rows={3}
            placeholder="One or more agency codes, separated by commas, spaces or new lines"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <button
            type="button"
            disabled={resolving || !pasteText.trim()}
            onClick={resolvePasted}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-white/80"
          >
            {resolving ? 'Looking up…' : 'Add these agents'}
          </button>
        </div>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((user) => (
            <span
              key={user.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 py-1 pl-3 pr-1.5 text-xs text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-200"
            >
              {userDisplayName(user)}
              {user.agency_code && <span className="opacity-60">{user.agency_code}</span>}
              <button
                type="button"
                aria-label={`Remove ${userDisplayName(user)}`}
                onClick={() => remove(user.id)}
                className="rounded-full px-1 hover:bg-indigo-100 dark:hover:bg-white/10"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
