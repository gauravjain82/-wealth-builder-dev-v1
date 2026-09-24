import { useState, type ReactNode } from 'react';
import { ProspectDetailsModal } from '@/features/team/prospect/components/prospect-details-modal';

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
 * (`ProspectDetailsModal`) reads `/api/accounts/users/{id}/`, which serves any
 * user — prospect or coded associate — so one component covers guests, inviters,
 * leaders and checked-in associates alike.
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
      />
    </>
  );
}
