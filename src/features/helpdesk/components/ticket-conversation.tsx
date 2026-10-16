/** Ticket conversation for worker views: internal notes are styled apart from public replies. */

import { Lock } from 'lucide-react';

import { formatHelpdeskDate } from '../constants';
import type { HelpdeskComment } from '../services/helpdesk-service';
import { AttachmentStrip } from './attachment-strip';

/** Classes for one comment card by kind (internal note / staff reply / requester). */
function commentClass(comment: HelpdeskComment): string {
  if (comment.is_internal) {
    return 'border-dashed border-amber-400 bg-amber-50/70 dark:border-amber-300/40 dark:bg-amber-500/10';
  }
  if (comment.is_staff_reply === false) return 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/5';
  return 'border-sky-200 bg-sky-50/60 dark:border-sky-400/20 dark:bg-sky-500/10';
}

/** List of comments, oldest first, with an "Internal note" label on private ones. */
export function TicketConversation({ comments }: { comments: HelpdeskComment[] }) {
  if (comments.length === 0) {
    return <div className="text-xs text-slate-600 dark:text-white/65">No comments yet.</div>;
  }
  return (
    <div className="space-y-2">
      {comments.map((comment) => (
        <div key={comment.id} className={`rounded-md border p-2 text-sm ${commentClass(comment)}`}>
          <div className="mb-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-600 dark:text-white/70">
            <strong className="text-slate-800 dark:text-white/90">{comment.author_name || 'Support Team'}</strong>
            <span>{formatHelpdeskDate(comment.created_at)}</span>
            {comment.is_internal ? (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-200">
                <Lock className="h-3 w-3" aria-hidden="true" /> Internal note
              </span>
            ) : comment.is_staff_reply === false ? (
              <span>from requester</span>
            ) : null}
          </div>
          <div className="whitespace-pre-wrap">{comment.body}</div>
          {comment.attachments?.length ? (
            <div className="mt-2">
              <AttachmentStrip attachments={comment.attachments} compact />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
