import { forwardRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Heading } from '@/shared/components/ui/typography';
import './video-hero.css';

interface VideoHeroProps {
  videoUrl: string;
  title: string;
  registerUrl: string;
  muted: boolean;
  onMuteToggle: () => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

export const VideoHero = forwardRef<HTMLElement, VideoHeroProps>(
  ({ videoUrl, title, registerUrl, muted, onMuteToggle, videoRef }, ref) => {
    return (
      <section ref={ref} className="video-hero">
        <div className="video-hero__inner">
          <div className="video-hero__wrap">
            <div className="video-hero__frame">
              <video
                ref={videoRef}
                className="video-hero__video"
                src={videoUrl}
                muted={muted}
                autoPlay
                loop
                playsInline
                controls
              />
              <button
                className="video-hero__mute-toggle"
                onClick={onMuteToggle}
                aria-label={muted ? 'Unmute video' : 'Mute video'}
              >
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            </div>

            <div className="video-hero__cta-bar">
              <Heading as="h1" variant="h1" className="video-hero__title">
                {title}
              </Heading>
              <a
                className="video-hero__register-btn"
                href={registerUrl}
                target="_blank"
                rel="noreferrer"
              >
                Register
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }
);

VideoHero.displayName = 'VideoHero';
