import { useCallback, useEffect, useMemo, useState } from 'react';
import { Block, Button, ConfirmationDialog } from '@/shared/components';
import { useToastStore } from '@/store';
import type { FileVaultConfig, FileVaultItemAdmin, FileVaultSectionAdmin } from '@/features/file-vault/types';
import { ItemFormModal } from '../components/item-form-modal';
import { SectionFormModal } from '../components/section-form-modal';
import {
  createFileVaultItem,
  createFileVaultSection,
  deleteFileVaultItem,
  deleteFileVaultSection,
  fetchFileVaultConfig,
  listFileVaultSections,
  reorderFileVaultItems,
  reorderFileVaultSections,
  updateFileVaultConfig,
  updateFileVaultItem,
  updateFileVaultItemRoles,
  updateFileVaultSection,
  updateFileVaultSectionRoles,
} from '../services/file-vault-admin-service';

export default function AdminFileVaultPage() {
  const { addToast } = useToastStore();
  const [config, setConfig] = useState<FileVaultConfig | null>(null);
  const [sections, setSections] = useState<FileVaultSectionAdmin[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<FileVaultSectionAdmin | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FileVaultItemAdmin | null>(null);
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<FileVaultSectionAdmin | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<FileVaultItemAdmin | null>(null);

  const activeSection = useMemo(
    () => sections.find((section) => section.id === activeSectionId) ?? null,
    [sections, activeSectionId]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [configData, sectionData] = await Promise.all([
        fetchFileVaultConfig(),
        listFileVaultSections(),
      ]);
      setConfig(configData);
      setSections(sectionData);
      setActiveSectionId((current) => {
        if (current && sectionData.some((section) => section.id === current)) {
          return current;
        }
        return sectionData[0]?.id ?? null;
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to load File Vault admin data',
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSaveSection = async (payload: {
    section_key: string;
    label: string;
    icon: string;
    is_active: boolean;
    roles: string[];
  }) => {
    const { roles, ...sectionPayload } = payload;
    if (editingSection) {
      await updateFileVaultSection(editingSection.id, sectionPayload);
      await updateFileVaultSectionRoles(editingSection.id, roles);
      addToast({ type: 'success', message: 'Section updated' });
    } else {
      const created = await createFileVaultSection(sectionPayload);
      await updateFileVaultSectionRoles(created.id, roles);
      addToast({ type: 'success', message: 'Section created' });
    }
    await loadData();
  };

  const handleSaveItem = async (payload: {
    title: string;
    href: string;
    item_view_type: 'row' | 'card';
    thumbnail_url: string;
    gcs_blob_name?: string;
    thumb_gcs_blob_name?: string;
    resource_type: string;
    is_active: boolean;
    roles: string[];
  }) => {
    if (!activeSection) throw new Error('Select a section first');
    const { roles, ...itemPayload } = payload;

    if (editingItem) {
      const updated = await updateFileVaultItem(editingItem.id, itemPayload);
      await updateFileVaultItemRoles(editingItem.id, roles);
      addToast({ type: 'success', message: 'Document updated' });
      await loadData();
      return updated;
    }

    const created = await createFileVaultItem({
      ...itemPayload,
      section: activeSection.id,
    });
    await updateFileVaultItemRoles(created.id, roles);
    addToast({ type: 'success', message: 'Document created' });
    await loadData();
    return created;
  };

  const moveSection = async (sectionId: number, direction: -1 | 1) => {
    const index = sections.findIndex((section) => section.id === sectionId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= sections.length) return;
    const reordered = [...sections];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    await reorderFileVaultSections(reordered.map((section) => section.id));
    await loadData();
  };

  const moveItem = async (itemId: number, direction: -1 | 1) => {
    if (!activeSection) return;
    const items = [...activeSection.items];
    const index = items.findIndex((item) => item.id === itemId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= items.length) return;
    const [moved] = items.splice(index, 1);
    items.splice(targetIndex, 0, moved);
    await reorderFileVaultItems(items.map((item) => item.id));
    await loadData();
  };

  const handleToggleSearch = async () => {
    if (!config) return;
    const next = !config.search_enabled;
    const updated = await updateFileVaultConfig({ search_enabled: next });
    setConfig(updated);
    addToast({ type: 'success', message: `Search ${next ? 'enabled' : 'disabled'}` });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-white/60">
        Loading File Vault admin...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Block
        title="File Vault Admin"
        description="Manage sections, documents, role visibility, and uploads."
        titleVariant="h5"
        className="flex-shrink-0"
      />

      <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleToggleSearch()}
        >
          Search: {config?.search_enabled ? 'On' : 'Off'}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setEditingSection(null);
            setSectionModalOpen(true);
          }}
        >
          Add section
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1d25] p-3">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
            Sections
          </h3>
          <div className="space-y-2">
            {sections.map((section) => {
              const isActive = section.id === activeSectionId;
              return (
                <div
                  key={section.id}
                  className={`rounded-xl border p-3 ${
                    isActive ? 'border-amber-400/60 bg-amber-400/10' : 'border-white/10'
                  }`}
                >
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 text-left"
                    onClick={() => setActiveSectionId(section.id)}
                  >
                    <span>{section.icon}</span>
                    <span className="flex-1 text-sm text-white">{section.label}</span>
                  </button>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void moveSection(section.id, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void moveSection(section.id, 1)}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingSection(section);
                        setSectionModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteSectionTarget(section)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="min-h-0 overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1d25] p-4">
          {activeSection ? (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{activeSection.label}</h3>
                  <p className="text-sm text-white/50">
                    {activeSection.items.length} document
                    {activeSection.items.length === 1 ? '' : 's'}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setEditingItem(null);
                    setItemModalOpen(true);
                  }}
                >
                  Add document
                </Button>
              </div>

              <div className="space-y-3">
                {activeSection.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-xl border border-white/10 p-4 md:flex-row md:items-center"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-white">{item.title}</p>
                      <p className="text-xs text-white/50">
                        {item.item_view_type} · {item.resource_type}
                        {item.allowed_roles.length
                          ? ` · roles: ${item.allowed_roles.join(', ')}`
                          : ' · all roles'}
                      </p>
                      {item.resolved_href && (
                        <a
                          href={item.resolved_href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-amber-300 hover:underline"
                        >
                          Open link
                        </a>
                      )}
                    </div>
                    {item.resolved_thumb && item.item_view_type === 'card' && (
                      <img
                        src={item.resolved_thumb}
                        alt={item.title}
                        className="h-16 w-24 rounded object-cover"
                      />
                    )}
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void moveItem(item.id, -1)}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void moveItem(item.id, 1)}
                      >
                        ↓
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingItem(item);
                          setItemModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteItemTarget(item)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
                {activeSection.items.length === 0 && (
                  <p className="py-8 text-center text-sm text-white/50">
                    No documents in this section yet.
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-white/50">
              Create a section to start adding documents.
            </p>
          )}
        </section>
      </div>

      <SectionFormModal
        open={sectionModalOpen}
        section={editingSection}
        onClose={() => setSectionModalOpen(false)}
        onSave={handleSaveSection}
      />

      {activeSection && (
        <ItemFormModal
          open={itemModalOpen}
          sectionId={activeSection.id}
          item={editingItem}
          onClose={() => setItemModalOpen(false)}
          onSave={handleSaveItem}
          onRefresh={() => void loadData()}
        />
      )}

      <ConfirmationDialog
        open={Boolean(deleteSectionTarget)}
        title="Delete section?"
        message="This will delete the section and all documents inside it."
        confirmText="Delete"
        onConfirm={async () => {
          if (!deleteSectionTarget) return;
          await deleteFileVaultSection(deleteSectionTarget.id);
          setDeleteSectionTarget(null);
          addToast({ type: 'success', message: 'Section deleted' });
          await loadData();
        }}
        onClose={() => setDeleteSectionTarget(null)}
      />

      <ConfirmationDialog
        open={Boolean(deleteItemTarget)}
        title="Delete document?"
        message="This action cannot be undone."
        confirmText="Delete"
        onConfirm={async () => {
          if (!deleteItemTarget) return;
          await deleteFileVaultItem(deleteItemTarget.id);
          setDeleteItemTarget(null);
          addToast({ type: 'success', message: 'Document deleted' });
          await loadData();
        }}
        onClose={() => setDeleteItemTarget(null)}
      />
    </div>
  );
}
