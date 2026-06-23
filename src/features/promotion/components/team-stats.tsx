import type { TeamResponse } from "../types";
export function TeamStats({ stats }: { stats: TeamResponse["stats"] }) {
  return (
    <div className="promo-stats">
      <div>
        <strong>{stats.total}</strong>
        <span>Total Downline</span>
      </div>
      <div>
        <strong className="green">{stats.ready}</strong>
        <span>Ready to Promote</span>
      </div>
      <div>
        <strong className="amber">{stats.in_progress}</strong>
        <span>In Progress</span>
      </div>
      <div>
        <strong className="muted">{stats.just_started}</strong>
        <span>Just Started</span>
      </div>
    </div>
  );
}
