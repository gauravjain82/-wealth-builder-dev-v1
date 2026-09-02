import { useEffect, useMemo, useState } from 'react';
import { Button, Input } from '@/shared/components';
import { useToastStore } from '@/store';
import { ContentPageAdminShell } from '@/features/admin/content-pages/components/content-page-admin-shell';
import type {
  ContentAdminApi,
  ContentFieldSchema,
} from '@/features/admin/content-pages/types';
import { openTrainingResource } from '@/features/training-center/services/training-center-service';
import type {
  TrainingCenterConfig,
  TrainingCenterItemAdmin,
  TrainingCenterSectionAdmin,
} from '@/features/training-center/types';
import {
  createTrainingCenterItem,
  createTrainingCenterSection,
  deleteTrainingCenterItem,
  deleteTrainingCenterSection,
  fetchTrainingCenterConfig,
  listTrainingCenterSections,
  reorderTrainingCenterItems,
  reorderTrainingCenterSections,
  updateTrainingCenterConfig,
  updateTrainingCenterItem,
  updateTrainingCenterItemRoles,
  updateTrainingCenterSection,
  updateTrainingCenterSectionRoles,
  uploadTrainingCenterItemFile,
} from '../services/training-center-admin-service';

const ITEM_FIELDS: ContentFieldSchema[] = [
  {
    kind: 'number',
    name: 'xp',
    label: 'XP reward',
    min: 0,
    hint: 'Awarded the first time an agent opens this module.',
  },
  {
    kind: 'text',
    name: 'item_key',
    label: 'Module key (optional)',
    placeholder: 'code-1',
    hint: 'Stable identifier used by seeds and imports.',
  },
  {
    kind: 'number',
    name: 'duration_minutes',
    label: 'Duration in minutes (optional)',
    min: 0,
  },
  {
    kind: 'textarea',
    name: 'description',
    label: 'Description (optional)',
    rows: 3,
  },
];

const RESOURCE_TYPES = ['link', 'video', 'pdf', 'doc', 'ppt'];

function TrainingCenterConfigControls() {
  const { addToast } = useToastStore();
  const [config, setConfig] = useState<TrainingCenterConfig | null>(null);
  const [xpDraft, setXpDraft] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchTrainingCenterConfig();
        setConfig(data);
        setXpDraft(String(data.xp_per_level));
      } catch {
        // The shell already surfaces load failures for sections.
      }
    })();
  }, []);

  const save = async (payload: Partial<TrainingCenterConfig>) => {
    try {
      const updated = await updateTrainingCenterConfig(payload);
      setConfig(updated);
      setXpDraft(String(updated.xp_per_level));
      addToast({ type: 'success', message: 'Training Center settings saved' });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save settings',
      });
    }
  };

  if (!config) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void save({ search_enabled: !config.search_enabled })}
      >
        Search: {config.search_enabled ? 'On' : 'Off'}
      </Button>
      <div className="flex items-center gap-2">
        <label className="text-sm text-white/70" htmlFor="xp-per-level">
          XP per level
        </label>
        <Input
          id="xp-per-level"
          type="number"
          min={1}
          className="w-24"
          value={xpDraft}
          onChange={(event) => setXpDraft(event.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!xpDraft || Number(xpDraft) === config.xp_per_level}
          onClick={() => void save({ xp_per_level: Number(xpDraft) })}
        >
          Save
        </Button>
      </div>
    </>
  );
}

export default function AdminTrainingCenterPage() {
  const api = useMemo<
    ContentAdminApi<TrainingCenterSectionAdmin, TrainingCenterItemAdmin>
  >(
    () => ({
      listSections: listTrainingCenterSections,
      createSection: createTrainingCenterSection,
      updateSection: updateTrainingCenterSection,
      deleteSection: deleteTrainingCenterSection,
      updateSectionRoles: updateTrainingCenterSectionRoles,
      reorderSections: reorderTrainingCenterSections,
      createItem: createTrainingCenterItem,
      updateItem: updateTrainingCenterItem,
      deleteItem: deleteTrainingCenterItem,
      updateItemRoles: updateTrainingCenterItemRoles,
      reorderItems: reorderTrainingCenterItems,
      uploadItemFile: uploadTrainingCenterItemFile,
    }),
    []
  );

  return (
    <ContentPageAdminShell<TrainingCenterSectionAdmin, TrainingCenterItemAdmin>
      title="Training Center Admin"
      description="Manage course tracks, modules, XP rewards, role visibility, and uploads."
      api={api}
      nouns={{
        section: 'Track',
        sectionPlural: 'Course tracks',
        item: 'Module',
        itemPlural: 'Modules',
      }}
      itemFields={ITEM_FIELDS}
      resourceTypes={RESOURCE_TYPES}
      defaultIcon="🎓"
      keyPlaceholder="code-of-honor"
      labelPlaceholder="Code of Honor"
      renderItemMeta={(item) =>
        `${item.resource_type} · ${item.xp} XP${
          item.duration_minutes ? ` · ${item.duration_minutes} min` : ''
        }`
      }
      renderToolbar={() => <TrainingCenterConfigControls />}
      openItem={(item) =>
        openTrainingResource({
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
