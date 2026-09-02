import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Block, Button, ConfirmationDialog } from '@/shared/components';
import { useToastStore } from '@/store';
import FullscreenViewer from '@/features/systematic-tools/components/fullscreen-viewer';
import type {
  ContentViewerTarget,
  OpenContentResult,
} from '@shared/services/content-page-service';
import { ContentItemFormModal } from './content-item-form-modal';
import { ContentSectionFormModal } from './content-section-form-modal';
import type {
  ContentAdminApi,
  ContentFieldSchema,
  ContentItemAdmin,
  ContentSectionAdmin,
  FieldValue,
} from '../types';

type Nouns = {
  section: string;
  sectionPlural: string;
  item: string;
  itemPlural: string;
};

type ContentPageAdminShellProps<
  TSection extends ContentSectionAdmin,
  TItem extends ContentItemAdmin,
> = {
  title: string;
  description: string;
  api: ContentAdminApi<TSection, TItem>;
  nouns: Nouns;
  itemFields?: ContentFieldSchema[];
  showThumbnail?: (extras: Record<string, FieldValue>) => boolean;
  resourceTypes?: string[];
  defaultIcon?: string;
  keyPlaceholder?: string;
  labelPlaceholder?: string;
  /** Extra summary line under each item title. */
  renderItemMeta?: (item: TItem) => ReactNode;
  /** Page-level config controls, rendered in the toolbar. */
  renderToolbar?: (reload: () => void) => ReactNode;
  /** Enables the per-item "Open" preview link. */
  openItem?: (item: TItem) => Promise<OpenContentResult>;
};

export function ContentPageAdminShell<
  TSection extends ContentSectionAdmin,
  TItem extends ContentItemAdmin,
