/**
 * Admin: recognition orders charged to SMDs. Route `/admin/plugin-fees/costs`, guarded on
 * `can_manage` (`plugin_fees:manage`). Logs new orders from a cart of catalogue products
 * (for one or many SMDs at once — one order per SMD), lists `GET costs/` filtered by
 * month (of `date_sent`) and SMD, deletes an order — or its whole batch — that has not
 * yet been netted into a cycle (a reason is required), and manages the product catalogue.
 * Screens and states: `docs/plugin-fees/UI.md` §2.8.
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

import { useCosts, useDeleteCost, useDeleteCostBatch } from '../hooks/use-plugin-fees';
import { CostForm } from '../components/costs/cost-form';
import { ProductCatalog } from '../components/costs/product-catalog';
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

/** What a delete removes: one order, or every order of its batch. */
interface DeleteTarget {
  cost: RecognitionCost;
  wholeBatch: boolean;
}

function DeleteCostDialog({
  target,
  loading,
  onConfirm,
  onClose,
}: {
  target: DeleteTarget | null;
  loading: boolean;
  onConfirm: (reason: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (target) setReason('');
  }, [target]);
  const cost = target?.cost;

  return (
    <ConfirmationDialog
      open={target !== null}
      title={target?.wholeBatch ? 'Delete batch' : 'Delete order'}
      message={
        !cost
          ? ''
          : target?.wholeBatch
            ? `Delete every order logged with ${cost.number} (${cost.item}), for every SMD it was charged to? None of them will be netted.`
            : `Delete ${cost.number} — ${cost.item} (${formatMoney(cost.total_cents)}) for ${cost.recipient_name}, charged to ${cost.smd.name}? It will not be netted.`
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
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);

  const monthFilter = MONTH_RE.test(month) ? month : '';
  // A new filter starts from the first page.
  useEffect(() => setPage(1), [monthFilter, smd]);

  const costs = useCosts({ smd: smd?.id ?? null, month: monthFilter, page });
  const remove = useDeleteCost();
  const removeBatch = useDeleteCostBatch();
  const removing = remove.isPending || removeBatch.isPending;
  const count = costs.data?.count ?? 0;

  const onDelete = async (reason: string) => {
    if (!deleting) return;
    const { cost, wholeBatch } = deleting;
    try {
      if (wholeBatch && cost.batch_id) {
        await removeBatch.mutateAsync({ batch_id: cost.batch_id, reason });
        addToast({ type: 'success', message: 'Batch deleted.' });
      } else {
        await remove.mutateAsync({ id: cost.id, reason });
        addToast({ type: 'success', message: 'Order deleted.' });
      }
      setDeleting(null);
    } catch (error) {
      if (isAlreadyDecided(error)) {
        // `already_applied`: netted into a cycle since the list loaded; the list refetches.
        addToast({ type: 'warning', message: describeError(error, 'This order was already netted.') });
        setDeleting(null);
      } else {
        addToast({ type: 'error', message: describeError(error, 'Failed to delete.') });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h4" weight="bold">
          Recognition Orders
        </Heading>
        <Text variant="muted">
          Recognition and mailing charged to an SMD for recognising their agents. Each order is
          netted against the SMD on the 1st of the month after it was sent — no separate invoice —
          and shown item by item on their statement. It can be deleted only until it is netted.
        </Text>
      </div>

      <section className="wb-pf-card" aria-labelledby="wb-pf-cost-form-heading">
        <h2 id="wb-pf-cost-form-heading" className="wb-pf-subheading">
          New order
        </h2>
        <CostForm />
      </section>

      <section className="wb-pf-card" aria-labelledby="wb-pf-costs-heading">
        <h2 id="wb-pf-costs-heading" className="wb-pf-subheading">
          Orders
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
            {costs.isFetching ? 'Loading…' : `${count.toLocaleString()} order${count === 1 ? '' : 's'}`}
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
            title="No orders"
            description={monthFilter || smd ? 'No orders match these filters.' : 'No orders have been logged.'}
          />
        ) : (
          <div className="wb-pf-table-wrap">
            <table className="wb-pf-table wb-pf-table--dense">
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Date sent</th>
                  <th scope="col">SMD</th>
                  <th scope="col">Recipient</th>
                  <th scope="col">Items</th>
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
                    <td>
                      <code>{cost.number}</code>
                    </td>
                    <td>{formatDate(cost.date_sent)}</td>
                    <td>
                      {cost.smd.name || '—'}
                      <span className="wb-pf-muted" style={{ display: 'block' }}>
                        {cost.smd.agency_code || '—'}
                      </span>
                    </td>
                    <td>{cost.recipient_name || '—'}</td>
                    <td>
                      <ul className="wb-pf-cost-items">
                        {cost.lines.map((line, index) => (
                          <li key={index}>
                            <span>
                              {line.quantity > 1 ? `${line.quantity} × ` : ''}
                              {line.description}
                              {line.sku ? <span className="wb-pf-muted"> · {line.sku}</span> : null}
                              {line.kind === 'mailing' && line.description !== 'Mailing' ? (
                                <span className="wb-pf-muted"> (mailing)</span>
                              ) : null}
                              {line.price_override_reason ? (
                                <span className="wb-pf-muted" title={line.price_override_reason}>
                                  {' '}
                                  · price changed: {line.price_override_reason}
                                </span>
                              ) : null}
                            </span>
                            <span className="wb-pf-num">{formatMoney(line.amount_cents)}</span>
                          </li>
                        ))}
                      </ul>
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
                        <div className="wb-pf-row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleting({ cost, wholeBatch: false })}
                            disabled={removing}
                          >
                            Delete
                          </Button>
                          {cost.batch_id ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              title="Delete this order for every SMD it was logged for"
                              onClick={() => setDeleting({ cost, wholeBatch: true })}
                              disabled={removing}
                            >
                              Delete batch
                            </Button>
                          ) : null}
                        </div>
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

      <section className="wb-pf-card" aria-labelledby="wb-pf-products-heading">
        <h2 id="wb-pf-products-heading" className="wb-pf-subheading">
          Product catalogue
        </h2>
        <Text variant="muted">
          The items and mailing options an order can be built from, with their SKU and current price.
          A price change applies to new orders only.
        </Text>
        <ProductCatalog />
      </section>

      <DeleteCostDialog
        target={deleting}
        loading={removing}
        onConfirm={onDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
