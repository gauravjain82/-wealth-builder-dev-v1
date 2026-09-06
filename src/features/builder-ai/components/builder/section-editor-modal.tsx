/**
 * SectionEditorModal — create or rename a dashboard section (title only).
 *
 * Section order is set by drag-drop, not here, so this modal edits just the title.
 * Presentational + local form state; the parent persists via the config API.
 */

import { useEffect, useState } from 'react';
import { Button, Input, Modal } from '@shared/components';
import type { SectionConfig } from '../../types';

export interface SectionEditorModalProps {
  open: boolean;
  /** The section being renamed, or `null` when adding a new one. */
  section: SectionConfig | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (title: string) => void | Promise<void>;
}

/** Render the section create/rename modal. */
export function SectionEditorModal({
  open,
  section,
  isSaving,
  onClose,
  onSubmit,
}: SectionEditorModalProps) {
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (open) setTitle(section?.title ?? '');
  }, [open, section]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={section ? 'Rename section' : 'Add section'}
      className="max-w-[440px]"
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/60">
            Section title
          </label>
          <Input
            autoFocus
            value={title}
            placeholder="e.g. Your Goals"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void onSubmit(title.trim())} disabled={isSaving}>
            {isSaving ? 'Saving…' : section ? 'Save' : 'Add section'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
