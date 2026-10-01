import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ErrorState, LoadingState } from '@/shared/components';
import { useToastStore } from '@/store';

import { WelcomeVideoCard } from '../components/welcome-video-card';
import { WelcomeVideoPlayer } from '../components/welcome-video-player';
import { useWelcomeVideos } from '../hooks/use-welcome-videos';
import type { WelcomeVideo } from '../types';
import { copyText, shareAllText } from '../utils/share';
import '../welcome-videos.css';

/**
 * `/welcome-videos` and `/welcome-videos/:videoKey`.
 *
 * Every role sees all eight. The open player lives in the URL, so a link to one video
 * lands on that video and the back button closes it.
 */
export default function WelcomeVideosPage() {
  const { videoKey } = useParams<{ videoKey?: string }>();
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const { data: videos = [], isLoading, isError, error, refetch } = useWelcomeVideos();

  const openVideo = useMemo(
    () => (videoKey ? videos.find((v) => v.key === videoKey) ?? null : null),
    [videoKey, videos]
  );

  const play = useCallback((video: WelcomeVideo) => navigate(`/welcome-videos/${video.key}`), [navigate]);
  const close = useCallback(() => navigate('/welcome-videos'), [navigate]);

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
          <h1 className="wb-wv__title">Welcome Videos</h1>
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
            <WelcomeVideoCard key={video.key} video={video} index={index} onPlay={play} />
          ))}
        </div>
      )}

      {openVideo ? <WelcomeVideoPlayer video={openVideo} onClose={close} /> : null}
    </div>
  );
}
