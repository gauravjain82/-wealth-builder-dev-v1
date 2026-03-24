import { useState } from 'react';
import { VideoModal } from '../video-modal';
import './video-card.css';

interface VideoCardData {
  title: string;
  thumb?: string;
  videoUrl: string;
}

interface VideoCardProps {
  data: VideoCardData;
  renderMode?: 'modal' | 'link';
}

const FALLBACK_THUMB =
  'https://images.unsplash.com/photo-1541534401786-2077eed87a72?q=80&w=1200&auto=format&fit=crop';

export function VideoCard({ data, renderMode = 'modal' }: VideoCardProps) {
  const [open, setOpen] = useState(false);
  const { title, thumb, videoUrl } = data;

  const openVideo = () => {
    if (renderMode === 'link') {
      window.open(videoUrl, '_blank', 'noopener,noreferrer');
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <article className="biz-card">
        <div
          className="biz-card-media"
          onClick={openVideo}
          title={title}
        >
          <img src={thumb || FALLBACK_THUMB} alt={title} loading="lazy" />
          <div className="biz-card-title-badge" title={title}>
            {title}
          </div>
          <div className="biz-card-play">
            <div className="biz-card-play-icon" aria-hidden="true">
              ▶
            </div>
          </div>
        </div>
      </article>
      <VideoModal
        open={open}
        onClose={() => setOpen(false)}
        src={videoUrl}
        title={title}
      />
    </>
  );
}
