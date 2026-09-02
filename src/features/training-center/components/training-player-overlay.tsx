import { useEffect } from 'react';
import { shouldUseIframe } from '../utils/media';

type TrainingPlayerOverlayProps = {
  src: string;
  title: string;
  onClose: () => void;
};

export function TrainingPlayerOverlay({ src, title, onClose }: TrainingPlayerOverlayProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="training-player-overlay"
      onClick={onClose}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        className="training-player-container"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Training video player'}
      >
        <button type="button" className="training-player-close-btn" onClick={onClose}>
          ✖ Close
        </button>
        <div className="training-player-title">{title}</div>

        {shouldUseIframe(src) ? (
          <div className="training-iframe-wrap">
            <iframe
              title={title || 'Training video'}
              src={src}
              className="training-embedded-video"
              allow="autoplay; encrypted-media"
              frameBorder="0"
              referrerPolicy="no-referrer"
            />
            <div className="training-iframe-control-shield" aria-hidden="true" />
          </div>
        ) : (
          <video
            title={title || 'Training video'}
            src={src}
            className="training-embedded-video"
            controls
            controlsList="nodownload nofullscreen noremoteplayback"
            disablePictureInPicture
            onContextMenu={(event) => event.preventDefault()}
          />
        )}
      </div>
    </div>
  );
}
