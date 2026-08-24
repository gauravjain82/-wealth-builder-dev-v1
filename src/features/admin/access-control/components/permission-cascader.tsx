import { useEffect, useMemo, useRef, useState } from 'react';
import { Input, Select } from '@/shared/components';
import type { PermissionItem } from '../types';

interface PermissionCascaderProps {
  permissions: PermissionItem[];
  value: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
}

/**
 * Cascading Resource → Action permission picker. The user chooses a resource
 * from a searchable list, then an action; only actions that actually exist for
 * that resource are offered (the catalog is sparse), so an invalid pair can't
 * be selected. The two selections resolve back to a single permission id.
 */
export function PermissionCascader({
  permissions,
  value,
  onChange,
  disabled,
}: PermissionCascaderProps) {
  // resource -> its permissions (one per action)
  const byResource = useMemo(() => {
    const map = new Map<string, PermissionItem[]>();
    for (const permission of permissions) {
      const list = map.get(permission.resource) ?? [];
      list.push(permission);
      map.set(permission.resource, list);
    }
    return map;
  }, [permissions]);

  const resources = useMemo(
    () => [...byResource.keys()].sort((a, b) => a.localeCompare(b)),
    [byResource],
  );

  const selected = useMemo(
    () => permissions.find((p) => p.id === value) ?? null,
    [permissions, value],
  );

  const [resource, setResource] = useState<string>('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep the resource in sync with an externally-set value (e.g. editing).
  useEffect(() => {
    setResource(selected?.resource ?? '');
  }, [selected]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const filteredResources = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? resources.filter((r) => r.toLowerCase().includes(q)) : resources;
  }, [resources, query]);

  const actionsForResource = useMemo(() => {
    const list = byResource.get(resource) ?? [];
    return [...list].sort((a, b) => a.action.localeCompare(b.action));
  }, [byResource, resource]);

  function selectResource(next: string) {
    setResource(next);
    setOpen(false);
    setQuery('');
    // Reset the action selection; force a fresh action pick for the new resource.
    onChange(null);
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {/* Resource — searchable */}
      <div ref={containerRef} className="relative">
        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/50">
          Resource
        </label>
        {resource && !open ? (
          <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 dark:border-white/15 dark:bg-white/5">
            <code className="text-sm text-slate-900 dark:text-white">{resource}</code>
            {!disabled && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setOpen(true);
                }}
                className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
              >
                Change
              </button>
            )}
          </div>
        ) : (
          <>
            <Input
              placeholder="Search resource…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setOpen(true)}
              disabled={disabled}
            />
            {open && (
              <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-white/15 dark:bg-[#1e2431]">
                {filteredResources.length === 0 && (
                  <div className="px-3 py-2 text-sm text-slate-500 dark:text-white/50">
                    No resources found
                  </div>
                )}
                {filteredResources.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => selectResource(r)}
                    className="flex w-full items-center px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-white/10"
                  >
                    <code className="text-sm text-slate-800 dark:text-white/80">{r}</code>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Action — dependent on resource */}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/50">
          Action
        </label>
        <Select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          disabled={disabled || !resource}
        >
          <option value="">{resource ? 'Select an action…' : 'Pick a resource first'}</option>
          {actionsForResource.map((permission) => (
            <option key={permission.id} value={permission.id}>
              {permission.action}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
