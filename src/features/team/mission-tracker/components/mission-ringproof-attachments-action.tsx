import { useEffect, useMemo, useState } from 'react';
import { IconUpload, IconX } from '@tabler/icons-react';
import { Button, ConfirmationDialog, Modal, Textarea } from '@/shared/components';
import {
  MISSION_RING_PROOF_TYPE_OPTIONS,
  inferMissionRingProofType,
  type MissionRingProofAttachment,
  type MissionRingProofType,
} from '../services/mission-tracker-service';
import { deleteMissionRingProofAttachment } from '../services/mission-tracker-service';
import { MissionRingIcon } from './mission-ring-icon';

const EMPTY_FILES: Record<MissionRingProofType, File[]> = {
  '1st_recruit': [],
  personal_saving: [],
  convention: [],
  others: [],
};

function emptyFileMap(): Record<MissionRingProofType, File[]> {
  return {
    '1st_recruit': [],
    personal_saving: [],
    convention: [],
    others: [],
  };
}

interface MissionRingProofAttachmentsActionProps {
  userId: number;
  eligible: boolean;
  listAttachments: (userId: number) => Promise<MissionRingProofAttachment[]>;
  uploadAttachment: (
    userId: number,
    files: File[],
    proofType: MissionRingProofType,
    notes?: string,
  ) => Promise<MissionRingProofAttachment[] | void>;
  missionRingProofList?: MissionRingProofAttachment[];
}

