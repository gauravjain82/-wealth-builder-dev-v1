import { useState, useEffect } from 'react';
import { fetchEducationVideos } from '@/services/video-config.service';
import {
  PageWrapper,
  VideoHero,
  GalleryRow,
  FaqSection,
} from '@/shared/components/education';
import { ActionButtons } from '@/shared/components/insight-center';

const FALLBACK_EDUCATION_INTRO = 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/AI%20videos%2FInsight%20center%2FInsight%20center%20Education.mp4?alt=media&token=23f05108-a432-405d-bcba-6a3e9382e37c';

const NAVIGATION_BUTTONS = [
  {
    to: '/learn/business',
    label: 'Business Education',
    ariaLabel: 'Learn about Business Education',
  },
  {
    to: '/learn/education',
    label: 'Financial Education',
    ariaLabel: 'Learn about Financial Education',
  },
];

interface VideoData {
  title: string;
  thumb?: string;
  videoUrl: string;
}

interface Section {
  id: string;
  title: string;
  cards: VideoData[];
}

export default function PublicEducationPage() {
  const [videoData, setVideoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVideos = async () => {
      try {
        const data = await fetchEducationVideos();
        setVideoData(data);
      } catch (error) {
        console.error('Failed to load education videos:', error);
      } finally {
        setLoading(false);
      }
    };
    loadVideos();
  }, []);

  if (loading) {
    return (
      <PageWrapper>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading videos...</p>
        </div>
      </PageWrapper>
    );
  }

  // Map Firestore data to component structure
  const sections: Section[] = videoData?.sections?.map((sec: any) => ({
    id: sec.id,
    title: sec.title,
    cards: sec.videos?.map((v: any) => ({
      title: v.title,
      thumb: v.thumbnail,
      videoUrl: v.url,
    })) || [],
  })) || [];

  const faqGeneral = videoData?.faqGeneral?.map((f: any) => ({
    q: f.question,
    videoUrl: f.url,
  })) || [];

  const faqAnnuities = videoData?.faqAnnuities?.map((f: any) => ({
    q: f.question,
    videoUrl: f.url,
  })) || [];

  const heroVideoUrl = videoData?.heroVideo?.url || FALLBACK_EDUCATION_INTRO;

  return (
    <PageWrapper>
      <ActionButtons buttons={NAVIGATION_BUTTONS} />
      
      <VideoHero videoUrl={heroVideoUrl} title="Education intro video" />

      {sections.slice(0, -1).map((sec) => (
        <GalleryRow key={sec.id} title={sec.title} cards={sec.cards} />
      ))}

      <FaqSection title="FAQ" items={faqGeneral} />

      {sections.slice(-1).map((sec) => (
        <GalleryRow key={sec.id} title={sec.title} cards={sec.cards} />
      ))}

      <FaqSection title="FAQ about Annuities" items={faqAnnuities} />
    </PageWrapper>
  );
}

