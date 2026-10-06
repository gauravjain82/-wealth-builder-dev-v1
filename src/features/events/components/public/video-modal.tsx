/**
 * Lightbox player for organizer videos (hero promo, later testimonials).
 *
 * Built on the native `<dialog>` element: `showModal()` gives focus trapping,
 * Escape-to-close, and a top-layer backdrop without a dependency, and it stays
 * independent of the app's own modal styling so public themes can restyle it.
 * The player is only mounted while open, so closing always stops playback.
 */

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

import type { VideoSource } from '../../utils/public-video';

interface VideoModalProps {
  /** Source to play; `null` keeps the dialog closed. */
  source: VideoSource | null;
  title: string;
  onClose: () => void;
}

export function VideoModal({ source, title, onClose }: VideoModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (source && !dialog.open) dialog.showModal();
    if (!source && dialog.open) dialog.close();
  }, [source]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="w-[min(960px,calc(100vw-32px))] overflow-visible bg-transparent p-0 backdrop:bg-black/80 backdrop:backdrop-blur-sm"
    >
      {source ? (
        <div className="relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close video"
            className="absolute -top-11 right-0 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="aspect-video overflow-hidden rounded-xl bg-black shadow-2xl">
            {source.kind === 'embed' ? (
              <iframe
                src={source.src}
                title={title}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                className="h-full w-full"
              />
            ) : (
              <video
                src={source.src}
                controls
                autoPlay
                playsInline
                className="h-full w-full"
              />
            )}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
