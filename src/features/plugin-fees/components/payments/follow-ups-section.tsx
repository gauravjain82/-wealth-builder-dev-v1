/**
 * Payment follow-ups (D19a): opened when automatic retries are exhausted or a self-pay
 * invoice goes overdue. `:review` and `:manage` read; only `:manage` resolves, with a
 * required note. A follow-up also resolves itself when its invoice is paid.
 * Screens: `docs/plugin-fees/UI.md` §2.9.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button, ConfirmationDialog, ErrorState, NonIdealState, Select, Textarea } from '@/shared/components';
import { useToastStore } from '@/store';

import { useFollowUps, useResolveFollowUp } from '../../hooks/use-plugin-fees';
import { PluginFeesError } from '../../services/plugin-fees-service';
import type { FollowUp, FollowUpStatusFilter } from '../../types';
import {
  describeError,
  formatDateTime,
  formatMoney,
  formatMonthShort,
  humanize,
} from '../../utils/plugin-fees-format';
import { StatusBadge } from '../submission-parts';

const REASON_LABEL: Record<string, string> = {
  retries_exhausted: 'Retries exhausted',
  self_pay_overdue: 'Self-pay overdue',
};

const followUpReasonLabel = (reason: string) => REASON_LABEL[reason] ?? humanize(reason);

const STATUS_OPTIONS: { value: FollowUpStatusFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All' },
];

function ResolveDialog({
  followUp,
  loading,
  onConfirm,
  onClose,
}: {
  followUp: FollowUp | null;
  loading: boolean;
  onConfirm: (note: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  useEffect(() => {
    if (followUp) setNote('');
  }, [followUp]);
  if (!followUp) return null;

  return (
    <ConfirmationDialog
      open
      title="Resolve follow-up"
      message={`${followUp.agent.name || 'This agent'} · ${formatMonthShort(followUp.month)} · ${formatMoney(
        followUp.amount_cents
      )} · ${followUpReasonLabel(followUp.reason)}. Resolving records your note; it does not change the invoice.`}
      confirmText="Resolve"
      confirmVariant="default"
      confirmDisabled={!note.trim()}
      loading={loading}
      onConfirm={() => onConfirm(note.trim())}
      onClose={onClose}
    >
      <label className="block space-y-1 text-sm">
        <span className="text-slate-700 dark:text-white/80">What was done? (required)</span>
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          required
          aria-required="true"
          placeholder="e.g. Called the agent, paying Friday"
          disabled={loading}
        />
      </label>
    </ConfirmationDialog>
  );
}

export function FollowUpsSection({ canResolve }: { canResolve: boolean }) {
  const { addToast } = useToastStore();
  const [status, setStatus] = useState<FollowUpStatusFilter>('open');
  const [resolving, setResolving] = useState<FollowUp | null>(null);
  const followUps = useFollowUps(status);
  const resolve = useResolveFollowUp();
  const items = followUps.data ?? [];

  const onResolve = async (note: string) => {
    if (!resolving) return;
    try {
      await resolve.mutateAsync({ id: resolving.id, note });
      addToast({ type: 'success', message: 'Follow-up resolved.' });
      setResolving(null);
    } catch (error) {
      if (error instanceof PluginFeesError && (error.code === 'already_resolved' || error.status === 409)) {
        addToast({ type: 'warning', message: describeError(error, 'This follow-up was already resolved.') });
        setResolving(null);
        void followUps.refetch();
        return;
      }
      addToast({
        type: 'error',
        message:
          error instanceof PluginFeesError && error.code === 'note_required'
            ? 'A note is required to resolve a follow-up.'
            : describeError(error, 'Failed to resolve the follow-up.'),
      });
    }
  };

  return (
    <section className="wb-pf-card" aria-labelledby="wb-pf-followups-heading">
      <div className="wb-pf-card-header">
        <h2 id="wb-pf-followups-heading" className="wb-pf-subheading">
          Follow-ups
        </h2>
        <div className="wb-pf-row">
          <Select
            aria-label="Follow-up status"
            value={status}
            onChange={(event) => setStatus(event.target.value as FollowUpStatusFilter)}
            className="w-auto min-w-[8rem]"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          {followUps.data ? <span className="wb-pf-muted">{items.length.toLocaleString()}</span> : null}
        </div>
      </div>
      <p className="wb-pf-muted" style={{ margin: 0 }}>
        Opened when automatic retries are exhausted or a self-pay invoice goes overdue. Across all
        months. A follow-up closes itself when its invoice is paid.
      </p>

      {followUps.isLoading ? (
        <p className="wb-pf-muted">Loading…</p>
      ) : followUps.isError ? (
        <ErrorState
          description={describeError(followUps.error, 'Unable to load follow-ups.')}
          onRetry={() => void followUps.refetch()}
        />
      ) : !items.length ? (
        <NonIdealState
          title="No follow-ups"
          description={status === 'open' ? 'Nothing needs following up.' : 'No follow-ups with this status.'}
        />
      ) : (
        <div className="wb-pf-table-wrap">
          <table className="wb-pf-table wb-pf-table--dense">
            <thead>
              <tr>
                <th scope="col">Reason</th>
                <th scope="col">Agent</th>
                <th scope="col">Month</th>
                <th scope="col" className="wb-pf-num">
                  Amount
                </th>
                <th scope="col">Opened</th>
                <th scope="col">Resolved</th>
                <th scope="col">Note</th>
                {canResolve ? (
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const open = !item.resolved_at;
                return (
                  <tr key={item.id}>
                    <td>
                      <StatusBadge
                        status={item.reason}
                        label={followUpReasonLabel(item.reason)}
                        tone={item.reason === 'retries_exhausted' ? 'rejected' : 'pending'}
                      />
                    </td>
                    <td>
                      <Link
                        to={`/admin/plugin-fees/agents/${item.agent.id}/statement`}
                        state={{ backTo: '/admin/plugin-fees/payments', backLabel: 'Payments' }}
                        className="wb-pf-link"
                      >
                        {item.agent.name || '—'}
                      </Link>
                      <span className="wb-pf-muted" style={{ display: 'block' }}>
                        {item.agent.agency_code || '—'}
                      </span>
                    </td>
                    <td>{formatMonthShort(item.month)}</td>
                    <td className="wb-pf-num">{formatMoney(item.amount_cents)}</td>
                    <td>{formatDateTime(item.opened_at)}</td>
                    <td>
                      {open ? (
                        <StatusBadge status="open" label="Open" tone="pending" />
                      ) : (
                        <span>
                          {formatDateTime(item.resolved_at)}
                          <span className="wb-pf-muted" style={{ display: 'block' }}>
                            {item.resolved_by || 'Automatically'}
                          </span>
                        </span>
                      )}
                    </td>
                    <td>{item.note ? <span className="wb-pf-note-cell">{item.note}</span> : '—'}</td>
                    {canResolve ? (
                      <td>
                        {open ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setResolving(item)}
                            disabled={resolve.isPending}
                          >
                            Resolve…
                          </Button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {canResolve ? (
        <ResolveDialog
          followUp={resolving}
          loading={resolve.isPending}
          onConfirm={onResolve}
          onClose={() => setResolving(null)}
        />
      ) : null}
    </section>
  );
}
