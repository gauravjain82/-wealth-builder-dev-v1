/**
 * Admin: manual ledger adjustments (P6, contract §8). Route
 * `/admin/plugin-fees/adjustments`, guarded on `can_manage` — the Hierarchy Assistant
 * cannot change ledger entries. Posts an adjustment (`POST adjustments/`) and lists them
 * (`GET adjustments/?smd=&page=`). Adjustments are never edited or deleted.
 *
 * The admin agent statement's "Adjust ledger" opens this page with
 * `state: { prefillSmd: {id, label}, backTo, backLabel }`: the form and the list filter
 * start on that SMD. Screens and states: `docs/plugin-fees/UI.md` §2.13.
 */

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Button, ErrorState, Heading, NonIdealState, Text, UserAutocompleteDropdown } from '@/shared/components';

import { useAdjustments } from '../hooks/use-plugin-fees';
import { AdjustmentForm, type Person } from '../components/adjustments/adjustment-form';
import { SignedAmount } from '../components/statement/statement-view';
import { describeError, formatDateTime } from '../utils/plugin-fees-format';
import '../components/plugin-fees.css';

/** The prefilled SMD and the back link from an agent statement; anything else is ignored. */
function readState(state: unknown): { smd: Person | null; back: { to: string; label: string } | null } {
  const value = (state ?? {}) as { prefillSmd?: unknown; backTo?: unknown; backLabel?: unknown };
  const raw = value.prefillSmd as { id?: unknown; label?: unknown } | undefined;
  const smd =
    raw && typeof raw.id === 'number' && Number.isSafeInteger(raw.id) && raw.id > 0
      ? { id: raw.id, label: typeof raw.label === 'string' && raw.label ? raw.label : `User #${raw.id}` }
      : null;
  const back =
    typeof value.backTo === 'string' && value.backTo.startsWith('/admin/plugin-fees/')
      ? { to: value.backTo, label: typeof value.backLabel === 'string' && value.backLabel ? value.backLabel : 'Back' }
      : null;
  return { smd, back };
}

export default function PluginFeesAdjustmentsPage() {
  const location = useLocation();
  const [{ smd: prefill, back }] = useState(() => readState(location.state));
  const [smd, setSmd] = useState<Person | null>(prefill);
  const [page, setPage] = useState(1);
  // A new filter starts from the first page.
  useEffect(() => setPage(1), [smd]);

  const adjustments = useAdjustments({ smd: smd?.id ?? null, page });
  const count = adjustments.data?.count ?? 0;

  return (
    <div className="space-y-6">
      <div className="wb-pf-stack" style={{ gap: 6 }}>
        {back ? (
          <Link to={back.to} className="wb-pf-link">
            ← {back.label}
          </Link>
        ) : null}
        <Heading as="h1" variant="h4" weight="bold">
          Ledger Adjustments
        </Heading>
        <Text variant="muted">
          Credit or debit an SMD&apos;s ledger by hand — for example to recollect a reversed charge, or to undo
          the fee of a voided invoice. An adjustment can never be edited or deleted; correct a mistake with an
          opposite adjustment.
        </Text>
      </div>

      <section className="wb-pf-card" aria-labelledby="wb-pf-adj-form-heading">
        <h2 id="wb-pf-adj-form-heading" className="wb-pf-subheading">
          Post an adjustment
        </h2>
        <AdjustmentForm initialSmd={prefill} />
      </section>

      <section className="wb-pf-card" aria-labelledby="wb-pf-adj-list-heading">
        <h2 id="wb-pf-adj-list-heading" className="wb-pf-subheading">
          Adjustments
        </h2>
        <div className="wb-pf-toolbar">
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
            {adjustments.isFetching ? 'Loading…' : `${count.toLocaleString()} adjustment${count === 1 ? '' : 's'}`}
          </span>
        </div>

        {adjustments.isLoading ? (
          <p className="wb-pf-muted">Loading…</p>
        ) : adjustments.isError ? (
          <ErrorState
            description={describeError(adjustments.error, 'Unable to load adjustments.')}
            onRetry={() => void adjustments.refetch()}
          />
        ) : !adjustments.data?.results.length ? (
          <NonIdealState
            title="No adjustments"
            description={smd ? 'No adjustments for this SMD.' : 'No adjustment has been posted.'}
          />
        ) : (
          <div className="wb-pf-table-wrap">
            <table className="wb-pf-table wb-pf-table--dense">
              <thead>
                <tr>
                  <th scope="col">Posted</th>
                  <th scope="col">SMD</th>
                  <th scope="col" className="wb-pf-num">
                    Amount
                  </th>
                  <th scope="col">Note</th>
                  <th scope="col">Invoice</th>
                  <th scope="col">By</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.data.results.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDateTime(row.created_at)}</td>
                    <td>
                      <Link
                        to={`/admin/plugin-fees/agents/${row.agent.id}/statement`}
                        state={{ backTo: '/admin/plugin-fees/adjustments', backLabel: 'Adjustments' }}
                        className="wb-pf-link"
                      >
                        {row.agent.name || '—'}
                      </Link>
                      <span className="wb-pf-muted" style={{ display: 'block' }}>
                        {row.agent.agency_code || '—'}
                      </span>
                    </td>
                    <td className="wb-pf-num">
                      <SignedAmount cents={row.amount_cents} signed />
                    </td>
                    <td>{row.note ? <span className="wb-pf-note-cell">{row.note}</span> : '—'}</td>
                    <td>{row.invoice_id ? `#${row.invoice_id}` : '—'}</td>
                    <td>{row.created_by || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {adjustments.data && (adjustments.data.next || adjustments.data.previous) ? (
          <div className="wb-pf-pagination">
            <span className="wb-pf-muted">Page {page}</span>
            <div className="wb-pf-row">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!adjustments.data.previous || adjustments.isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!adjustments.data.next || adjustments.isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
