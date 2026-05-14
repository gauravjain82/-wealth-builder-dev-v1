import './video-hero.css';

interface VideoHeroProps {
  videoUrl: string;
  title?: string;
  className?: string;
}

function isEmbedUrl(url: string): boolean {
  return url.includes('vimeo.com') || url.includes('youtube.com') || url.includes('youtu.be');
}

export function VideoHero({ videoUrl, title = 'Intro video', className = '' }: VideoHeroProps) {
  return (
    <section className={`biz-hero small ${className}`}>
      <div className="biz-hero-inner">
        <div className="biz-hero-media">
          <div className="biz-hero-video-wrapper">
            {isEmbedUrl(videoUrl) ? (
              <iframe
                src={videoUrl}
                title={title}
                className="biz-hero-video"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                allowFullScreen
                loading="lazy"
              />
            ) : (
              <video
                src={videoUrl}
                title={title}
                className="biz-hero-video"
                controls
                muted
                playsInline
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
