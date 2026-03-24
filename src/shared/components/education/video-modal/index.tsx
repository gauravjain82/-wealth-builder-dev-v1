import { useEffect } from 'react';
import './video-modal.css';

interface VideoModalProps {
  open: boolean;
  onClose: () => void;
  src: string;
  title?: string;
}

export function VideoModal({ open, onClose, src, title }: VideoModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="biz-modal-backdrop" onClick={onClose}>
      <div className="biz-modal" onClick={(e) => e.stopPropagation()}>
        <button className="biz-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="biz-modal-body">
          <video
            src={src}
            title={title}
            className="biz-modal-video"
            controls
            autoPlay
            playsInline
          />
        </div>
      </div>
    </div>
  );
}
