import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { firebaseDb, firebaseStorage } from '@/infrastructure/firebase';
import {
  API_BASE_URL,
  getAuthHeaders,
  getJsonHeaders,
  parseError,
} from '@shared/services/content-page-service';
import type { HomepageContent, HomepageVideoSlot } from '../types';

export const DEFAULT_HOMEPAGE_CONTENT: HomepageContent = {
  backgroundImageUrl:
    'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/ChatGPT%20Image%20Sep%2015%2C%202025%2C%2012_54_37%20AM.png?alt=media&token=2322a57d-447c-4319-888c-8353a34fbfb9',
  trailerVideoUrl:
    'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/IMG_7934.MP4?alt=media&token=597143ab-4dfc-42bb-87f3-428e54c345df',
  heroTitle: 'Wealth Bowl 2026 - Oct 9 - 11 | St. Louis Union Station Hotel, MO',
  registerUrl: 'https://bscpro.com/event/wb2026',
  eventsTitle: 'Event & Contests',
  eventsVideoUrl: 'https://www.canva.com/design/DAG6eJasb0c/QMcDazQ53A-DPwBIfKIn-Q/view?embed',
  recognitionTitle: 'Recognition',
  recognitionVideoUrl: 'https://www.canva.com/design/DAG-W6V-Uxc/qjp27ftg9x_dXxF9O9WBvA/view?embed',
};

const FIRESTORE_DOC = doc(firebaseDb, 'config', 'homepage');

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function pickString(source: Record<string, unknown>, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallback;
}

function carouselUrl(
  items: unknown,
  carouselType: 'contest' | 'recognition',
  fallback: string
): string {
  if (!Array.isArray(items)) return fallback;
  const match = items.find((item) => {
    const record = asRecord(item);
    return record.carousel_type === carouselType || record.carouselType === carouselType;
  });
  if (!match) return fallback;
  return pickString(asRecord(match), ['video_url', 'videoUrl', 'image_url', 'imageUrl', 'url'], fallback);
}

export function normalizeHomepageContent(raw: unknown): HomepageContent {
  const root = asRecord(raw);
  const data = root.data && typeof root.data === 'object' ? asRecord(root.data) : root;
  const config = asRecord(data.config ?? data);

  return {
    backgroundImageUrl: pickString(
      config,
      ['backgroundImageUrl', 'background_image_url'],
      DEFAULT_HOMEPAGE_CONTENT.backgroundImageUrl
    ),
    trailerVideoUrl: pickString(
      config,
      ['trailerVideoUrl', 'trailer_video_url'],
      DEFAULT_HOMEPAGE_CONTENT.trailerVideoUrl
    ),
    heroTitle: pickString(
      config,
      ['heroTitle', 'hero_title', 'title'],
      DEFAULT_HOMEPAGE_CONTENT.heroTitle
    ),
    registerUrl: pickString(
      config,
      ['registerUrl', 'register_url'],
      DEFAULT_HOMEPAGE_CONTENT.registerUrl
    ),
    eventsTitle: pickString(config, ['eventsTitle', 'events_title'], DEFAULT_HOMEPAGE_CONTENT.eventsTitle),
    eventsVideoUrl: pickString(
      config,
      ['eventsVideoUrl', 'events_video_url', 'contest_video_url'],
      carouselUrl(data.carousel_items ?? data.carouselItems, 'contest', DEFAULT_HOMEPAGE_CONTENT.eventsVideoUrl)
    ),
    recognitionTitle: pickString(
      config,
      ['recognitionTitle', 'recognition_title'],
      DEFAULT_HOMEPAGE_CONTENT.recognitionTitle
    ),
    recognitionVideoUrl: pickString(
      config,
      ['recognitionVideoUrl', 'recognition_video_url'],
      carouselUrl(
        data.carousel_items ?? data.carouselItems,
        'recognition',
        DEFAULT_HOMEPAGE_CONTENT.recognitionVideoUrl
      )
    ),
  };
}

function toApiPayload(content: HomepageContent) {
  return {
    config: {
      background_image_url: content.backgroundImageUrl,
      trailer_video_url: content.trailerVideoUrl,
      register_url: content.registerUrl,
      hero_title: content.heroTitle,
      events_title: content.eventsTitle,
      events_video_url: content.eventsVideoUrl,
      recognition_title: content.recognitionTitle,
      recognition_video_url: content.recognitionVideoUrl,
    },
  };
}

async function getJson(path: string): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

async function fetchFromFirestore(): Promise<HomepageContent | null> {
  try {
    const snap = await getDoc(FIRESTORE_DOC);
    if (!snap.exists()) return null;
    return normalizeHomepageContent(snap.data());
  } catch (error) {
    console.warn('Homepage Firestore read failed', error);
    return null;
  }
}

export async function fetchHomepageContent(): Promise<HomepageContent> {
  try {
    return normalizeHomepageContent(await getJson('/api/content/home/'));
  } catch {
    try {
      return normalizeHomepageContent(await getJson('/api/content/admin/home/'));
    } catch {
      return (await fetchFromFirestore()) ?? DEFAULT_HOMEPAGE_CONTENT;
    }
  }
}

async function saveToFirestore(content: HomepageContent): Promise<void> {
  await setDoc(
    FIRESTORE_DOC,
    {
      ...toApiPayload(content).config,
      ...content,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function saveHomepageContent(content: HomepageContent): Promise<HomepageContent> {
  const payload = toApiPayload(content);
  const attempts: Array<{ path: string; method: string }> = [
    { path: '/api/content/admin/home/', method: 'PATCH' },
    { path: '/api/content/home/', method: 'PATCH' },
    { path: '/api/admin/pages/home', method: 'PUT' },
  ];

  let lastError: Error | null = null;
  for (const attempt of attempts) {
    try {
      const response = await fetch(`${API_BASE_URL}${attempt.path}`, {
        method: attempt.method,
        headers: getJsonHeaders(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await parseError(response));
      const body = response.status === 204 ? payload : await response.json().catch(() => payload);
      return normalizeHomepageContent(body);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Failed to save homepage');
    }
  }

  try {
    await saveToFirestore(content);
    return content;
  } catch {
    throw lastError ?? new Error('Failed to save homepage content');
  }
}

async function uploadViaApi(slot: HomepageVideoSlot, file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_type', slot);

  const paths = [
    '/api/content/admin/home/upload/',
    `/api/content/admin/home/${slot}/upload/`,
  ];

  for (const path of paths) {
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      if (!response.ok) throw new Error(await parseError(response));
      const body = asRecord(await response.json());
      const url = pickString(body, ['url', 'href', 'resolved_href', 'file_url'], '');
      if (url) return url;
    } catch {
      // Fall through to Firebase Storage when the CMS upload route is not available.
    }
  }
  return null;
}

async function uploadViaFirebase(slot: HomepageVideoSlot, file: File): Promise<string> {
  const safeName = file.name.replace(/[^\w.-]+/g, '-');
  const storageRef = ref(firebaseStorage, `homepage/${slot}/${Date.now()}-${safeName}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function uploadHomepageMedia(slot: HomepageVideoSlot, file: File): Promise<string> {
  const fromApi = await uploadViaApi(slot, file);
  if (fromApi) return fromApi;
  return uploadViaFirebase(slot, file);
}
