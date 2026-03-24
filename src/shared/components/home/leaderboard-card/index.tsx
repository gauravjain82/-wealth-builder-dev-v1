import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Heading, Text } from '@/shared/components/ui/typography';
import './leaderboard-card.css';

interface LeaderboardEntry {
  name: string;
  count: number;
}

interface LeaderboardCardProps {
  avatarUrl: string;
  smdData: LeaderboardEntry[];
  mdData: LeaderboardEntry[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TAB_CONFIG = [
  { id: 'bp', label: 'Business Partners' },
  { id: 'pt', label: 'Points' },
  { id: 'lic', label: 'Licenses' },
  { id: 'cv', label: 'Convention' },
];

export function LeaderboardCard({
  avatarUrl,
  smdData,
  mdData,
  activeTab,
  onTabChange,
}: LeaderboardCardProps) {
  return (
    <Card className="leaderboard-card">
      <CardHeader>
        <div className="leaderboard-card__header">
          <CardTitle className="leaderboard-card__title">Leaderboards</CardTitle>
          <a
            href="https://wbperformance.netlify.app"
            target="_blank"
            rel="noopener noreferrer"
            className="leaderboard-card__link"
          >
            Performance Tracker →
          </a>
        </div>
      </CardHeader>
      <CardContent>
        {/* Tab Buttons */}
        <div className="leaderboard-card__tabs">
          {TAB_CONFIG.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              size="sm"
              className={
                activeTab === tab.id
                  ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400/40'
                  : 'bg-black/30 border-white/20 text-white hover:bg-black/50'
              }
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Leaderboard Content */}
        <div className="leaderboard-card__columns">
          {/* SMD Column */}
          <div>
            <Heading as="h3" variant="h5" className="leaderboard-card__column-title">
              Top 5 SMD
            </Heading>
            <div className="leaderboard-card__list">
              {smdData.map((row, idx) => (
                <div key={`smd-${idx}`} className="leaderboard-card__item">
                  <Text as="span" weight="bold" className="leaderboard-card__rank">
                    #{idx + 1}
                  </Text>
                  <img src={avatarUrl} alt="" className="leaderboard-card__avatar" />
                  <Text as="span" weight="medium" className="leaderboard-card__name">
                    {row.name}
                  </Text>
                  <Text as="span" weight="semibold" className="leaderboard-card__count">
                    {row.count}
                  </Text>
                </div>
              ))}
            </div>
          </div>

          {/* MD Column */}
          <div>
            <Heading as="h3" variant="h5" className="leaderboard-card__column-title">
              Top 5 MD
            </Heading>
            <div className="leaderboard-card__list">
              {mdData.map((row, idx) => (
                <div key={`md-${idx}`} className="leaderboard-card__item">
                  <Text as="span" weight="bold" className="leaderboard-card__rank">
                    #{idx + 1}
                  </Text>
                  <img src={avatarUrl} alt="" className="leaderboard-card__avatar" />
                  <Text as="span" weight="medium" className="leaderboard-card__name">
                    {row.name}
                  </Text>
                  <Text as="span" weight="semibold" className="leaderboard-card__count">
                    {row.count}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
