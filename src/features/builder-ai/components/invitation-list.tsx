/**
 * InvitationList — the sent/received BuilderInvitations table with lifecycle
 * actions. Pending invitations can be cancelled or resent (Decision 9); terminal
 * ones are shown read-only with their status badge.
 */

import { Badge, Button, Card, LoadingState, NonIdealState } from '@shared/components';
import type { BadgeProps } from '@shared/components';
import type { BuilderInvitation, InvitationStatus } from '../types';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

const STATUS_VARIANT: Record<InvitationStatus, BadgeVariant> = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  DECLINED: 'destructive',
  EXPIRED: 'secondary',
  CANCELLED: 'secondary',
};

export interface InvitationListProps {
  invitations: BuilderInvitation[];
  isLoading: boolean;
  busyId: number | null;
  onCancel: (id: number) => void;
  onResend: (id: number) => void;
}

/** Display name for an embedded user brief. */
function displayName(user: BuilderInvitation['invitee']): string {
  return user.full_name || user.username || `User #${user.id}`;
}

/** Format an ISO date as a short label. */
function shortDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Render the invitations list. */
export function InvitationList({
  invitations,
  isLoading,
  busyId,
  onCancel,
  onResend,
}: InvitationListProps) {
  if (isLoading) {
    return <LoadingState title="Loading invitations" description="Fetching your invitations…" />;
  }
  if (invitations.length === 0) {
    return (
      <NonIdealState
        title="No invitations yet"
        description="Invite a member of your direct team to get started."
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="divide-y divide-slate-100 dark:divide-white/5">
        {invitations.map((invitation) => {
          const pending = invitation.status === 'PENDING';
          const busy = busyId === invitation.id;
          return (
            <div key={invitation.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {displayName(invitation.invitee)}
                </div>
                <div className="text-xs text-slate-500 dark:text-white/50">
                  {invitation.invitee.agency_code || invitation.invitee.username}
                  {' · sent '}
                  {shortDate(invitation.created_at)}
                  {pending && invitation.expires_at ? ` · expires ${shortDate(invitation.expires_at)}` : ''}
                </div>
              </div>
              <Badge variant={STATUS_VARIANT[invitation.status]}>
                {invitation.status.charAt(0) + invitation.status.slice(1).toLowerCase()}
              </Badge>
              {pending && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => onResend(invitation.id)}>
                    Resend
                  </Button>
                  <Button size="sm" variant="destructive" disabled={busy} onClick={() => onCancel(invitation.id)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