>({
  title,
  description,
  api,
  nouns,
  itemFields,
  showThumbnail,
  resourceTypes,
  defaultIcon,
  keyPlaceholder,
  labelPlaceholder,
  renderItemMeta,
  renderToolbar,
  openItem,
}: ContentPageAdminShellProps<TSection, TItem>) {
  const { addToast } = useToastStore();
  const [sections, setSections] = useState<TSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<TSection | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TItem | null>(null);
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<TSection | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<TItem | null>(null);
  const [viewer, setViewer] = useState<ContentViewerTarget | null>(null);

  const activeSection = useMemo(
    () => sections.find((section) => section.id === activeSectionId) ?? null,
    [sections, activeSectionId]
  );

  const loadData = useCallback(async () => {
    // After the first fetch, refresh in the background. Setting `loading`
    // unmounts open item modals and re-enables Save while a GCS upload is
    // still pending.
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const sectionData = await api.listSections();
      setSections(sectionData);
      setActiveSectionId((current) => {
        if (current && sectionData.some((section) => section.id === current)) return current;
        return sectionData[0]?.id ?? null;
      });
      hasLoadedRef.current = true;
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : `Failed to load ${title}`,
      });
    } finally {
      setLoading(false);
    }
  }, [api, addToast, title]);

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
      await api.updateSection(editingSection.id, sectionPayload);
      await api.updateSectionRoles(editingSection.id, roles);
      addToast({ type: 'success', message: `${nouns.section} updated` });
    } else {
      const created = await api.createSection(sectionPayload);
      await api.updateSectionRoles(created.id, roles);
      addToast({ type: 'success', message: `${nouns.section} created` });
    }
    await loadData();
  };

  const handleSaveItem = async (payload: Record<string, unknown>) => {
    if (!activeSection) throw new Error(`Select a ${nouns.section.toLowerCase()} first`);
    const { roles, id: payloadId, ...itemPayload } = payload as {
      roles: string[];
      id?: number;
    } & Record<string, unknown>;
    const existingId = typeof payloadId === 'number' ? payloadId : editingItem?.id;

    // Metadata save only. The modal uploads to GCS afterwards and toasts once
    // that finishes, so we do not refresh or close anything here.
    if (existingId) {
      const updated = await api.updateItem(existingId, itemPayload);
      await api.updateItemRoles(existingId, roles);
      return updated;
    }

    const created = await api.createItem({ ...itemPayload, section: activeSection.id });
    await api.updateItemRoles(created.id, roles);
    return created;
  };

  const moveSection = async (sectionId: number, direction: -1 | 1) => {
    const index = sections.findIndex((section) => section.id === sectionId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= sections.length) return;
    const reordered = [...sections];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    await api.reorderSections(reordered.map((section) => section.id));
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
    await api.reorderItems(items.map((item) => item.id));
    await loadData();
  };

  const handleOpenItem = async (item: TItem) => {
    if (!openItem) return;
    const result = await openItem(item);
    if ('viewer' in result) {
      setViewer(result.viewer);
      return;
    }
    if ('failed' in result) {
      addToast({ type: 'error', message: 'Unable to open this file.' });
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-white/60">
        Loading {title}...
      </div>
    );
  }

  const items = (activeSection?.items ?? []) as TItem[];

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Block
        title={title}
        description={description}
        titleVariant="h5"
        className="flex-shrink-0"
      />

      <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
        {renderToolbar?.(() => void loadData())}
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setEditingSection(null);
            setSectionModalOpen(true);
          }}
        >
          Add {nouns.section.toLowerCase()}
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1d25] p-3">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
            {nouns.sectionPlural}
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
                    {!section.is_active && (
                      <span className="text-xs text-white/40">hidden</span>
                    )}
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
                    {items.length}{' '}
                    {items.length === 1
                      ? nouns.item.toLowerCase()
                      : nouns.itemPlural.toLowerCase()}
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
                  Add {nouns.item.toLowerCase()}
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-xl border border-white/10 p-4 md:flex-row md:items-center"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-white">{item.title}</p>
                      <p className="text-xs text-white/50">
                        {renderItemMeta ? renderItemMeta(item) : item.resource_type}
                        {item.allowed_roles.length
                          ? ` · roles: ${item.allowed_roles.join(', ')}`
                          : ' · all roles'}
                        {item.is_active ? '' : ' · hidden'}
                      </p>
                      {openItem && (item.gcs_blob_name || item.resolved_href) ? (
                        <button
                          type="button"
                          className="text-xs text-amber-300 hover:underline"
                          onClick={() => void handleOpenItem(item)}
                        >
                          Open
                        </button>
                      ) : null}
                    </div>
                    {item.resolved_thumb && (
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
                {items.length === 0 && (
                  <p className="py-8 text-center text-sm text-white/50">
                    No {nouns.itemPlural.toLowerCase()} in this{' '}
                    {nouns.section.toLowerCase()} yet.
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-white/50">
              Create a {nouns.section.toLowerCase()} to start adding{' '}
              {nouns.itemPlural.toLowerCase()}.
            </p>
          )}
        </section>
      </div>

      <ContentSectionFormModal
        open={sectionModalOpen}
        section={editingSection}
        onClose={() => setSectionModalOpen(false)}
        onSave={handleSaveSection}
        nounSingular={nouns.section.toLowerCase()}
        defaultIcon={defaultIcon}
        keyPlaceholder={keyPlaceholder}
        labelPlaceholder={labelPlaceholder}
      />

      {activeSection && (
        <ContentItemFormModal<TItem>
          open={itemModalOpen}
          sectionId={activeSection.id}
          item={editingItem}
          onClose={() => setItemModalOpen(false)}
          onSave={handleSaveItem}
          uploadFile={api.uploadItemFile}
          onRefresh={() => void loadData()}
          onSaved={(_saved, action) => {
            addToast({ type: 'success', message: `${nouns.item} ${action}` });
          }}
          fields={itemFields}
          showThumbnail={showThumbnail}
          resourceTypes={resourceTypes}
          nounSingular={nouns.item.toLowerCase()}
        />
      )}

      <ConfirmationDialog
        open={Boolean(deleteSectionTarget)}
        title={`Delete ${nouns.section.toLowerCase()}?`}
        message={`This will delete the ${nouns.section.toLowerCase()} and all ${nouns.itemPlural.toLowerCase()} inside it.`}
        confirmText="Delete"
        onConfirm={async () => {
          if (!deleteSectionTarget) return;
          await api.deleteSection(deleteSectionTarget.id);
          setDeleteSectionTarget(null);
          addToast({ type: 'success', message: `${nouns.section} deleted` });
          await loadData();
        }}
        onClose={() => setDeleteSectionTarget(null)}
      />

      <ConfirmationDialog
        open={Boolean(deleteItemTarget)}
        title={`Delete ${nouns.item.toLowerCase()}?`}
        message="This action cannot be undone."
        confirmText="Delete"
        onConfirm={async () => {
          if (!deleteItemTarget) return;
          await api.deleteItem(deleteItemTarget.id);
          setDeleteItemTarget(null);
          addToast({ type: 'success', message: `${nouns.item} deleted` });
          await loadData();
        }}
        onClose={() => setDeleteItemTarget(null)}
      />

      <FullscreenViewer
        isOpen={Boolean(viewer)}
        src={viewer?.src ?? ''}
        title={viewer?.title ?? ''}
        allowDownload={viewer?.allowDownload}
        httpHeaders={viewer?.httpHeaders}
        forcePdf={viewer?.forcePdf}
        onClose={() => setViewer(null)}
      />
    </div>
  );
}
