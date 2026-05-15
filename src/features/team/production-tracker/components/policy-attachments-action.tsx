import { useState } from 'react';
import { IconPaperclip } from '@tabler/icons-react';
import { Modal } from '@/shared/components';
import {
  listPolicyAttachments,
  type PolicyAttachment,
  uploadPolicyAttachment,
} from '../services/production-tracker-service';

interface PolicyAttachmentsActionProps {
  policyId: number;
  policyLabel?: string;
}

export function PolicyAttachmentsAction({ policyId, policyLabel = 'Policy' }: PolicyAttachmentsActionProps) {
  const [open, setOpen] = useState(false);
  const [attachments, setAttachments] = useState<PolicyAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAttachments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPolicyAttachments(policyId);
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
      await uploadPolicyAttachment(policyId, file);
      await loadAttachments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload attachment.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <>
      <button
        type="button"
        className="h-7 w-7 rounded border border-sky-300/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20"
        title="Attachments"
        onClick={openModal}
      >
        <IconPaperclip size={14} className="mx-auto" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Policy Attachments" contentClassName="max-w-[640px]">
        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-white/80">{policyLabel || 'Policy'}</div>
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
