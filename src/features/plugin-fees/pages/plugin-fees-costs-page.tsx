/**
 * Admin: recognition and mailing costs charged to SMDs. Route `/admin/plugin-fees/costs`,
 * guarded on `can_manage` (`plugin_fees:manage`). Lists `GET costs/` filtered by month
 * (of `date_sent`) and SMD, logs new costs, and deletes a cost that has not yet been
 * netted into a cycle (a reason is required). Screens and states: `docs/plugin-fees/UI.md` §2.8.
 */

import { useEffect, useState } from 'react';

import {
  Button,
  ConfirmationDialog,
  ErrorState,
  Heading,
  Input,
  NonIdealState,
  Text,
  Textarea,
  UserAutocompleteDropdown,
} from '@/shared/components';
import { useToastStore } from '@/store';

import { useCosts, useDeleteCost } from '../hooks/use-plugin-fees';
import { CostForm } from '../components/costs/cost-form';
import type { RecognitionCost } from '../types';
import {
  describeError,
  formatDate,
  formatMoney,
  formatMonthShort,
  isAlreadyDecided,
  MONTH_RE,
} from '../utils/plugin-fees-format';
import '../components/plugin-fees.css';

function AppliedCell({ cost }: { cost: RecognitionCost }) {
  if (cost.applied_month) return <span>Netted in {formatMonthShort(cost.applied_month)}</span>;
  return <span className="wb-pf-muted">Pending — will be netted on the 1st of next month</span>;
}

function DeleteCostDialog({
  cost,
  loading,
  onConfirm,
  onClose,
}: {
  cost: RecognitionCost | null;
  loading: boolean;
  onConfirm: (reason: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (cost) setReason('');
  }, [cost]);

  return (
    <ConfirmationDialog
      open={cost !== null}
      title="Delete cost"
      message={
        cost
          ? `Delete ${cost.item} (${formatMoney(cost.total_cents)}) for ${cost.recipient_name}, charged to ${cost.smd.name}? It will not be netted.`
          : ''
      }
      confirmText="Delete"
      confirmDisabled={!reason.trim()}
      loading={loading}
      onConfirm={() => onConfirm(reason.trim())}
      onClose={onClose}
    >
      <label className="block space-y-1 text-sm">
        <span className="text-slate-700 dark:text-white/80">Reason (required)</span>
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          required
          aria-required="true"
          disabled={loading}
        />
      </label>
    </ConfirmationDialog>
  );
}

