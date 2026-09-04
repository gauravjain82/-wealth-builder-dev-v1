/**
 * Top-level Calendar Sync section, embedded as a glass-section in the Settings
 * page. Composes the connection card, the four per-source rows, and an
 * all-sources "Sync now". Owns its own data via the TanStack hooks and handles
 * the `?google_connected=1` OAuth return.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/store';
import {
  calendarSyncKeys,
  useCalendarSyncSettings,
  useCalendarSyncStatus,
  useDisconnectGoogle,
  useGoogleCalendars,
} from '../hooks/use-calendar-sync';
import { calendarSyncService } from '../services/calendar-sync-service';
import { CalendarConnectionCard } from './calendar-connection-card';
import { SourceCalendarRow } from './source-calendar-row';
import { SyncNowButton } from './sync-now-button';
import './calendar-sync-section.css';

export function CalendarSyncSection() {
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [connecting, setConnecting] = useState(false);

  const statusQuery = useCalendarSyncStatus();
  const settingsQuery = useCalendarSyncSettings();
  const status = statusQuery.data;
  const connected = Boolean(status?.connected);
  const canManage = Boolean(status?.can_manage_calendars) && !status?.needs_reconsent;
  const calendarsQuery = useGoogleCalendars(connected && canManage);
  const disconnect = useDisconnectGoogle();

  // Handle the Google OAuth return: refresh status and clean the URL.
  useEffect(() => {
    if (searchParams.get('google_connected') !== '1') return;
    void queryClient.invalidateQueries({ queryKey: calendarSyncKeys.root });
    addToast({ type: 'success', message: 'Google Calendar connected.' });
    const next = new URLSearchParams(searchParams);
    next.delete('google_connected');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, queryClient, addToast]);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const { authorization_url } = await calendarSyncService.startGoogleOAuth(
        '/settings#settings-calendar-sync',
      );
      window.location.href = authorization_url;
    } catch (error) {
      setConnecting(false);
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to start Google connection.',
      });
    }
  };

  const sources = settingsQuery.data ?? [];
  const calendars = calendarsQuery.data ?? [];

  return (
    <div className="glass-section" id="settings-calendar-sync">
      <div className="section-header">
        <h3 className="section-title">
          <span className="title-icon">📆</span>
          Calendar Sync
        </h3>
        {connected ? <SyncNowButton disabled={statusQuery.isLoading} /> : null}
      </div>

      <div className="calendar-sync-content">
        <CalendarConnectionCard
          status={status}
          busy={connecting || disconnect.isPending || statusQuery.isLoading}
          onConnect={() => void handleConnect()}
          onDisconnect={() => disconnect.mutate()}
        />

        {statusQuery.isLoading ? (
          <div className="calendar-sync-empty">Loading calendar sync…</div>
        ) : !connected ? null : settingsQuery.isLoading ? (
          <div className="calendar-sync-empty">Loading sources…</div>
        ) : sources.length === 0 ? (
          <div className="calendar-sync-empty">No sync sources available for your account.</div>
        ) : (
          <div className="calendar-sync-sources">
            {calendarsQuery.isError && canManage ? (
              <div className="calendar-sync-empty">
                Couldn’t load your Google calendars. You can still toggle sync; try again shortly.
              </div>
            ) : null}
            {sources.map((mapping) => (
              <SourceCalendarRow
                key={mapping.source}
                mapping={mapping}
                calendars={calendars}
                canManageCalendars={canManage}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
