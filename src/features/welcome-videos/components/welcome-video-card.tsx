import { useToastStore } from '@/store';

import type { WelcomeVideo } from '../types';
import { canNativeShare, copyText, shareText, videoLabel } from '../utils/share';

interface WelcomeVideoCardProps {
  video: WelcomeVideo;
  index: number;
  onPlay: (video: WelcomeVideo) => void;
}

export function WelcomeVideoCard({ video, index, onPlay }: WelcomeVideoCardProps) {
  const { addToast } = useToastStore();

  const handleCopy = async () => {
    const ok = await copyText(video.video_url);
    addToast(
      ok
        ? { type: 'success', message: 'Video link copied.' }
        : { type: 'error', message: 'Could not copy the link.' }
    );
  };

  const handleShare = async () => {
    try {
      await navigator.share({ title: videoLabel(video), text: shareText(video) });
    } catch {
      // The person dismissed the share sheet; nothing to report.
    }
  };

  return (
    <article className="wb-wv-card">
      <div className="wb-wv-card__head">
        <span className="wb-wv-card__number" aria-hidden="true">
          {index + 1}
        </span>
        <div>
          <h3 className="wb-wv-card__title">{video.title}</h3>
          {video.speaker ? <p className="wb-wv-card__speaker">{video.speaker}</p> : null}
        </div>
      </div>
      <p className="wb-wv-card__description">{video.description}</p>
      <div className="wb-wv-card__actions">
        <button type="button" className="wb-wv-btn wb-wv-btn--primary" onClick={() => onPlay(video)}>
          ▶ Play
        </button>
        <button type="button" className="wb-wv-btn" onClick={handleCopy}>
          Copy link
        </button>
        {canNativeShare() ? (
          <button type="button" className="wb-wv-btn" onClick={handleShare}>
            Share
          </button>
        ) : null}
      </div>
    </article>
  );
}
