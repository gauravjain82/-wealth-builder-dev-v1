/**
 * The home page — the layout built as Home v2, which replaced the original page here
 * (leaderboards decision L16).
 *
 * `/home` is every guard's denial target, so this page has no guard of its own and
 * must render for any signed-in user. The leaderboard and contest sections read
 * `wbreporting` endpoints the backend gates on `homev2:read`; a caller without the
 * grant gets each section's own "unavailable" state, not a broken page.
 *
 * New agents keep what the original page gave them: the learning, welcome-video and
 * onboarding cards, and none of the leaderboard, contest, Code of Honor or metrics
 * sections.
 *
 * The "Event & Contests" slot is a Canva media card (like Recognition), the two
 * sitting side by side. The live contest is a separate full-width block below the
 * leaderboard — the featured-contest showcase, not the standings grid, which stays on
 * `/contests`. The Code of Honor wall follows the contests, as its own card.
 */

import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { VideoHero, CanvaVideoCard, PerformanceTable } from '@/features/home/components';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { ContestShowcase } from '@/features/contests';
import { CodeOfHonorCard } from '@/features/code-of-honor';
import { LeaderboardPanel } from '@/features/leaderboards';
import { useHomePageContent } from '@/features/home/hooks/use-home-content';
import { WelcomeVideosHomeCard } from '@/features/welcome-videos';
import type { HomeMediaType, HomePageSlot } from '@/features/home/services/home-content-service';
import { roleToPlan } from '@core/constants/roles';
import { Plan } from '@core/types';

