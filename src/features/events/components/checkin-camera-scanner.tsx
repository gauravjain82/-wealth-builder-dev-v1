import { useEffect, useRef, useState } from 'react';
import { Text } from '@shared/components';
import { barcodeDetectorCtor, type DetectedBarcodeLike } from '../utils/checkin-scan';

interface CheckinCameraScannerProps {
  /** Called with the raw QR payload — the hosted-ticket URL on our tickets. */
  onDetected: (payload: string) => void;
  /** Suspends detection while the parent is submitting a scan. */
  paused?: boolean;
}

const POLL_MS = 300;
// Ignore a repeat of the same code for this long so one badge isn't submitted
// dozens of times while it sits in front of the lens.
const REPEAT_GRACE_MS = 3000;

/** Live camera QR scanner for the check-in desk. */
export function CheckinCameraScanner({ onDetected, paused = false }: CheckinCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastPayloadRef = useRef<{ value: string; at: number } | null>(null);
  const pausedRef = useRef(paused);
  const onDetectedRef = useRef(onDetected);
  const [error, setError] = useState<string | null>(null);

  pausedRef.current = paused;
  onDetectedRef.current = onDetected;

  useEffect(() => {
    const Detector = barcodeDetectorCtor();
    if (!Detector) {
      setError('This browser cannot scan QR codes. Type the ticket number instead.');
      return;
    }

    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let cancelled = false;
    const detector = new Detector({ formats: ['qr_code'] });

    const tick = async () => {
      const video = videoRef.current;
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA || pausedRef.current) return;
      let codes: DetectedBarcodeLike[] = [];
      try {
        codes = await detector.detect(video);
      } catch {
        return; // A single dropped frame is not worth surfacing.
      }
      const payload = codes[0]?.rawValue;
      if (!payload) return;
      const last = lastPayloadRef.current;
      if (last && last.value === payload && Date.now() - last.at < REPEAT_GRACE_MS) return;
      lastPayloadRef.current = { value: payload, at: Date.now() };
      onDetectedRef.current(payload);
    };

    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        timer = window.setInterval(() => void tick(), POLL_MS);
      } catch {
        setError('Camera access was blocked. Allow it, or type the ticket number.');
      }
    })();

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

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
