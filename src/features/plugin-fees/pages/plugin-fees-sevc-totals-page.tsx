/**
 * SEVC totals by month (P6, contract §8). Route `/admin/plugin-fees/sevc-totals`, guarded
 * on `can_manage || can_review`. `GET sevc-totals/?from=&to=` → one row per month and
 * SEVC (SMD fees, costs, MD fees with no SMD assistant, total; net of reversals), grand
 * totals, and a client-side CSV of the rows shown. Its own route rather than an overview
 * section (PF40): it is a range report with its own URL state.
 *
 * The range lives in the URL (`?from=YYYY-MM&to=YYYY-MM`, default the last 6 months
 * ending with the current UTC month). Screens and states: `docs/plugin-fees/UI.md` §2.12.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button, ErrorState, Heading, Input, NonIdealState, Text } from '@/shared/components';

import { useSevcTotals } from '../hooks/use-plugin-fees';
import type { SevcMonthTotal } from '../types';
import { describeError, downloadCsv, formatMoney, formatMonth, formatMonthShort, MONTH_RE, toCsv } from '../utils/plugin-fees-format';
import { todayUtc } from '../utils/plugin-fees-payment';
import '../components/plugin-fees.css';

function shiftMonth(value: string, by: number): string {
  const [year, month] = value.split('-').map(Number);
  const index = year * 12 + (month - 1) + by;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/** The last 6 months, ending with the current UTC month (the backend's default). */
function defaultRange() {
  const to = todayUtc().slice(0, 7);
  return { from: shiftMonth(to, -5), to };
}

const dollars = (cents: number) => (cents / 100).toFixed(2);

function exportRows(rows: SevcMonthTotal[]) {
  return [
    ['month', 'sevc_id', 'sevc_name', 'smd_fees', 'costs', 'md_fees_no_smd_assistant', 'total'],
    ...rows.map((row) => [
      row.month,
      row.sevc_id,
      row.sevc_name,
      dollars(row.smd_fees_cents),
      dollars(row.costs_cents),
      dollars(row.md_unrouted_cents),
      dollars(row.total_cents),
    ]),
  ];
}

export default function PluginFeesSevcTotalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fallback = defaultRange();
  const paramFrom = searchParams.get('from');
  const paramTo = searchParams.get('to');
  const urlValid =
    Boolean(paramFrom && paramTo && MONTH_RE.test(paramFrom) && MONTH_RE.test(paramTo)) &&
    (paramFrom as string) <= (paramTo as string);
  const range = urlValid ? { from: paramFrom as string, to: paramTo as string } : fallback;

  const [fromInput, setFromInput] = useState(range.from);
  const [toInput, setToInput] = useState(range.to);
  // Keep the inputs in step with the URL (Back / Forward).
  useEffect(() => {
    setFromInput(range.from);
    setToInput(range.to);
  }, [range.from, range.to]);

  const inputError = !MONTH_RE.test(fromInput) || !MONTH_RE.test(toInput)
    ? 'Enter both months as YYYY-MM.'
    : fromInput > toInput
      ? 'The start month must not be after the end month.'
      : null;

  const totals = useSevcTotals(range);
  const data = totals.data;

  const rows = useMemo(
    () =>
      [...(data ?? [])].sort(
        (a, b) =>
          b.month.localeCompare(a.month) || (a.sevc_name ?? '').localeCompare(b.sevc_name ?? '')
      ),
    [data]
  );
  const grand = useMemo(
    () =>
      rows.reduce(
        (sum, row) => ({
          smd: sum.smd + row.smd_fees_cents,
          costs: sum.costs + row.costs_cents,
          md: sum.md + row.md_unrouted_cents,
          total: sum.total + row.total_cents,
        }),
        { smd: 0, costs: 0, md: 0, total: 0 }
      ),
    [rows]
  );

  const apply = () => {
    const params = new URLSearchParams(searchParams);
    params.set('from', fromInput);
    params.set('to', toInput);
    setSearchParams(params);
  };

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h4" weight="bold">
          SEVC Totals
        </Heading>
        <Text variant="muted">
          What each SEVC received per month: SMD plug-in fees, recognition costs, and MD fees that reached
          the SEVC because no SMD on the line had a verified assistant. Net of reversals.
        </Text>
      </div>

      <form
        className="wb-pf-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          if (!inputError) apply();
        }}
      >
        <label className="wb-pf-row" style={{ gap: 6 }}>
          <span className="text-sm">From</span>
          <Input
            type="month"
            value={fromInput}
            onChange={(event) => setFromInput(event.target.value)}
            placeholder="YYYY-MM"
            aria-invalid={Boolean(inputError)}
            className="w-auto"
          />
        </label>
        <label className="wb-pf-row" style={{ gap: 6 }}>
          <span className="text-sm">To</span>
          <Input
            type="month"
            value={toInput}
            onChange={(event) => setToInput(event.target.value)}
            placeholder="YYYY-MM"
            aria-invalid={Boolean(inputError)}
            className="w-auto"
          />
        </label>
        <Button type="submit" disabled={Boolean(inputError) || totals.isFetching}>
          Show
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => downloadCsv(`plugin-fees-sevc-totals-${range.from}-${range.to}.csv`, toCsv(exportRows(rows)))}
          disabled={!rows.length}
        >
          Download CSV
        </Button>
        {inputError ? <span className="wb-pf-field-error">{inputError}</span> : null}
      </form>

      <section className="wb-pf-card" aria-labelledby="wb-pf-sevc-range-heading">
        <h2 id="wb-pf-sevc-range-heading" className="wb-pf-subheading">
          {formatMonth(range.from)} – {formatMonth(range.to)}
        </h2>
        {totals.isLoading ? (
          <p className="wb-pf-muted">Loading…</p>
        ) : totals.isError ? (
          <ErrorState
            description={describeError(totals.error, 'Unable to load SEVC totals.')}
            onRetry={() => void totals.refetch()}
          />
        ) : !rows.length ? (
          <NonIdealState title="No SEVC totals" description="No SEVC received anything in this range." />
        ) : (
          <div className="wb-pf-table-wrap">
            <table className="wb-pf-table wb-pf-table--dense">
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">SEVC</th>
                  <th scope="col" className="wb-pf-num">
                    SMD fees
                  </th>
                  <th scope="col" className="wb-pf-num">
                    Costs
                  </th>
                  <th scope="col" className="wb-pf-num">
                    MD fees, no SMD assistant
                  </th>
                  <th scope="col" className="wb-pf-num">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.month}-${row.sevc_id}`}>
                    <td>{formatMonthShort(row.month)}</td>
                    <td>{row.sevc_name || `SEVC #${row.sevc_id}`}</td>
                    <td className="wb-pf-num">{formatMoney(row.smd_fees_cents)}</td>
                    <td className="wb-pf-num">{formatMoney(row.costs_cents)}</td>
                    <td className="wb-pf-num">{formatMoney(row.md_unrouted_cents)}</td>
                    <td className="wb-pf-num">
                      <strong>{formatMoney(row.total_cents)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="wb-pf-total-row">
                  <th scope="row" colSpan={2}>
                    Grand total
                  </th>
                  <td className="wb-pf-num">{formatMoney(grand.smd)}</td>
                  <td className="wb-pf-num">{formatMoney(grand.costs)}</td>
                  <td className="wb-pf-num">{formatMoney(grand.md)}</td>
                  <td className="wb-pf-num">
                    <strong>{formatMoney(grand.total)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
