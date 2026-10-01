import { useUserHistory } from '@/features/team/hooks/use-user-history';
import type {
  UserHistoryEvent,
  UserHistoryFieldEvent,
  UserHistoryRoleEvent,
} from '@/features/team/services/tracker-user-profile-service';

interface UserChangeHistoryProps {
  userId: number | null;
  enabled: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  api: 'App',
  admin: 'Django admin',
  system: 'Automatic',
  command: 'Data repair',
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

function whoDidIt(event: UserHistoryEvent): string {
  if (event.actor?.name) return event.actor.name;
  return event.source === 'command' ? 'Data repair' : 'System';
}

function FieldChanges({ event }: { event: UserHistoryFieldEvent }) {
  if (event.action === 'DELETE') {
    return <div>Record deleted</div>;
  }
  const lines = event.changes.map((change) => (
    <div key={change.field}>
      <span className="font-medium">{change.label}:</span>{' '}
      {event.action === 'CREATE' ? (
        change.new ?? '—'
      ) : (
        <>
          {change.old ?? '—'} → {change.new ?? '—'}
        </>
      )}
    </div>
  ));
  return (
    <>
      {event.action === 'CREATE' && <div>Record created</div>}
      {lines}
    </>
  );
}

function RoleChange({ event }: { event: UserHistoryRoleEvent }) {
  return (
    <div>
      <span className="font-medium">Role:</span> {event.from_role ?? '—'} → {event.to_role ?? '—'}
      {event.status !== 'applied' && <span className="text-slate-500 dark:text-white/50"> ({event.status})</span>}
    </div>
  );
}

/**
 * Who changed this person's leader, recruiter, agency code, phone or roles.
 *
 * Renders nothing for a viewer without `audit_log:read`: the backend answers 403
 * and the panel stays out of the way rather than showing an error.
 */
export function UserChangeHistory({ userId, enabled }: UserChangeHistoryProps) {
  const { data, isLoading, isError } = useUserHistory(userId, enabled);

  if (data && !data.allowed) return null;

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
      <div className="text-xs font-semibold uppercase text-slate-600 dark:text-white/70">Change History</div>
      {isLoading ? (
        <div className="text-xs text-slate-600 dark:text-white/60">Loading history...</div>
      ) : isError ? (
        <div className="text-xs text-red-600 dark:text-red-300">Could not load change history.</div>
      ) : !data || !data.allowed || data.events.length === 0 ? (
        <div className="text-xs text-slate-600 dark:text-white/60">No recorded changes yet.</div>
      ) : (
        <ol className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {data.events.map((event) => (
            <li
              key={event.id}
              className="rounded-md border border-slate-200 bg-white p-2 text-xs dark:border-white/10 dark:bg-black/20"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-slate-600 dark:text-white/60">
                <span>
                  <span className="font-semibold text-slate-900 dark:text-white">{whoDidIt(event)}</span>
                  {' · '}
                  {SOURCE_LABELS[event.source] ?? event.source}
                </span>
                <time dateTime={event.at}>{formatWhen(event.at)}</time>
              </div>
              <div className="mt-1 space-y-0.5 text-slate-800 dark:text-white/90">
                {event.kind === 'role' ? <RoleChange event={event} /> : <FieldChanges event={event} />}
              </div>
              {event.reason && (
                <div className="mt-1 text-slate-500 dark:text-white/50">{event.reason}</div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
