import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Heading,
  LoadingState,
  Select,
  Text,
  UserAutocompleteDropdown,
  type UserAutocompleteOption,
} from '@shared/components';
import { useToastStore } from '@/store';
import { eventService } from '../services/event-service';
import { postSaleService } from '../services/post-sale-service';
import { EventSubnav } from '../components/event-subnav';
import type { BigEvent } from '../types/event';
import type { EventPermissionGrant, PermissionScope } from '../types/post-sale';

const SCOPES: Array<{ value: PermissionScope; label: string; help: string }> = [
  { value: 'EVENT', label: 'Event management', help: 'Edit the event and its configuration' },
  { value: 'PURCHASE', label: 'Purchases', help: 'View and manage orders and tickets' },
  { value: 'CHECKIN', label: 'Check-in', help: 'Run the door / mark attendees arrived' },
  { value: 'QUESTION', label: 'Questions', help: 'Answer attendee questions' },
];

const SCOPE_LABEL: Record<PermissionScope, string> = {
  EVENT: 'Event management',
  PURCHASE: 'Purchases',
  CHECKIN: 'Check-in',
  QUESTION: 'Questions',
};

/** Per-event delegated access: grant users a scope without global permissions. */
export default function EventPermissionsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const id = Number(eventId);
  const addToast = useToastStore((state) => state.addToast);

  const [event, setEvent] = useState<BigEvent | null>(null);
  const [grants, setGrants] = useState<EventPermissionGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserAutocompleteOption | null>(null);
  const [scope, setScope] = useState<PermissionScope>('CHECKIN');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setGrants(await postSaleService.listPermissions(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load access grants');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    void eventService.get(id).then(setEvent).catch(() => setEvent(null));
    void load();
  }, [id, load]);

  const addGrant = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await postSaleService.createPermission(id, selectedUser.id, scope);
      addToast({ type: 'success', message: `Granted ${SCOPE_LABEL[scope]} to ${selectedUser.label}.` });
      setSelectedUser(null);
      await load();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to grant access' });
    } finally {
      setSaving(false);
    }
  };

  const removeGrant = async (grantId: number) => {
    try {
      await postSaleService.deletePermission(id, grantId);
      await load();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to revoke' });
    }
  };

  if (!Number.isFinite(id)) return <Text variant="muted">Invalid event.</Text>;

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h1">
          {event?.name || 'Access'}
        </Heading>
        <Text variant="muted">
          Grant a user access to just this event — no platform-wide permission needed
        </Text>
      </div>
      <EventSubnav eventId={id} />

      <Card>
        <CardContent className="p-4">
          <Text className="mb-3 font-medium">Grant access</Text>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px]">
              <UserAutocompleteDropdown
                selectedId={selectedUser?.id ?? null}
                selectedLabel={selectedUser?.label}
                placeholder="Search a user…"
                fetchFromApi
                onSelect={(option) => setSelectedUser(option)}
              />
            </div>
            <Select
              value={scope}
              onChange={(e) => setScope(e.target.value as PermissionScope)}
              className="max-w-[200px]"
            >
              {SCOPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
            <Button type="button" onClick={() => void addGrant()} disabled={!selectedUser || saving}>
              Grant
            </Button>
          </div>
          <Text variant="muted" className="mt-2 text-xs">
            {SCOPES.find((s) => s.value === scope)?.help}
          </Text>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <Text className="text-red-600">{error}</Text>
      ) : grants.length === 0 ? (
        <Text variant="muted">No per-event grants. Users with global permissions still have access.</Text>
      ) : (
        <Card>
          <CardContent className="p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-1">User</th>
                  <th className="py-1">Scope</th>
                  <th className="py-1" />
                </tr>
              </thead>
              <tbody>
                {grants.map((grant) => (
                  <tr key={grant.id} className="border-t border-slate-100 dark:border-white/10">
                    <td className="py-2">
                      {grant.user_detail?.name || `User #${grant.user}`}
                      {grant.user_detail?.email ? (
                        <span className="ml-2 text-xs text-slate-500">{grant.user_detail.email}</span>
                      ) : null}
                    </td>
                    <td className="py-2">
                      <Badge variant="outline">{SCOPE_LABEL[grant.scope]}</Badge>
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => void removeGrant(grant.id)}
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
