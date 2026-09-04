/**
 * Google connection header for the Calendar Sync section.
 *
 * Shows the connected account / not-connected state, a Connect or Disconnect
 * action, and a prominent re-consent banner when the stored credential predates
 * the full `calendar` scope (required for calendar selection + two-way sync).
 */
import { CalendarCheck, PlugZap, TriangleAlert, Unplug } from 'lucide-react';
import { Button } from '@shared/components/ui';
import type { CalendarSyncStatus } from '../types';

interface CalendarConnectionCardProps {
  status: CalendarSyncStatus | null | undefined;
  /** True while a connect/disconnect action is in flight. */
  busy?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function CalendarConnectionCard({
  status,
  busy = false,
  onConnect,
  onDisconnect,
}: CalendarConnectionCardProps) {
  const connected = Boolean(status?.connected);
  const needsReconsent = Boolean(status?.needs_reconsent);

  return (
    <div className="calendar-sync-connection">
      <div className="calendar-sync-connection-main">
        <CalendarCheck size={20} className="calendar-sync-connection-icon" />
        <div className="calendar-sync-connection-copy">
          <span className="calendar-sync-connection-title">Google Calendar</span>
          <span className="calendar-sync-connection-status">
            {connected
              ? `Connected as ${status?.google_email || 'Google account'}`
              : 'Connect to sync your appointments, BPM, and events across calendars.'}
          </span>
        </div>
        <div className="calendar-sync-connection-actions">
          {connected ? (
            <Button variant="outline" size="sm" onClick={onDisconnect} disabled={busy}>
              <Unplug size={15} /> Disconnect
            </Button>
          ) : (
            <Button size="sm" onClick={onConnect} disabled={busy}>
              <PlugZap size={15} /> Connect
            </Button>
          )}
        </div>
      </div>

      {connected && needsReconsent ? (
        <div className="calendar-sync-reconsent">
          <TriangleAlert size={16} className="calendar-sync-reconsent-icon" />
          <div className="calendar-sync-reconsent-copy">
            <strong>Reconnect required.</strong> To choose which calendar each source syncs to and
            enable two-way sync, reconnect Google. This grants full calendar access so the app can
            list your calendars, create dedicated calendars, and read events for availability.
            <div className="calendar-sync-reconsent-action">
              <Button size="sm" onClick={onConnect} disabled={busy}>
                <PlugZap size={15} /> Reconnect Google
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
