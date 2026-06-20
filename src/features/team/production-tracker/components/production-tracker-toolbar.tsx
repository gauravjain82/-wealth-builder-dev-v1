import { Button, TrackerDateRangeFilter, type DatePresetKey, type TrackerDateRangeChange } from '@/shared/components';
import { TrackerTeamScopeFilter, type TrackerTeamScope } from '@/features/team/components/tracker-team-scope-filter';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';

const PRODUCTION_FILTER_KEY_OPTIONS = [
  { value: 'all', label: 'Submitted Date' },
  { value: 'declined', label: 'Policy Declined' },
  { value: 'cancelled', label: 'Policy Cancelled' },
  { value: 'incomplete', label: 'Policy Incomplete' },
  { value: 'pending_1_adv', label: 'Pending 1st adv' },
  { value: 'pending_2_adv', label: 'Pending 2nd adv' },
  { value: 'pending_1_or_2_adv', label: 'Pending 1st or 2nd adv' },
  { value: 'pending_1_and_2_adv', label: 'Pending 1st and 2nd adv' },
  { value: 'complete_1_adv', label: 'Complete 1st adv' },
  { value: 'complete_2_adv', label: 'Complete 2nd adv' },
  { value: 'complete_1_or_2_adv', label: 'Complete 1st or 2nd adv' },
  { value: 'complete_1_and_2_adv', label: 'Complete 1st and 2nd adv' },
  { value: 'approved_all', label: 'Approved[All]' },
  { value: 'approved', label: 'Approved[Only]' },
  { value: 'issued_all', label: 'Issued[All]' },
  { value: 'issued', label: 'Issued[Only]' },
  { value: 'mailed', label: 'Printed/Mailed[Only]' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'complete', label: 'Complete' },
  { value: 'chargeback_all', label: 'Chargebacks[All]' },
  { value: 'chargeback_incomplete', label: 'Chargebacks[Incomplete]' },
  { value: 'chargeback_declined', label: 'Chargebacks[Declined]' },
  { value: 'chargeback_other', label: 'Chargebacks[Other]' },
] as const;

export function ProductionTrackerToolbar({
  pageHeading,
  pageDescription,
  exporting,
  dateRangePreset,
  selectedDateRange,
  filterKey,
  teamScope,
  teamScopeUserId,
  summaryVisible,
  // onAddProduction,
  onExport,
  // onImport,
  onFilterKeyChange,
  onDateRangeChange,
  onTeamScopeChange,
  onToggleSummary,
}: {
  pageHeading: string;
  pageDescription: string;
  exporting: boolean;
  dateRangePreset: DatePresetKey;
  selectedDateRange: { startDate: string; endDate: string };
  filterKey: string;
  teamScope: TrackerTeamScope;
  teamScopeUserId: string | null;
  summaryVisible: boolean;
  // onAddProduction: () => void;
  onExport: () => void;
  // onImport: () => void;
  onFilterKeyChange: (value: string) => void;
  onDateRangeChange: (value: TrackerDateRangeChange) => void;
  onTeamScopeChange: (next: { scope: TrackerTeamScope; user: { id: string; name: string } | null }) => void;
  onToggleSummary: () => void;
}) {
  return (
    <div className="relative z-[200] overflow-visible rounded-2xl border border-gray-200 bg-white px-4 py-5 shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-[#1d2027] dark:shadow-[0_20px_45px_rgba(0,0,0,0.28)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{pageHeading}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-white/60">{pageDescription}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <select
            name="filterkey"
            value={filterKey}
            onChange={(event) => onFilterKeyChange(event.target.value)}
            className="h-9 rounded-md border border-gray-300 bg-transparent px-2 text-sm text-gray-900 dark:border-white/20 dark:bg-white/5 dark:text-white"
            aria-label="Filter production data"
          >
            {PRODUCTION_FILTER_KEY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-white text-gray-900 dark:bg-[#1d2027] dark:text-white">
                {option.label}
              </option>
            ))}
          </select>
          <TrackerDateRangeFilter
            value={dateRangePreset}
            selectedRange={selectedDateRange}
            onChange={onDateRangeChange}
          />
          <TrackerTeamScopeFilter
            value={teamScope}
            selectedUserId={teamScopeUserId}
            onChange={onTeamScopeChange}
          />
          <Button type="button" size="sm" variant="secondary" onClick={onToggleSummary}>
            {summaryVisible ? <IconChevronUp size={15} /> : <IconChevronDown size={15} />}
            {summaryVisible ? 'Hide Summary' : 'Show Summary'}
          </Button>
          {/* <Button type="button" size="sm" onClick={onAddProduction}>
            Add Production
          </Button> */}
          <Button type="button" size="sm" variant="secondary" onClick={onExport} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          {/* <Button type="button" size="sm" variant="outline" onClick={onImport}>
            Import CSV
          </Button> */}
        </div>
      </div>
    </div>
  );
}
