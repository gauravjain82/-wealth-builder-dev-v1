import { useMemo, useState } from 'react';
import { Input } from '@/shared/components';
import type { PermissionItem } from '../types';

interface PermissionMatrixProps {
  permissions: PermissionItem[];
  value: Set<number>;
  onChange: (ids: Set<number>) => void;
}

/** CRUD first, in the usual order; any custom actions follow alphabetically. */
const ACTION_ORDER = ['read', 'create', 'update', 'delete'];

function compareActions(a: string, b: string): number {
  const ia = ACTION_ORDER.indexOf(a);
  const ib = ACTION_ORDER.indexOf(b);
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  return a.localeCompare(b);
}

/**
 * Multi-select permission picker laid out as one row per resource with a toggle
 * chip per action that exists for it (the catalog is sparse, so there are no
 * empty cells). A row toggle selects the whole resource; the action bar above
 * toggles one action across every resource currently shown by the filter.
 */
export function PermissionMatrix({ permissions, value, onChange }: PermissionMatrixProps) {
  const [filter, setFilter] = useState('');

  const rows = useMemo(() => {
    const map = new Map<string, PermissionItem[]>();
    for (const permission of permissions) {
      const list = map.get(permission.resource) ?? [];
      list.push(permission);
      map.set(permission.resource, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([resource, list]) => ({
        resource,
        items: [...list].sort((a, b) => compareActions(a.action, b.action)),
      }));
  }, [permissions]);

  const visibleRows = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (row) =>
        row.resource.toLowerCase().includes(needle) ||
        row.items.some((p) => p.action.toLowerCase().includes(needle)),
    );
  }, [rows, filter]);

  const visibleActions = useMemo(() => {
    const actions = new Set<string>();
    for (const row of visibleRows) for (const p of row.items) actions.add(p.action);
    return [...actions].sort(compareActions);
  }, [visibleRows]);

  function setMany(ids: number[], on: boolean) {
    const next = new Set(value);
    for (const id of ids) {
      if (on) next.add(id);
      else next.delete(id);
    }
    onChange(next);
  }

  function toggleAction(action: string) {
    const ids = visibleRows.flatMap((row) =>
      row.items.filter((p) => p.action === action).map((p) => p.id),
    );
    setMany(ids, !ids.every((id) => value.has(id)));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1">
          <Input
            placeholder="Filter resources or actions…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <span className="text-xs text-slate-500 dark:text-white/50">
          {value.size} selected
        </span>
        {value.size > 0 && (
          <button
            type="button"
            className="text-xs text-slate-500 hover:underline dark:text-white/50"
            onClick={() => onChange(new Set())}
          >
            Clear
          </button>
        )}
      </div>

      {visibleActions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 dark:text-white/50">Toggle across shown:</span>
          {visibleActions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => toggleAction(action)}
              className="rounded-full border border-slate-300 px-2.5 py-0.5 text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/10"
            >
              {action}
            </button>
          ))}
        </div>
      )}

      <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200 dark:border-white/10">
        {visibleRows.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-white/50">
            No permissions match.
          </div>
        )}
        <ul className="divide-y divide-slate-100 dark:divide-white/5">
          {visibleRows.map((row) => {
            const ids = row.items.map((p) => p.id);
            const selectedCount = ids.filter((id) => value.has(id)).length;
            const all = selectedCount === ids.length;
            return (
              <li key={row.resource} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <label className="flex w-56 shrink-0 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={all}
                    ref={(el) => {
                      if (el) el.indeterminate = selectedCount > 0 && !all;
                    }}
                    onChange={() => setMany(ids, !all)}
                  />
                  <code className="truncate text-xs text-slate-800 dark:text-white/80">
                    {row.resource}
                  </code>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {row.items.map((p) => {
                    const on = value.has(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setMany([p.id], !on)}
                        className={
                          on
                            ? 'rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs text-white'
                            : 'rounded-full border border-slate-300 px-2.5 py-0.5 text-xs text-slate-600 hover:bg-slate-100 dark:border-white/15 dark:text-white/60 dark:hover:bg-white/10'
                        }
                      >
                        {p.action}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
