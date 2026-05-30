import { useState, useEffect } from 'react';
import { IconFile, IconUpload, IconX } from '@tabler/icons-react';
import { ConfirmationDialog } from '@/shared/components';
import { Button } from '@/shared/components';
// You should implement these API functions in your mission-tracker-service
// import { listMissionRingProofAttachments, uploadMissionRingProofAttachment } from '../services/mission-tracker-service';


import type { MissionRingProofAttachment } from '../services/mission-tracker-service';
import { deleteMissionRingProofAttachment } from '../services/mission-tracker-service';

interface MissionRingProofAttachmentsActionProps {
  userId: number;
  label?: string;
  listAttachments: (userId: number) => Promise<MissionRingProofAttachment[]>;
  uploadAttachment: (userId: number, file: File) => Promise<void>;
  missionRingProofList?: MissionRingProofAttachment[];
}


export function MissionRingProofAttachmentsAction({ userId, label = 'Mission Ring Proof', listAttachments, uploadAttachment, missionRingProofList }: MissionRingProofAttachmentsActionProps) {
  const [attachments, setAttachments] = useState<MissionRingProofAttachment[]>(missionRingProofList || []);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MissionRingProofAttachment | null>(null);
    // Delete attachment API
    const deleteAttachment = async (attachment: MissionRingProofAttachment) => {
      setDeletingId(attachment.id);
      setError(null);
      try {
        let blobName = attachment.blob_name;
        if (!blobName) {
          // Try to fetch the latest attachments and match by file_name and uploaded_at
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
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount, if missionRingProofList is provided, use it. Otherwise, fetch.
  useEffect(() => {
    if (missionRingProofList) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadAttachments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAttachments(userId);
      setAttachments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attachments.');
    } finally {
      setLoading(false);
    }
  };


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


  const hasAttachments = attachments.length > 0;
  return (
    <div className="flex items-center gap-2">
      {/* Show file icons for each attachment */}
      {attachments.map((attachment) => (
        <div key={attachment.id} className="relative group flex items-center">
          <a
            href={attachment.url}
            target="_blank"
            rel="noreferrer"
            title={attachment.file_name}
            className="text-sky-300 hover:text-sky-200 flex items-center"
            style={{ pointerEvents: deletingId === attachment.id ? 'none' : undefined, opacity: deletingId === attachment.id ? 0.5 : 1 }}
          >
            <IconFile size={24} />
          </a>
          {/* Cross icon overlay for delete */}
          <button
            type="button"
            className="absolute -top-1 -right-1 bg-black/80 rounded-full p-0.5 text-red-300 hover:text-red-500 opacity-80 group-hover:opacity-100 border border-white/20"
            style={{ width: 14, height: 14, lineHeight: 0 }}
            title="Delete attachment"
            disabled={deletingId === attachment.id}
            onClick={(e) => {
              e.preventDefault();
              setConfirmDelete(attachment);
            }}
          >
            <IconX size={10} />
          </button>
        </div>
      ))}
            {/* Confirmation dialog for delete */}
            <ConfirmationDialog
              open={!!confirmDelete}
              title="Delete Attachment"
              message={`Are you sure you want to delete '${confirmDelete?.file_name || ''}'?`}
              confirmText="Delete"
              cancelText="Cancel"
              loading={!!deletingId}
              onClose={() => setConfirmDelete(null)}
              onConfirm={() => confirmDelete && deleteAttachment(confirmDelete)}
            />
      {/* Upload icon/button */}
      <label className="inline-flex items-center cursor-pointer">
        <input
          type="file"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
        <span title={uploading ? 'Uploading...' : 'Upload Attachment'} className="flex items-center text-sky-400 hover:text-sky-200">
          <IconUpload size={16} />
        </span>
      </label>
      {error && <span className="ml-2 text-xs text-red-300">{error}</span>}
    </div>
  );
}
