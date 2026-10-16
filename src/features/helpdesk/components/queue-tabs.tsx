/** Tab strip for queue views, with optional counts. */

/** One tab: `count` is shown as a pill when given. */
export interface QueueTab<K extends string> {
  key: K;
  label: string;
  count?: number;
  /** Highlight the count (e.g. "Needs action"). */
  emphasize?: boolean;
}

interface QueueTabsProps<K extends string> {
  tabs: Array<QueueTab<K>>;
  active: K;
  onChange: (key: K) => void;
  /** Accessible name of the tab list. */
  label: string;
}

/** Horizontally scrollable, keyboard-reachable tab buttons. */
export function QueueTabs<K extends string>({ tabs, active, onChange, label }: QueueTabsProps<K>) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/5">
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.key)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
              selected
                ? 'bg-[#f5d66a] font-semibold text-black'
                : 'text-slate-700 hover:bg-slate-100 dark:text-white/80 dark:hover:bg-white/10'
            }`}
          >
            {tab.label}
            {typeof tab.count === 'number' ? (
              <span
                className={`min-w-[20px] rounded-full px-1.5 text-center text-[11px] font-bold ${
                  tab.emphasize && tab.count > 0
                    ? 'bg-sky-600 text-white'
                    : selected
                      ? 'bg-black/15 text-black'
                      : 'bg-slate-200 text-slate-700 dark:bg-white/15 dark:text-white/80'
                }`}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
