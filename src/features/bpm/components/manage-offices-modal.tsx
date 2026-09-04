import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, ConfirmationDialog, Modal } from '@shared/components';
import { useToastStore } from '@/store';
import { bpmService } from '../services/bpm-service';
import type { Office } from '../types';
import { OfficeFormModal } from './office-form-modal';

interface ManageOfficesModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after any create/update/delete so callers can refresh their office list. */
  onChanged: (offices: Office[]) => void;
}

const officeLocation = (office: Office) =>
  [office.address, office.city, office.state, office.zip_code, office.country].filter(Boolean).join(', ');

export function ManageOfficesModal({ open, onClose, onChanged }: ManageOfficesModalProps) {
  const addToast = useToastStore((state) => state.addToast);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Office | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Office | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bpmService.offices();
      setOffices(data.results);
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load offices' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (office: Office) => {
    setEditing(office);
    setFormOpen(true);
  };

  const handleSaved = (saved: Office) => {
    setOffices((prev) => {
      const exists = prev.some((office) => office.id === saved.id);
      const next = exists
        ? prev.map((office) => (office.id === saved.id ? saved : office))
        : [saved, ...prev];
      onChanged(next);
      return next;
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await bpmService.deleteOffice(deleteTarget.id);
      setOffices((prev) => {
        const next = prev.filter((office) => office.id !== deleteTarget.id);
        onChanged(next);
        return next;
      });
      addToast({ type: 'success', message: 'Office deleted.' });
      setDeleteTarget(null);
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to delete office' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Modal open={open} title="Manage Offices" onClose={onClose} contentClassName="max-w-[720px]">
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={openAdd}>
              <Plus size={15} className="mr-1" /> Add Office
            </Button>
          </div>

          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-white/10 dark:border-white/10">
            {loading ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500 dark:text-white/60">Loading offices…</p>
            ) : offices.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500 dark:text-white/60">
                No offices yet. Add one above.
              </p>
            ) : (
              offices.map((office) => (
                <div key={office.id} className="flex items-start justify-between gap-3 px-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-slate-900 dark:text-white">
                        {office.name || 'Untitled office'}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-white/10 dark:text-white/60">
                        {office.office_type === 'PERMANENT' ? 'Permanent' : 'Temporary'}
                      </span>
                    </div>
                    <p className="truncate text-xs text-slate-500 dark:text-white/60">{officeLocation(office)}</p>
                    {office.host_name || office.phone_number ? (
                      <p className="truncate text-xs text-slate-500 dark:text-white/60">
                        {[office.host_name, office.phone_number].filter(Boolean).join(' · ')}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(office)}
                      aria-label={`Edit ${office.name}`}
                    >
                      <Pencil size={15} />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteTarget(office)}
                      aria-label={`Delete ${office.name}`}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </Modal>

      <OfficeFormModal
        open={formOpen}
        office={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        title="Delete office"
        message={`Delete "${deleteTarget?.name || 'this office'}"? This cannot be undone.`}
        confirmText="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}
