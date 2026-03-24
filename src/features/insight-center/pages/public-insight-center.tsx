import { useState, useEffect } from 'react';
import { fetchInsightCenterVideos } from '@/services/video-config.service';
import {
  VideoIntro,
  ActionButtons,
  EasterEggLogo,
  EasterEggModal,
  PageWrapper,
} from '@/shared/components/insight-center';
import wbLogo from '@/assets/images/wealthbuilderslogo.png';

const FALLBACK_INTRO = 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Insight%20center%2Finsight_center_intro_v2.mp4?alt=media&token=b6e04e29-69ca-4dc6-8754-75e5be9e1b5d';
const FALLBACK_EASTER_EGG = 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Insight%20center%2FLeadership%20Bonus.mp4?alt=media&token=fe0c09c7-cf66-4d70-b93b-76b7c68d26df';

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

export default function PublicInsightCenter() {
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [videoData, setVideoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVideos = async () => {
      try {
        const data = await fetchInsightCenterVideos();
        setVideoData(data);
      } catch (error) {
        console.error('Failed to load insight center videos:', error);
      } finally {
        setLoading(false);
      }
    };
    loadVideos();
  }, []);

  const introVideoUrl = videoData?.mainIntro?.url || FALLBACK_INTRO;
  const easterEggVideoUrl = videoData?.easterEgg?.url || FALLBACK_EASTER_EGG;

  if (loading) {
    return (
      <PageWrapper>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading videos...</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <VideoIntro videoUrl={introVideoUrl} />

      <h3 className="ic-question">Welcome to Wealth Builders! 🌟</h3>
      <p className="ic-subtitle">
        You've been invited to discover how we're helping people achieve financial independence
      </p>

      <ActionButtons buttons={NAVIGATION_BUTTONS} />

      <EasterEggLogo logoSrc={wbLogo} onClick={() => setShowEasterEgg(true)} />

      <EasterEggModal
        isOpen={showEasterEgg}
        videoUrl={easterEggVideoUrl}
        onClose={() => setShowEasterEgg(false)}
      />
    </PageWrapper>
  );
}
