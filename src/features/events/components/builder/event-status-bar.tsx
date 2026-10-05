import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, ConfirmationDialog, Text } from '@shared/components';
import { useToastStore } from '@/store';
import { configService } from '../../services/config-service';
import type { BigEvent } from '../../types/event';

const STATUS_VARIANT: Record<BigEvent['status'], 'secondary' | 'success' | 'outline'> = {
  DRAFT: 'secondary',
  PUBLISHED: 'success',
  ARCHIVED: 'outline',
};

const STATUS_LABEL: Record<BigEvent['status'], string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

type Pending = 'publish-without-price' | 'unpublish' | null;

/**
 * Status, public link and Publish / Unpublish for the event builder.
 *
 * Publish stays disabled while required fields are blank (the backend rejects
 * it too). Publishing an event with no ticket price is allowed but confirmed
 * first, because buyers would see the page and be unable to check out.
 * Unpublishing hides the public page and checkout; orders and tickets stay.
 */
export function EventStatusBar({
  event,
  missingRequiredFields,
  busy,
  onChangeStatus,
}: {
  event: BigEvent;
  missingRequiredFields: string[];
  busy: boolean;
  onChangeStatus: (action: 'publish' | 'unpublish') => Promise<void>;
}) {
  const addToast = useToastStore((s) => s.addToast);
  const [pending, setPending] = useState<Pending>(null);
  const [checking, setChecking] = useState(false);

  const isPublished = event.status === 'PUBLISHED';
  const publicPath = `/event/${event.shortcut}`;

  const run = async (action: 'publish' | 'unpublish') => {
    try {
      await onChangeStatus(action);
      addToast({
        type: 'success',
        message: action === 'publish' ? 'Event published — the public page is live.' : 'Event moved back to draft.',
      });
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Could not update the event.' });
    } finally {
      setPending(null);
    }
  };

  const publish = async () => {
    setChecking(true);
    try {
      const tiers = await configService.listPricingTiers(event.id);
      if (tiers.length === 0) {
        setPending('publish-without-price');
        return;
      }
    } catch {
      // Can't tell — let the publish go ahead rather than block on a lookup.
    } finally {
      setChecking(false);
    }
    await run('publish');
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3 dark:border-white/10">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={STATUS_VARIANT[event.status]}>{STATUS_LABEL[event.status]}</Badge>
        {isPublished ? (
          <Link
            to={publicPath}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            {window.location.origin}
            {publicPath} ↗
          </Link>
        ) : (
          <Text variant="muted" className="text-sm">
            {event.status === 'ARCHIVED'
              ? 'Archived — hidden from the public. Publish to bring it back.'
              : 'Draft — only visible here until you publish.'}
          </Text>
        )}
      </div>

      <div className="flex gap-2">
        {isPublished ? (
          <Button type="button" variant="outline" onClick={() => setPending('unpublish')} disabled={busy}>
            Unpublish
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => void publish()}
            disabled={busy || checking || missingRequiredFields.length > 0}
            title={missingRequiredFields.length > 0 ? 'Fill in the required fields first' : undefined}
          >
            {checking || busy ? 'Working…' : 'Publish event'}
          </Button>
        )}
      </div>

      <ConfirmationDialog
        open={pending !== null}
        title={pending === 'unpublish' ? 'Unpublish this event?' : 'No ticket price yet'}
        message={
          pending === 'unpublish'
            ? 'The public page and checkout will stop working until you publish again. Existing orders and tickets are kept.'
            : 'This event has no ticket price, so buyers will see the page but cannot check out. Publish anyway?'
        }
        confirmText={pending === 'unpublish' ? 'Unpublish' : 'Publish anyway'}
        confirmVariant={pending === 'unpublish' ? 'destructive' : undefined}
        loading={busy}
        onConfirm={() => run(pending === 'unpublish' ? 'unpublish' : 'publish')}
        onClose={() => setPending(null)}
      />
    </div>
  );
}
