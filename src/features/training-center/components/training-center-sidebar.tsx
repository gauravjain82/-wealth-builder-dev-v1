import type { TrainingCenterSection, TrainingSectionProgress } from '../types';

type TrainingCenterSidebarProps = {
  sections: TrainingCenterSection[];
  progressBySection: Record<string, TrainingSectionProgress>;
  activeId: string;
  query: string;
  searchEnabled: boolean;
  onSelect: (sectionId: string) => void;
  onQueryChange: (query: string) => void;
};

export function TrainingCenterSidebar({
  sections,
  progressBySection,
  activeId,
  query,
  searchEnabled,
  onSelect,
  onQueryChange,
}: TrainingCenterSidebarProps) {
  return (
    <aside className="training-sidebar">
      <div className="sidebar-header">
        <h3>Course Tracks</h3>
        {searchEnabled && (
          <input
            type="text"
            className="search-input"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="🔍 Search..."
          />
        )}
      </div>

      <nav className="section-nav" aria-label="Course tracks">
        {sections.map((section) => {
          const stats = progressBySection[section.section_key];
          const opened = stats?.opened ?? 0;
          const total = stats?.total ?? section.items.length;
          const percent = stats?.percent ?? 0;

          return (
            <button
              key={section.id}
              type="button"
              className={`section-btn ${section.id === activeId ? 'active' : ''}`}
              onClick={() => onSelect(section.id)}
            >
              <div className="section-icon-wrap">
                <span className="section-icon">{section.icon}</span>
                {percent === 100 && <span className="completion-badge">✓</span>}
              </div>
              <div className="section-info">
                <div className="section-label">{section.label}</div>
                <div className="section-progress-mini">
                  <div className="progress-mini-bar">
                    <div className="progress-mini-fill" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="progress-mini-text">
                    {opened}/{total}
                  </span>
                </div>
              </div>
              <span className="section-arrow">›</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
