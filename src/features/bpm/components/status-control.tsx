import { Select } from '@shared/components';
import { BPM_STATUS_LABELS } from '../types';
import type { BPMStatus, BPMStatusOverride } from '../types';

/** The four hard-set states, in the order the brief lists them. */
const OVERRIDE_OPTIONS: BPMStatusOverride[] = [
  'ARCHIVED',
  'HIDDEN',
  'CANCELLED',
  'DELETED',
];

/** Tailwind classes per status, so a list scans at a glance. */
const STATUS_BADGE: Record<BPMStatus, string> = {
  SCHEDULED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300',
  LIVE: 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300',
  COMPLETED: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/70',
  ARCHIVED: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/70',
  HIDDEN: 'bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300',
  CANCELLED: 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300',
  DELETED: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200',
};

/** Read-only status pill. */
export function StatusBadge({ status }: { status: BPMStatus }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}
    >
      {BPM_STATUS_LABELS[status]}
    </span>
  );
}

interface StatusControlProps {
  /** What the row currently reports, derived or hard-set. */
  effectiveStatus: BPMStatus;
  /** The stored override, or null when the status is derived from the clock. */
  statusOverride: BPMStatusOverride | null;
  disabled?: boolean;
  /**
   * Offer Archived / Hidden / Cancelled. Off leaves only Automatic (and Deleted,
   * if allowed) — for a user who may delete a date but not otherwise edit it.
   */
  allowOverrides?: boolean;
  /** Offer Deleted. The caller passes `can_delete`; hidden, not disabled, without it. */
  allowDelete?: boolean;
  onChange: (next: BPMStatusOverride | null) => void;
}

/**
 * Hard-set a row's status, or clear it back to automatic.
 *
 * The blank option is not "no status" — it means *derive from the clock*, which
 * is what produces Scheduled / Live / Completed. Restoring something DELETED is
 * deliberately not offered here: that lives in BPM Settings, so this control
 * shows the state but leaves it locked.
 */
export function StatusControl({
  effectiveStatus,
  statusOverride,
  disabled = false,
  allowOverrides = true,
  allowDelete = true,
  onChange,
}: StatusControlProps) {
  const isDeleted = statusOverride === 'DELETED';
  const options = OVERRIDE_OPTIONS.filter((option) =>
    option === 'DELETED'
      ? allowDelete
      : // Never drop the option the row already holds, or the select would
        // show a value it has no entry for.
        allowOverrides || option === statusOverride,
  );

  if (isDeleted) {
    return (
      <span className="inline-flex items-center gap-2">
        <StatusBadge status="DELETED" />
        <span className="text-xs text-slate-500 dark:text-white/60">
          restore in BPM Settings
        </span>
      </span>
    );
  }

  return (
    <Select
      variant="surface"
      value={statusOverride ?? ''}
      disabled={disabled}
      aria-label="Status"
      onChange={(event) =>
        onChange((event.target.value || null) as BPMStatusOverride | null)
      }
    >
      <option value="">
        Automatic ({BPM_STATUS_LABELS[effectiveStatus]})
      </option>
      {options.map((option) => (
        <option key={option} value={option}>
          {BPM_STATUS_LABELS[option]}
        </option>
      ))}
    </Select>
  );
}
