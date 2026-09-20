import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { VideoHero, CanvaVideoCard, LeaderboardCard, PerformanceTable } from '@/features/home/components';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { isPlanAtLeast, roleToPlan } from '@core/constants/roles';
import { Plan } from '@core/types';
import { useHomepageContent } from '@/features/home/hooks/use-homepage-content';

function normalizePlanFromRole(role?: string | null): Plan {
  const normalizedRole = (role || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (!normalizedRole) return Plan.NewAgent;
  return roleToPlan(normalizedRole);
}

export default function HomePage() {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { content } = useHomepageContent();

  const [muted, setMuted] = useState(true);

  const currentPlan = normalizePlanFromRole(user?.roles?.[0]);
  const isPaid = currentPlan !== Plan.NewAgent;
  const canEditHomepage = isPlanAtLeast(user?.accountType, Plan.Admin);

  return (
    <div data-modern-homepage="true" className="w-full relative min-h-full" style={{ margin: '-24px' }}>
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${content.backgroundImageUrl})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
        }}
      />

      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px] z-10"
        style={{
          background:
            'linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.3) 100%)',
        }}
      />

      <main className="text-white transition-all duration-300 relative z-20 pb-8">
        {canEditHomepage && (
          <div className="flex justify-end px-4 pt-4">
            <Link
              to="/admin/homepage"
              className="rounded-lg border border-yellow-400/40 bg-black/40 px-4 py-2 text-sm font-semibold text-yellow-400 no-underline hover:bg-black/60"
            >
              Edit homepage
            </Link>
          </div>
        )}

        <VideoHero
          videoUrl={content.trailerVideoUrl}
          title={content.heroTitle}
          registerUrl={content.registerUrl}
          muted={muted}
          onMuteToggle={() => setMuted((m) => !m)}
          videoRef={videoRef}
        />

        {!isPaid && (
          <>
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

        <section className="px-4 pb-16">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <CanvaVideoCard title={content.eventsTitle} videoUrl={content.eventsVideoUrl} />
              <CanvaVideoCard title={content.recognitionTitle} videoUrl={content.recognitionVideoUrl} />
            </div>
          </div>
        </section>

        {isPaid && (
          <section className="px-4 pb-16" aria-label="Leaderboards">
            <div className="max-w-7xl mx-auto">
              <LeaderboardCard />
            </div>
          </section>
        )}

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
