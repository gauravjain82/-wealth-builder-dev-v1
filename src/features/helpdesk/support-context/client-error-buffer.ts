/**
 * In-memory ring buffers of recent failed API calls and uncaught JS errors, attached
 * to "Report a problem" tickets so support can see what went wrong on the page.
 *
 * Only metadata is kept: method, path + redacted query, status, time and the
 * `x-request-id` response header. Request/response bodies are never read.
 */

import type { SupportApiError, SupportJsError } from '../services/helpdesk-service';
import { clip, redactUrl } from './redact';

/** Entries kept per buffer. */
const BUFFER_SIZE = 10;

/** Longest JS error message kept. */
const MAX_MESSAGE_LENGTH = 300;

/** The widget's own submit endpoint: its failures are shown in the dialog, not recorded. */
const SUBMIT_PATH = '/api/helpdesk/my/tickets/';

const apiErrors: SupportApiError[] = [];
const jsErrors: SupportJsError[] = [];
let installed = false;
let pauseDepth = 0;

/** Append `entry` to `buffer`, dropping the oldest beyond BUFFER_SIZE (newest last). */
function push<T>(buffer: T[], entry: T): void {
  buffer.push(entry);
  if (buffer.length > BUFFER_SIZE) buffer.splice(0, buffer.length - BUFFER_SIZE);
}

/** Method and URL of a fetch call, whatever form its arguments take. */
function describeRequest(input: RequestInfo | URL, init?: RequestInit): { method: string; url: string } {
  let url = '';
  let method = init?.method;
  if (typeof input === 'string') url = input;
  else if (input instanceof URL) url = input.href;
  else if (typeof Request !== 'undefined' && input instanceof Request) {
    url = input.url;
    method = method ?? input.method;
  }
  return { method: (method || 'GET').toUpperCase(), url };
}

/** Record one failed call unless recording is paused or it is the widget submit itself. */
function recordApiError(method: string, rawUrl: string, status: number, requestId: string): void {
  if (pauseDepth > 0) return;
  const url = redactUrl(rawUrl);
  if (method === 'POST' && url.split('?')[0] === SUBMIT_PATH) return;
  push(apiErrors, { method, url, status, at: new Date().toISOString(), request_id: clip(requestId, 100) });
}

/** "file.js:12:34" from a script URL and position (origin and query dropped). */
function formatSource(fileUrl: string, line?: number, col?: number): string {
  if (!fileUrl) return '';
  let file = fileUrl;
  try {
    file = new URL(fileUrl, window.location.origin).pathname.split('/').pop() || '';
  } catch {
    file = fileUrl.split('/').pop() || '';
  }
  const position = [line, col].filter((n) => typeof n === 'number' && n > 0).join(':');
  return clip(position ? `${file}:${position}` : file, 200);
}

/** First "url:line:col" frame of an Error stack, formatted like formatSource. */
function sourceFromStack(stack: string | undefined): string {
  if (!stack) return '';
  const match = stack.match(/(https?:\/\/[^\s)]+|\/[^\s)]+):(\d+):(\d+)/);
  return match ? formatSource(match[1], Number(match[2]), Number(match[3])) : '';
}

/** Human message for an Error or any rejection reason. */
function describeReason(reason: unknown): string {
  if (reason instanceof Error) return `${reason.name}: ${reason.message}`;
  if (typeof reason === 'string') return reason;
  try {
    return JSON.stringify(reason) ?? String(reason);
  } catch {
    return String(reason);
  }
}

/** Record one uncaught error / rejection. */
function recordJsError(message: string, source: string): void {
  if (pauseDepth > 0) return;
  push(jsErrors, { message: clip(message || 'Unknown error', MAX_MESSAGE_LENGTH), source, at: new Date().toISOString() });
}

/**
 * Install the fetch wrapper and global error listeners. Call once from main.tsx before
 * rendering; later calls are no-ops. The wrapper returns the very same Response (or
 * re-throws the very same error) as the original fetch.
 */
export function installClientErrorBuffer(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const originalFetch = window.fetch;
  if (typeof originalFetch === 'function') {
    const wrappedFetch = function (this: unknown, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const promise = originalFetch.call(window, input, init);
      let described: { method: string; url: string } | null = null;
      try {
        described = describeRequest(input, init);
      } catch {
        described = null;
      }
      return promise.then(
        (response) => {
          try {
            if (described && response.status >= 400) {
              recordApiError(described.method, described.url, response.status, response.headers.get('x-request-id') || '');
            }
          } catch {
            // Recording must never affect the caller.
          }
          return response;
        },
        (error: unknown) => {
          try {
            const aborted = error instanceof DOMException && error.name === 'AbortError';
            if (described && !aborted) recordApiError(described.method, described.url, 0, '');
          } catch {
            // Recording must never affect the caller.
          }
          throw error;
        }
      );
    };
    window.fetch = wrappedFetch as typeof window.fetch;
  }

  window.addEventListener('error', (event: ErrorEvent) => {
    const message = event.message || (event.error ? describeReason(event.error) : '');
    if (!message) return;
    const source = formatSource(event.filename, event.lineno, event.colno) || sourceFromStack(event.error?.stack);
    recordJsError(message, source);
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason: unknown = event.reason;
    recordJsError(describeReason(reason), reason instanceof Error ? sourceFromStack(reason.stack) : '');
  });
}

/** Recent failed API calls, oldest first (≤ 10). */
export function getRecentApiErrors(): SupportApiError[] {
  return apiErrors.map((entry) => ({ ...entry }));
}

/** Recent uncaught JS errors / unhandled rejections, oldest first (≤ 10). */
export function getRecentJsErrors(): SupportJsError[] {
  return jsErrors.map((entry) => ({ ...entry }));
}

/**
 * Run `task` without recording anything it causes (e.g. the screenshot library's own
 * resource fetches), then resume recording.
 */
export async function withRecordingPaused<T>(task: () => Promise<T>): Promise<T> {
  pauseDepth += 1;
  try {
    return await task();
  } finally {
    pauseDepth -= 1;
  }
}
