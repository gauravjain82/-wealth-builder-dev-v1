import { useState, type ReactNode } from 'react';
import { ProspectDetailsModal } from '@/features/team/prospect/components/prospect-details-modal';
import { bpmService } from '@/features/bpm/services/bpm-service';

interface UserDetailsLinkProps {
  /** User to show. When null the name renders as plain text, not a link. */
  userId: number | null | undefined;
  /** Display name. Falls back to an em dash when empty. */
  name?: string | null;
  /** Extra classes for the rendered name. */
  className?: string;
  /** Optional content in place of the plain name (e.g. a name plus a subtitle). */
  children?: ReactNode;
}

/**
 * A person's name, clickable, opening their details modal.
 *
 * The BPM brief asks for every user / associate / guest mentioned in a list to
 * open "the user details information modal found in prospect list". That modal
 * (`ProspectDetailsModal`) is reused, but fed from **`/api/bpm/people/{id}/`**
 * (`bpmService.person`) rather than its default `/api/accounts/users/{id}/`.
 *
 * Why: the accounts endpoint is scoped to the viewer's own team, and a BPM list
 * names people from across the company — a guest invited by another shop, an
 * inviter's SMD — so it 404'd ("Failed to fetch prospect profile: Not Found")
 * for exactly the names people click. The product decision is that anyone using
 * BPM sees the full, read-only details of anyone a BPM list shows; the BPM
 * endpoint serves that, in the same shape, so the modal renders it unchanged.
 * One component still covers guests, inviters, leaders and associates alike,
 * which is also why the modal is titled neutrally here.
 *
 * Used only by BPM. Match Up opens `ProspectDetailsModal` directly and keeps
 * the team-scoped endpoint and the "Prospect Details" wording.
 *
 * Deliberately read-only: `TrackerUserProfileModal` is the *editable* profile
 * view and can terminate a user, which is not something a check-in list should
 * expose.
 *
 * Each instance owns its own open state, so dropping it into a table row needs
 * no state plumbing in the parent.
 */
export function UserDetailsLink({
  userId,
  name,
  className,
  children,
}: UserDetailsLinkProps) {
  const [open, setOpen] = useState(false);
  const label = children ?? name ?? '—';

  if (!userId) {
    return <span className={className}>{label}</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`View ${name || 'user'} details`}
        className={[
          'cursor-pointer text-left underline decoration-dotted underline-offset-2',
          'hover:decoration-solid focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
          className || '',
        ]
          .join(' ')
          .trim()}
      >
        {label}
      </button>
      <ProspectDetailsModal
        open={open}
        prospectId={userId}
        fallbackName={name ?? undefined}
        onClose={() => setOpen(false)}
        load={bpmService.person}
        title="Details"
        subtitle="Profile · View only"
      />
    </>
  );
}
