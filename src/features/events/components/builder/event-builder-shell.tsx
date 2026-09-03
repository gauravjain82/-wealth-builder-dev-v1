import type { ReactNode } from 'react';
import { TAB_REGISTRY } from './tab-registry';

const FIELD_LABELS: Record<string, string> = {
  name: 'Event name',
  shortcut: 'URL shortcut',
  begin_at: 'Start date',
  end_at: 'End date',
};

interface EventBuilderShellProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  saving: boolean;
  /** Publish-required fields still blank, surfaced as a banner. */
  missingRequiredFields: string[];
  children: ReactNode;
}

export function EventBuilderShell({
  activeTab,
  onTabChange,
  saving,
  missingRequiredFields,
  children,
}: EventBuilderShellProps) {
  return (
    <div className="space-y-4">
      {missingRequiredFields.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
          <span className="font-medium">Required before publishing:</span>{' '}
          {missingRequiredFields.map((f) => FIELD_LABELS[f] ?? f).join(', ')}
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto dark:border-white/10">
        {TAB_REGISTRY.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white'
            }`}
          >
            {tab.label}
            {!tab.implemented && (
              <span className="ml-1.5 text-[10px] uppercase tracking-wide text-slate-400">
                soon
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Save status */}
      <div className="h-4 text-xs text-slate-500 dark:text-white/50">
        {saving ? 'Saving…' : ''}
      </div>

      {/* Tab content */}
      <div>{children}</div>
    </div>
  );
}
