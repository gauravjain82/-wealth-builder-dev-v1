import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Button,
  Card,
  CardContent,
  ConfirmationDialog,
  ErrorState,
  Heading,
  Input,
  LoadingState,
  Select,
  Text,
} from '@shared/components';
import { useToastStore } from '@/store';
import { configService } from '../services/config-service';
import type {
  ExternalLeaderLevel,
  ExternalTeam,
  ExternalTeamMember,
} from '../types/config';

const LEVELS: { value: ExternalLeaderLevel; label: string }[] = [
  { value: 'SMD', label: 'SMD' },
  { value: 'CEO-MD', label: 'CEO-MD' },
  { value: 'EVC', label: 'EVC' },
];

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

interface MemberDraft {
  name: string;
  agent_code: string;
  level_code: ExternalLeaderLevel;
}

const BLANK_MEMBER: MemberDraft = { name: '', agent_code: '', level_code: 'SMD' };

/** Name / agency code / rank inputs shared by the add and edit member rows. */
function MemberForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: MemberDraft;
  submitLabel: string;
  busy: boolean;
  onSubmit: (draft: MemberDraft) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState<MemberDraft>(initial);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (await onSubmit(draft)) setDraft(initial);
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="SMD / CEO name"
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        className="min-w-[180px] flex-1"
        required
      />
      <Input
        placeholder="Agency code"
        value={draft.agent_code}
        onChange={(e) => setDraft({ ...draft, agent_code: e.target.value })}
        className="w-36"
        required
      />
      <Select
        value={draft.level_code}
        onChange={(e) => setDraft({ ...draft, level_code: e.target.value as ExternalLeaderLevel })}
        className="w-32"
      >
        {LEVELS.map((l) => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
      </Select>
      <Button type="submit" size="sm" disabled={busy}>
        {submitLabel}
      </Button>
      {onCancel && (
        <Button type="button" size="sm" variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      )}
    </form>
  );
}

