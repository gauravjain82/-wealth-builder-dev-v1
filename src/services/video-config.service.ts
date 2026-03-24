import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/infrastructure/firebase';

interface VideoItem {
  url: string;
  title?: string;
  uploadedAt?: any;
}

interface InsightCenterVideos {
  mainIntro?: VideoItem;
  easterEgg?: VideoItem;
}

interface BusinessVideos {
  faq?: VideoItem[];
  heroVideo?: VideoItem;
  sections?: any[];
}

interface EducationVideos {
  faqGeneral?: VideoItem[];
  faqAnnuities?: VideoItem[];
  heroVideo?: VideoItem;
  sections?: any[];
}

type VideoConfigType = 'insight_center_videos' | 'business_videos' | 'education_videos';

/**
 * Fetches video configuration from Firestore config collection
 */
export async function fetchVideoConfig(docId: VideoConfigType): Promise<any> {
  try {
    const docRef = doc(firebaseDb, 'config', docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      console.warn(`⚠️ Video config document '${docId}' not found`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error fetching video config '${docId}':`, error);
    throw error;
  }
}

/**
 * Fetches insight center videos configuration
 */
export async function fetchInsightCenterVideos(): Promise<InsightCenterVideos | null> {
  return fetchVideoConfig('insight_center_videos');
}

/**
 * Fetches business videos configuration
 */
export async function fetchBusinessVideos(): Promise<BusinessVideos | null> {
  return fetchVideoConfig('business_videos');
}

/**
 * Fetches education videos configuration
 */
export async function fetchEducationVideos(): Promise<EducationVideos | null> {
  return fetchVideoConfig('education_videos');
}