export function MissionRingProofAttachmentsAction({
  userId,
  eligible,
  listAttachments,
  uploadAttachment,
  missionRingProofList,
}: MissionRingProofAttachmentsActionProps) {
  const [attachments, setAttachments] = useState<MissionRingProofAttachment[]>(missionRingProofList || []);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MissionRingProofAttachment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewingFiles, setViewingFiles] = useState(false);
  const [filesByType, setFilesByType] = useState<Record<MissionRingProofType, File[]>>(EMPTY_FILES);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupedAttachments = useMemo(() => {
    const grouped: Record<MissionRingProofType, MissionRingProofAttachment[]> = {
      '1st_recruit': [],
      personal_saving: [],
      convention: [],
      others: [],
    };
    attachments.forEach((attachment) => {
      grouped[inferMissionRingProofType(attachment)].push(attachment);
    });
    return grouped;
  }, [attachments]);

  const selectedCount = MISSION_RING_PROOF_TYPE_OPTIONS.reduce(
    (total, option) => total + filesByType[option.value].length,
    0,
  );

  const deleteAttachment = async (attachment: MissionRingProofAttachment) => {
    setDeletingId(attachment.id);
    setError(null);
    try {
      let blobName: string | undefined = attachment.blob_name;
      if (!blobName) {
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
    if (modalOpen) return;
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
  }, [listAttachments, missionRingProofList, userId, modalOpen]);

  const resetModalForm = () => {
    setFilesByType(emptyFileMap());
    setNotes('');
    setError(null);
    setViewingFiles(false);
  };

  const openModal = () => {
    resetModalForm();
    setViewingFiles(!eligible);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (selectedCount === 0) {
      setError('Select at least one file to upload.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      let latest = attachments;
      const knownBlobs = new Set(attachments.map((attachment) => attachment.blob_name).filter(Boolean));
      for (const option of MISSION_RING_PROOF_TYPE_OPTIONS) {
        const files = filesByType[option.value];
        if (files.length === 0) continue;
        const uploaded = await uploadAttachment(userId, files, option.value, notes);
        if (Array.isArray(uploaded) && uploaded.length > 0) {
          latest = uploaded.map((attachment) => {
            const isNew = attachment.blob_name && !knownBlobs.has(attachment.blob_name);
            if (isNew) {
              return { ...attachment, proof_type: option.value };
            }
            return attachment;
          });
          latest.forEach((attachment) => {
            if (attachment.blob_name) knownBlobs.add(attachment.blob_name);
          });
        }
      }
      const data = latest.length ? latest : await listAttachments(userId);
      setAttachments(data);
      setFilesByType(emptyFileMap());
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload attachment.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2" onClick={(event) => event.stopPropagation()}>
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
      {eligible ? (
        <>
          <span
            title="Mission Ring earned"
            className="relative inline-flex h-11 w-11 items-center justify-center"
          >
            <span className="pointer-events-none absolute inset-0 rounded-full bg-amber-400/20 blur-[6px]" />
            <span className="pointer-events-none absolute inset-[3px] rounded-full ring-2 ring-amber-300/70 ring-offset-1 ring-offset-[#1a1d25]" />
            <MissionRingIcon size={38} className="relative drop-shadow-[0_0_8px_rgba(255,213,74,0.75)]" />
          </span>
          <button
            type="button"
            title="Upload Mission Ring proof"
            className="inline-flex h-8 items-center gap-1 rounded-md border border-amber-300/50 bg-amber-500/15 px-2 text-[11px] font-semibold uppercase tracking-wide text-amber-200 transition-colors hover:bg-amber-500/25 hover:text-amber-50"
            onClick={openModal}
          >
            <IconUpload size={13} />
            Upload
          </button>
        </>
      ) : attachments.length > 0 ? (
        <button
          type="button"
          className="inline-flex h-8 items-center rounded-md border border-white/15 px-2 text-[11px] font-semibold text-white/70 hover:bg-white/10"
          onClick={openModal}
        >
          View files
        </button>
      ) : null}
      {error && !modalOpen ? <span className="text-[10px] text-red-300">{error}</span> : null}

      <Modal
        open={modalOpen}
        onClose={() => {
          if (uploading) return;
          setModalOpen(false);
          resetModalForm();
        }}
        title="Mission Ring Proof"
        contentClassName="max-w-[640px]"
      >
        <div className="grid gap-4">
          {eligible ? (
            <div className="flex items-center gap-3 rounded-xl border border-amber-300/30 bg-amber-500/10 px-3 py-2">
              <MissionRingIcon size={36} className="drop-shadow-[0_0_8px_rgba(255,213,74,0.7)]" />
              <p className="text-sm text-amber-100/90">
                Choose files in the matching row, then click Upload. You can review already-uploaded files with View files.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-white/70">
              Proof files already uploaded for this associate.
            </p>
          )}

          {MISSION_RING_PROOF_TYPE_OPTIONS.map((option) => {
            const selected = filesByType[option.value];
            if (!eligible) return null;
            return (
              <div key={option.value} className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">{option.label}</div>
                  <label className="inline-flex h-8 cursor-pointer items-center rounded border border-amber-300/40 bg-amber-500/10 px-3 text-xs text-amber-700 hover:bg-amber-500/20 dark:text-amber-200">
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      disabled={uploading}
                      onChange={(event) => {
                        const next = Array.from(event.target.files || []);
                        setFilesByType((prev) => ({
                          ...prev,
                          [option.value]: [...prev[option.value], ...next],
                        }));
                        event.target.value = '';
                      }}
                    />
                    Choose files
                  </label>
                </div>
                {selected.length > 0 ? (
                  <ul className="space-y-1">
                    {selected.map((file, index) => (
                      <li
                        key={`${file.name}-${file.size}-${index}`}
                        className="flex items-center justify-between gap-2 rounded border border-amber-300/25 bg-amber-500/10 px-2 py-1 text-xs text-amber-100"
                      >
                        <span className="truncate">{file.name}</span>
                        <button
                          type="button"
                          className="text-red-300 hover:text-red-200"
                          title="Remove file"
                          onClick={() => {
                            setFilesByType((prev) => ({
                              ...prev,
                              [option.value]: prev[option.value].filter((_, fileIndex) => fileIndex !== index),
                            }));
                          }}
                        >
                          <IconX size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-white/45">No files selected for this row.</p>
                )}
              </div>
            );
          })}

          {eligible ? (
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-900 dark:text-white">Notes (optional)</span>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add a note about this proof upload…"
                rows={3}
                disabled={uploading}
              />
            </label>
          ) : null}

          <div className="rounded-lg border border-white/10">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-sm text-amber-200 hover:bg-white/5"
              onClick={() => setViewingFiles((open) => !open)}
            >
              <span>View files ({attachments.length})</span>
              <span className="text-xs text-white/50">{viewingFiles ? 'Hide' : 'Show'}</span>
            </button>
            {viewingFiles ? (
              <div className="grid gap-3 border-t border-white/10 p-3">
                {MISSION_RING_PROOF_TYPE_OPTIONS.map((option) => {
                  const existing = groupedAttachments[option.value];
                  if (existing.length === 0) return null;
                  return (
                    <div key={option.value}>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/50">{option.label}</div>
                      <ul className="space-y-1">
                        {existing.map((attachment) => (
                          <li
                            key={`${attachment.blob_name || attachment.id}-${attachment.file_name}`}
                            className="flex items-center justify-between gap-2 rounded border border-white/10 px-2 py-1 text-xs"
                          >
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate text-amber-200 underline hover:text-amber-100"
                              title={attachment.file_name}
                            >
                              {attachment.file_name || 'Open file'}
                            </a>
                            <button
                              type="button"
                              className="text-red-300/80 hover:text-red-200 disabled:opacity-50"
                              title="Delete attachment"
                              disabled={deletingId === attachment.id}
                              onClick={() => setConfirmDelete(attachment)}
                            >
                              <IconX size={12} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
                {attachments.length === 0 ? (
                  <p className="text-xs text-white/50">No files uploaded yet.</p>
                ) : null}
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="rounded border border-red-300/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => {
                setModalOpen(false);
                resetModalForm();
              }}
            >
              {eligible ? 'Cancel' : 'Close'}
            </Button>
            {eligible ? (
              <Button type="button" disabled={uploading || selectedCount === 0} onClick={() => void handleSubmit()}>
                {uploading ? 'Uploading…' : `Upload${selectedCount ? ` (${selectedCount})` : ''}`}
              </Button>
            ) : null}
          </div>
        </div>
      </Modal>
    </div>
  );
}
