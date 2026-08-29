import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Checkbox, ConfirmationDialog, Input, Label, Modal, Select } from '@shared/components';
import { useToastStore } from '@/store';
import { bpmService } from '../services/bpm-service';
import type { BPMInterestGroup, BPMInterestOption, BPMInterestOptionPayload } from '../types';

interface InterestOptionsAdminModalProps {
  open: boolean;
  options: BPMInterestOption[];
  onClose: () => void;
  /** Called after any successful create/update/delete so the catalog can be refetched. */
  onChanged: () => void | Promise<void>;
}

const GROUP_OPTIONS: { value: BPMInterestGroup; label: string }[] = [
  { value: 'GOALS', label: 'GOALS' },
  { value: 'BUSINESS', label: 'BUSINESS' },
  { value: 'SELF_IMPROVEMENT', label: 'SELF_IMPROVEMENT' },
];

type Draft = Pick<BPMInterestOptionPayload, 'group' | 'label' | 'slug' | 'sort_order' | 'is_active'>;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const emptyDraft = (): Draft => ({
  group: 'GOALS',
  label: '',
  slug: '',
  sort_order: 0,
  is_active: true,
});

export function InterestOptionsAdminModal({
  open,
  options: optionsProp,
  onClose,
  onChanged,
}: InterestOptionsAdminModalProps) {
  const options = Array.isArray(optionsProp) ? optionsProp : [];
  const addToast = useToastStore((state) => state.addToast);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [newDraft, setNewDraft] = useState<Draft>(emptyDraft);
  const [busyId, setBusyId] = useState<number | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BPMInterestOption | null>(null);

  useEffect(() => {
    if (!open) return;
    const next: Record<number, Draft> = {};
    (Array.isArray(options) ? options : []).forEach((option) => {
      next[option.id] = {
        group: option.group,
        label: option.label,
        slug: option.slug,
        sort_order: option.sort_order,
        is_active: option.is_active,
      };
    });
    setDrafts(next);
    setNewDraft(emptyDraft());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, optionsProp]);

  const patchDraft = (id: number, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const run = async (id: number | 'new', message: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await action();
      addToast({ type: 'success', message });
      await onChanged();
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Action failed' });
    } finally {
      setBusyId(null);
    }
  };

  const saveExisting = (option: BPMInterestOption) => {
    const draft = drafts[option.id];
    if (!draft?.label?.trim() || !draft.slug?.trim()) {
      addToast({ type: 'error', message: 'Label and slug are required.' });
      return;
    }
    void run(option.id, 'Option updated.', () => bpmService.updateInterestOption(option.id, draft));
  };

  const createNew = () => {
    const slug = newDraft.slug?.trim() || slugify(newDraft.label || '');
    if (!newDraft.label?.trim() || !slug) {
      addToast({ type: 'error', message: 'Label and slug are required.' });
      return;
    }
    void run('new', 'Option created.', () =>
      bpmService.createInterestOption({ ...newDraft, slug }).then(() => setNewDraft(emptyDraft())),
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    void run(target.id, 'Option deleted.', () =>
      bpmService.deleteInterestOption(target.id).then(() => setDeleteTarget(null)),
    );
  };

  return (
    <>
      <Modal open={open} title="Manage interest options" onClose={onClose} contentClassName="max-w-[860px]">
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-white/60">
                  <th className="px-3 py-2">Group</th>
                  <th className="px-3 py-2">Label</th>
                  <th className="px-3 py-2">Slug</th>
                  <th className="px-3 py-2 w-20">Order</th>
                  <th className="px-3 py-2 w-16">Active</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {options.map((option) => {
                  const draft = drafts[option.id] ?? emptyDraft();
                  const rowBusy = busyId === option.id;
                  return (
                    <tr key={option.id} className="border-t border-slate-100 dark:border-white/10">
                      <td className="px-3 py-2">
                        <Select
                          value={draft.group}
                          onChange={(event) => patchDraft(option.id, { group: event.target.value as BPMInterestGroup })}
                        >
                          {GROUP_OPTIONS.map((group) => (
                            <option key={group.value} value={group.value}>
                              {group.label}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          variant="surface"
                          value={draft.label ?? ''}
                          onChange={(event) => patchDraft(option.id, { label: event.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          variant="surface"
                          value={draft.slug ?? ''}
                          onChange={(event) => patchDraft(option.id, { slug: event.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          variant="surface"
                          value={draft.sort_order ?? 0}
                          onChange={(event) => patchDraft(option.id, { sort_order: Number(event.target.value) })}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Checkbox
                          checked={Boolean(draft.is_active)}
                          onChange={(event) => patchDraft(option.id, { is_active: event.target.checked })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" disabled={rowBusy} onClick={() => saveExisting(option)}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={rowBusy}
                            onClick={() => setDeleteTarget(option)}
                            aria-label={`Delete ${option.label}`}
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {options.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500 dark:text-white/60">
                      No interest options yet. Add one below.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
            <Label className="mb-2 block">Add new option</Label>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto_auto_auto] sm:items-center">
              <Select
                value={newDraft.group}
                onChange={(event) => setNewDraft((prev) => ({ ...prev, group: event.target.value as BPMInterestGroup }))}
              >
                {GROUP_OPTIONS.map((group) => (
                  <option key={group.value} value={group.value}>
                    {group.label}
                  </option>
                ))}
              </Select>
              <Input
                variant="surface"
                placeholder="Label"
                value={newDraft.label ?? ''}
                onChange={(event) => setNewDraft((prev) => ({ ...prev, label: event.target.value }))}
              />
              <Input
                variant="surface"
                placeholder="slug (auto)"
                value={newDraft.slug ?? ''}
                onChange={(event) => setNewDraft((prev) => ({ ...prev, slug: event.target.value }))}
              />
              <Input
                type="number"
                variant="surface"
                className="w-20"
                value={newDraft.sort_order ?? 0}
                onChange={(event) => setNewDraft((prev) => ({ ...prev, sort_order: Number(event.target.value) }))}
              />
              <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-white/80">
                <Checkbox
                  checked={Boolean(newDraft.is_active)}
                  onChange={(event) => setNewDraft((prev) => ({ ...prev, is_active: event.target.checked }))}
                />
                Active
              </label>
              <Button type="button" disabled={busyId === 'new'} onClick={createNew}>
                Add
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        title="Delete interest option"
        message={`Delete "${deleteTarget?.label}"? This cannot be undone.`}
        confirmText="Delete"
        loading={busyId === deleteTarget?.id}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}
