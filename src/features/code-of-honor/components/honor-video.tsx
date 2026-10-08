/**
 * "Watch: what the Code of Honor means" — a small 16:9 thumbnail in the card header that
 * opens the video in a dialog.
 *
 * The source is `VITE_CODE_OF_HONOR_VIDEO_URL` (a YouTube or Vimeo page link, or a direct
 * file URL). Until one is set the thumbnail stays in place as a disabled "coming soon"
 * placeholder, so the layout does not shift when the video arrives.
 */

import { Play } from 'lucide-react';
import { useState } from 'react';

import { getEmbedVideoUrl } from '@/features/promotion/video-url';
import { Modal } from '@/shared/components/ui/modal';

import coinBack from '../assets/coin-back.webp';

const VIDEO_URL = (import.meta.env.VITE_CODE_OF_HONOR_VIDEO_URL ?? '').trim();

function isEmbed(url: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com/.test(url);
}

export function HonorVideo() {
  const [open, setOpen] = useState(false);
  const src = VIDEO_URL ? getEmbedVideoUrl(VIDEO_URL) : '';

  return (
    <>
      <button
        type="button"
        className="wb-coh-video"
        disabled={!src}
        onClick={() => setOpen(true)}
        aria-label={src ? 'Watch the Code of Honor video' : 'Code of Honor video, coming soon'}
      >
        <img className="wb-coh-video__bg" src={coinBack} alt="" draggable={false} />
        <span className="wb-coh-video__play" aria-hidden="true">
          <Play size={16} fill="currentColor" />
        </span>
        <span className="wb-coh-video__caption">
          {src ? 'Watch: what the Code means' : 'Video coming soon'}
        </span>
      </button>

      {src && (
        <Modal contentClassName="wb-coh-modal" open={open} title="The Code of Honor" onClose={() => setOpen(false)} dismissible>
          <div className="wb-coh-video__frame">
            {open &&
              (isEmbed(src) ? (
                <iframe
                  src={src}
                  title="The Code of Honor"
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowFullScreen
                />
              ) : (
                <video src={src} controls autoPlay playsInline />
              ))}
          </div>
        </Modal>
      )}
    </>
  );
}
