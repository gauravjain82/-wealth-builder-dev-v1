import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { VideoHero, CarouselCard, LeaderboardCard, PerformanceTable } from '@/shared/components/home';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useCarouselImages } from '@/hooks/use-carousel-images';
import { Plan } from '@core/types';

/** ============================
 *  ASSET URLS
 *  ============================ */
const BACKGROUND_URL =
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/ChatGPT%20Image%20Sep%2015%2C%202025%2C%2012_54_37%20AM.png?alt=media&token=2322a57d-447c-4319-888c-8353a34fbfb9';
const TRAILER_URL =
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/dallas-convention-2025-recap.mp4?alt=media&token=8ba184af-14e7-4744-bfcd-a09cb145e1c6';
const REGISTER_URL = 'https://wealthbuildersevents.com';
const AVATAR_URL =
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/rec1.png?alt=media&token=df042a0f-924f-487f-a355-85eea6cd8075';

export default function HomePage() {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);

  /* ===== Carousel Images from Firestore ===== */
  const { contestImages, recognitionImages } = useCarouselImages();

  /* ===== Video Controls ===== */
  const [muted, setMuted] = useState(true);

  /* ===== User Type ===== */
  const currentPlan = user?.plan ?? user?.accountType;
  const isPaid = currentPlan !== Plan.NewAgent;

  /* ===== Contest slider ===== */
  const [cIndex, setCIndex] = useState(0);
  const [autoRollC, setAutoRollC] = useState(true);

  useEffect(() => {
    if (!autoRollC || contestImages.length === 0) return;
    const id = setInterval(
      () => setCIndex((i) => (i + 1) % contestImages.length),
      5000
    );
    return () => clearInterval(id);
  }, [autoRollC, contestImages.length]);

  /* ===== Recognition slider ===== */
  const [rIndex, setRIndex] = useState(0);
  const [autoRollR, setAutoRollR] = useState(true);

  useEffect(() => {
    if (!autoRollR || recognitionImages.length === 0) return;
    const id = setInterval(
      () => setRIndex((i) => (i + 1) % recognitionImages.length),
      5000
    );
    return () => clearInterval(id);
  }, [autoRollR, recognitionImages.length]);

  /* ===== Lightbox ===== */
  const [lightbox, setLightbox] = useState({
    open: false,
    type: null as 'contest' | 'recognition' | null,
    index: 0,
  });
  const openLightbox = (type: 'contest' | 'recognition', index = 0) =>
    setLightbox({ open: true, type, index });
  const closeLightbox = () =>
    setLightbox({ open: false, type: null, index: 0 });

  // Contest controls
  const nextContest = () => {
    setAutoRollC(false);
    setCIndex((i) => (i + 1) % contestImages.length);
  };
  const prevContest = () => {
    setAutoRollC(false);
    setCIndex((i) => (i - 1 + contestImages.length) % contestImages.length);
  };

  // Recognition controls
  const nextRec = () => {
    setAutoRollR(false);
    setRIndex((i) => (i + 1) % recognitionImages.length);
  };
  const prevRec = () => {
    setAutoRollR(false);
    setRIndex(
      (i) => (i - 1 + recognitionImages.length) % recognitionImages.length
    );
  };

  // Leaderboard state
  const [activeTab, setActiveTab] = useState('bp');

  // Mock leaderboard data
  const mockLeaderboardData = {
    smd: [
      { name: 'John Smith', count: 145 },
      { name: 'Sarah Johnson', count: 132 },
      { name: 'Mike Williams', count: 118 },
      { name: 'Emily Davis', count: 105 },
      { name: 'David Brown', count: 98 },
    ],
    md: [
      { name: 'Lisa Anderson', count: 87 },
      { name: 'Robert Taylor', count: 79 },
      { name: 'Jennifer Wilson', count: 71 },
      { name: 'James Martinez', count: 65 },
      { name: 'Amanda Garcia', count: 58 },
    ],
  };

  // Mock user stats
  const userStats = {
    nlr: 12,
    tr: 45,
    pp: 350,
    tp: 1250,
    lic: 8,
    nl: 5,
    tl: 23,
    bis: 0,
    be: 0,
  };

  return (
    <div data-modern-homepage="true" className="w-full relative min-h-full" style={{ margin: '-24px' }}>
      {/* Background Layer */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${BACKGROUND_URL})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Background Blur Overlay */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px] z-10"
        style={{
          background:
            'linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.3) 100%)',
        }}
      />

      <main className="text-white transition-all duration-300 relative z-20 pb-8">{/* Hero Section */}
        {/* Hero Section */}
        <VideoHero
          videoUrl={TRAILER_URL}
          title="BREAKING BARRIERS OCT 9–11 | SALT LAKE CITY, UTAH"
          registerUrl={REGISTER_URL}
          muted={muted}
          onMuteToggle={() => setMuted((m) => !m)}
          videoRef={videoRef}
        />

        {/* Free Users Only: Learning & Onboarding Cards */}
        {!isPaid && (
          <>
            {/* What would you like to learn more about Card */}
            <section className="px-4 pb-8">
              <div className="max-w-4xl mx-auto">
                <Card className="bg-black/20 backdrop-blur-md border-white/10">
                  <CardHeader>
                    <CardTitle className="text-yellow-400 text-2xl font-bold text-center border-b border-yellow-400/30 pb-4">
                      What would you like to learn more about?
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 justify-center flex-wrap">
                      <Link
                        to="/learn/business"
                        className="flex-1 min-w-[200px] max-w-[300px] px-6 py-3 bg-gradient-to-r from-yellow-400/20 to-yellow-500/20 hover:from-yellow-400/30 hover:to-yellow-500/30 text-yellow-400 border border-yellow-400/40 rounded-lg transition-all duration-200 text-center font-semibold no-underline"
                      >
                        Business Education
                      </Link>
                      <Link
                        to="/learn/education"
                        className="flex-1 min-w-[200px] max-w-[300px] px-6 py-3 bg-gradient-to-r from-yellow-400/20 to-yellow-500/20 hover:from-yellow-400/30 hover:to-yellow-500/30 text-yellow-400 border border-yellow-400/40 rounded-lg transition-all duration-200 text-center font-semibold no-underline"
                      >
                        Financial Education
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Start your onboarding process Card */}
            <section className="px-4 pb-16">
              <div className="max-w-4xl mx-auto">
                <Card className="bg-black/20 backdrop-blur-md border-white/10">
                  <CardHeader>
                    <CardTitle className="text-yellow-400 text-2xl font-bold text-center border-b border-yellow-400/30 pb-4">
                      Start your onboarding process
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <Link
                      to="/onboarding-game"
                      className="px-6 py-3 bg-gradient-to-r from-yellow-400/20 to-yellow-500/20 hover:from-yellow-400/30 hover:to-yellow-500/30 text-yellow-400 border border-yellow-400/40 rounded-lg transition-all duration-200 font-semibold no-underline"
                      style={{ width: 'auto', minWidth: '200px', maxWidth: '400px' }}
                    >
                      Start Onboarding Game
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </section>
          </>
        )}

        {/* Event & Contests + Recognition Cards */}
        <section className="px-4 pb-16">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Event & Contests Card */}
              <CarouselCard
                title="Event & Contests"
                images={contestImages}
                currentIndex={cIndex}
                autoPlay={autoRollC}
                onToggleAutoPlay={() => setAutoRollC((v) => !v)}
                onFullscreen={() => openLightbox('contest', cIndex)}
                onNext={nextContest}
                onPrevious={prevContest}
              />

              {/* Recognition Card */}
              <CarouselCard
                title="Recognition"
                images={recognitionImages}
                currentIndex={rIndex}
                autoPlay={autoRollR}
                onToggleAutoPlay={() => setAutoRollR((v) => !v)}
                onFullscreen={() => openLightbox('recognition', rIndex)}
                onNext={nextRec}
                onPrevious={prevRec}
              />
            </div>
          </div>
        </section>

        {/* Leaderboard Section - Paid Users Only */}
        {isPaid && (
          <LeaderboardCard
            avatarUrl={AVATAR_URL}
            smdData={mockLeaderboardData.smd}
            mdData={mockLeaderboardData.md}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}

        {/* Performance Tracker - Paid Users Only */}
        {isPaid && (
          <section className="px-8 md:px-4 pb-16" aria-label="Quick metrics">
            <div className="max-w-7xl mx-auto">
              <PerformanceTable stats={userStats} />
            </div>
          </section>
        )}

        {/* Lightbox Modal */}
        {lightbox.open && (
          <div
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeLightbox}
          >
            <div className="relative max-w-6xl w-full">
              <button
                onClick={closeLightbox}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full border border-white/20"
              >
                ✕
              </button>
              <img
                src={
                  lightbox.type === 'contest'
                    ? contestImages[lightbox.index]
                    : recognitionImages[lightbox.index]
                }
                alt="Full size"
                className="w-full h-auto rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
