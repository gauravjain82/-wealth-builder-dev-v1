/**
 * Home v2 — the next home page, behind an access-console gate.
 *
 * Composed from the components the current home page already uses, plus the new
 * leaderboard card. Nothing here is a fork: `VideoHero`, `CanvaVideoCard` and
 * `PerformanceTable` are imported from `features/home`, so a change to any of them
 * lands on both pages and the two cannot drift.
 *
 * `/home` is deliberately **not modified**. The new leaderboard and the existing
 * `<LeaderboardCard />` compute their numbers from different tables — the reporting
 * pipeline's `agency_code`-keyed results versus the materialised BaseShop metrics —
 * so putting both on one page would show two similar cards with different figures.
 * They live on different pages instead, and v2 replaces v1 once the numbers have been
 * compared on QA. That replacement is out of scope here.
 *
 * The contest slot is still the existing "Event & Contests" media card; the contests
 * package replaces it with live standings.
 */

import { useRef, useState } from 'react';

import { VideoHero, CanvaVideoCard, PerformanceTable } from '@/features/home/components';
import { LeaderboardsCard } from '@/features/leaderboards';
import { useHomePageContent } from '@/features/home/hooks/use-home-content';
import type { HomePageSlot } from '@/features/home/services/home-content-service';

/** Fallbacks used while the CMS content loads, matching the current home page. */
const DEFAULT_BACKGROUND_URL =
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/ChatGPT%20Image%20Sep%2015%2C%202025%2C%2012_54_37%20AM.png?alt=media&token=2322a57d-447c-4319-888c-8353a34fbfb9';
const DEFAULT_TRAILER_URL =
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/IMG_7934.MP4?alt=media&token=597143ab-4dfc-42bb-87f3-428e54c345df';
const DEFAULT_REGISTER_URL = 'https://bscpro.com/event/wb2026';
const DEFAULT_TITLE = 'Wealth Bowl 2026 - Oct 9 - 11 | St. Louis Union Station Hotel, MO';
const DEFAULT_EVENTS_VIDEO_URL = 'https://www.canva.com/design/DAG6eJasb0c/QMcDazQ53A-DPwBIfKIn-Q/view?embed';
const DEFAULT_RECOGNITION_VIDEO_URL = 'https://www.canva.com/design/DAG-W6V-Uxc/qjp27ftg9x_dXxF9O9WBvA/view?embed';

export default function HomeV2Page() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  const { data: homeContent } = useHomePageContent();
  const slotHref = (slot: HomePageSlot, fallback: string): string => {
    const media = homeContent?.media?.[slot];
    return media && media.is_active && media.href ? media.href : fallback;
  };

  const backgroundUrl = slotHref('background', DEFAULT_BACKGROUND_URL);
  const trailerUrl = slotHref('hero_trailer', DEFAULT_TRAILER_URL);
  const eventsVideoUrl = slotHref('events', DEFAULT_EVENTS_VIDEO_URL);
  const recognitionVideoUrl = slotHref('recognition', DEFAULT_RECOGNITION_VIDEO_URL);
  const heroTitle = homeContent?.config?.hero_title || DEFAULT_TITLE;
  const registerUrl = homeContent?.config?.register_url || DEFAULT_REGISTER_URL;

  return (
    <div data-home-v2="true" className="w-full relative min-h-full" style={{ margin: '-24px' }}>
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
          title={heroTitle}
          registerUrl={registerUrl}
          muted={muted}
          onMuteToggle={() => setMuted((value) => !value)}
          videoRef={videoRef}
        />

        <section className="px-4 pb-8" aria-label="Events and recognition">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Replaced by live contest standings when the contests package lands. */}
              <CanvaVideoCard title="Event & Contests" videoUrl={eventsVideoUrl} />
              <CanvaVideoCard title="Recognition" videoUrl={recognitionVideoUrl} />
            </div>
          </div>
        </section>

        <section className="px-4 pb-8" aria-label="Leaderboards">
          <div className="max-w-7xl mx-auto">
            <LeaderboardsCard />
          </div>
        </section>

        <section className="px-8 md:px-4 pb-16" aria-label="Your metrics">
          <div className="max-w-7xl mx-auto">
            <PerformanceTable />
          </div>
        </section>
      </main>
    </div>
  );
}
