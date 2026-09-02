import type { TrainingProgress } from '../types';

type TrainingCenterStatsProps = {
  title: string;
  subtitle: string;
  progress: TrainingProgress;
};

export function TrainingCenterStats({ title, subtitle, progress }: TrainingCenterStatsProps) {
  return (
    <div className="training-hero">
      <div className="hero-content">
        <h1 className="hero-title">
          <span className="title-icon">🎓</span>
          {title}
        </h1>
        <p className="hero-subtitle">{subtitle}</p>
      </div>

      <div className="stats-dashboard">
        <div className="stat-card level-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-info">
            <div className="stat-label">Level</div>
            <div className="stat-value">{progress.level}</div>
          </div>
          <div className="level-progress">
            <div className="level-bar">
              <div
                className="level-fill"
                style={{ width: `${progress.xp_progress_percent}%` }}
              />
            </div>
            <div className="level-text">
              {progress.total_xp} / {progress.xp_for_next_level} XP
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon completed">🎯</div>
          <div className="stat-info">
            <div className="stat-label">Explored</div>
            <div className="stat-value">
              {progress.opened_count}/{progress.total_items}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon progress">📈</div>
          <div className="stat-info">
            <div className="stat-label">Discovery</div>
            <div className="stat-value">{progress.exploration_percent}%</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon xp">💎</div>
          <div className="stat-info">
            <div className="stat-label">Total XP</div>
            <div className="stat-value">{progress.total_xp}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
