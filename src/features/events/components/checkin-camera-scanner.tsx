import { useEffect, useRef, useState } from 'react';
import { Text } from '@shared/components';
import { barcodeDetectorCtor, type DetectedBarcodeLike } from '../utils/checkin-scan';

interface CheckinCameraScannerProps {
  /** Called with the raw QR payload — a URL or a bare token, depending on the code. */
  onDetected: (payload: string) => void;
  /** Suspends detection while the parent is submitting a scan. */
  paused?: boolean;
  /**
   * What the caller can still do with no camera, appended to the reason shown.
   * The events desk can type a ticket number; a BPM door has a searchable list.
   * Passed in because this component has no idea which screen it is on, and
   * "type the ticket number instead" is wrong advice at a BPM.
   */
  fallbackHint?: string;
}

const POLL_MS = 300;
// Ignore a repeat of the same code for this long so one badge isn't submitted
// dozens of times while it sits in front of the lens.
const REPEAT_GRACE_MS = 3000;

/**
 * Live camera QR scanner, shared by the events check-in desk and BPM.
 *
 * Decodes with the native `BarcodeDetector` where the browser has one and with a
 * lazily-imported `@zxing/browser` reader where it does not — see
 * `utils/checkin-scan` for why the fallback exists at all. The camera stream is
 * acquired here in both cases, so a blocked or missing camera produces one
 * message whichever decoder would have run.
 *
 * **When the camera cannot be opened, this renders a reason and nothing else.**
 * It never silently shows a black rectangle: on an insecure origin, inside an
 * iOS in-app webview, or after a denied permission prompt, the caller's own
 * manual path is the answer and the message says so.
 */
export function CheckinCameraScanner({
  onDetected,
  paused = false,
  fallbackHint,
}: CheckinCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastPayloadRef = useRef<{ value: string; at: number } | null>(null);
  const pausedRef = useRef(paused);
  const onDetectedRef = useRef(onDetected);
  const [error, setError] = useState<string | null>(null);

  pausedRef.current = paused;
  onDetectedRef.current = onDetected;

  useEffect(() => {
    let cancelled = false;
    // Reassigned once the decoder is running; the returned cleanup calls
    // whatever is current, so unmounting mid-`await` still tears down.
    let teardown: () => void = () => {};

    /** Debounced hand-off, shared by both decoders. */
    const handle = (payload: string) => {
      if (!payload || pausedRef.current) return;
      const last = lastPayloadRef.current;
      if (last && last.value === payload && Date.now() - last.at < REPEAT_GRACE_MS) return;
      lastPayloadRef.current = { value: payload, at: Date.now() };
      onDetectedRef.current(payload);
    };

    void (async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
      } catch {
        // Covers a denied prompt, an insecure origin and an iOS in-app webview
        // that never asks — indistinguishable from here, and the advice is the
        // same for all three.
        setError(
          `The camera could not be opened. Check the permission, or open this page in Safari or Chrome rather than inside another app.${
            fallbackHint ? ` ${fallbackHint}` : ''
          }`,
        );
        return;
      }

      const stopStream = () => stream.getTracks().forEach((track) => track.stop());
      teardown = stopStream;
      if (cancelled) return stopStream();

      const video = videoRef.current;
      if (!video) return stopStream();
      video.srcObject = stream;
      await video.play().catch(() => undefined);
      if (cancelled) return stopStream();

      const Detector = barcodeDetectorCtor();
      if (Detector) {
        const detector = new Detector({ formats: ['qr_code'] });
        const tick = async () => {
          if (video.readyState !== video.HAVE_ENOUGH_DATA || pausedRef.current) return;
          let codes: DetectedBarcodeLike[] = [];
          try {
            codes = await detector.detect(video);
          } catch {
            return; // A single dropped frame is not worth surfacing.
          }
          handle(codes[0]?.rawValue ?? '');
        };
        const timer = window.setInterval(() => void tick(), POLL_MS);
        teardown = () => {
          window.clearInterval(timer);
          stopStream();
        };
        return;
      }

      // Safari / Firefox. Imported here rather than at the top of the file so the
      // decoder is downloaded only by the browsers that cannot do without it.
      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser');
        if (cancelled) return stopStream();
        const reader = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: POLL_MS,
        });
        const controls = await reader.decodeFromStream(stream, video, (result) => {
          // zxing calls back on every attempt, with a null result for a frame
          // holding no code.
          if (result) handle(result.getText());
        });
        if (cancelled) {
          controls.stop();
          return stopStream();
        }
        teardown = () => {
          controls.stop();
          stopStream();
        };
      } catch {
        stopStream();
        setError(
          `This browser could not start a QR scanner.${
            fallbackHint ? ` ${fallbackHint}` : ''
          }`,
        );
      }
    })();

    return () => {
      cancelled = true;
      teardown();
    };
  }, [fallbackHint]);

  if (error) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
        <Text variant="muted" className="text-xs">
          {error}
        </Text>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-black dark:border-white/10">
      {/* muted + playsInline are required for autoplay on mobile Safari/Chrome. */}
      <video ref={videoRef} muted playsInline className="h-56 w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-32 w-32 rounded-lg border-2 border-white/70" />
      </div>
    </div>
  );
}
