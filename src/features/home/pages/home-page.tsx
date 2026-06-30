import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { VideoHero, CanvaVideoCard, LeaderboardCard, PerformanceTable } from '@/features/home/components';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { roleToPlan } from '@core/constants/roles';
import { Plan } from '@core/types';

/** ============================
 *  HELPER: Normalize role into plan value
 *  ============================ */
function normalizePlanFromRole(role?: string | null): Plan {
  const normalizedRole = (role || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (!normalizedRole) return Plan.NewAgent;
  return roleToPlan(normalizedRole);
}

/** ============================
 *  ASSET URLS
 *  ============================ */
const BACKGROUND_URL =
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/ChatGPT%20Image%20Sep%2015%2C%202025%2C%2012_54_37%20AM.png?alt=media&token=2322a57d-447c-4319-888c-8353a34fbfb9';
const TRAILER_URL =
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/IMG_7934.MP4?alt=media&token=597143ab-4dfc-42bb-87f3-428e54c345df';
const REGISTER_URL = 'https://bscpro.com/event/wb2026';
const EVENTS_VIDEO_URL = 'https://www.canva.com/design/DAG6eJasb0c/QMcDazQ53A-DPwBIfKIn-Q/view?embed';
const RECOGNITION_VIDEO_URL = 'https://www.canva.com/design/DAG-W6V-Uxc/qjp27ftg9x_dXxF9O9WBvA/view?embed';

export default function HomePage() {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);

  /* ===== Video Controls ===== */
  const [muted, setMuted] = useState(true);

  /* ===== User Type ===== */
  const currentPlan = normalizePlanFromRole(user?.roles?.[0]);
  const isPaid = currentPlan !== Plan.NewAgent;

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
          title="Wealth Bowl 2026 - Oct 9 - 11 | St. Louis Union Station Hotel, MO"
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
              <CanvaVideoCard
                title="Event & Contests"
                videoUrl={EVENTS_VIDEO_URL}
              />

              {/* Recognition Card */}
              <CanvaVideoCard
                title="Recognition"
                videoUrl={RECOGNITION_VIDEO_URL}
              />
            </div>
          </div>
        </section>

        {/* Leaderboard Section - Paid Users Only */}
        {isPaid && (
          <section className="px-4 pb-16" aria-label="Leaderboards">
            <div className="max-w-7xl mx-auto">
              <LeaderboardCard />
            </div>
          </section>
        )}

        {/* Performance Tracker - Paid Users Only */}
        {isPaid && (
          <section className="px-8 md:px-4 pb-16" aria-label="Quick metrics">
            <div className="max-w-7xl mx-auto">
              <PerformanceTable />
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
