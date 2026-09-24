import { useRef, useState } from 'react';
import { Download, FileText, ImageIcon, Paperclip, Trash2 } from 'lucide-react';
import { Button, Modal } from '@shared/components';
import { useToastStore } from '@/store';
import { bpmService } from '../services/bpm-service';
import type { BPMEventAttachment } from '../types';

/**
 * BPM attachments — in practice the flyer made for the event.
 *
 * Files live on the CDN: `href` is a permanent URL the browser fetches
 * directly, so there is nothing to proxy and no signed URL to refresh. An empty
 * `href` means the viewer is not allowed to view attachments, which is the only
 * half of the view/download settings pair that can be enforced server-side.
 */

function AttachmentIcon({ attachment }: { attachment: BPMEventAttachment }) {
  const isImage = attachment.content_type.startsWith('image/');
  return isImage ? (
    <ImageIcon size={16} className="shrink-0 text-slate-400" />
  ) : (
    <FileText size={16} className="shrink-0 text-slate-400" />
  );
}

interface AttachmentListProps {
  attachments: BPMEventAttachment[];
  /** Show the download control. A UI gate only — see BPM Settings / D11. */
  allowDownload?: boolean;
  /** When set, each row gets a remove button calling back with the id. */
  onRemove?: (attachmentId: number) => void;
  busy?: boolean;
}

/** Rows of attachments with preview and (optionally) download / remove. */
export function AttachmentList({
  attachments,
  allowDownload = true,
  onRemove,
  busy = false,
}: AttachmentListProps) {
  if (attachments.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
        No attachments yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 dark:divide-white/10">
      {attachments.map((attachment) => (
        <li key={attachment.id} className="flex items-center gap-3 py-2">
          <AttachmentIcon attachment={attachment} />
          <span className="min-w-0 flex-1 truncate text-sm text-slate-900 dark:text-white">
            {attachment.file_name}
          </span>
          {attachment.href ? (
            <>
              <a
                href={attachment.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium underline decoration-dotted underline-offset-2"
              >
                View
              </a>
              {allowDownload ? (
                <a
                  href={attachment.href}
                  download={attachment.file_name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium underline decoration-dotted underline-offset-2"
                >
                  <Download size={13} /> Download
                </a>
              ) : null}
            </>
          ) : (
            <span className="text-xs text-slate-400">Viewing disabled</span>
          )}
          {onRemove ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => onRemove(attachment.id)}
              title={`Remove ${attachment.file_name}`}
            >
              <Trash2 size={13} />
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

interface AttachmentsModalProps {
  open: boolean;
  eventName: string;
  attachments: BPMEventAttachment[];
  allowDownload?: boolean;
  onClose: () => void;
}

/** Read-only attachments popup, opened from BPM Overview and BPM Schedule. */
export function AttachmentsModal({
  open,
  eventName,
  attachments,
  allowDownload = true,
  onClose,
}: AttachmentsModalProps) {
  const previewable = attachments.filter(
    (attachment) => attachment.is_previewable && attachment.href,
  );

  return (
    <Modal
      open={open}
      title={`Attachments — ${eventName}`}
      onClose={onClose}
      contentClassName="max-w-[720px]"
    >
      <AttachmentList attachments={attachments} allowDownload={allowDownload} />
      {previewable.map((attachment) =>
        attachment.content_type.startsWith('image/') ? (
          <img
            key={attachment.id}
            src={attachment.href}
            alt={attachment.file_name}
            className="mt-4 w-full rounded-lg border border-slate-200 dark:border-white/10"
          />
        ) : (
          <object
            key={attachment.id}
            data={attachment.href}
            type="application/pdf"
            className="mt-4 h-[60vh] w-full rounded-lg border border-slate-200 dark:border-white/10"
          >
            <p className="p-4 text-sm text-slate-500">
              Preview unavailable — use the View link above.
            </p>
          </object>
        ),
      )}
    </Modal>
  );
}

interface AttachmentUploaderProps {
  eventId: number;
  attachments: BPMEventAttachment[];
  onChanged: (attachments: BPMEventAttachment[]) => void;
}

/** Upload / remove control for the Create-Edit BPM modal. */
export function AttachmentUploader({
  eventId,
  attachments,
  onChanged,
}: AttachmentUploaderProps) {
  const addToast = useToastStore((state) => state.addToast);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const created = await bpmService.uploadAttachment(eventId, file);
      onChanged([created, ...attachments]);
      addToast({ type: 'success', message: `${file.name} attached.` });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Upload failed',
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (attachmentId: number) => {
    setBusy(true);
    try {
      await bpmService.deleteAttachment(eventId, attachmentId);
      onChanged(attachments.filter((row) => row.id !== attachmentId));
      addToast({ type: 'success', message: 'Attachment removed.' });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Remove failed',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        hidden
        accept="image/*,application/pdf"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip size={15} /> {busy ? 'Uploading…' : 'Attach flyer (image or PDF)'}
      </Button>
      <AttachmentList
        attachments={attachments}
        onRemove={(id) => void remove(id)}
        busy={busy}
      />
    </div>
  );
}
