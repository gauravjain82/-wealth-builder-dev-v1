/**
 * API layer for BPM's one unauthenticated endpoint: the hosted guest pass.
 *
 * Deliberately separate from `bpm-service.ts`, which sends an Authorization
 * header and is reached through the app shell. A guest opening the link they were
 * texted has no account and no token, so nothing here may assume one — the token
 * in the URL is the whole credential.
 *
 * Modelled on `features/events/services/public-event-service.ts`, which solved
 * the same problem for the hosted ticket. It is a second small module rather than
 * a shared one because the two surfaces are allowed to diverge; what they share
 * is the shape, not the code.
 */

import type { PublicBPMGuestPass } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/** Thrown for non-2xx responses, carrying the status so a caller can branch. */
export class PublicBpmApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'PublicBpmApiError';
    this.status = status;
  }
}

/** Pull the most useful sentence out of a DRF error body. */
async function parseError(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status})`;
  const data = (await response.json().catch(() => null)) as { detail?: unknown } | null;
  if (!data || typeof data !== 'object') return fallback;
  const { detail } = data;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.join(', ');
  return fallback;
}

export const publicBpmService = {
  /**
   * Load one guest's pass by its token.
   *
   * Rejects with a 404 `PublicBpmApiError` for a token nothing answers to —
   * which includes a reissued pass and, deliberately, a pass into a BPM that has
   * since been cancelled or hidden.
   */
  async getGuestPass(token: string): Promise<PublicBPMGuestPass> {
    const response = await fetch(`${API_BASE_URL}/api/bpm/public/pass/${token}/`);
    if (!response.ok) {
      throw new PublicBpmApiError(await parseError(response), response.status);
    }
    return response.json() as Promise<PublicBPMGuestPass>;
  },
};
