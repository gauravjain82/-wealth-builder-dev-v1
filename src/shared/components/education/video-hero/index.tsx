import './video-hero.css';

interface VideoHeroProps {
  videoUrl: string;
  title?: string;
  className?: string;
}

export function VideoHero({ videoUrl, title = 'Intro video', className = '' }: VideoHeroProps) {
  return (
    <section className={`biz-hero small ${className}`}>
      <div className="biz-hero-inner">
        <div className="biz-hero-media">
          <div className="biz-hero-video-wrapper">
            <video
              src={videoUrl}
              title={title}
              className="biz-hero-video"
              controls
              muted
              playsInline
            />
          </div>
        </div>
      </div>
    </section>
  );
}
