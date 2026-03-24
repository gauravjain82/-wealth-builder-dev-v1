import './video-intro.css';

interface VideoIntroProps {
  videoUrl: string;
  title?: string;
  className?: string;
}

export function VideoIntro({ videoUrl, title = 'Wealth Builders Introduction', className = '' }: VideoIntroProps) {
  return (
    <div className={`ic-video-wrap ic-video-centered ${className}`}>
      <div className="ic-video">
        <div className="ic-video-inner">
          <video
            className="ic-video-player"
            src={videoUrl}
            title={title}
            controls
            muted
            playsInline
          />
        </div>
      </div>
    </div>
  );
}
