import { useEffect, useRef } from "react";
import "@/features/education/components/video-modal/video-modal.css";
import { promotionService } from "../services/promotion-service";
import type { WatchProgress } from "../types";
import {
  Html5Playback,
  VimeoPlayback,
  isEmbedUrl,
  type PlaybackAdapter,
} from "../video-playback";

/** Highest playback speed allowed until the video counts as watched (the server assumes the same). */
const MAX_RATE = 1.5;
/** A jump further than this past the furthest point reached is a skip ahead, not playback. */
const SEEK_TOLERANCE_SECONDS = 2;
const REPORT_INTERVAL_MS = 15_000;

interface TrackedVideoModalProps {
  open: boolean;
  onClose: () => void;
  moduleId: number;
  /** Embeddable player URL (see getEmbedVideoUrl). */
  src: string;
  title: string;
  /** Furthest point already recorded on the server, in seconds. */
  watchedSeconds: number;
  /** While false, skipping ahead and speeds above 1.5x are blocked and progress is reported. */
  alreadyWatched: boolean;
  onProgress: (progress: WatchProgress) => void;
}

/**
 * The promotion video player. Until the video is watched it resumes where the learner
 * stopped, refuses skipping past the furthest point reached, caps the speed at 1.5x,
 * and reports progress to the server, which unlocks the quiz at 95%.
 */
export function TrackedVideoModal({
  open,
  onClose,
  moduleId,
  src,
  title,
  watchedSeconds,
  alreadyWatched,
  onProgress,
}: TrackedVideoModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Read at open time only; the effect must not restart when the parent re-renders.
  const startRef = useRef({ watchedSeconds, alreadyWatched, onProgress });
  startRef.current = { watchedSeconds, alreadyWatched, onProgress };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || startRef.current.alreadyWatched) return;
    const element = iframeRef.current ?? videoRef.current;
    // Only Vimeo embeds and plain files can be tracked; a YouTube link cannot unlock the quiz.
    if (!element || (element instanceof HTMLIFrameElement && !src.includes("vimeo.com"))) return;
    const playback: PlaybackAdapter =
      element instanceof HTMLIFrameElement
        ? new VimeoPlayback(element)
        : new Html5Playback(element);

    let furthest = startRef.current.watchedSeconds;
    let duration = 0;
    let reported = -1;
    let done = false;

    const report = () => {
      if (done || duration <= 0 || Math.floor(furthest) === reported) return;
      reported = Math.floor(furthest);
      promotionService
        .watchProgress(moduleId, reported, Math.round(duration))
        .then((progress) => {
          if (progress.watched_at) done = true;
          startRef.current.onProgress(progress);
        })
        .catch(() => undefined); // the next report retries
    };

    void playback.getDuration().then((seconds) => {
      duration = seconds;
      if (furthest > SEEK_TOLERANCE_SECONDS && furthest < duration * 0.95) {
        playback.seekTo(furthest); // resume where they left off
      }
    });
    playback.onTime((seconds) => {
      if (done) return;
      if (seconds > furthest + SEEK_TOLERANCE_SECONDS) playback.seekTo(furthest);
      else furthest = Math.max(furthest, seconds);
    });
    playback.onRateChange((rate) => {
      if (!done && rate > MAX_RATE) playback.setRate(MAX_RATE);
    });
    // The first report starts the server's clock, so send one as soon as playback begins.
    playback.onPlay(() => {
      reported = -1;
      report();
    });
    playback.onEnded(() => {
      furthest = Math.max(furthest, duration);
      report();
    });
    const timer = window.setInterval(report, REPORT_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
      report();
      playback.dispose();
    };
  }, [open, moduleId, src]);

  if (!open) return null;

  return (
    <div className="biz-modal-backdrop" onClick={onClose}>
      <div className="biz-modal" onClick={(e) => e.stopPropagation()}>
        <button className="biz-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="biz-modal-body">
          {isEmbedUrl(src) ? (
            <iframe
              ref={iframeRef}
              src={src}
              title={title}
              className="biz-modal-video"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
            />
          ) : (
            <video
              ref={videoRef}
              src={src}
              title={title}
              className="biz-modal-video"
              controls
              autoPlay
              playsInline
            />
          )}
        </div>
      </div>
    </div>
  );
}
