import './easter-egg-modal.css';

interface EasterEggModalProps {
  isOpen: boolean;
  videoUrl: string;
  onClose: () => void;
  title?: string;
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
          <video
            src={videoUrl}
            title={title}
            className="ic-modal-embed"
            controls
            autoPlay
            playsInline
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
    </div>
  );
}
