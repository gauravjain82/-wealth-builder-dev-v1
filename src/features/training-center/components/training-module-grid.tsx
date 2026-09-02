import type { TrainingCenterItem, TrainingCenterSection } from '../types';

type TrainingModuleGridProps = {
  section: TrainingCenterSection | undefined;
  items: TrainingCenterItem[];
  openedCount: number;
  completedIds: Set<number>;
  onOpenItem: (item: TrainingCenterItem) => void;
};

export function TrainingModuleGrid({
  section,
  items,
  openedCount,
  completedIds,
  onOpenItem,
}: TrainingModuleGridProps) {
  return (
    <main className="training-main">
      <div className="main-header">
        <div className="section-title-wrap">
          <span className="section-title-icon">{section?.icon}</span>
          <h2 className="section-title">{section?.label}</h2>
        </div>
        <div className="section-meta">
          {openedCount} of {section?.items.length ?? 0} explored
        </div>
      </div>

      <div className="modules-grid">
        {items.map((item) => {
          const isOpened = completedIds.has(item.id);
          return (
            <div
              key={item.id}
              className={`module-card ${isOpened ? 'opened' : ''}`}
              onClick={() => onOpenItem(item)}
            >
              <div className="module-status">
                {isOpened ? (
                  <span className="status-icon opened">✓</span>
                ) : (
                  <span className="status-icon available">▶</span>
                )}
              </div>
              <div className="module-content">
                <h3 className="module-title">{item.title}</h3>
                {item.description && (
                  <p className="module-description">{item.description}</p>
                )}
                <div className="module-xp">
                  <span className="xp-icon">💎</span>
                  <span className="xp-value">{isOpened ? 'Opened' : `${item.xp} XP`}</span>
                </div>
              </div>
              <div className="module-hover-effect" />
              {isOpened && <div className="completion-glow" />}
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <div className="empty-text">No modules found</div>
            <div className="empty-hint">Try a different search term</div>
          </div>
        )}
      </div>
    </main>
  );
}
