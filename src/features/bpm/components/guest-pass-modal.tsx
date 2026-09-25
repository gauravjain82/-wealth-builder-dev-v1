import { useCallback, useEffect, useState } from 'react';
import { Button, LoadingState, Modal, QrCode, Text } from '@shared/components';
import { bpmService } from '../services/bpm-service';
import type { BPMGuest, BPMGuestPass } from '../types';

interface GuestPassModalProps {
  open: boolean;
  onClose: () => void;
  occurrenceId: number | null;
  /** The guest whose pass to show. Null closes the modal on the caller's side. */
  guest: BPMGuest | null;
}

/**
 * One guest's door pass, shown to the **host**.
 *
 * The mirror of `MyQrCodeModal`, and it exists for the case that mirror does not
 * cover: a guest has no account, so the code they are holding lives on a hosted
 * page rather than in this app. When that link never arrived — the wrong number,
 * a spam folder, a phone left at home — this is how somebody at the door produces
 * the same code on their own screen.
 *
 * It shows the **link as well as the square**, because those solve different
 * problems: the square gets this guest in tonight, and the link is what to send
 * so it works next time.
 *
 * Everything is fetched on open and nothing cached in a parent — `Modal` unmounts
 * its children when closed (§6.6), and re-reading is also how the square stays
 * truthful after a reissue somewhere else.
 */
export function GuestPassModal({ open, onClose, occurrenceId, guest }: GuestPassModalProps) {
  const [pass, setPass] = useState<BPMGuestPass | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(
    async (regenerate = false) => {
      if (!occurrenceId || !guest) return;
      if (regenerate) setBusy(true);
      else setLoading(true);
      setError(null);
      try {
        setPass(await bpmService.guestPass(occurrenceId, guest.id, regenerate));
        setConfirmingReset(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load this pass');
      } finally {
        setLoading(false);
        setBusy(false);
      }
    },
    [occurrenceId, guest],
  );

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const copyLink = async () => {
    if (!pass) return;
    try {
      await navigator.clipboard.writeText(pass.url);
      setCopied(true);
    } catch {
      // A blocked clipboard is not worth an error state — the link is on screen
      // and selectable, which is the fallback either way.
      setCopied(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Pass for ${guest?.prospect_detail?.name || 'guest'}`}
      contentClassName="max-w-[520px]"
    >
      <div className="flex flex-col items-center gap-4 py-2">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <div className="w-full rounded-lg border border-red-300 bg-red-50 px-3 py-2 dark:border-red-500/30 dark:bg-red-500/10">
            <Text className="text-sm font-medium">{error}</Text>
          </div>
        ) : pass ? (
          <>
            {/* 300px: read by another person's camera across a table. */}
            <QrCode
              value={pass.token}
              size={300}
              alt={`Check-in code for ${guest?.prospect_detail?.name || 'guest'}`}
              fallbackText="QR code unavailable — check this guest in from the list instead."
            />
            <p className="text-center text-base font-semibold text-slate-900 dark:text-white">
              {pass.label}
            </p>
            <Text variant="muted" className="max-w-sm text-center text-xs">
              Scan this to check them in. It is the same code every time, and it is the one
              behind the link they were sent.
            </Text>

            <div className="w-full rounded-lg bg-slate-50 px-3 py-2 dark:bg-white/5">
              <p className="break-all text-xs text-slate-600 dark:text-white/70">{pass.url}</p>
              <div className="mt-2 flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => void copyLink()}>
                  {copied ? 'Copied' : 'Copy link'}
                </Button>
              </div>
            </div>
          </>
        ) : null}

        {pass ? (
          <div className="w-full border-t border-slate-200 pt-4 dark:border-white/10">
            {confirmingReset ? (
              <div className="space-y-2">
                <Text className="text-sm">
                  Reissuing gives this guest a new pass and stops the old one working
                  immediately — including the link already in their inbox, so send it again
                  afterwards. Nobody else&rsquo;s pass is affected.
                </Text>
                <div className="flex gap-2">
                  <Button type="button" disabled={busy} onClick={() => void load(true)}>
                    {busy ? 'Reissuing…' : 'Yes, reissue it'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setConfirmingReset(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => setConfirmingReset(true)}>
                Reissue this pass
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
