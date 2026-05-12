import { useState } from 'react';
import { FILTER_COLORS, FILTER_KEYS } from '../utils/filters';
import type { OrgViewType, OrgChartUser } from '../services/org-chart-service';

const FILTER_OPTIONS = [
  { key: FILTER_KEYS.BPM, label: 'BPM Attendance', color: FILTER_COLORS[FILTER_KEYS.BPM] },
  { key: FILTER_KEYS.BIG_EVENT, label: 'Big Event', color: FILTER_COLORS[FILTER_KEYS.BIG_EVENT] },
  { key: FILTER_KEYS.KEY_PLAYER, label: 'Key Player', color: FILTER_COLORS[FILTER_KEYS.KEY_PLAYER] },
  { key: FILTER_KEYS.LICENSED, label: 'Licensed', color: FILTER_COLORS[FILTER_KEYS.LICENSED] },
  { key: FILTER_KEYS.NET_LICENSED, label: 'Net Licensed', color: FILTER_COLORS[FILTER_KEYS.NET_LICENSED] },
  { key: FILTER_KEYS.CLIENT, label: 'Client', color: FILTER_COLORS[FILTER_KEYS.CLIENT] },
];

interface OrgToolbarProps {
  currentView: OrgViewType;
  onViewChange: (view: OrgViewType) => void;
  viewOptions: Array<{ id: OrgViewType; label: string; description: string }>;
  loadingTeamOptions?: boolean;
  onSearch: (value: string) => void;
  onCenterOnMe: () => void;
  activeFilters: Set<string>;
  onFilterToggle: (filterKey: string) => void;
  teamOptions: Array<{ id: string; name: string; level: string }>;
  selectedSMDId: string | null;
  onSMDSelect: (smdId: string | null) => void;
  onExpandToDepth: (depth: number | null) => void;
  expandDepth: number | null;
  users: OrgChartUser[];
}

export default function OrgToolbar({
  currentView,
  onViewChange,
  viewOptions,
  loadingTeamOptions = false,
  onSearch,
  onCenterOnMe,
  activeFilters,
  onFilterToggle,
  teamOptions,
  selectedSMDId,
  onSMDSelect,
  onExpandToDepth,
  expandDepth,
  users,
}: OrgToolbarProps) {
  const [searchValue, setSearchValue] = useState('');
  const [showDepthMenu, setShowDepthMenu] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  const filteredUsers =
    searchValue.trim().length < 2
      ? []
      : users
          .filter((user) => {
            const query = searchValue.toLowerCase();
            const roleQuerySource = user.roles.join(' ').toLowerCase();
            return (
              user.name.toLowerCase().includes(query) ||
              user.email.toLowerCase().includes(query) ||
              roleQuerySource.includes(query)
            );
          })
          .slice(0, 8);

  return (
    <div className="org-toolbar">
      <div className="org-toolbar-section">
        <label className="org-toolbar-label">View:</label>
        <div className="org-toolbar-views">
          {viewOptions.map((view) => (
            <button
              key={view.id}
              className={`org-toolbar-view-btn ${currentView === view.id ? 'active' : ''}`}
              onClick={() => onViewChange(view.id)}
              title={view.description}
              type="button"
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>

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

      <div className="org-toolbar-section org-toolbar-expand-controls">
        <label className="org-toolbar-label">Expand:</label>
        <div className="org-toolbar-expand-btns">
          <div className="org-toolbar-depth-selector">
            <button
              className="org-toolbar-expand-btn org-toolbar-depth-btn"
              onClick={() => setShowDepthMenu((previous) => !previous)}
              title="Expand to specific depth"
              type="button"
            >
              Depth {expandDepth !== null ? expandDepth : 'Inf'}
            </button>
            {showDepthMenu && (
              <div className="org-toolbar-depth-menu">
                <button onClick={() => onExpandToDepth(null)} className={expandDepth === null ? 'active' : ''} type="button">
                  All Levels
                </button>
                {[1, 2, 3, 4, 5].map((depth) => (
                  <button
                    key={depth}
                    onClick={() => onExpandToDepth(depth)}
                    className={expandDepth === depth ? 'active' : ''}
                    type="button"
                  >
                    Level {depth}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="org-toolbar-section org-toolbar-filters">
        <label className="org-toolbar-label">Filters:</label>
        <div className="org-toolbar-filter-pills">
          {FILTER_OPTIONS.map((filter) => {
            const isActive = activeFilters.has(filter.key);
            return (
              <button
                key={filter.key}
                className={`org-filter-pill ${isActive ? 'active' : ''}`}
                style={{
                  backgroundColor: isActive ? filter.color : 'transparent',
                  borderColor: filter.color,
                  color: isActive ? '#fff' : filter.color,
                }}
                onClick={() => onFilterToggle(filter.key)}
                title={`Toggle ${filter.label} filter`}
                type="button"
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="org-toolbar-section">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (searchValue.trim()) {
              onSearch(searchValue.trim());
              setShowAutocomplete(false);
            }
          }}
          className="org-toolbar-search"
        >
          <div className="org-toolbar-search-wrapper">
            <input
              type="text"
              value={searchValue}
              onChange={(event) => {
                const value = event.target.value;
                setSearchValue(value);
                if (value.trim().length >= 2) {
                  setShowAutocomplete(true);
                } else {
                  setShowAutocomplete(false);
                }
              }}
              onFocus={() => {
                if (filteredUsers.length > 0) {
                  setShowAutocomplete(true);
                }
              }}
              onBlur={() => {
                setTimeout(() => setShowAutocomplete(false), 200);
              }}
              placeholder="Search by name..."
              className="org-toolbar-search-input"
              autoComplete="off"
            />
            {showAutocomplete && filteredUsers.length > 0 && (
              <div className="org-toolbar-autocomplete">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="org-toolbar-autocomplete-item"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onSearch(user.name);
                      setSearchValue(user.name);
                      setShowAutocomplete(false);
                    }}
                  >
                    <div className="org-toolbar-autocomplete-name">{user.name}</div>
                    <div className="org-toolbar-autocomplete-meta">
                      <span className="org-toolbar-autocomplete-type">{user.roles[0] || 'Agent'}</span>
                      {user.email && <span className="org-toolbar-autocomplete-email">{user.email}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </div>

      <div className="org-toolbar-section">
        <button className="org-toolbar-btn" onClick={onCenterOnMe} type="button">
          Center on Me
        </button>
      </div>
    </div>
  );
}
