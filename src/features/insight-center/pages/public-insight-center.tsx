import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchInsightCenterVideos } from '@/services/video-config.service';
import {
  VideoIntro,
  ActionButtons,
  EasterEggLogo,
  EasterEggModal,
  PageWrapper,
} from '@/features/insight-center/components';
import wbLogo from '@/assets/images/wealthbuilderslogo.png';
import { Heading, Text } from '@/shared/components';

const FALLBACK_INTRO = 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Insight%20center%2Finsight_center_intro_v2.mp4?alt=media&token=b6e04e29-69ca-4dc6-8754-75e5be9e1b5d';
const FALLBACK_EASTER_EGG = 'https://player.vimeo.com/video/931170735?h=d171159b83';

export default function PublicInsightCenter() {
  const location = useLocation();
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [videoData, setVideoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isPublicInsightCenterRoute = location.pathname === '/public-insight-center';
  const navigationButtons = [
    {
      to: isPublicInsightCenterRoute ? '/learn/public-business' : '/learn/business',
      label: 'Business Education',
      ariaLabel: 'Learn about Business Education',
    },
    {
      to: isPublicInsightCenterRoute ? '/learn/public-education' : '/learn/education',
      label: 'Financial Education',
      ariaLabel: 'Learn about Financial Education',
    },
  ];

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
          <Text variant="body">Loading videos...</Text>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <VideoIntro videoUrl={introVideoUrl} />

      <Heading as="h3" variant="h5" className="ic-question">Welcome to Wealth Builders! 🌟</Heading>
      <Text variant="body" className="ic-subtitle">
        You've been invited to discover how we're helping people achieve financial independence
      </Text>

      <ActionButtons buttons={navigationButtons} />

      <EasterEggLogo logoSrc={wbLogo} onClick={() => setShowEasterEgg(true)} />

      <EasterEggModal
        isOpen={showEasterEgg}
        videoUrl={easterEggVideoUrl}
        onClose={() => setShowEasterEgg(false)}
      />
    </PageWrapper>
  );
}
