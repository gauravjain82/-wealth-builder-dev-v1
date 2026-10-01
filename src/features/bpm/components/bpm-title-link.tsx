import type { MouseEvent, ReactNode } from 'react';
import { useAttachmentsViewAllowed } from '../context/bpm-config-selectors';

interface BpmTitleLinkProps {
  children: ReactNode;
  /** Whether this BPM has any attachments. */
  hasAttachments: boolean;
  /** Opens the attachments popup. Omit and the title is always plain text. */
  onOpen?: () => void;
  className?: string;
}

/**
 * A BPM's name, which doubles as the way into its attachments.
 *
 * This replaced the paperclip button on every BPM list: the flyer is the thing
 * people look for, and a separate icon beside five jump buttons was easy to
 * miss. The name is a visibly underlined link only when there is something to
 * open *and* attachment viewing is switched on in BPM Settings; otherwise it is
 * plain text, so a link never promises a popup with nothing in it.
 *
 * The click does not propagate, because in BPM Schedule the name sits on a row
 * that expands when clicked.
 */
export function BpmTitleLink({ children, hasAttachments, onOpen, className }: BpmTitleLinkProps) {
  const viewAllowed = useAttachmentsViewAllowed();

  if (!onOpen || !hasAttachments || !viewAllowed) {
    return <span className={className}>{children}</span>;
  }

  const open = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onOpen();
  };

  return (
    <button
      type="button"
      onClick={open}
      title="View attachments"
      className={[
        'cursor-pointer text-left underline decoration-1 underline-offset-2 hover:decoration-2',
        className || '',
      ]
        .join(' ')
        .trim()}
    >
      {children}
    </button>
  );
}
