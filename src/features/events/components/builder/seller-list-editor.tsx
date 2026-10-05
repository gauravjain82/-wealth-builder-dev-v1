import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  ErrorState,
  Input,
  Label,
  LoadingState,
  Select,
  Text,
} from '@shared/components';
import { useToastStore } from '@/store';
import { configService } from '../../services/config-service';
import { useEventsAccess } from '../../hooks/use-events-access';
import type { EventTrackedSeller, ExternalTeam } from '../../types/config';
import type { BigEvent } from '../../types/event';

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

/**
 * The event's seller list — the names buyers pick from in the checkout "Who
 * invited you?" dropdown, and that sales are credited to in reports.
 *
 * Our own leaders come from the hierarchy; leaders of teams outside
 * WealthBuilder come from the shared External Teams directory, either a whole
 * team at once or one leader at a time.
 */
export function SellerListEditor({ event }: { event: BigEvent }) {
  const addToast = useToastStore((s) => s.addToast);
  const { data: access } = useEventsAccess();
  const canManageDirectory = Boolean(access?.surfaces.external_teams);

  const [sellers, setSellers] = useState<EventTrackedSeller[]>([]);
  const [teams, setTeams] = useState<ExternalTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [teamId, setTeamId] = useState('');
  const [memberId, setMemberId] = useState('');

  const loadSellers = useCallback(async () => {
    setSellers(await configService.listSellers(event.id));
  }, [event.id]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      loadSellers(),
      // The directory is optional here: without access the external picker hides.
      configService.listExternalTeams().then(setTeams, () => setTeams([])),
    ])
      .catch((err) => setError(errorMessage(err, 'Failed to load sellers')))
      .finally(() => setLoading(false));
  }, [loadSellers]);

  const selectedTeam = teams.find((t) => String(t.id) === teamId) ?? null;
  const onEventCodes = useMemo(() => new Set(sellers.map((s) => s.agent_code)), [sellers]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sellers;
    return sellers.filter((s) =>
      [s.display_name, s.agent_code, s.team_name].some((v) => v.toLowerCase().includes(q)),
    );
  }, [sellers, search]);

  const run = async (action: () => Promise<{ created: number }>, noun: string) => {
    setBusy(true);
    try {
      const { created } = await action();
      await loadSellers();
      addToast({
        type: created ? 'success' : 'info',
        message: created ? `Added ${created} ${noun}${created === 1 ? '' : 's'}` : 'Everyone is already on the list',
      });
    } catch (err) {
      addToast({ type: 'error', message: errorMessage(err, 'Could not add sellers') });
    } finally {
      setBusy(false);
    }
  };

  const addFromHierarchy = () =>
    run(() => configService.populateSellersFromHierarchy(event.id), 'name');

  const addExternal = () => {
    if (!selectedTeam) return;
    const selection = memberId
      ? { member_ids: [Number(memberId)] }
      : { team_ids: [selectedTeam.id] };
    void run(() => configService.addExternalSellers(event.id, selection), 'leader').then(() =>
      setMemberId(''),
    );
  };

  const remove = async (seller: EventTrackedSeller) => {
    setBusy(true);
    try {
      await configService.deleteSeller(event.id, seller.id);
      await loadSellers();
    } catch (err) {
      addToast({ type: 'error', message: errorMessage(err, 'Could not remove seller') });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState description={error} />;

  return (
    <section className="space-y-4 border-t border-slate-200 pt-6 dark:border-white/10">
      <div>
        <Text className="font-medium">Seller list</Text>
        <Text variant="muted" className="text-sm">
          Buyers pick one of these names at checkout so their ticket is credited to the right SMD.
          {event.track_by === 'DONT_TRACK' &&
            ' Tracking is off, so the list is hidden at checkout until you choose a "Track sales by" mode.'}
        </Text>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Button type="button" variant="secondary" onClick={() => void addFromHierarchy()} disabled={busy}>
          Add names from hierarchy
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 p-4 dark:border-white/10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Text className="text-sm font-medium">Add an external team</Text>
          {canManageDirectory && (
            <Link to="/events/external-teams" className="text-xs text-blue-600 hover:underline">
              Manage external teams
            </Link>
          )}
        </div>
        {teams.length === 0 ? (
          <Text variant="muted" className="text-sm">
            No external teams yet.
            {canManageDirectory && ' Add teams and their SMDs under Big Event → External Teams.'}
          </Text>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-[200px] flex-col gap-1.5">
              <Label variant="form">Team</Label>
              <Select
                value={teamId}
                onChange={(e) => {
                  setTeamId(e.target.value);
                  setMemberId('');
                }}
              >
                <option value="">Select a team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.members.length})
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex min-w-[240px] flex-col gap-1.5">
              <Label variant="form">SMD / CEO-MD</Label>
              <Select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                disabled={!selectedTeam}
              >
                <option value="">All leaders on this team</option>
                {selectedTeam?.members.map((m) => (
                  <option key={m.id} value={m.id} disabled={onEventCodes.has(m.agent_code)}>
                    {m.name} ({m.agent_code}) · {m.level_code}
                    {onEventCodes.has(m.agent_code) ? ' — on list' : ''}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="button" onClick={addExternal} disabled={!selectedTeam || busy}>
              {memberId ? 'Add leader' : 'Add team'}
            </Button>
          </div>
        )}
      </div>

      <Input
        placeholder="Search name, agency code or team"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {visible.length === 0 ? (
        <Text variant="muted" className="text-sm">
          {sellers.length === 0 ? 'No sellers yet.' : 'No sellers match your search.'}
        </Text>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-1">SMD / CEO / Leader</th>
                <th className="py-1">Agency code</th>
                <th className="py-1">Level</th>
                <th className="py-1">Team</th>
                <th className="py-1">Nearest upline</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {visible.map((seller) => (
                <tr key={seller.id} className="border-t border-slate-100 dark:border-white/10">
                  <td className="py-2">{seller.display_name}</td>
                  <td className="py-2">{seller.agent_code}</td>
                  <td className="py-2">{seller.level_code || '—'}</td>
                  <td className="py-2">
                    {seller.team_name ? (
                      <Badge variant="outline">{seller.team_name}</Badge>
                    ) : (
                      <span className="text-xs text-slate-500">Our team</span>
                    )}
                  </td>
                  <td className="py-2">{seller.nearest_upline_name || '—'}</td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline disabled:opacity-50"
                      onClick={() => void remove(seller)}
                      disabled={busy}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
