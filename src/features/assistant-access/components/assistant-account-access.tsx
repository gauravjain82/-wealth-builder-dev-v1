/**
 * "Account access" block under the SMD's verified assistant (Settings → Assistant):
 * the state of the assistant's own login — invite sent, active, blocked or revoked —
 * with Resend invite / Revoke access. Renders nothing while loading, on error, or when
 * the SMD has no access record (MDs, or no verified assistant yet).
 */

import { useState } from 'react';

import { ConfirmationDialog } from '@/shared/components';
import { useToastStore } from '@/store';

import {
  useMyAssistantAccess,
  useResendAssistantInvite,
  useRevokeAssistantAccess,
} from '../hooks/use-assistant-access';
import type { AssistantAccess } from '../types';

/** ISO timestamp → "Oct 16, 2026"; absent or unparsable → "—". */
function formatAccessDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Human message for a `blocked` access. */
function blockedMessage(access: AssistantAccess): string {
  if (access.blocked_reason === 'email_is_agent_account') {
    return 'This email belongs to an agent account. Contact support to convert it.';
  }
  return 'Access is blocked. Contact support for help.';
}

export function AssistantAccountAccess({
  submissionVerified,
}: {
  /** The plug-in fees assistant is still verified, so a revoked login can be re-invited. */
  submissionVerified: boolean;
}) {
  const { addToast } = useToastStore();
  const { data } = useMyAssistantAccess();
  const resend = useResendAssistantInvite();
  const revoke = useRevokeAssistantAccess();
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const access = data?.access;
  if (!access) return null;

  const handleResend = async () => {
    try {
      await resend.mutateAsync();
      addToast({ type: 'success', message: `Invite sent to ${access.assistant_email}.` });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to resend the invite.',
      });
    }
  };

  const handleRevoke = async () => {
    try {
      await revoke.mutateAsync();
      addToast({ type: 'success', message: 'Assistant access revoked.' });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to revoke access.',
      });
    } finally {
      setConfirmRevoke(false);
    }
  };

  const busy = resend.isPending || revoke.isPending;

  return (
    <div className="wb-pf-stack" style={{ gap: 8 }} id="settings-plugin-fees-assistant-access">
      <h4 className="wb-pf-subheading">Account access</h4>
      <p className="wb-pf-muted" style={{ margin: 0 }}>
        Your assistant signs in with their own email and password and works in your account.
        Billing, plug-in fees and your personal settings stay hidden from them.
      </p>

      {access.status === 'invited' ? (
        <div className="wb-pf-callout" role="status">
          Invite sent to {access.assistant_email}, expires {formatAccessDate(access.invite_expires_at)}.
        </div>
      ) : null}

      {access.status === 'active' ? (
        <div className="wb-pf-callout" role="status">
          Active since {formatAccessDate(access.activated_at)} ({access.assistant_email}).
        </div>
      ) : null}

      {access.status === 'blocked' ? (
        <div className="wb-pf-callout wb-pf-callout--warning" role="status">
          {blockedMessage(access)}
        </div>
      ) : null}

      {access.status === 'revoked' ? (
        <div className="wb-pf-callout" role="status">
          Access revoked{access.revoked_at ? ` on ${formatAccessDate(access.revoked_at)}` : ''}.
        </div>
      ) : null}

      <div className="connected-account-actions">
        {access.status === 'invited' || (access.status === 'revoked' && submissionVerified) ? (
          <button type="button" className="btn-secondary" onClick={() => void handleResend()} disabled={busy}>
            {resend.isPending ? 'Sending…' : access.status === 'revoked' ? 'Re-send invite' : 'Resend invite'}
          </button>
        ) : null}
        {access.status === 'active' || access.status === 'invited' ? (
          <button type="button" className="btn-secondary" onClick={() => setConfirmRevoke(true)} disabled={busy}>
            Revoke access
          </button>
        ) : null}
      </div>

      <ConfirmationDialog
        open={confirmRevoke}
        title="Revoke your assistant's access?"
        message={`${access.assistant_name} will be signed out and can no longer sign in to your account. Your verified assistant for plug-in fees is not affected.`}
        confirmText="Revoke access"
        loading={revoke.isPending}
        onConfirm={() => void handleRevoke()}
        onClose={() => setConfirmRevoke(false)}
      />
    </div>
  );
}
