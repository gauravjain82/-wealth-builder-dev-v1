import { CalendarCheck, PlugZap, Unplug } from 'lucide-react';
import { Button } from '@shared/components/ui';
import type { GoogleStatus } from '../types';

interface GoogleSyncCardProps {
  status: GoogleStatus | null;
  busy?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function GoogleSyncCard({ status, busy = false, onConnect, onDisconnect }: GoogleSyncCardProps) {
  return (
    <section className="matchup-panel matchup-google-card">
      <div>
        <CalendarCheck size={20} />
        <div>
          <h2>Google Calendar</h2>
          <p>{status?.connected ? `Connected as ${status.google_email || 'Google account'}` : 'Sync accepted trainer appointments.'}</p>
        </div>
      </div>
      {status?.connected ? (
        <Button variant="outline" size="sm" onClick={onDisconnect} disabled={busy}>
          <Unplug size={15} /> Disconnect
        </Button>
      ) : (
        <Button size="sm" onClick={onConnect} disabled={busy}>
          <PlugZap size={15} /> Connect
        </Button>
      )}
    </section>
  );
}
