import { useCallback, useState } from 'react';
import { doorErrorOf, doorService } from '../services/door-service';
import type { LinkAccountPayload, LinkAccountResult } from '../types/door';

type LinkRequest = Omit<LinkAccountPayload, 'session_id' | 'confirm_without_contact_match'>;

/**
 * Link-account-and-admit at a door. Wraps `POST .../checkin/link/` and the one
 * refusal staff may override: `no_contact_match` (neither email nor phone
 * matches), which is held in `idCheck` until staff confirm they checked photo
 * ID — never retried silently.
 *
 * `sessionId` routes the admission into that session instead of the desk.
 */
export function useAccountLink(eventId: number, sessionId?: number | null) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idCheck, setIdCheck] = useState<{ request: LinkRequest; message: string } | null>(null);

  const send = useCallback(
    async (request: LinkRequest, confirmed: boolean): Promise<LinkAccountResult | null> => {
      setBusy(true);
      setError(null);
      try {
        const result = await doorService.linkAccount(eventId, {
          ...request,
          ...(confirmed ? { confirm_without_contact_match: true } : {}),
          ...(sessionId != null ? { session_id: sessionId } : {}),
        });
        setIdCheck(null);
        return result;
      } catch (err) {
        const door = doorErrorOf(err);
        const message = err instanceof Error ? err.message : 'Could not link the account.';
        if (door?.code === 'no_contact_match' && door.overridable && !confirmed) {
          setIdCheck({ request, message });
        } else {
          setIdCheck(null);
          setError(message);
        }
        return null;
      } finally {
        setBusy(false);
      }
    },
    [eventId, sessionId],
  );

  /** Link (and admit). Resolves with the result, or null when refused. */
  const link = useCallback((request: LinkRequest) => send(request, false), [send]);

  /** Staff checked photo ID — repeat the held request with the override. */
  const confirmAnyway = useCallback(
    () => (idCheck ? send(idCheck.request, true) : Promise.resolve(null)),
    [idCheck, send],
  );

  const reset = useCallback(() => {
    setError(null);
    setIdCheck(null);
  }, []);

  return { busy, error, idCheck, link, confirmAnyway, reset };
}
