import { useEffect, useMemo, useRef, useState } from 'react';
import { ErrorState, LoadingState } from '@/shared/components';
import { useToastStore } from '@/store';
import FullscreenViewer from '@/features/systematic-tools/components/fullscreen-viewer';
import { TrainingCenterSidebar } from '../components/training-center-sidebar';
import { TrainingCenterStats } from '../components/training-center-stats';
import { TrainingModuleGrid } from '../components/training-module-grid';
import { TrainingPlayerOverlay } from '../components/training-player-overlay';
import {
  useCompleteTrainingItem,
  useTrainingCenter,
} from '../hooks/use-training-center';
import {
  clearLegacyProgress,
  completeTrainingItem,
  openTrainingResource,
  readLegacyProgressKeys,
  type TrainingViewerTarget,
} from '../services/training-center-service';
import type { TrainingCenterItem, TrainingSectionProgress } from '../types';
import { isVideoHref, lockedPlayerSrc } from '../utils/media';
import './training-center.css';

export default function TrainingCenterPage() {
  const { data, isLoading, isError, error, refetch } = useTrainingCenter();
  const completeItem = useCompleteTrainingItem();
  const { addToast } = useToastStore();

  const [activeId, setActiveId] = useState('');
  const [query, setQuery] = useState('');
  const [earnedXP, setEarnedXP] = useState(0);
  const [showAchievement, setShowAchievement] = useState(false);
  const [player, setPlayer] = useState<{ src: string; title: string } | null>(null);
  const [viewer, setViewer] = useState<TrainingViewerTarget | null>(null);
  const legacyMigrationRan = useRef(false);

  const sections = useMemo(() => data?.sections ?? [], [data]);
  const progress = data?.progress;

  useEffect(() => {
    if (!sections.length) {
      setActiveId('');
      return;
    }
    if (!sections.some((section) => section.id === activeId)) {
      setActiveId(sections[0].id);
    }
  }, [sections, activeId]);

  // Replay pre-backend localStorage progress once, so existing users keep their XP.
  useEffect(() => {
    if (legacyMigrationRan.current || !data) return;
    legacyMigrationRan.current = true;

    const legacyKeys = readLegacyProgressKeys();
    if (!legacyKeys.length) return;

    const idByItemKey = new Map<string, number>();
    for (const section of data.sections) {
      for (const item of section.items) {
        if (item.item_key) idByItemKey.set(item.item_key, item.id);
      }
    }

    const ids = legacyKeys
      .map((key) => idByItemKey.get(key))
      .filter((id): id is number => typeof id === 'number');

    if (!ids.length) {
      clearLegacyProgress();
      return;
    }

    void (async () => {
      for (const id of ids) {
        try {
          await completeTrainingItem(id);
        } catch {
          // A single failure shouldn't strand the rest of the migration.
        }
      }
      clearLegacyProgress();
      void refetch();
    })();
  }, [data, refetch]);

  const progressBySection = useMemo(() => {
    const lookup: Record<string, TrainingSectionProgress> = {};
    for (const entry of progress?.sections ?? []) {
      lookup[entry.section_key] = entry;
    }
    return lookup;
  }, [progress]);

  const completedIds = useMemo(
    () => new Set(progress?.completed_item_ids ?? []),
    [progress]
  );

  const activeSection = useMemo(
    () => sections.find((section) => section.id === activeId) ?? sections[0],
    [sections, activeId]
  );

  const filteredItems = useMemo(() => {
    if (!activeSection) return [];
    if (!query.trim()) return activeSection.items;
    const search = query.trim().toLowerCase();
    return activeSection.items.filter((item) =>
      item.title.toLowerCase().includes(search)
    );
  }, [activeSection, query]);

  const handleOpenItem = async (item: TrainingCenterItem) => {
    if (!completedIds.has(item.id)) {
      try {
        const result = await completeItem.mutateAsync(item.id);
        if (result.xp_earned > 0) {
          setEarnedXP(result.xp_earned);
          setShowAchievement(true);
          setTimeout(() => setShowAchievement(false), 3000);
        }
      } catch {
        addToast({ type: 'error', message: 'Unable to record your progress.' });
      }
    }

    if (item.is_pdf) {
      const result = await openTrainingResource(item);
      if ('viewer' in result) {
        setViewer(result.viewer);
      } else if ('failed' in result) {
        addToast({ type: 'error', message: 'Unable to open this resource.' });
      }
      return;
    }

    if (!item.href || item.href === '#') return;

    if (isVideoHref(item.href)) {
      setPlayer({ src: lockedPlayerSrc(item.href), title: item.title });
      return;
    }

    window.open(item.href, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <div className="training-hub">
        <LoadingState />
      </div>
    );
  }

  if (isError || !data || !progress) {
    return (
      <div className="training-hub">
        <ErrorState
          title="Unable to load Training Center"
          description={error instanceof Error ? error.message : 'Something went wrong.'}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const activeSectionProgress = activeSection
    ? progressBySection[activeSection.section_key]
    : undefined;

  return (
    <div className="training-hub">
      <TrainingCenterStats
        title={data.config.page_title}
        subtitle={data.config.page_subtitle}
        progress={progress}
      />

      <div className="training-content">
        <TrainingCenterSidebar
          sections={sections}
          progressBySection={progressBySection}
          activeId={activeId}
          query={query}
          searchEnabled={data.config.search_enabled}
          onSelect={setActiveId}
          onQueryChange={setQuery}
        />

        <TrainingModuleGrid
          section={activeSection}
          items={filteredItems}
          openedCount={activeSectionProgress?.opened ?? 0}
          completedIds={completedIds}
          onOpenItem={(item) => void handleOpenItem(item)}
        />
      </div>

      {showAchievement && (
        <div className="achievement-popup">
          <div className="achievement-content">
            <div className="achievement-icon">🎉</div>
            <div className="achievement-text">
              <div className="achievement-title">XP Earned!</div>
              <div className="achievement-subtitle">+{earnedXP} XP</div>
            </div>
          </div>
        </div>
      )}

      {player && (
        <TrainingPlayerOverlay
          src={player.src}
          title={player.title}
          onClose={() => setPlayer(null)}
        />
      )}

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
