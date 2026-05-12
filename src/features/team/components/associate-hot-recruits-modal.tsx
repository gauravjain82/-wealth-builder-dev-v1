import { useEffect, useMemo, useState } from 'react';
import { Button, Modal } from '@/shared/components';
import { IconCheck, IconMail, IconPhoneCall, IconX } from '@tabler/icons-react';
import type { HotRecruitUser } from '@/features/team/associate-tracker/services/associate-tracker-service';
import { TrackerNotesCell } from '@/features/team/components/tracker-notes-cell';
import { TrackerNotesModal } from '@/features/team/components/tracker-notes-modal';
import {
  createTrackerNote,
  fetchTrackerNotesForUser,
  type TrackerNote,
} from '@/features/team/services/tracker-notes-service';

interface AssociateHotRecruitsModalProps {
  open: boolean;
  ownerName: string;
  loading: boolean;
  recruits: HotRecruitUser[];
  onClose: () => void;
}

interface AssociateUserListModalProps {
  open: boolean;
  ownerName: string;
  loading: boolean;
  users: HotRecruitUser[];
  title: string;
  introText: string;
  loadingText: string;
  emptyText: string;
  onClose: () => void;
}

function fullNameOf(user: HotRecruitUser): string {
  const full = user.full_name?.trim();
  if (full) return full;
  const combined = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return combined || `User #${user.id}`;
}

function outcomeOf(user: HotRecruitUser): string {
  return (user.agent_meta?.outcome || user.plan || user.user_type || user.type || '-').toString();
}

function profileTextOf(user: HotRecruitUser): string {
  const parts = [
    user.email || null,
    user.phone || null,
    user.level?.name || user.level?.code || null,
    user.agency_code || null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' • ') : '-';
}

function BooleanIcon({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400" title="Yes" aria-label="Yes">
      <IconCheck size={14} stroke={2.6} />
    </span>
  ) : (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500/15 text-red-400" title="No" aria-label="No">
      <IconX size={14} stroke={2.6} />
    </span>
  );
}

