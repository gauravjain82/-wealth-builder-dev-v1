import { useMemo } from 'react';

import { ErrorState, LoadingState } from '@/shared/components';
import { useToastStore } from '@/store';

import { useWelcomeVideos } from '../hooks/use-welcome-videos';
import type { WelcomeVideo } from '../types';
import { copyText, shareAllText } from '../utils/share';
import { WelcomeVideoCard } from './welcome-video-card';
import { WelcomeVideoPlayer } from './welcome-video-player';
import '../welcome-videos.css';

interface WelcomeVideosLibraryProps {
  /** Key of the video whose player is open, or null for none. The host owns it. */
  openKey: string | null;
  onPlay: (video: WelcomeVideo) => void;
  onClose: () => void;
  /** `h2` when embedded under another page's heading (File Vault). */
  titleAs?: 'h1' | 'h2';
}

/**
 * The eight-video library: header, cards and player. Hosted by `/welcome-videos`
 * (player state in the URL) and by File Vault's Welcome Videos section (player
 * state local), which is where the sidebar sends people now.
 */
export function WelcomeVideosLibrary({
  openKey,
  onPlay,
  onClose,
  titleAs: Title = 'h1',
}: WelcomeVideosLibraryProps) {
  const { addToast } = useToastStore();
  const { data: videos = [], isLoading, isError, error, refetch } = useWelcomeVideos();

  const openVideo = useMemo(
    () => (openKey ? videos.find((v) => v.key === openKey) ?? null : null),
    [openKey, videos]
  );

  const handleCopyAll = async () => {
    const ok = await copyText(shareAllText(videos));
    addToast(
      ok
        ? { type: 'success', message: 'All video links copied.' }
        : { type: 'error', message: 'Could not copy the links.' }
    );
  };

  if (isLoading) {
    return <LoadingState pageHeading="Welcome Videos" title="Loading videos" />;
  }

  if (isError) {
    return (
      <ErrorState
        pageHeading="Welcome Videos"
        description={error instanceof Error ? error.message : 'Unable to load the videos.'}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="wb-wv">
      <header className="wb-wv__header">
        <div>
          <Title className="wb-wv__title">Welcome Videos</Title>
          <p className="wb-wv__subtitle">
            The eight videos every new agent receives by text and Telegram after their agency code is
            added. Watch them here, or copy a link to send to an agent.
          </p>
        </div>
        {videos.length > 0 ? (
          <button type="button" className="wb-wv-btn" onClick={handleCopyAll}>
            Copy all links
          </button>
        ) : null}
      </header>

      {videos.length === 0 ? (
        <p className="wb-wv__empty">No welcome videos are available right now.</p>
      ) : (
        <div className="wb-wv__grid">
          {videos.map((video, index) => (
            <WelcomeVideoCard key={video.key} video={video} index={index} onPlay={onPlay} />
          ))}
        </div>
      )}

      {openVideo ? <WelcomeVideoPlayer video={openVideo} onClose={onClose} /> : null}
    </div>
  );
}
