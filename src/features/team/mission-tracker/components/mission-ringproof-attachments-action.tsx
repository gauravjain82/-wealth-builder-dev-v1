import { useState, useEffect } from 'react';
import { IconPaperclip } from '@tabler/icons-react';
import { Modal, Button } from '@/shared/components';
// You should implement these API functions in your mission-tracker-service
// import { listMissionRingProofAttachments, uploadMissionRingProofAttachment } from '../services/mission-tracker-service';


interface MissionRingProofAttachment {
  id: number;
  file_name: string;
  uploaded_at: string;
  url: string;
}

interface MissionRingProofAttachmentsActionProps {
  userId: number;
  label?: string;
  listAttachments: (userId: number) => Promise<MissionRingProofAttachment[]>;
  uploadAttachment: (userId: number, file: File) => Promise<void>;
  missionRingProofList?: MissionRingProofAttachment[];
}


export function MissionRingProofAttachmentsAction({ userId, label = 'Mission Ring Proof', listAttachments, uploadAttachment, missionRingProofList }: MissionRingProofAttachmentsActionProps) {
  const [open, setOpen] = useState(false);
  const [attachments, setAttachments] = useState<MissionRingProofAttachment[]>(missionRingProofList || []);
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

  const openModal = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setOpen(true);
    await loadAttachments();
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      await uploadAttachment(userId, file);
      await loadAttachments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload attachment.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };


  const hasAttachments = attachments.length > 0;
  return (
    <>
      <Button
        type="button"
        variant={hasAttachments ? 'secondary' : 'default'}
        size="sm"
        title={hasAttachments ? 'View attachments' : 'Add attachment'}
        onClick={openModal}
        className="flex items-center gap-1 justify-center"
      >
        <IconPaperclip size={14} /> {hasAttachments ? 'View' : 'Add'}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title={label} contentClassName="max-w-[640px]">
        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-white/80">{label}</div>
            <label className="inline-flex h-9 cursor-pointer items-center rounded border border-sky-300/40 bg-sky-500/10 px-3 text-sm text-sky-200 hover:bg-sky-500/20">
              <input
                type="file"
                className="hidden"
                onChange={(e) => void handleUpload(e)}
                disabled={uploading}
              />
              {uploading ? 'Uploading...' : 'Upload Attachment'}
            </label>
          </div>

          {error ? <div className="rounded border border-red-300/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div> : null}

          {loading ? (
            <div className="text-sm text-white/70">Loading attachments...</div>
          ) : attachments.length === 0 ? (
            <div className="text-sm text-white/60">No attachments uploaded yet.</div>
          ) : (
            <div className="max-h-[320px] overflow-auto rounded border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.06em] text-white/60">
                  <tr>
                    <th className="px-3 py-2">File</th>
                    <th className="px-3 py-2">Uploaded</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {attachments.map((attachment) => (
                    <tr key={attachment.id} className="border-t border-white/10">
                      <td className="px-3 py-2 text-white/90">{attachment.file_name}</td>
                      <td className="px-3 py-2 text-white/70">{new Date(attachment.uploaded_at).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-300 hover:text-sky-200"
                        >
                          Open
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
