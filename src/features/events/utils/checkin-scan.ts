/**
 * Camera QR-scanning helpers, shared by the events check-in desk and BPM.
 *
 * Two decoders sit behind one question. The Shape Detection API
 * (`BarcodeDetector`) is free, fast and native — but it is absent in Safari and
 * Firefox, which for a long time was acceptable here: the events desk falls back
 * to typing a ticket number on a laptop.
 *
 * **BPM has no such fallback.** Check-in there is a phone at a door, iOS Safari
 * is the likely device, and a BPM guest has no ticket number to type — so
 * "this browser cannot scan" would have meant "iPhones cannot check anyone in".
 * `@zxing/browser` is therefore the fallback decoder (decision **D7** always
 * recommended it), **dynamically imported** so its ~200KB stays out of the main
 * bundle and is only fetched by the browsers that actually need it.
 *
 * The fallback lives behind this module and `CheckinCameraScanner` rather than in
 * a second BPM-only scanner, so the events desk gains iOS support for free and
 * the two cannot drift apart.
 */

export interface DetectedBarcodeLike {
  rawValue: string;
}

export interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcodeLike[]>;
}

export type BarcodeDetectorCtor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorLike;

/** Return the browser's `BarcodeDetector` constructor, if it has one. */
export function barcodeDetectorCtor(): BarcodeDetectorCtor | undefined {
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
}

/**
 * Whether this browser can open a camera at all.
 *
 * The *decoder* is no longer part of the question — `@zxing/browser` works
 * anywhere `getUserMedia` does, so the camera is the only real requirement.
 *
 * Note what this cannot tell you: `getUserMedia` is undefined on an insecure
 * origin (scanning needs HTTPS or localhost), and it is *present but unreliable*
 * inside iOS in-app webviews, where the permission prompt may never appear. Both
 * surface as a failure to open the camera rather than as a missing API, which is
 * why `CheckinCameraScanner` always renders a reason and every caller keeps a
 * way to proceed without a camera.
 */
export function isCameraScanSupported(): boolean {
  return Boolean(navigator.mediaDevices?.getUserMedia);
}
