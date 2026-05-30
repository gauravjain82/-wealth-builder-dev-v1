import { useState, useEffect } from 'react';
import { IconFile, IconUpload, IconX } from '@tabler/icons-react';
import { ConfirmationDialog } from '@/shared/components';
import type { MissionRingProofAttachment } from '../services/mission-tracker-service';
import { deleteMissionRingProofAttachment } from '../services/mission-tracker-service';

interface MissionRingProofAttachmentsActionProps {
  userId: number;
  listAttachments: (userId: number) => Promise<MissionRingProofAttachment[]>;
  uploadAttachment: (userId: number, file: File) => Promise<void>;
  missionRingProofList?: MissionRingProofAttachment[];
}

export function MissionRingProofAttachmentsAction({ userId, listAttachments, uploadAttachment, missionRingProofList }: MissionRingProofAttachmentsActionProps) {
  const [attachments, setAttachments] = useState<MissionRingProofAttachment[]>(missionRingProofList || []);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MissionRingProofAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteAttachment = async (attachment: MissionRingProofAttachment) => {
    setDeletingId(attachment.id);
    setError(null);
    try {
      let blobName: string | undefined = attachment.blob_name;
      if (!blobName) {
        // Older list responses may not contain the blob name required by the delete API.
        const latest = await listAttachments(userId);
        const match = latest.find(
          (a) => a.file_name === attachment.file_name && a.uploaded_at === attachment.uploaded_at
        );
        blobName = match?.blob_name;
      }
      if (!blobName) throw new Error('Missing blob_name for attachment');
      await deleteMissionRingProofAttachment(userId, blobName);
      const data = await listAttachments(userId);
      setAttachments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete attachment.');
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  useEffect(() => {
    if (missionRingProofList !== undefined) {
      setAttachments(missionRingProofList);
    } else {
      (async () => {
        try {
          const data = await listAttachments(userId);
          setAttachments(data);
        } catch {
          // ignore
        }
      })();
    }
  }, [listAttachments, missionRingProofList, userId]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadAttachment(userId, file);
      const data = await listAttachments(userId);
      setAttachments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload attachment.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };


  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5" onClick={(event) => event.stopPropagation()}>
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="inline-flex h-7 items-center overflow-hidden rounded border border-amber-300/35 bg-amber-500/10"
        >
          <a
            href={attachment.url}
            target="_blank"
            rel="noreferrer"
            title={attachment.file_name}
            className="flex h-full items-center px-1.5 text-amber-300 transition-colors hover:bg-amber-500/15 hover:text-amber-100"
            style={{ pointerEvents: deletingId === attachment.id ? 'none' : undefined, opacity: deletingId === attachment.id ? 0.5 : 1 }}
          >
            <IconFile size={15} />
          </a>
          <button
            type="button"
            className="flex h-full items-center border-l border-amber-300/20 px-1 text-red-300/80 transition-colors hover:bg-red-500/15 hover:text-red-200 disabled:opacity-50"
            title="Delete attachment"
            disabled={deletingId === attachment.id}
            onClick={(e) => {
              e.preventDefault();
              setConfirmDelete(attachment);
            }}
          >
            <IconX size={12} />
          </button>
        </div>
      ))}
      <ConfirmationDialog
        open={!!confirmDelete}
        title="Delete Attachment"
        message={`Are you sure you want to delete '${confirmDelete?.file_name || ''}'?`}
        confirmText="Delete"
        cancelText="Cancel"
        loading={!!deletingId}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete ? deleteAttachment(confirmDelete) : undefined}
      />
      <label
        title={uploading ? 'Uploading...' : 'Upload Attachment'}
        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-amber-300/35 bg-amber-500/10 text-amber-300 transition-colors hover:bg-amber-500/20 hover:text-amber-100"
      >
        <input
          type="file"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
        <IconUpload size={15} />
      </label>
      {error && <span className="text-[10px] text-red-300">{error}</span>}
    </div>
  );
}
