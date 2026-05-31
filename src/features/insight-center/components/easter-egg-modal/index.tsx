import './easter-egg-modal.css';

interface EasterEggModalProps {
  isOpen: boolean;
  videoUrl: string;
  onClose: () => void;
  title?: string;
}

function isEmbedUrl(url: string): boolean {
  return url.includes('vimeo.com') || url.includes('youtube.com') || url.includes('youtu.be');
}

function withAutoplay(url: string): string {
  if (!url.includes('vimeo.com')) return url;
  const parsed = new URL(url);
  if (parsed.pathname === '/video/931170735' && !parsed.searchParams.has('h')) {
    parsed.searchParams.set('h', 'd171159b83');
  }
  parsed.searchParams.set('autoplay', '1');
  return parsed.toString();
}

export function EasterEggModal({ isOpen, videoUrl, onClose, title = 'Easter Egg Video' }: EasterEggModalProps) {
  if (!isOpen) return null;

  return (
    <div className="ic-modal-overlay" onClick={onClose}>
      <div className="ic-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="ic-modal-close" onClick={onClose}>
          ×
        </button>
        <div className="ic-modal-video">
          {isEmbedUrl(videoUrl) ? (
            <iframe
              src={withAutoplay(videoUrl)}
              title={title}
              className="ic-modal-embed"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
              loading="lazy"
              style={{ width: '100%', height: '100%', border: 0 }}
            />
          ) : (
            <video
              src={videoUrl}
              title={title}
              className="ic-modal-embed"
              controls
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