/** Normalize a role into its plan; no role means a new agent. */
function normalizePlanFromRole(role?: string | null): Plan {
  const normalizedRole = (role || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (!normalizedRole) return Plan.NewAgent;
  return roleToPlan(normalizedRole);
}

/**
 * Fallbacks used while home content loads or if the request fails. Admins edit the
 * live values from the Home Content admin screen.
 */
const DEFAULT_BACKGROUND_URL =
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/ChatGPT%20Image%20Sep%2015%2C%202025%2C%2012_54_37%20AM.png?alt=media&token=2322a57d-447c-4319-888c-8353a34fbfb9';
const DEFAULT_TRAILER_URL =
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/IMG_7934.MP4?alt=media&token=597143ab-4dfc-42bb-87f3-428e54c345df';
const DEFAULT_REGISTER_URL = 'https://bscpro.com/event/wb2026';
const DEFAULT_TITLE = 'Wealth Bowl 2026 - Oct 9 - 11 | St. Louis Union Station Hotel, MO';
const DEFAULT_EVENTS_VIDEO_URL = 'https://www.canva.com/design/DAG6eJasb0c/QMcDazQ53A-DPwBIfKIn-Q/view?embed';
const DEFAULT_RECOGNITION_VIDEO_URL = 'https://www.canva.com/design/DAG-W6V-Uxc/qjp27ftg9x_dXxF9O9WBvA/view?embed';

const ONBOARDING_LINK_CLASS =
  'px-6 py-3 bg-gradient-to-r from-yellow-400/20 to-yellow-500/20 hover:from-yellow-400/30 hover:to-yellow-500/30 text-yellow-400 border border-yellow-400/40 rounded-lg transition-all duration-200 font-semibold no-underline';
const ONBOARDING_TITLE_CLASS =
  'text-yellow-400 text-2xl font-bold text-center border-b border-yellow-400/30 pb-4';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  const { data: homeContent } = useHomePageContent();
  const slotHref = (slot: HomePageSlot, fallback: string): string => {
    const media = homeContent?.media?.[slot];
    return media && media.is_active && media.href ? media.href : fallback;
  };

  const slotMediaType = (slot: HomePageSlot): HomeMediaType | undefined => {
    const media = homeContent?.media?.[slot];
    return media && media.is_active && media.href ? media.media_type : undefined;
  };

  const backgroundUrl = slotHref('background', DEFAULT_BACKGROUND_URL);
  const trailerUrl = slotHref('hero_trailer', DEFAULT_TRAILER_URL);
  const eventsVideoUrl = slotHref('events', DEFAULT_EVENTS_VIDEO_URL);
  const recognitionVideoUrl = slotHref('recognition', DEFAULT_RECOGNITION_VIDEO_URL);
  const heroTitle = homeContent?.config?.hero_title || DEFAULT_TITLE;
  const registerUrl = homeContent?.config?.register_url || DEFAULT_REGISTER_URL;

  const isPaid = normalizePlanFromRole(user?.roles?.[0]) !== Plan.NewAgent;

  return (
    <div data-modern-homepage="true" className="w-full relative min-h-full" style={{ margin: '-24px' }}>
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${backgroundUrl})`,
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
        <VideoHero
          videoUrl={trailerUrl}
          mediaType={slotMediaType('hero_trailer')}
          title={heroTitle}
          registerUrl={registerUrl}
          muted={muted}
          onMuteToggle={() => setMuted((value) => !value)}
          videoRef={videoRef}
        />

        {/* New agents only: learning and onboarding cards */}
        {!isPaid && (
          <>
            <section className="px-4 pb-8">
              <div className="max-w-4xl mx-auto">
                <Card className="bg-black/20 backdrop-blur-md border-white/10">
                  <CardHeader>
                    <CardTitle className={ONBOARDING_TITLE_CLASS}>
                      What would you like to learn more about?
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 justify-center flex-wrap">
                      <Link
                        to="/learn/business"
                        className={`flex-1 min-w-[200px] max-w-[300px] text-center ${ONBOARDING_LINK_CLASS}`}
                      >
                        Business Education
                      </Link>
                      <Link
                        to="/learn/education"
                        className={`flex-1 min-w-[200px] max-w-[300px] text-center ${ONBOARDING_LINK_CLASS}`}
                      >
                        Financial Education
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Welcome videos — the drip videos, also in the sidebar for every role */}
            <WelcomeVideosHomeCard />

            <section className="px-4 pb-8">
              <div className="max-w-4xl mx-auto">
                <Card className="bg-black/20 backdrop-blur-md border-white/10">
                  <CardHeader>
                    <CardTitle className={ONBOARDING_TITLE_CLASS}>
                      Start your onboarding process
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <Link
                      to="/onboarding-game"
                      className={ONBOARDING_LINK_CLASS}
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

        <section className="px-4 pb-8" aria-label="Events and recognition">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <CanvaVideoCard title="Event & Contests" videoUrl={eventsVideoUrl} />
              <CanvaVideoCard title="Recognition" videoUrl={recognitionVideoUrl} />
            </div>
          </div>
        </section>

        {/* Paid users only. Unmounted, not hidden, so a new agent sends none of these requests. */}
        {isPaid && (
          <>
            <section className="px-4 pb-8" aria-label="Leaderboards">
              <div className="max-w-7xl mx-auto">
                <LeaderboardPanel onOpenFullReport={() => navigate('/leaderboards?view=report')} />
              </div>
            </section>

            <section className="px-4 pb-8" aria-label="Contests">
              <div className="max-w-7xl mx-auto">
                {/*
                  The featured-contest showcase (dtez's wb_contests_showcase.php): content-
                  sized, so unlike the standings card it needs no bounded wrapper. The full
                  grid, filters and proofs are on /contests, which "View all" opens.
                */}
                <ContestShowcase onViewAll={() => navigate('/contests')} />
              </div>
            </section>

            <section className="px-4 pb-8" aria-label="Code of Honor">
              <div className="max-w-7xl mx-auto">
                {/*
                  The Code of Honor wall: a fixed-height card whose tabs scroll inside it.
                  It renders nothing for anyone the backend does not count as a member
                  (prospects), and links committee holders to /code-of-honor/committee.
                */}
                <CodeOfHonorCard onOpenCommittee={() => navigate('/code-of-honor/committee')} />
              </div>
            </section>

            <section className="px-8 md:px-4 pb-16" aria-label="Your metrics">
              <div className="max-w-7xl mx-auto">
                <PerformanceTable />
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
