import { useEffect, useState } from 'react';
import { Button, Checkbox, Input, Modal, Textarea } from '@/shared/components';
import { useToastStore } from '@/store';
import { createFunction, updateFunction } from '../services/access-control-service';
import type { FunctionItem } from '../types';

interface FunctionFormModalProps {
  open: boolean;
  /** When set, the modal edits this function; otherwise it creates a new one. */
  editing: FunctionItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export function FunctionFormModal({ open, editing, onClose, onSaved }: FunctionFormModalProps) {
  const { addToast } = useToastStore();
  const [slug, setSlug] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSlug(editing?.slug ?? '');
    setLabel(editing?.label ?? '');
    setDescription(editing?.description ?? '');
    setIsActive(editing?.is_active ?? true);
  }, [open, editing]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedSlug = slug.trim();
    const trimmedLabel = label.trim();
    if (!trimmedSlug || !trimmedLabel) {
      addToast({ message: 'Slug and label are required', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateFunction(editing.id, {
          slug: trimmedSlug,
          label: trimmedLabel,
          description: description.trim(),
          is_active: isActive,
        });
        addToast({ message: 'Function updated', type: 'success' });
      } else {
        await createFunction({
          slug: trimmedSlug,
          label: trimmedLabel,
          description: description.trim(),
          is_active: isActive,
        });
        addToast({ message: 'Function created', type: 'success' });
      }
      onSaved();
      onClose();
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : 'Failed to save function',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={editing ? 'Edit Function' : 'Create Function'}
      onClose={onClose}
      contentClassName="max-w-[520px]"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80">
            Slug
          </label>
          <Input
            placeholder="TRAINER"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toUpperCase())}
            disabled={!!editing}
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-white/50">
            Stable identifier used in code/queries. Cannot be changed after creation.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80">
            Label
          </label>
          <Input
            placeholder="Trainer"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80">
            Description
          </label>
          <Textarea
            placeholder="What this capacity means…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 dark:text-white/80">
          <Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create function'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
