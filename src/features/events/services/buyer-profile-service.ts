/**
 * The signed-in member's own details, for prefilling the public ticket form.
 *
 * The one call on the public event pages that sends the app's token. It lives
 * apart from `public-event-service.ts`, which never sends an Authorization
 * header, so that rule stays true there. A visitor with no token is a guest and
 * no request is made; a stale token or any failure also reads as "guest" — the
 * form is simply filled in by hand.
 */

import type { BuyerProfile } from '../types/public';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/** True when this browser holds an app login. */
export function hasAppLogin(): boolean {
  try {
    return Boolean(localStorage.getItem('wb.authToken'));
  } catch {
    return false;
  }
}

export const buyerProfileService = {
  /** `GET /api/events/public/{shortcut}/me/`; `null` for a guest or on any failure. */
  async get(shortcut: string, signal?: AbortSignal): Promise<BuyerProfile | null> {
    if (!hasAppLogin()) return null;
    const response = await fetch(`${API_BASE_URL}/api/events/public/${shortcut}/me/`, {
      headers: { Authorization: `Token ${localStorage.getItem('wb.authToken')}` },
      signal,
    });
    if (!response.ok) return null;
    return (await response.json()) as BuyerProfile;
  },
};