export default function PluginFeesCostsPage() {
  const { addToast } = useToastStore();
  const [month, setMonth] = useState('');
  const [smd, setSmd] = useState<{ id: number; label: string } | null>(null);
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<RecognitionCost | null>(null);

  const monthFilter = MONTH_RE.test(month) ? month : '';
  // A new filter starts from the first page.
  useEffect(() => setPage(1), [monthFilter, smd]);

  const costs = useCosts({ smd: smd?.id ?? null, month: monthFilter, page });
  const remove = useDeleteCost();
  const count = costs.data?.count ?? 0;

  const onDelete = async (reason: string) => {
    if (!deleting) return;
    try {
      await remove.mutateAsync({ id: deleting.id, reason });
      addToast({ type: 'success', message: 'Cost deleted.' });
      setDeleting(null);
    } catch (error) {
      if (isAlreadyDecided(error)) {
        // `already_applied`: netted into a cycle since the list loaded; the list refetches.
        addToast({ type: 'warning', message: describeError(error, 'This cost was already netted.') });
        setDeleting(null);
      } else {
        addToast({ type: 'error', message: describeError(error, 'Failed to delete the cost.') });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h4" weight="bold">
          Recognition &amp; Mailing Costs
        </Heading>
        <Text variant="muted">
          Costs charged to an SMD for recognising their agents. Each is netted against the SMD on the
          1st of the month after it was sent, and can be deleted only until then.
        </Text>
      </div>

      <section className="wb-pf-card" aria-labelledby="wb-pf-cost-form-heading">
        <h2 id="wb-pf-cost-form-heading" className="wb-pf-subheading">
          Log a cost
        </h2>
        <CostForm />
      </section>

      <section className="wb-pf-card" aria-labelledby="wb-pf-costs-heading">
        <h2 id="wb-pf-costs-heading" className="wb-pf-subheading">
          Logged costs
        </h2>
        <div className="wb-pf-toolbar">
          <label className="wb-pf-row" style={{ gap: 6 }}>
            <span className="text-sm">Month sent</span>
            <Input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              placeholder="YYYY-MM"
              className="w-auto"
            />
          </label>
          {month ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setMonth('')}>
              All months
            </Button>
          ) : null}
          <div style={{ flex: '1 1 14rem', minWidth: 0 }}>
            <UserAutocompleteDropdown
              selectedId={smd?.id ?? null}
              selectedLabel={smd?.label}
              placeholder="All SMDs"
              buttonText="FILTER"
              fetchFromApi
              onSelect={(option) => setSmd({ id: option.id, label: option.label })}
            />
          </div>
          {smd ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setSmd(null)}>
              All SMDs
            </Button>
          ) : null}
          <span className="wb-pf-muted">
            {costs.isFetching ? 'Loading…' : `${count.toLocaleString()} cost${count === 1 ? '' : 's'}`}
          </span>
        </div>

        {costs.isLoading ? (
          <p className="wb-pf-muted">Loading…</p>
        ) : costs.isError ? (
          <ErrorState
            description={describeError(costs.error, 'Unable to load costs.')}
            onRetry={() => void costs.refetch()}
          />
        ) : !costs.data?.results.length ? (
          <NonIdealState
            title="No costs"
            description={monthFilter || smd ? 'No costs match these filters.' : 'No costs have been logged.'}
          />
        ) : (
          <div className="wb-pf-table-wrap">
            <table className="wb-pf-table wb-pf-table--dense">
              <thead>
                <tr>
                  <th scope="col">Date sent</th>
                  <th scope="col">SMD</th>
                  <th scope="col">Recipient</th>
                  <th scope="col">Item</th>
                  <th scope="col" className="wb-pf-num">
                    Recognition
                  </th>
                  <th scope="col" className="wb-pf-num">
                    Mailing
                  </th>
                  <th scope="col" className="wb-pf-num">
                    Total
                  </th>
                  <th scope="col">Netting</th>
                  <th scope="col">Logged by</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {costs.data.results.map((cost) => (
                  <tr key={cost.id}>
                    <td>{formatDate(cost.date_sent)}</td>
                    <td>
                      {cost.smd.name || '—'}
                      <span className="wb-pf-muted" style={{ display: 'block' }}>
                        {cost.smd.agency_code || '—'}
                      </span>
                    </td>
                    <td>{cost.recipient_name || '—'}</td>
                    <td>
                      {cost.item || '—'}
                      {cost.note ? <span className="wb-pf-note">{cost.note}</span> : null}
                    </td>
                    <td className="wb-pf-num">{formatMoney(cost.recognition_cents)}</td>
                    <td className="wb-pf-num">{formatMoney(cost.mailing_cents)}</td>
                    <td className="wb-pf-num">
                      <strong>{formatMoney(cost.total_cents)}</strong>
                    </td>
                    <td>
                      <AppliedCell cost={cost} />
                    </td>
                    <td>{cost.logged_by || '—'}</td>
                    <td>
                      {cost.applied_month ? null : (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleting(cost)}
                          disabled={remove.isPending}
                        >
                          Delete
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {costs.data && (costs.data.next || costs.data.previous) ? (
          <div className="wb-pf-pagination">
            <span className="wb-pf-muted">Page {page}</span>
            <div className="wb-pf-row">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!costs.data.previous || costs.isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!costs.data.next || costs.isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <DeleteCostDialog
        cost={deleting}
        loading={remove.isPending}
        onConfirm={onDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
