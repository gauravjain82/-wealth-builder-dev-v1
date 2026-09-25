import { useCallback, useEffect, useState } from 'react';
import { Button, LoadingState, Modal, QrCode, Text } from '@shared/components';
import { bpmService } from '../services/bpm-service';
import type { BPMQrToken } from '../types';

interface MyQrCodeModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * "My QR Code" — the code a host scans to check the viewer into a BPM.
 *
 * Deliberately large: it is read off a phone screen by a camera held by somebody
 * else, in a room, and a small square photographs badly.
 *
 * **Everything is fetched on open, nothing is cached in a parent.** `Modal`
 * unmounts its children when closed (`if (!open) return null`), so state inside
 * one is lost every time it closes — see §6.6. That is exactly right here: the
 * token can be reissued from this very modal, so re-reading it on open is also
 * how the square stays truthful after a regenerate in another tab.
 */
export function MyQrCodeModal({ open, onClose }: MyQrCodeModalProps) {
  const [code, setCode] = useState<BPMQrToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCode(await bpmService.myQrIdentity());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your QR code');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const regenerate = async () => {
    setBusy(true);
    setError(null);
    try {
      setCode(await bpmService.regenerateQrIdentity());
      setConfirmingReset(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reissue your QR code');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="My QR Code" contentClassName="max-w-[520px]">
      <div className="flex flex-col items-center gap-4 py-2">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <div className="w-full rounded-lg border border-red-300 bg-red-50 px-3 py-2 dark:border-red-500/30 dark:bg-red-500/10">
            <Text className="text-sm font-medium">{error}</Text>
          </div>
        ) : code ? (
          <>
            {/* 300px: read by another person's camera across a table. */}
            <QrCode
              value={code.token}
              size={300}
              alt="My check-in QR code"
              fallbackText="QR code unavailable — ask to be checked in by name."
            />
            <p className="text-center text-base font-semibold text-slate-900 dark:text-white">
              {code.label}
            </p>
            <Text variant="muted" className="max-w-sm text-center text-xs">
              Show this at a BPM and the host scans it to check you in. It is the same code
              every time, so you can screenshot it.
            </Text>
          </>
        ) : null}

        {code ? (
          <div className="w-full border-t border-slate-200 pt-4 dark:border-white/10">
            {confirmingReset ? (
              <div className="space-y-2">
                <Text className="text-sm">
                  Reissuing gives you a new code and stops the old one working immediately.
                  Any screenshot you have shared will stop checking you in. Nobody else's
                  code is affected.
                </Text>
                <div className="flex gap-2">
                  <Button type="button" disabled={busy} onClick={() => void regenerate()}>
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
                Reissue my code
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
