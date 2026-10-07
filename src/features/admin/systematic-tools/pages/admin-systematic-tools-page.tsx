import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ContentPageAdminShell } from '@/features/admin/content-pages/components/content-page-admin-shell';
import type { ContentAdminApi, RoleOption } from '@/features/admin/content-pages/types';
import { DEFAULT_ROLE_OPTIONS } from '@/features/admin/content-pages/utils/visible-to';
import { openSystematicToolResource } from '@/features/systematic-tools/services/systematic-tools-service';
import type {
  SystematicToolAdmin,
  SystematicToolItemAdmin,
} from '@/features/systematic-tools/types';
import { PreviewAsRole } from '../components/preview-as-role';
import { SystematicToolItemFormModal } from '../components/systematic-tool-item-form-modal';
import {
  createSystematicTool,
  createSystematicToolItem,
  deleteSystematicTool,
  deleteSystematicToolItem,
  listSystematicToolRoles,
  listSystematicTools,
  reorderSystematicToolItems,
  reorderSystematicTools,
  updateSystematicTool,
  updateSystematicToolItem,
  updateSystematicToolItemRoles,
  updateSystematicToolRoles,
  uploadSystematicToolItemFile,
} from '../services/systematic-tools-admin-service';
import { inferItemKind, itemKindOption } from '../utils/item-kind';

/** Admin → 10 Systematic Tools: tools (sections) and their contents (items). */
export default function AdminSystematicToolsPage() {
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>(DEFAULT_ROLE_OPTIONS);

  useEffect(() => {
    void (async () => {
      try {
        const roles = await listSystematicToolRoles();
        if (roles.length) setRoleOptions(roles);
      } catch {
        // Fall back to the built-in role list; the shell surfaces load errors.
      }
    })();
  }, []);

  const api = useMemo<ContentAdminApi<SystematicToolAdmin, SystematicToolItemAdmin>>(
    () => ({
      listSections: listSystematicTools,
      createSection: createSystematicTool,
      updateSection: updateSystematicTool,
      deleteSection: deleteSystematicTool,
      updateSectionRoles: updateSystematicToolRoles,
      reorderSections: reorderSystematicTools,
      createItem: createSystematicToolItem,
      updateItem: updateSystematicToolItem,
      deleteItem: deleteSystematicToolItem,
      updateItemRoles: updateSystematicToolItemRoles,
      reorderItems: reorderSystematicToolItems,
      uploadItemFile: uploadSystematicToolItemFile,
    }),
    []
  );

  return (
    <ContentPageAdminShell<SystematicToolAdmin, SystematicToolItemAdmin>
      title="10 Systematic Tools"
      description="Add, edit, hide and reorder the tools and the content inside each tool. “Visible to” controls who sees each tool and each piece of content."
      api={api}
      nouns={{
        section: 'Tool',
        sectionPlural: 'Tools',
        item: 'Content',
        itemPlural: 'Contents',
      }}
      defaultIcon="🛠️"
      labelPlaceholder="Business Shower"
      itemLayout="cards"
      roleOptions={roleOptions}
      sectionForm={{
        showKeyField: false,
        nameLabel: 'Name',
        activeLabel: 'Shown on page',
        rolePicker: 'presets',
      }}
      renderItemMeta={(item) => itemKindOption(inferItemKind(item)).badge}
      renderToolbar={() => (
        <>
          <PreviewAsRole roleOptions={roleOptions} />
          <Link
            to="/systematic-tools"
            className="text-sm text-amber-300 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open user page ↗
          </Link>
        </>
      )}
      renderItemForm={(props) => (
        <SystematicToolItemFormModal {...props} roleOptions={roleOptions} />
      )}
      openItem={(item) =>
        openSystematicToolResource({
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
