export type BuilderTab = 'tracker' | 'results' | 'activity' | 'submit';

export const BUILDER_TABS: Array<{ id: BuilderTab; label: string }> = [
  { id: 'tracker', label: 'Tracker' },
  { id: 'results', label: 'Results Leaderboard' },
  { id: 'activity', label: 'Activity Leaderboard' },
  { id: 'submit', label: 'Submit Daily Six' },
];

/** Tabs for a program member below the full-page plan: everything but the tracker. */
export const MEMBER_TABS = BUILDER_TABS.filter((tab) => tab.id !== 'tracker');

interface BuildersTabsProps {
  /** Tabs to offer. Defaults to all four. */
  tabs?: Array<{ id: BuilderTab; label: string }>;
  activeTab: BuilderTab;
  onChange: (tab: BuilderTab) => void;
}

export function BuildersTabs({ tabs = BUILDER_TABS, activeTab, onChange }: BuildersTabsProps) {
  return (
    <div className="mb-2 flex flex-shrink-0 gap-1 overflow-x-auto border-b border-slate-200 dark:border-white/10">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === tab.id
              ? 'border-amber-400 text-amber-600 dark:text-amber-300'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white'
          }`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