/** One team: its name/notes, its leaders, and an inline add-leader row. */
function TeamCard({
  team,
  busy,
  onRenameTeam,
  onRemoveTeam,
  onAddMember,
  onUpdateMember,
  onRemoveMember,
}: {
  team: ExternalTeam;
  busy: boolean;
  onRenameTeam: (team: ExternalTeam, name: string, notes: string) => Promise<boolean>;
  onRemoveTeam: (team: ExternalTeam) => void;
  onAddMember: (team: ExternalTeam, draft: MemberDraft) => Promise<boolean>;
  onUpdateMember: (member: ExternalTeamMember, draft: MemberDraft) => Promise<boolean>;
  onRemoveMember: (member: ExternalTeamMember) => void;
}) {
  const [editingTeam, setEditingTeam] = useState(false);
  const [name, setName] = useState(team.name);
  const [notes, setNotes] = useState(team.notes);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);

  const saveTeam = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (await onRenameTeam(team, name, notes)) setEditingTeam(false);
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        {editingTeam ? (
          <form onSubmit={(e) => void saveTeam(e)} className="flex flex-wrap items-center gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="min-w-[200px] flex-1" required />
            <Input
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-w-[200px] flex-1"
            />
            <Button type="submit" size="sm" disabled={busy}>
              Save
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setEditingTeam(false)}>
              Cancel
            </Button>
          </form>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <Text className="font-medium">{team.name}</Text>
              <Text variant="muted" className="text-xs">
                {team.members.length} leader{team.members.length === 1 ? '' : 's'}
                {team.notes ? ` · ${team.notes}` : ''}
              </Text>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => setEditingTeam(true)}>
                Edit
              </Button>
              <Button type="button" size="sm" variant="destructive" onClick={() => onRemoveTeam(team)} disabled={busy}>
                Remove team
              </Button>
            </div>
          </div>
        )}

        {team.members.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-1">Name</th>
                  <th className="py-1">Agency code</th>
                  <th className="py-1">Level</th>
                  <th className="py-1" />
                </tr>
              </thead>
              <tbody>
                {team.members.map((member) =>
                  editingMemberId === member.id ? (
                    <tr key={member.id} className="border-t border-slate-100 dark:border-white/10">
                      <td colSpan={4} className="py-2">
                        <MemberForm
                          initial={{
                            name: member.name,
                            agent_code: member.agent_code,
                            level_code: member.level_code,
                          }}
                          submitLabel="Save"
                          busy={busy}
                          onSubmit={async (draft) => {
                            const ok = await onUpdateMember(member, draft);
                            if (ok) setEditingMemberId(null);
                            return ok;
                          }}
                          onCancel={() => setEditingMemberId(null)}
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr key={member.id} className="border-t border-slate-100 dark:border-white/10">
                      <td className="py-2">{member.name}</td>
                      <td className="py-2">{member.agent_code}</td>
                      <td className="py-2">{member.level_code}</td>
                      <td className="space-x-3 py-2 text-right">
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:underline"
                          onClick={() => setEditingMemberId(member.id)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:underline"
                          onClick={() => onRemoveMember(member)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}

        <MemberForm
          initial={BLANK_MEMBER}
          submitLabel="Add leader"
          busy={busy}
          onSubmit={(draft) => onAddMember(team, draft)}
        />
      </CardContent>
    </Card>
  );
}

type PendingRemoval =
  | { kind: 'team'; team: ExternalTeam }
  | { kind: 'member'; member: ExternalTeamMember };

/**
 * Big Event → External Teams: the shared directory of teams outside
 * WealthBuilder and their SMDs / CEO-MDs. Any event can add these leaders to its
 * seller list (Team Ticketing tab) so buyers from other teams can credit their
 * ticket to their own SMD.
 */
export default function ExternalTeamsPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [teams, setTeams] = useState<ExternalTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [search, setSearch] = useState('');
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);

  const load = useCallback(async () => {
    setTeams(await configService.listExternalTeams());
  }, []);

  useEffect(() => {
    load()
      .catch((err) => setError(errorMessage(err, 'Failed to load external teams')))
      .finally(() => setLoading(false));
  }, [load]);

  /** Run a directory change, reload, and report; resolves whether it succeeded. */
  const mutate = async (action: () => Promise<unknown>, success: string): Promise<boolean> => {
    setBusy(true);
    try {
      await action();
      await load();
      addToast({ type: 'success', message: success });
      return true;
    } catch (err) {
      addToast({ type: 'error', message: errorMessage(err, 'Save failed') });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const createTeam = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = newTeamName.trim();
    if (!name) return;
    if (await mutate(() => configService.createExternalTeam({ name, notes: '' }), `Added ${name}`)) {
      setNewTeamName('');
    }
  };

  const confirmRemoval = async () => {
    if (!pendingRemoval) return;
    if (pendingRemoval.kind === 'team') {
      const { team } = pendingRemoval;
      await mutate(() => configService.deleteExternalTeam(team.id), `Removed ${team.name}`);
    } else {
      const { member } = pendingRemoval;
      await mutate(() => configService.deleteExternalMember(member.id), `Removed ${member.name}`);
    }
    setPendingRemoval(null);
  };

  const visibleTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(q) ||
        team.members.some(
          (m) => m.name.toLowerCase().includes(q) || m.agent_code.toLowerCase().includes(q),
        ),
    );
  }, [teams, search]);

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h1">
          External Teams
        </Heading>
        <Text variant="muted">
          Teams outside WealthBuilder that sell tickets to our events. Add their SMDs / CEO-MDs here,
          then add the team to any event from its Team Ticketing tab.
        </Text>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={(e) => void createTeam(e)} className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="New team name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              className="min-w-[240px] flex-1"
            />
            <Button type="submit" disabled={busy || !newTeamName.trim()}>
              Add team
            </Button>
          </form>
        </CardContent>
      </Card>

      {teams.length > 0 && (
        <Input
          placeholder="Search team, name or agency code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      )}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState description={error} />
      ) : teams.length === 0 ? (
        <Text variant="muted">No external teams yet.</Text>
      ) : (
        <div className="space-y-4">
          {visibleTeams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              busy={busy}
              onRenameTeam={(t, name, notes) =>
                mutate(() => configService.updateExternalTeam(t.id, { name, notes }), 'Team saved')
              }
              onRemoveTeam={(t) => setPendingRemoval({ kind: 'team', team: t })}
              onAddMember={(t, draft) =>
                mutate(
                  () => configService.createExternalMember({ team: t.id, ...draft }),
                  `Added ${draft.name}`,
                )
              }
              onUpdateMember={(m, draft) =>
                mutate(() => configService.updateExternalMember(m.id, draft), 'Leader saved')
              }
              onRemoveMember={(m) => setPendingRemoval({ kind: 'member', member: m })}
            />
          ))}
          {visibleTeams.length === 0 && <Text variant="muted">No teams match your search.</Text>}
        </div>
      )}

      <ConfirmationDialog
        open={pendingRemoval !== null}
        loading={busy}
        confirmVariant="destructive"
        title={pendingRemoval?.kind === 'team' ? 'Remove team?' : 'Remove leader?'}
        message={
          pendingRemoval?.kind === 'team'
            ? `${pendingRemoval.team.name} and its leaders will be taken off every event's seller list. Past sales keep their credit.`
            : `${pendingRemoval?.member.name ?? 'This leader'} will be taken off every event's seller list. Past sales keep their credit.`
        }
        confirmText="Remove"
        onConfirm={confirmRemoval}
        onClose={() => setPendingRemoval(null)}
      />
    </div>
  );
}
