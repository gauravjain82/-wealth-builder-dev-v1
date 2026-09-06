/**
 * BuilderInvitationsPage — the Phase 1 enrollment surface.
 *
 * Lists the current user's BuilderInvitations with lifecycle actions, and lets a
 * leader invite a member of their direct team. Creating an invitation also creates
 * the INVITED profile server-side (Decision 9); the backend enforces the depth/cap
 * rule and returns a clear error we surface as a toast.
 */

import { useState } from 'react';
import { Button } from '@shared/components';
import { UserPlus } from 'lucide-react';
import { useToastStore } from '@/store';
import {
  useInvitationMutations,
  useInvitations,
  usePrograms,
} from '../hooks/use-builder-ai';
import { InvitationCreateModal } from '../components/invitation-create-modal';
import { InvitationList } from '../components/invitation-list';

/** Render the Builder Invitations page. */
export default function BuilderInvitationsPage() {
  const addToast = useToastStore((state) => state.addToast);
  const [createOpen, setCreateOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const programs = usePrograms();
  const invitations = useInvitations();
  const { create, cancel, resend } = useInvitationMutations();

  const programId = programs.data?.[0]?.id;

  /** Send a new invitation for the sole active program. */
  const handleCreate = async (inviteeId: number) => {
    if (!programId) {
      addToast({ type: 'error', message: 'No builder program is available yet.' });
      return;
    }
    try {
      await create.mutateAsync({ program: programId, invitee: inviteeId });
      addToast({ type: 'success', message: 'Invitation sent.' });
      setCreateOpen(false);
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to send invitation.',
      });
    }
  };

  /** Cancel a pending invitation. */
  const handleCancel = async (id: number) => {
    setBusyId(id);
    try {
      await cancel.mutateAsync(id);
      addToast({ type: 'success', message: 'Invitation cancelled.' });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to cancel invitation.',
      });
    } finally {
      setBusyId(null);
    }
  };

  /** Resend a pending invitation (rotates the token + expiry). */
  const handleResend = async (id: number) => {
    setBusyId(id);
    try {
      await resend.mutateAsync(id);
      addToast({ type: 'success', message: 'Invitation resent.' });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to resend invitation.',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Builder invitations</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-white/60">
            Invite your direct team into the program and track their status.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={!programId}>
          <UserPlus size={16} />
          Invite builder
        </Button>
      </div>

      <InvitationList
        invitations={invitations.data ?? []}
        isLoading={invitations.isLoading}
        busyId={busyId}
        onCancel={handleCancel}
        onResend={handleResend}
      />

      <InvitationCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={create.isPending}
      />
    </div>
  );
}
