import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Heading, Text } from '@/shared/components/ui/typography';
import {
  fetchHomeLeaderboard,
  HomeLeaderboardEntry,
  HomeLeaderboardMetric,
} from '@/features/home/services/home-leaderboard-service';
import './leaderboard-card.css';

const TAB_CONFIG = [
  { id: 'recruits', label: 'Business Partners' },
  { id: 'points', label: 'Points' },
  { id: 'licenses', label: 'Licenses' },
  { id: 'big_event', label: 'Convention' },
] satisfies Array<{ id: HomeLeaderboardMetric; label: string }>;

function formatValue(row: HomeLeaderboardEntry): string {
  const value = Number(row.value);
  if (!Number.isFinite(value)) return String(row.value);
  return value.toLocaleString(undefined, {
    maximumFractionDigits: row.metric === 'points' ? 2 : 0,
  });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}

interface LeaderboardListProps {
  level: 'SMD' | 'MD';
  rows: HomeLeaderboardEntry[];
}

function LeaderboardList({ level, rows }: LeaderboardListProps) {
  return (
    <div>
      <Heading as="h3" variant="h5" className="leaderboard-card__column-title">
        Top 5 {level}
      </Heading>
      <div className="leaderboard-card__list">
        {rows.length === 0 && (
          <Text as="div" className="leaderboard-card__message">
            No data available
          </Text>
        )}
        {rows.map((row) => (
          <div key={`${level}-${row.user_id}`} className="leaderboard-card__item">
            <Text as="span" weight="bold" className="leaderboard-card__rank">
              #{row.rank}
            </Text>
            <span className="leaderboard-card__avatar leaderboard-card__avatar--initials">
              {getInitials(row.user_name)}
            </span>
            <Text as="span" weight="medium" className="leaderboard-card__name">
              {row.user_name}
            </Text>
            <Text as="span" weight="semibold" className="leaderboard-card__count">
              {formatValue(row)}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LeaderboardCard() {
  const [activeTab, setActiveTab] = useState<HomeLeaderboardMetric>('recruits');
  const userId = localStorage.getItem('wb.userId') || '';
  const { data, error, isLoading } = useQuery({
    queryKey: ['home-leaderboard', userId, activeTab],
    queryFn: () => fetchHomeLeaderboard(activeTab),
  });

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
            Performance Tracker &rarr;
          </a>
        </div>
      </CardHeader>
      <CardContent>
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
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {isLoading && (
          <Text as="div" className="leaderboard-card__message">
            Loading leaderboard data...
          </Text>
        )}
        {error && !isLoading && (
          <Text as="div" className="leaderboard-card__message leaderboard-card__message--error">
            Unable to load leaderboard data.
          </Text>
        )}
        {data && !isLoading && !error && (
          <div className="leaderboard-card__columns">
            <LeaderboardList level="SMD" rows={data.smd} />
            <LeaderboardList level="MD" rows={data.md} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
