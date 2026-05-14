import type { OrgViewType } from '../services/org-chart-service';

interface OrgToolbarProps {
  currentView: OrgViewType;
  loadingTeamOptions?: boolean;
  teamOptions: Array<{ id: string; name: string; level: string }>;
  selectedSMDId: string | null;
  onSMDSelect: (smdId: string | null) => void;
}

export default function OrgToolbar({
  currentView,
  loadingTeamOptions = false,
  teamOptions,
  selectedSMDId,
  onSMDSelect,
}: OrgToolbarProps) {
  return (
    <div className="org-toolbar">
      {(currentView === 'superbase' || currentView === 'superteam') && (
        <div className="org-toolbar-section">
          <label className="org-toolbar-label">Team:</label>
          <select
            className="org-toolbar-team-selector"
            value={selectedSMDId || ''}
            disabled={loadingTeamOptions}
            onChange={(event) => onSMDSelect(event.target.value || null)}
          >
            <option value="">
              {loadingTeamOptions ? 'Loading teams...' : teamOptions.length > 0 ? 'Select Team...' : 'No teams available'}
            </option>
            {teamOptions.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} ({team.level})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
