/** Thumbnails for stored ticket attachments and for files staged locally before upload. */

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

import type { HelpdeskAttachment } from '../services/helpdesk-service';

/** Human file size, e.g. "1.2 MB". */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AttachmentStripProps {
  attachments: HelpdeskAttachment[] | undefined;
  /** Smaller thumbnails, e.g. inside a comment. */
  compact?: boolean;
}

/**
 * Row of stored attachments. Each thumbnail opens the signed URL in a new tab; the
 * URL expires after ~15 minutes, so a reload of the ticket refreshes it.
 */
export function AttachmentStrip({ attachments, compact = false }: AttachmentStripProps) {
  if (!attachments || attachments.length === 0) return null;
  const size = compact ? 'h-14 w-20' : 'h-20 w-28';
  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((attachment) => (
        <a
          key={attachment.id}
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          title={`${attachment.file_name} (${formatBytes(attachment.size_bytes)})`}
          className="group flex flex-col items-center gap-1 text-[10px] text-slate-600 dark:text-white/60"
        >
          <img
            src={attachment.url}
            alt={attachment.file_name}
            loading="lazy"
            className={`${size} rounded-md border border-slate-200 bg-slate-100 object-cover group-hover:border-[#f5d66a] dark:border-white/15 dark:bg-black/30`}
          />
          <span className="max-w-[7rem] truncate">{attachment.kind === 'screenshot' ? 'Screenshot' : attachment.file_name}</span>
        </a>
      ))}
    </div>
  );
}

interface LocalFileThumbProps {
  file: File;
  onRemove?: () => void;
  removeLabel?: string;
  className?: string;
}

/** Preview of a not-yet-uploaded image with an optional remove button. */
export function LocalFileThumb({ file, onRemove, removeLabel = 'Remove', className = 'h-16 w-24' }: LocalFileThumbProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="relative">
      {url ? (
        <img src={url} alt={file.name} className={`${className} rounded-md border border-slate-200 object-cover dark:border-white/15`} />
      ) : (
        <div className={`${className} rounded-md border border-slate-200 dark:border-white/15`} />
      )}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${removeLabel} ${file.name}`}
          className="absolute -right-2 -top-2 rounded-full border border-slate-300 bg-white p-0.5 text-slate-700 shadow hover:text-red-600 dark:border-white/20 dark:bg-[#1e2431] dark:text-white/80"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}

interface TicketAttachmentsSectionProps {
  /** Images attached to the ticket itself. */
  attachments?: HelpdeskAttachment[];
  /** Comments whose images are listed after the ticket's own. */
  comments?: Array<{ attachments?: HelpdeskAttachment[] }>;
}

/** "Attachments (n)" card combining ticket and comment images; renders nothing when empty. */
export function TicketAttachmentsSection({ attachments = [], comments = [] }: TicketAttachmentsSectionProps) {
  const all = [...attachments, ...comments.flatMap((comment) => comment.attachments ?? [])];
  if (all.length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-black/20">
      <h3 className="mb-2 text-sm font-semibold">Attachments ({all.length})</h3>
      <AttachmentStrip attachments={all} />
    </div>
  );
}
