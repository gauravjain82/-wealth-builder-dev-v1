/**
 * Public read model for the CMS-managed member home page.
 *
 * The hero trailer, background image, and the two feature cards (Events &
 * Contests, Recognition) are stored in the backend `content` app and edited by
 * admins from the Home Content admin screen. This module fetches the current
 * values; the home page falls back to sensible defaults if the request fails.
 */

import { API_BASE_URL, getAuthHeaders } from '@shared/services/content-page-service';

export type HomePageSlot = 'hero_trailer' | 'background' | 'events' | 'recognition';
export type HomeMediaType = 'video' | 'image' | 'embed';

export type HomePageConfig = {
  hero_title: string;
  register_url: string;
  updated_at?: string;
};

export type HomePageMedia = {
  id: number;
  slot: HomePageSlot;
  label: string;
  href: string;
  gcs_blob_name: string;
  media_type: HomeMediaType;
  is_active: boolean;
  updated_at?: string;
};

export type HomePageContent = {
  config: HomePageConfig;
  media: Partial<Record<HomePageSlot, HomePageMedia>>;
};

export async function fetchHomePageContent(): Promise<HomePageContent> {
  const response = await fetch(`${API_BASE_URL}/api/content/home-page/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error(`Failed to load home content (${response.status})`);
  return response.json() as Promise<HomePageContent>;
}
