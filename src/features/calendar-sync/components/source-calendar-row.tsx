/**
 * One row of the Calendar Sync section: a single source (Personal / Match Up /
 * BPM / Big Events) with its target-calendar picker, sync/push/pull toggles,
 * per-source "Sync now", and last-synced hints.
 */
import { useMemo } from 'react';
import {
  useSetSourceTarget,
  useUpdateSourceToggles,
} from '../hooks/use-calendar-sync';
import type { GoogleCalendarDTO, SourceMappingDTO } from '../types';
import { SyncNowButton } from './sync-now-button';

/** Sentinel value used by the picker to trigger branded-calendar creation. */
const CREATE_OPTION = '__create__';

interface SourceCalendarRowProps {
  mapping: SourceMappingDTO;
  calendars: GoogleCalendarDTO[];
  /** True when the granted scope can list/select calendars. */
  canManageCalendars: boolean;
}

/** Format an ISO timestamp for the "last synced" hint. */
function formatWhen(value: string | null): string {
  if (!value) return 'never';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'never';
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function SourceCalendarRow({
  mapping,
  calendars,
  canManageCalendars,
}: SourceCalendarRowProps) {
  const updateToggles = useUpdateSourceToggles();
  const setTarget = useSetSourceTarget();

  /** Current select value: the mapped calendar id, or empty when unset. */
  const selectValue = useMemo(() => mapping.google_calendar_id || '', [mapping.google_calendar_id]);

  const pickerDisabled = !canManageCalendars || setTarget.isPending;

  const handleTargetChange = (value: string) => {
    if (!value || value === selectValue) return;
    if (value === CREATE_OPTION) {
      setTarget.mutate({ source: mapping.source, body: { mode: 'create' } });
      return;
    }
    const chosen = calendars.find((c) => c.id === value);
    setTarget.mutate({
      source: mapping.source,
      body: { mode: 'existing', calendar_id: value, calendar_summary: chosen?.summary },
    });
  };

  const handleToggle = (flag: 'sync_enabled' | 'push_enabled' | 'pull_enabled', next: boolean) => {
    updateToggles.mutate([{ source: mapping.source, [flag]: next }]);
  };

  return (
    <div className="calendar-sync-source-row">
      <div className="calendar-sync-source-head">
        <span className="calendar-sync-source-label">{mapping.label}</span>
        <SyncNowButton source={mapping.source} disabled={!mapping.sync_enabled} />
      </div>

      <div className="calendar-sync-source-body">
        <div className="calendar-sync-field">
          <label className="calendar-sync-field-label">Target calendar</label>
          {canManageCalendars ? (
            <select
              className="input-field"
              value={selectValue}
              onChange={(e) => handleTargetChange(e.target.value)}
              disabled={pickerDisabled}
            >
              {!selectValue ? <option value="">Select a calendar…</option> : null}
              {/* Ensure the currently-mapped calendar is always selectable even
                  if it's not in the fetched list (e.g. app-created). */}
              {selectValue && !calendars.some((c) => c.id === selectValue) ? (
                <option value={selectValue}>{mapping.calendar_summary || selectValue}</option>
              ) : null}
              {calendars.map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.summary}
                  {cal.primary ? ' (primary)' : ''}
                </option>
              ))}
              <option value={CREATE_OPTION}>➕ Create a Wealth Builder calendar</option>
            </select>
          ) : (
            <div className="calendar-sync-field-hint">
              {mapping.calendar_summary || 'Reconnect Google to choose a calendar.'}
            </div>
          )}
        </div>

        <div className="calendar-sync-toggles">
          <label className="calendar-sync-toggle">
            <input
              type="checkbox"
              checked={mapping.sync_enabled}
              onChange={(e) => handleToggle('sync_enabled', e.target.checked)}
              disabled={updateToggles.isPending}
            />
            <span>Enabled</span>
          </label>
          <label className="calendar-sync-toggle">
            <input
              type="checkbox"
              checked={mapping.push_enabled}
              onChange={(e) => handleToggle('push_enabled', e.target.checked)}
              disabled={updateToggles.isPending || !mapping.sync_enabled}
            />
            <span>Push to Google</span>
          </label>
          <label className="calendar-sync-toggle">
            <input
              type="checkbox"
              checked={mapping.pull_enabled}
              onChange={(e) => handleToggle('pull_enabled', e.target.checked)}
              disabled={updateToggles.isPending || !mapping.sync_enabled}
            />
            <span>Pull from Google</span>
          </label>
        </div>
      </div>

      <div className="calendar-sync-source-meta">
        <span>Last pushed: {formatWhen(mapping.last_pushed_at)}</span>
        <span>Last pulled: {formatWhen(mapping.last_pulled_at)}</span>
      </div>
    </div>
  );
}
