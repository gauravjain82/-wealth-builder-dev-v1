import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/shared/components';
import { useToastStore } from '@/store';
import { ContentPageAdminShell } from '@/features/admin/content-pages/components/content-page-admin-shell';
import type {
  ContentAdminApi,
  ContentFieldSchema,
} from '@/features/admin/content-pages/types';
import { isPdfLike } from '@/features/admin/content-pages/utils/delivery-mode';
import { openFileVaultDocumentFromClick } from '@/features/file-vault/services/file-vault-service';
import type {
  FileVaultConfig,
  FileVaultItemAdmin,
  FileVaultSectionAdmin,
} from '@/features/file-vault/types';
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
  uploadFileVaultItemFile,
} from '../services/file-vault-admin-service';

const ITEM_FIELDS: ContentFieldSchema[] = [
  {
    kind: 'select',
    name: 'item_view_type',
    label: 'View type',
    options: [
      { value: 'card', label: 'Card' },
      { value: 'row', label: 'Row' },
    ],
  },
];

function FileVaultConfigControls() {
  const { addToast } = useToastStore();
  const [config, setConfig] = useState<FileVaultConfig | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setConfig(await fetchFileVaultConfig());
      } catch {
        // The shell already surfaces load failures for sections.
      }
    })();
  }, []);

  if (!config) return null;

  const toggleSearch = async () => {
    const next = !config.search_enabled;
    try {
      setConfig(await updateFileVaultConfig({ search_enabled: next }));
      addToast({ type: 'success', message: `Search ${next ? 'enabled' : 'disabled'}` });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save settings',
      });
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={() => void toggleSearch()}>
      Search: {config.search_enabled ? 'On' : 'Off'}
    </Button>
  );
}

export default function AdminFileVaultPage() {
  const api = useMemo<ContentAdminApi<FileVaultSectionAdmin, FileVaultItemAdmin>>(
    () => ({
      listSections: listFileVaultSections,
      createSection: createFileVaultSection,
      updateSection: updateFileVaultSection,
      deleteSection: deleteFileVaultSection,
      updateSectionRoles: updateFileVaultSectionRoles,
      reorderSections: reorderFileVaultSections,
      createItem: createFileVaultItem,
      updateItem: updateFileVaultItem,
      deleteItem: deleteFileVaultItem,
      updateItemRoles: updateFileVaultItemRoles,
      reorderItems: reorderFileVaultItems,
      uploadItemFile: uploadFileVaultItemFile,
    }),
    []
  );

  return (
    <ContentPageAdminShell<FileVaultSectionAdmin, FileVaultItemAdmin>
      title="File Vault Admin"
      description="Manage sections, documents, role visibility, and uploads."
      api={api}
      nouns={{
        section: 'Section',
        sectionPlural: 'Sections',
        item: 'Document',
        itemPlural: 'Documents',
      }}
      itemFields={ITEM_FIELDS}
      showThumbnail={(extras) => extras.item_view_type !== 'row'}
      defaultIcon="📁"
      keyPlaceholder="presentations"
      labelPlaceholder="Presentations"
      renderItemMeta={(item) => {
        const pdfNote = isPdfLike(item.resource_type, null, item.gcs_blob_name)
          ? item.allow_download
            ? ' · download allowed'
            : ' · view only'
          : '';
        return `${item.item_view_type} · ${item.resource_type}${pdfNote}`;
      }}
      renderToolbar={() => <FileVaultConfigControls />}
      openItem={(item) =>
        openFileVaultDocumentFromClick({
          id: item.id,
          title: item.title,
          href: item.resolved_href || item.href,
          resource_type: item.resource_type,
          allow_download: item.allow_download,
          gcs_blob_name: item.gcs_blob_name,
        })
      }
    />
  );
}
