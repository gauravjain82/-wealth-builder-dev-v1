import './video-intro.css';

interface VideoIntroProps {
  videoUrl: string;
  title?: string;
  className?: string;
}

function isEmbedUrl(url: string): boolean {
  return url.includes('vimeo.com') || url.includes('youtube.com') || url.includes('youtu.be');
}

export function VideoIntro({ videoUrl, title = 'Wealth Builders Introduction', className = '' }: VideoIntroProps) {
  return (
    <div className={`ic-video-wrap ic-video-centered ${className}`}>
      <div className="ic-video">
        <div className="ic-video-inner">
          {isEmbedUrl(videoUrl) ? (
            <iframe
              className="ic-video-player"
              src={videoUrl}
              title={title}
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <video
              className="ic-video-player"
              src={videoUrl}
              title={title}
              controls
              muted
              playsInline
            />
          )}
        </div>
      </div>
    </div>
  );
}
