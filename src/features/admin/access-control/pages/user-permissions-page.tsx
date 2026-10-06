import { useEffect, useState } from 'react';
import { useToastStore } from '@/store';
import { AccessListPanel } from '../components/access-list-panel';
import { BulkGrantPanel } from '../components/bulk-grant-panel';
import { listAllPermissions } from '../services/access-control-service';
import type { PermissionItem } from '../types';

type Tab = 'access' | 'grant';

export default function UserPermissionsPage() {
  const { addToast } = useToastStore();
  const [tab, setTab] = useState<Tab>('access');
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listAllPermissions()
      .then((data) => {
        if (!cancelled) setPermissions(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          addToast({
            message: err instanceof Error ? err.message : 'Failed to load permissions',
            type: 'error',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Permissions</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-white/60">
          Explicit per-agent overrides. A GRANT gives access even if the agent's roles don't; a
          DENY blocks access even if their roles allow it. Overrides win over role-based
          permissions.
        </p>
      </div>

      <div className="mb-6 flex gap-1 border-b border-slate-200 dark:border-white/10">
        {(
          [
            ['access', 'Who has access'],
            ['grant', 'Grant / deny access'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === key
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-white/50 dark:hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="max-w-6xl">
        {tab === 'access' ? (
          <AccessListPanel permissions={permissions} refreshKey={refreshKey} />
        ) : (
          <BulkGrantPanel
            permissions={permissions}
            onApplied={() => {
              setRefreshKey((k) => k + 1);
              setTab('access');
            }}
          />
        )}
      </div>
    </div>
  );
}
