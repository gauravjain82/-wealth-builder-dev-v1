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
  useMyBuilderAccess,
  usePrograms,
} from '../hooks/use-builder-ai';
import { useInvitationRule, useInvitationRuleMutation } from '../hooks/use-builder-config';
import { InvitationCreateModal } from '../components/invitation-create-modal';
import { InvitationLimitsPanel } from '../components/invitation-limits-panel';
import { InvitationList } from '../components/invitation-list';
import type { InvitationRuleWriteInput } from '../types';

/** Render the Builder Invitations page. */
export default function BuilderInvitationsPage() {
  const addToast = useToastStore((state) => state.addToast);
  const [createOpen, setCreateOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const programs = usePrograms();
  const invitations = useInvitations();
  const { create, cancel, resend } = useInvitationMutations();

  const programId = programs.data?.[0]?.id;

  const access = useMyBuilderAccess();
  const canManage = Boolean(access.data?.program.manage);
  const ruleQuery = useInvitationRule(programId);
  const ruleMutation = useInvitationRuleMutation(programId);

  /** Persist the program's invitation limits (caps/depth/expiry). */
  const handleSaveLimits = async (payload: InvitationRuleWriteInput) => {
    if (!ruleQuery.data) return;
    try {
      await ruleMutation.mutateAsync({ id: ruleQuery.data.id, payload });
      addToast({ type: 'success', message: 'Invitation limits updated.' });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update limits.',
      });
    }
  };

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

      {ruleQuery.data && (
        <InvitationLimitsPanel
          rule={ruleQuery.data}
          canManage={canManage}
          isSaving={ruleMutation.isPending}
          onSave={handleSaveLimits}
        />
      )}

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
