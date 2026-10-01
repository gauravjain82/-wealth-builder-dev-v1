/**
 * One review queue tab: status filter, debounced search, DRF pagination (25 per page),
 * the submission cards and their decision dialogs. Parameterised by kind so offices and
 * assistants share the mechanics; the kind-specific parts come in through props.
 */

import { useEffect, useState, type ReactNode } from 'react';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import { Button, ErrorState, Input, NonIdealState, Select } from '@/shared/components';
import { useToastStore } from '@/store';

import { useDebouncedValue } from '../../hooks/use-plugin-fees';
import type { DecisionInput, Paginated, ReviewAgent, ReviewQuery } from '../../types';
import { describeError, isAlreadyDecided } from '../../utils/plugin-fees-format';
import { ApproveDialog, RejectModal } from './decision-dialogs';

const PAGE_SIZE = 25;

export interface ReviewQueueConfig<S extends string, Item, D extends string> {
  noun: string;
  statuses: { value: S; label: string }[];
  defaultStatus: S;
  useList: (query: ReviewQuery<S>) => UseQueryResult<Paginated<Item>>;
  useDecide: () => UseMutationResult<unknown, Error, DecisionInput<D>>;
  approveDecision: D;
  rejectDecision: D;
  /** Label for the approve button on this item, or null when it cannot be decided. */
  approveLabel: (item: Item) => string | null;
  renderBody: (item: Item, actions: ReactNode) => ReactNode;
}

function AgentLine({ agent }: { agent: ReviewAgent }) {
  return (
    <div className="wb-pf-row">
      <strong>{agent.name || '—'}</strong>
      <span className="wb-pf-muted">
        {agent.agency_code || '—'} · {agent.level_code || '—'}
        {agent.email ? ` · ${agent.email}` : ''}
      </span>
    </div>
  );
}

export function ReviewQueue<S extends string, Item extends { id: number; agent: ReviewAgent }, D extends string>({
  config,
  initialStatus,
}: {
  config: ReviewQueueConfig<S, Item, D>;
  /** A status to open on (the overview's deep links); ignored unless it is one of `config.statuses`. */
  initialStatus?: string | null;
}) {
  const { addToast } = useToastStore();
  const [status, setStatus] = useState<S>(
    () => config.statuses.find((option) => option.value === initialStatus)?.value ?? config.defaultStatus
  );
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim());
  const [page, setPage] = useState(1);
  const [decision, setDecision] = useState<{ item: Item; mode: 'approve' | 'reject' } | null>(null);

  // A new filter starts from the first page.
  useEffect(() => setPage(1), [status, search]);

  const list = config.useList({ status, search, page });
  const decide = config.useDecide();

  const count = list.data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const submitDecision = async (note: string) => {
    if (!decision) return;
    const { item, mode } = decision;
    try {
      await decide.mutateAsync({
        id: item.id,
        decision: mode === 'approve' ? config.approveDecision : config.rejectDecision,
        note,
      });
      const verb = mode === 'approve' ? config.approveLabel(item) ?? 'Approve' : 'Reject';
      addToast({
        type: 'success',
        message: `${config.noun} decision recorded (${verb}) for ${item.agent.name}.`,
      });
      setDecision(null);
    } catch (error) {
      if (isAlreadyDecided(error)) {
        // Someone else got there first; the queue refetches on settle.
        addToast({ type: 'warning', message: describeError(error, 'This was already decided.') });
        setDecision(null);
      } else {
        addToast({ type: 'error', message: describeError(error, 'Failed to record the decision.') });
      }
    }
  };

  const approveText = decision ? config.approveLabel(decision.item) ?? 'Approve' : 'Approve';

  return (
    <div className="wb-pf-stack">
      <div className="wb-pf-toolbar">
        <Select
          aria-label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value as S)}
          className="w-auto min-w-[10rem]"
        >
          {config.statuses.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <div className="wb-pf-search">
          <Input
            type="search"
            aria-label="Search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search name, agency code or email"
          />
        </div>
        <span className="wb-pf-muted">
          {list.isFetching ? 'Loading…' : `${count.toLocaleString()} result${count === 1 ? '' : 's'}`}
        </span>
      </div>

      {list.isLoading ? (
        <p className="wb-pf-muted">Loading…</p>
      ) : list.isError ? (
        <ErrorState
          description={describeError(list.error, `Unable to load ${config.noun.toLowerCase()} submissions.`)}
          onRetry={() => void list.refetch()}
        />
      ) : !list.data?.results.length ? (
        <NonIdealState
          title="Nothing here"
          description={
            search ? 'No submissions match this search.' : 'No submissions with this status.'
          }
        />
      ) : (
        <div className="wb-pf-stack">
          {list.data.results.map((item) => {
            const label = config.approveLabel(item);
            const actions = label ? (
              <div className="wb-pf-row">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setDecision({ item, mode: 'approve' })}
                  disabled={decide.isPending}
                >
                  {label}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => setDecision({ item, mode: 'reject' })}
                  disabled={decide.isPending}
                >
                  Reject
                </Button>
              </div>
            ) : null;
            return (
              <div key={item.id} className="wb-pf-stack" style={{ gap: 6 }}>
                <AgentLine agent={item.agent} />
                {config.renderBody(item, actions)}
              </div>
            );
          })}
        </div>
      )}

      {count > PAGE_SIZE ? (
        <div className="wb-pf-pagination">
          <span className="wb-pf-muted">
            Page {page} of {pages}
          </span>
          <div className="wb-pf-row">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!list.data?.previous || list.isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!list.data?.next || list.isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <ApproveDialog
        open={decision?.mode === 'approve'}
        title={`${approveText} — ${decision?.item.agent.name ?? ''}`}
        message={`${approveText} this ${config.noun.toLowerCase()} submission? Your name and the time are recorded.`}
        confirmText={approveText}
        loading={decide.isPending}
        onConfirm={submitDecision}
        onClose={() => setDecision(null)}
      />
      <RejectModal
        open={decision?.mode === 'reject'}
        title={`Reject ${config.noun.toLowerCase()} — ${decision?.item.agent.name ?? ''}`}
        loading={decide.isPending}
        onConfirm={submitDecision}
        onClose={() => setDecision(null)}
      />
    </div>
  );
}
