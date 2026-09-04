/**
 * On-demand "Sync now" trigger.
 *
 * Two shapes: a per-source button (pass `source`) and an all-sources button
 * (omit `source`). Both delegate to the sync hooks, which toast a result
 * summary; this component only manages the click + in-flight state.
 */
import { RefreshCw } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { useSyncAll, useSyncSource } from '../hooks/use-calendar-sync';
import type { CalendarSource } from '../types';

interface SyncNowButtonProps {
  /** When provided, syncs a single source; otherwise syncs all sources. */
  source?: CalendarSource;
  disabled?: boolean;
  label?: string;
}

export function SyncNowButton({ source, disabled = false, label }: SyncNowButtonProps) {
  const syncSource = useSyncSource();
  const syncAll = useSyncAll();
  const pending = source ? syncSource.isPending : syncAll.isPending;

  const handleClick = () => {
    if (source) syncSource.mutate(source);
    else syncAll.mutate();
  };

  return (
    <Button
      variant={source ? 'outline' : 'default'}
      size="sm"
      onClick={handleClick}
      disabled={disabled || pending}
    >
      <RefreshCw size={15} className={pending ? 'calendar-sync-spin' : undefined} />
      {pending ? 'Syncing…' : label || (source ? 'Sync' : 'Sync all now')}
    </Button>
  );
}
