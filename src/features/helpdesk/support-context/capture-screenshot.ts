/**
 * Viewport screenshot for "Report a problem" tickets, rendered in the browser with
 * html-to-image. Password inputs, `[data-support-redact]` elements and the help
 * dialog itself (`[data-support-dialog]`) are left out of the image.
 */

import { MAX_ATTACHMENT_BYTES } from './attachment-rules';
import { withRecordingPaused } from './client-error-buffer';

/** Attribute marking the help dialog and its overlay so they never appear in a capture. */
export const SUPPORT_DIALOG_ATTR = 'data-support-dialog';

/** Highest pixel ratio used, to keep files small on retina screens. */
const MAX_PIXEL_RATIO = 1.5;

/** Give up on a capture that takes longer than this. */
const CAPTURE_TIMEOUT_MS = 10_000;

/** 1×1 transparent PNG used when a (cross-origin) image cannot be inlined. */
const IMAGE_PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

/** False for nodes that must not be rendered into the screenshot. */
function includeNode(node: HTMLElement): boolean {
  if (!(node instanceof Element)) return true;
  if (node.matches('input[type="password" i]')) return false;
  if (node.hasAttribute('data-support-redact')) return false;
  if (node.hasAttribute(SUPPORT_DIALOG_ATTR)) return false;
  return true;
}

/** Render the visible page to a PNG blob at `pixelRatio`, or reject. */
async function renderPng(pixelRatio: number): Promise<Blob | null> {
  // Loaded on first use so the library stays out of the main bundle.
  const { toBlob } = await import('html-to-image');
  const capture = toBlob(document.body, {
    pixelRatio,
    width: window.innerWidth,
    height: window.innerHeight,
    canvasWidth: window.innerWidth,
    canvasHeight: window.innerHeight,
    filter: includeNode,
    imagePlaceholder: IMAGE_PLACEHOLDER,
    cacheBust: false,
    style: { margin: '0' },
  });
  let timer = 0;
  const timeout = new Promise<null>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error('Screenshot timed out')), CAPTURE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([capture, timeout]);
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Capture the visible page as `screenshot-<timestamp>.png`. Retries at 1× when the
 * first image is over the upload size limit. Resolves to null on any failure; never
 * throws.
 */
export async function captureScreenshot(): Promise<File | null> {
  try {
    return await withRecordingPaused(async () => {
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      let blob = await renderPng(ratio);
      if (blob && blob.size > MAX_ATTACHMENT_BYTES && ratio > 1) blob = await renderPng(1);
      if (!blob || blob.size > MAX_ATTACHMENT_BYTES) return null;
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      return new File([blob], `screenshot-${stamp}.png`, { type: 'image/png' });
    });
  } catch {
    return null;
  }
}