function AssociateUserListModal({
  open,
  ownerName,
  loading,
  users,
  title,
  introText,
  loadingText,
  emptyText,
  onClose,
}: AssociateUserListModalProps) {
  const [notesByUserId, setNotesByUserId] = useState<Record<number, TrackerNote[]>>({});
  const [loadingNoteUserIdSet, setLoadingNoteUserIdSet] = useState<Set<number>>(new Set());
  const [noteDraftByUserId, setNoteDraftByUserId] = useState<Record<number, string>>({});
  const [focusedNoteInputId, setFocusedNoteInputId] = useState<number | null>(null);
  const [savingNoteUserIdSet, setSavingNoteUserIdSet] = useState<Set<number>>(new Set());
  const [notesOpenFor, setNotesOpenFor] = useState<HotRecruitUser | null>(null);
  const [modalNoteDraft, setModalNoteDraft] = useState('');

  useEffect(() => {
    if (!open) {
      setNotesOpenFor(null);
      setModalNoteDraft('');
      setFocusedNoteInputId(null);
    }
  }, [open]);

  const sortedNotesForOpenUser = useMemo(() => {
    if (!notesOpenFor) return [];
    const notes = notesByUserId[notesOpenFor.id] || [];
    return [...notes].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [notesByUserId, notesOpenFor]);

  const ensureNotesLoaded = async (userId: number) => {
    if (notesByUserId[userId]) return;
    setLoadingNoteUserIdSet((prev) => new Set(prev).add(userId));
    try {
      const loaded = await fetchTrackerNotesForUser(userId, 'associate');
      setNotesByUserId((prev) => ({ ...prev, [userId]: loaded }));
    } finally {
      setLoadingNoteUserIdSet((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleNoteDraftChange = (userId: number, value: string) => {
    setNoteDraftByUserId((prev) => ({ ...prev, [userId]: value }));
  };

  const handleAddInlineNote = async (userId: number) => {
    const draft = (noteDraftByUserId[userId] || '').trim();
    if (!draft) return;

    setSavingNoteUserIdSet((prev) => new Set(prev).add(userId));
    try {
      const created = await createTrackerNote(userId, draft, 'associate');
      setNotesByUserId((prev) => {
        const current = prev[userId] || [];
        return { ...prev, [userId]: [...current, created] };
      });
      setNoteDraftByUserId((prev) => ({ ...prev, [userId]: '' }));
    } finally {
      setSavingNoteUserIdSet((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleAddModalNote = async () => {
    if (!notesOpenFor) return;
    const text = modalNoteDraft.trim();
    if (!text) return;

    const userId = notesOpenFor.id;
    setSavingNoteUserIdSet((prev) => new Set(prev).add(userId));
    try {
      const created = await createTrackerNote(userId, text, 'associate');
      setNotesByUserId((prev) => {
        const current = prev[userId] || [];
        return { ...prev, [userId]: [...current, created] };
      });
      setModalNoteDraft('');
    } finally {
      setSavingNoteUserIdSet((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const openNotesForUser = async (user: HotRecruitUser) => {
    setNotesOpenFor(user);
    setModalNoteDraft('');
    await ensureNotesLoaded(user.id);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title.replace('{ownerName}', ownerName)}
      contentClassName="max-w-[1500px]"
    >
      <div className="space-y-3">
        <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-xs text-white/70">
          {introText.replace('{ownerName}', ownerName)}
        </div>

        <div className="max-h-[60vh] overflow-auto rounded-xl border border-white/10 bg-black/20">
          {loading ? (
            <div className="px-4 py-6 text-sm text-white/70">{loadingText}</div>
          ) : users.length === 0 ? (
            <div className="px-4 py-6 text-sm text-white/70">{emptyText}</div>
          ) : (
            <table className="w-full min-w-[1700px] border-collapse text-left text-sm text-white/90">
              <thead className="sticky top-0 bg-[#263146] text-xs uppercase text-white/70">
                <tr>
                  <th className="px-3 py-2">Leader</th>
                  <th className="px-3 py-2">Recruiter</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Top25</th>
                  <th className="px-3 py-2">Hot</th>
                  <th className="px-3 py-2">Outcome</th>
                  <th className="px-3 py-2">Profile</th>
                  <th className="px-3 py-2">Notes</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const userNotes = notesByUserId[user.id] || (user.latest_note_text ? [{
                    id: user.id,
                    user: user.id,
                    created_by: null,
                    created_by_name: user.latest_note_created_by_name || '',
                    text: user.latest_note_text,
                    tracker: 'associate',
                    created_at: user.latest_note_created_at || '',
                    updated_at: user.latest_note_created_at || '',
                  }] : []);

                  return (
                  <tr key={user.id} className="border-t border-white/10">
                    <td className="px-3 py-2 text-white/80">{user.leader_name || '-'}</td>
                    <td className="px-3 py-2 text-white/80">{user.recruited_by_name || ownerName || '-'}</td>
                    <td className="px-3 py-2 font-medium">{fullNameOf(user)}</td>
                    <td className="px-3 py-2 text-white/80">
                      <BooleanIcon value={Boolean(user.prospect_meta?.top25)} />
                    </td>
                    <td className="px-3 py-2 text-white/80">
                      <BooleanIcon value={Boolean(user.prospect_meta?.hot)} />
                    </td>
                    <td className="px-3 py-2 text-white/80">{outcomeOf(user)}</td>
                    <td className="px-3 py-2 text-white/80 max-w-[300px] align-top">
                      <div className="line-clamp-2">{profileTextOf(user)}</div>
                    </td>
                    <td className="px-3 py-2 text-white/80 max-w-[340px] align-top">
                      <TrackerNotesCell
                        userId={user.id}
                        userName={fullNameOf(user)}
                        notes={userNotes}
                        draft={noteDraftByUserId[user.id] || ''}
                        focusedNoteInputId={focusedNoteInputId}
                        saving={Boolean(
                          savingNoteUserIdSet.has(user.id) || loadingNoteUserIdSet.has(user.id)
                        )}
                        onDraftChange={handleNoteDraftChange}
                        onFocus={setFocusedNoteInputId}
                        onBlur={() => setFocusedNoteInputId(null)}
                        onAddInlineNote={handleAddInlineNote}
                        onOpenAllNotes={() => {
                          void openNotesForUser(user);
                        }}
                      />
                    </td>
                    <td className="px-3 py-2 text-white/80">
                      <div className="flex items-center gap-2">
                        <a
                          href={user.phone ? `tel:${user.phone}` : undefined}
                          aria-disabled={!user.phone}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 ${
                            user.phone ? 'hover:bg-white/10' : 'cursor-not-allowed opacity-40'
                          }`}
                          title={user.phone ? `Call ${fullNameOf(user)}` : 'Phone not available'}
                          onClick={(event) => {
                            if (!user.phone) event.preventDefault();
                          }}
                        >
                          <IconPhoneCall size={16} />
                        </a>
                        <a
                          href={user.email ? `mailto:${user.email}` : undefined}
                          aria-disabled={!user.email}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 ${
                            user.email ? 'hover:bg-white/10' : 'cursor-not-allowed opacity-40'
                          }`}
                          title={user.email ? `Email ${fullNameOf(user)}` : 'Email not available'}
                          onClick={(event) => {
                            if (!user.email) event.preventDefault();
                          }}
                        >
                          <IconMail size={16} />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </div>

        <TrackerNotesModal
          open={Boolean(notesOpenFor)}
          title={`Notes - ${notesOpenFor ? fullNameOf(notesOpenFor) : ''}`}
          notes={sortedNotesForOpenUser}
          draft={modalNoteDraft}
          saving={Boolean(
            notesOpenFor &&
              (savingNoteUserIdSet.has(notesOpenFor.id) || loadingNoteUserIdSet.has(notesOpenFor.id))
          )}
          onClose={() => setNotesOpenFor(null)}
          onDraftChange={setModalNoteDraft}
          onAddNote={handleAddModalNote}
        />
      </div>
    </Modal>
  );
}

export function AssociateHotRecruitsModal(props: AssociateHotRecruitsModalProps) {
  return (
    <AssociateUserListModal
      open={props.open}
      ownerName={props.ownerName}
      loading={props.loading}
      users={props.recruits}
      title="Hot Recruits - {ownerName}"
      introText="Showing users recruited by {ownerName} that are marked Hot."
      loadingText="Loading hot recruits..."
      emptyText="No hot recruits found."
      onClose={props.onClose}
    />
  );
}

interface AssociateClientUsersModalProps {
  open: boolean;
  ownerName: string;
  loading: boolean;
  users: HotRecruitUser[];
  onClose: () => void;
}

interface AssociateLicensedUsersModalProps {
  open: boolean;
  ownerName: string;
  loading: boolean;
  users: HotRecruitUser[];
  onClose: () => void;
}

export function AssociateClientUsersModal(props: AssociateClientUsersModalProps) {
  return (
    <AssociateUserListModal
      open={props.open}
      ownerName={props.ownerName}
      loading={props.loading}
      users={props.users}
      title="45k Personal Points - {ownerName}"
      introText="Showing users recruited by {ownerName} who are clients."
      loadingText="Loading client users..."
      emptyText="No client users found."
      onClose={props.onClose}
    />
  );
}

export function AssociateLicensedUsersModal(props: AssociateLicensedUsersModalProps) {
  return (
    <AssociateUserListModal
      open={props.open}
      ownerName={props.ownerName}
      loading={props.loading}
      users={props.users}
      title="3 Licenses - {ownerName}"
      introText="Showing users recruited by {ownerName} whose license flag is true."
      loadingText="Loading licensed users..."
      emptyText="No licensed users found."
      onClose={props.onClose}
    />
  );
}
