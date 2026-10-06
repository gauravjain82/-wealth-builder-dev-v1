import { useEffect, useMemo, useState } from 'react';
import { ErrorState, LoadingState } from '@/shared/components';
import { useToastStore } from '@/store';
import FullscreenViewer from '@/features/systematic-tools/components/fullscreen-viewer';
import { WelcomeVideosLibrary } from '@/features/welcome-videos';
import { FileVaultSidebar } from '../components/file-vault-sidebar';
import { FileVaultContent } from '../components/file-vault-content';
import { useFileVault } from '../hooks/use-file-vault';
import { openFileVaultDocumentFromClick, type FileVaultViewerTarget } from '../services/file-vault-service';
import type { FileVaultItem, FileVaultSection } from '../types';
import './file-vault-page.css';

const EMPTY_SECTION: FileVaultSection = {
  id: '',
  section_key: '',
  icon: '📁',
  label: '',
  items: [],
};

/**
 * Welcome Videos is a File Vault section, not a sidebar entry. It is not CMS content:
 * the entry is added here, after the CMS sections, and renders the welcome-video
 * library in place of the file list.
 */
const WELCOME_VIDEOS_ID = '__welcome-videos__';
const WELCOME_VIDEOS_ENTRY = { id: WELCOME_VIDEOS_ID, icon: '🎬', label: 'Welcome Videos' };

export default function FileVaultPage() {
  const { data, isLoading, isError, error, refetch } = useFileVault();
  const { addToast } = useToastStore();
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState('');
  const [viewer, setViewer] = useState<FileVaultViewerTarget | null>(null);
  const [openVideoKey, setOpenVideoKey] = useState<string | null>(null);

  const vaultData = useMemo(() => data?.sections ?? [], [data]);
  const sidebarSections = useMemo(() => [...vaultData, WELCOME_VIDEOS_ENTRY], [vaultData]);
  const showWelcomeVideos = activeId === WELCOME_VIDEOS_ID;

  useEffect(() => {
    if (!sidebarSections.some((section) => section.id === activeId)) {
      setActiveId(sidebarSections[0].id);
    }
  }, [sidebarSections, activeId]);

  const activeSection = useMemo(
    () => vaultData.find((section) => section.id === activeId) || vaultData[0] || EMPTY_SECTION,
    [vaultData, activeId]
  );

  const filteredItems = useMemo(() => {
    if (!query.trim()) return activeSection.items;
    const search = query.trim().toLowerCase();
    return activeSection.items.filter((item) => item.title.toLowerCase().includes(search));
  }, [activeSection, query]);

  const handleLeftKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const count = sidebarSections.length;
    const index = sidebarSections.findIndex((section) => section.id === activeId);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveId(sidebarSections[(index + 1) % count].id);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveId(sidebarSections[(index - 1 + count) % count].id);
    }
  };

  const handleOpenItem = async (item: FileVaultItem) => {
    const result = await openFileVaultDocumentFromClick(item);
    if ('viewer' in result) {
      setViewer(result.viewer);
      return;
    }
    if ('failed' in result) {
      addToast({ type: 'error', message: 'Unable to open this file.' });
    }
  };

  if (isLoading) {
    return (
      <div className="file-vault-page">
        <LoadingState />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="file-vault-page">
        <ErrorState
          title="Unable to load File Vault"
          description={error instanceof Error ? error.message : 'Something went wrong.'}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="file-vault-page">
      <div className="file-vault-shell">
        <FileVaultSidebar
          sections={sidebarSections}
          activeId={activeId}
          onSelect={setActiveId}
          onKeyDown={handleLeftKeyDown}
        />

        {showWelcomeVideos ? (
          <main className="file-vault-content">
            <WelcomeVideosLibrary
              titleAs="h2"
              openKey={openVideoKey}
              onPlay={(video) => setOpenVideoKey(video.key)}
              onClose={() => setOpenVideoKey(null)}
            />
          </main>
        ) : (
          <FileVaultContent
            activeSection={activeSection}
            query={query}
            onQueryChange={setQuery}
            filteredItems={filteredItems}
            searchEnabled={data?.config.search_enabled ?? true}
            onOpenItem={(item) => void handleOpenItem(item)}
          />
        )}
      </div>

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
