import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Checkbox, Input, Label, Modal, Text, Textarea } from '@shared/components';
import { externalTicketService } from '../../services/external-ticket-service';
import type { AccountMap, AccountSearchHit, DecidePayload } from '../../types/external-tickets';
import { MapStateBadge } from './shared';

const ROLE_LABEL: Record<AccountMap['role'], string> = {
  sponsor: 'Sponsor (SMD/CEO)',
  ticket_holder: 'Original ticket holder',
  transfer_recipient: 'Transfer recipient (current attendee)',
};

interface MapReviewModalProps {
  eventId: number;
  map: AccountMap | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: DecidePayload) => void;
}

/**
 * Confirm, correct or ignore one relationship. Search covers agents AND
 * prospects; a suggestion is only ever a starting point — the server still
 * validates the revision and the whole group.
 */
export function MapReviewModal({ eventId, map, submitting, error, onClose, onSubmit }: MapReviewModalProps) {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState<AccountSearchHit | null>(null);
  const [reason, setReason] = useState('');
  const [rememberAlias, setRememberAlias] = useState(true);
  const [group, setGroup] = useState(true);

  useEffect(() => {
    if (!map) return;
    setQ(map.source_name);
    setDebounced(map.source_name);
    setSelected(null);
    setReason('');
    setRememberAlias(true);
    setGroup(true);
  }, [map]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(timer);
  }, [q]);

  // react-query aborts the superseded request, so a slow old search can never
  // overwrite the results of the current one.
  const search = useQuery({
    queryKey: ['external-tickets', eventId, 'account-search', debounced],
    queryFn: ({ signal }) => externalTicketService.searchAccounts(eventId, debounced, signal),
    enabled: Boolean(map) && debounced.length >= 2,
  });

  if (!map) return null;
  const decide = (accountId: number | null) =>
    onSubmit({
      account_id: accountId,
      expected_revision: map.revision,
      reason,
      remember_alias: rememberAlias,
      scope: group ? 'group' : 'single',
    });

  return (
    <Modal open={Boolean(map)} onClose={onClose} title="Review identity" subtitle={ROLE_LABEL[map.role]} className="max-w-2xl">
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
          <Text className="font-semibold">{map.source_name}</Text>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <MapStateBadge state={map.state} />
            {map.account ? <Text variant="muted">Currently: {map.account.full_name}</Text> : null}
            {map.state === 'provisional' ? <Text variant="muted">Suggested at {map.confidence}% — not yet confirmed</Text> : null}
          </div>
          {map.warnings.length ? (
            <Text variant="muted" className="mt-1 text-xs">
              Notes: {map.warnings.map((w) => w.replace(/_/g, ' ')).join(', ')}
            </Text>
          ) : null}
        </div>

        <div>
          <Label htmlFor="intake-account-search">Search WB accounts (agents and prospects)</Label>
          <Input id="intake-account-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, agency code or email" />
        </div>
        <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 dark:border-white/10" role="listbox" aria-label="Matching accounts">
          {search.isFetching && !search.data ? <Text variant="muted" className="p-3">Searching…</Text> : null}
          {search.isError ? <Text className="p-3 text-red-600">Search failed.</Text> : null}
          {search.data?.rows.length === 0 ? <Text variant="muted" className="p-3">No accounts found.</Text> : null}
          {search.data?.rows.map((hit) => (
            <button
              key={hit.id}
              type="button"
              role="option"
              aria-selected={selected?.id === hit.id}
              onClick={() => setSelected(hit)}
              className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 dark:border-white/5 ${
                selected?.id === hit.id ? 'bg-amber-50 dark:bg-white/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              <span>
                <span className="font-medium">{hit.full_name}</span>
                {hit.agency_code ? <span className="text-slate-500"> · {hit.agency_code}</span> : null}
                {hit.email_hint ? <span className="block text-xs text-slate-500">{hit.email_hint}</span> : null}
              </span>
              <span className="text-xs text-slate-500">
                {hit.is_agent ? 'Agent' : 'Prospect'}
                {hit.is_active ? '' : ' · inactive'}
              </span>
            </button>
          ))}
        </div>

        <div>
          <Label htmlFor="intake-reason">Reason (kept in the audit history)</Label>
          <Textarea id="intake-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={group} onChange={(e) => setGroup(e.target.checked)} />
            Apply to every row with this same exported name in this file
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={rememberAlias} onChange={(e) => setRememberAlias(e.target.checked)} />
            Remember this for future exports
          </label>
        </div>
        {error ? <Text className="text-sm text-red-600" role="alert">{error}</Text> : null}

        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="outline" disabled={submitting} onClick={() => decide(null)}>
            Not a WB account
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button disabled={!selected || submitting} onClick={() => selected && decide(selected.id)}>
              {submitting ? 'Saving…' : selected ? `Confirm ${selected.full_name}` : 'Select an account'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
