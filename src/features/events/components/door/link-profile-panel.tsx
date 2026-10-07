import { useState } from 'react';
import { Button, Input, Text } from '@shared/components';
import { CheckinCameraScanner } from '../checkin-camera-scanner';
import { DoorIdCheckPrompt } from './door-id-check-prompt';
import { useAccountLink } from '../../hooks/use-account-link';
import { isCameraScanSupported } from '../../utils/checkin-scan';
import type { LinkAccountResult } from '../../types/door';

interface LinkProfilePanelProps {
  eventId: number;
  ticketId: number;
  holderName: string;
  onLinked: (result: LinkAccountResult) => void;
  onCancel: () => void;
}

/**
 * After a ticket with no linked account is admitted: scan the attendee's
 * profile QR to link it, so their sessions, schedule and reviews follow them.
 * Reuses the shared camera scanner; a hardware scanner or typing works too.
 */
export function LinkProfilePanel({
  eventId,
  ticketId,
  holderName,
  onLinked,
  onCancel,
}: LinkProfilePanelProps) {
  const link = useAccountLink(eventId);
  const [value, setValue] = useState('');
  const [cameraOn, setCameraOn] = useState(isCameraScanSupported());
  const cameraSupported = isCameraScanSupported();

  const submit = async (raw: string) => {
    const scan = raw.trim();
    if (!scan || link.busy) return;
    const result = await link.link({ ticket_id: ticketId, profile_scan: scan });
    if (result) {
      setValue('');
      onLinked(result);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-sky-300 bg-sky-50 px-3 py-3 dark:border-sky-500/30 dark:bg-sky-500/10">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Link profile QR{holderName ? ` for ${holderName}` : ''}
          </p>
          <Text variant="muted" className="text-xs">
            Scan the profile QR in their app. Email or phone must match the ticket; otherwise you’ll be
            asked to check photo ID.
          </Text>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Close
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={value}
          disabled={link.busy}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void submit(value);
            }
          }}
          placeholder="Scan the profile QR…"
          aria-label="Profile QR"
          autoComplete="off"
          className="min-w-[200px] flex-1"
        />
        <Button type="button" size="sm" disabled={link.busy || !value.trim()} onClick={() => void submit(value)}>
          {link.busy ? 'Linking…' : 'Link'}
        </Button>
        {cameraSupported ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setCameraOn((on) => !on)}>
            {cameraOn ? 'Stop camera' : 'Use camera'}
          </Button>
        ) : null}
      </div>
      {cameraOn ? (
        <CheckinCameraScanner
          paused={link.busy || Boolean(link.idCheck)}
          fallbackHint="Ask them to open their profile QR and use a hardware scanner instead."
          onDetected={(payload) => void submit(payload)}
        />
      ) : null}
      {link.idCheck ? (
        <DoorIdCheckPrompt
          message={link.idCheck.message}
          busy={link.busy}
          onConfirm={() =>
            void link.confirmAnyway().then((result) => {
              if (result) onLinked(result);
            })
          }
          onCancel={link.reset}
        />
      ) : null}
      {link.error ? (
        <Text className="text-sm font-medium text-red-800 dark:text-red-200">{link.error}</Text>
      ) : null}
    </div>
  );
}
