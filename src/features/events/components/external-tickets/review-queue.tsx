import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, ErrorState, Input, Label, LoadingState, Modal, Select, Text, Textarea } from '@shared/components';
import { externalTicketService } from '../../services/external-ticket-service';
import type { Pagination, ResolvePayload, ReviewItem } from '../../types/external-tickets';
import { errorText } from './labels';
import { Pager } from './shared';

const KIND_LABEL: Record<string, string> = {
  conflict: 'On-site conflict',
  identity_hold: 'Identity hold',
  missing_source: 'Missing from export',
  audit: 'Needs correction',
};

const RESOLUTIONS: Record<string, Array<{ value: ResolvePayload['resolution']; label: string }>> = {
  conflict: [
    { value: 'accept_source', label: 'Keep the provider value' },
    { value: 'retain_staff', label: 'Restore the on-site value' },
    { value: 'reassign', label: 'Link a verified WB account' },
  ],
  identity_hold: [
    { value: 'accept_source', label: 'ID verified for the newly named person — release hold' },
    { value: 'reassign', label: 'Link the verified WB account and release hold' },
  ],
  missing_source: [{ value: 'acknowledge', label: 'Acknowledge (the ticket stays active)' }],
  audit: [{ value: 'acknowledge', label: 'Acknowledge' }],
};

const show = (record: Record<string, unknown>) =>
  Object.entries(record)
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v === '' || v === null ? '—' : String(v)}`)
    .join(' · ') || '—';

interface ReviewQueueProps {
  eventId: number;
  rows: ReviewItem[];
  pagination: Pagination | undefined;
  kind: string;
  loading: boolean;
  error: string | null;
  resolving: boolean;
  onKind: (kind: string) => void;
  onPage: (page: number) => void;
  onResolve: (item: ReviewItem, payload: ResolvePayload) => Promise<void>;
}

/** Step 5 — open conflicts, identity holds and missing rows, each with both versions. */
export function ReviewQueue(props: ReviewQueueProps) {
  const { rows, loading, error } = props;
  const [active, setActive] = useState<ReviewItem | null>(null);

  return (
    <div className="space-y-4">
      <Select aria-label="Review type" value={props.kind} onChange={(e) => props.onKind(e.target.value)} className="max-w-[240px]">
        <option value="">All open items</option>
        {Object.entries(KIND_LABEL).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </Select>
      {loading && !rows.length ? (
        <LoadingState />
      ) : error ? (
        <ErrorState description={error} />
      ) : rows.length === 0 ? (
        <Text variant="muted">Nothing needs review.</Text>
      ) : (
        <div className="space-y-3">
          {rows.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-col gap-2 p-4 text-sm md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <p className="font-semibold">
                    {KIND_LABEL[item.kind] ?? item.kind} · <span className="font-mono">{item.confirmation}</span>
                  </p>
                  <Text variant="muted" className="text-xs">{new Date(item.created_at).toLocaleString()}</Text>
                  {Object.keys(item.before).length ? <p><span className="text-slate-500">Before:</span> {show(item.before)}</p> : null}
                  {Object.keys(item.after).length ? <p><span className="text-slate-500">Now:</span> {show(item.after)}</p> : null}
                  <p className="text-slate-600 dark:text-slate-300">{item.reason}</p>
                </div>
                <Button variant="outline" onClick={() => setActive(item)}>Resolve</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Pager pagination={props.pagination} onPage={props.onPage} />
      <ResolveModal eventId={props.eventId} item={active} submitting={props.resolving} onClose={() => setActive(null)}
        onSubmit={async (payload) => {
          if (!active) return;
          await props.onResolve(active, payload);
          setActive(null);
        }}
      />
    </div>
  );
}

interface ResolveModalProps {
  eventId: number;
  item: ReviewItem | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: ResolvePayload) => Promise<void>;
}

function ResolveModal({ eventId, item, submitting, onClose, onSubmit }: ResolveModalProps) {
  const options = item ? RESOLUTIONS[item.kind] ?? [] : [];
  const [resolution, setResolution] = useState<ResolvePayload['resolution'] | ''>('');
  const [reason, setReason] = useState('');
  const [q, setQ] = useState('');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const search = useQuery({
    queryKey: ['external-tickets', eventId, 'resolve-search', q.trim()],
    queryFn: ({ signal }) => externalTicketService.searchAccounts(eventId, q.trim(), signal),
    enabled: resolution === 'reassign' && q.trim().length >= 2,
  });
  if (!item) return null;
  const reset = () => {
    setResolution('');
    setReason('');
    setQ('');
    setAccountId(null);
    setError(null);
    onClose();
  };
  return (
    <Modal open={Boolean(item)} onClose={reset} title={`Resolve ${KIND_LABEL[item.kind] ?? item.kind}`} subtitle={item.confirmation} className="max-w-xl">
      <div className="space-y-4 text-sm">
        <fieldset className="space-y-2">
          <legend className="mb-1 font-medium">Decision</legend>
          {options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2">
              <input type="radio" name="resolution" value={opt.value} checked={resolution === opt.value} onChange={() => setResolution(opt.value)} />
              {opt.label}
            </label>
          ))}
        </fieldset>
        {resolution === 'reassign' ? (
          <div className="space-y-2">
            <Label htmlFor="resolve-search">Verified account</Label>
            <Input id="resolve-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or agency code" />
            <Select aria-label="Account" value={accountId ?? ''} onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Select…</option>
              {search.data?.rows.map((hit) => (
                <option key={hit.id} value={hit.id}>
                  {hit.full_name}{hit.agency_code ? ` · ${hit.agency_code}` : ''} ({hit.is_agent ? 'agent' : 'prospect'})
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        <div>
          <Label htmlFor="resolve-reason">Reason (required)</Label>
          <Textarea id="resolve-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        {error ? <Text className="text-red-600" role="alert">{error}</Text> : null}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={reset}>Cancel</Button>
          <Button
            disabled={!resolution || !reason.trim() || submitting || (resolution === 'reassign' && !accountId)}
            onClick={async () => {
              if (!resolution) return;
              setError(null);
              try {
                await onSubmit({ resolution, reason, expected_revision: item.revision, account_id: accountId });
                reset();
              } catch (err) {
                setError(errorText(err));
              }
            }}
          >
            {submitting ? 'Saving…' : 'Resolve'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
