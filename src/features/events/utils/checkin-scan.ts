/**
 * Camera QR-scanning helpers for the check-in desk.
 *
 * The Shape Detection API (`BarcodeDetector`) isn't in lib.dom yet and isn't
 * implemented in Safari or Firefox, so it is accessed through these narrow
 * types and always paired with the typed-entry fallback in the scan box.
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

/** Whether this browser can scan QR codes from a camera feed. */
export function isCameraScanSupported(): boolean {
  return Boolean(barcodeDetectorCtor() && navigator.mediaDevices?.getUserMedia);
}
