/**
 * Owns the public "manage my tickets" flow (email + invoice number as auth).
 *
 * There is no session: the proof is re-sent with every action, so it is held in
 * hook state after a successful claim. Assign and transfer both return the
 * refreshed claim payload, which is stored directly — no follow-up fetch.
 */

import { useCallback, useState } from 'react';

import { publicEventService } from '../services/public-event-service';
import type { ClaimProof, ClaimResult } from '../types/public';

interface UseTicketClaimResult {
  /** The verified proof, or `null` before a successful claim. */
  proof: ClaimProof | null;
  claim: ClaimResult | null;
  loading: boolean;
  /** Id of the ticket currently being mutated, for per-row spinners. */
  pendingTicketId: number | null;
  error: string | null;
  lookup: (proof: ClaimProof) => Promise<boolean>;
  assign: (
    ticketId: number,
    holder: { first_name: string; last_name: string; holder_email: string; phone?: string },
  ) => Promise<boolean>;
  transfer: (
    ticketId: number,
    recipient: { to_email: string; to_name?: string },
  ) => Promise<boolean>;
  signOut: () => void;
}

export function useTicketClaim(shortcut: string): UseTicketClaimResult {
  const [proof, setProof] = useState<ClaimProof | null>(null);
  const [claim, setClaim] = useState<ClaimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingTicketId, setPendingTicketId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(
    async (next: ClaimProof): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const result = await publicEventService.claimTickets(shortcut, next);
        setClaim(result);
        setProof(next);
        return true;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'We could not find an order for that email and invoice number.',
        );
        setClaim(null);
        setProof(null);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [shortcut],
  );

  /** Run a ticket-scoped mutation, tracking which row is busy. */
  const mutate = useCallback(
    async (
      ticketId: number,
      action: (verified: ClaimProof) => Promise<ClaimResult>,
      fallbackMessage: string,
    ): Promise<boolean> => {
      if (!proof) return false;
      setPendingTicketId(ticketId);
      setError(null);
      try {
        setClaim(await action(proof));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : fallbackMessage);
        return false;
      } finally {
        setPendingTicketId(null);
      }
    },
    [proof],
  );

  const assign = useCallback(
    (
      ticketId: number,
      holder: {
        first_name: string;
        last_name: string;
        holder_email: string;
        phone?: string;
      },
    ) =>
      mutate(
        ticketId,
        (verified) =>
          publicEventService.assignTicket(shortcut, {
            ...verified,
            ticket_id: ticketId,
            ...holder,
          }),
        'Could not assign this ticket.',
      ),
    [mutate, shortcut],
  );

  const transfer = useCallback(
    (ticketId: number, recipient: { to_email: string; to_name?: string }) =>
      mutate(
        ticketId,
        (verified) =>
          publicEventService.transferTicket(shortcut, {
            ...verified,
            ticket_id: ticketId,
            ...recipient,
          }),
        'Could not transfer this ticket.',
      ),
    [mutate, shortcut],
  );

  const signOut = useCallback(() => {
    setProof(null);
    setClaim(null);
    setError(null);
  }, []);

  return {
    proof,
    claim,
    loading,
    pendingTicketId,
    error,
    lookup,
    assign,
    transfer,
    signOut,
  };
}
