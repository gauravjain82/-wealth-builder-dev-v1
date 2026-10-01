import { useEffect } from 'react';

import type { WelcomeVideo } from '../types';
import { videoLabel } from '../utils/share';
import { vimeoEmbedUrl } from '../utils/vimeo';

interface WelcomeVideoPlayerProps {
  video: WelcomeVideo;
  onClose: () => void;
}

export function WelcomeVideoPlayer({ video, onClose }: WelcomeVideoPlayerProps) {
  const embedUrl = vimeoEmbedUrl(video.video_url);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="wb-wv-player" role="dialog" aria-modal="true" aria-label={videoLabel(video)} onClick={onClose}>
      <div className="wb-wv-player__dialog" onClick={(e) => e.stopPropagation()}>
        <div className="wb-wv-player__header">
          <h2 className="wb-wv-player__title">{videoLabel(video)}</h2>
          <button type="button" className="wb-wv-player__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {embedUrl ? (
          <div className="wb-wv-player__frame">
            <iframe
              src={embedUrl}
              title={video.title}
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
            />
          </div>
        ) : (
          <p className="wb-wv-player__fallback">
            This video can't play here.{' '}
            <a href={video.video_url} target="_blank" rel="noopener noreferrer">
              Open it on Vimeo
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
}
