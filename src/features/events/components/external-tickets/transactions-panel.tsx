import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardContent, ErrorState, Input, Label, LoadingState, Text } from '@shared/components';
import { useToastStore } from '@/store';
import { formatPrice } from '../../utils/public-pricing';
import {
  useTransactionActions,
  useTransactionImport,
  useTransactionImports,
  useTransactionRows,
} from '../../hooks/use-external-tickets';
import type { TransactionCounts } from '../../types/external-tickets';
import { errorText } from './labels';
import { Pager } from './shared';

interface TransactionsPanelProps {
  eventId: number;
  eventName: string;
  currency: string;
}

function localNow(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function Count({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
      <Text variant="muted" className="text-xs uppercase tracking-wide">{label}</Text>
      <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{value}</p>
      {hint ? <Text variant="muted" className="mt-1 text-xs">{hint}</Text> : null}
    </div>
  );
}

/**
 * Partner payments — upload the partner's transactions export (one row per
 * purchase: price, payment method, charge id, payment date). Rows join the
 * purchases already imported by invoice number. Nothing is written until Apply;
 * an invoice with no imported purchase is listed as unmatched and never applied
 * to another order.
 */
export function TransactionsPanel({ eventId, eventName, currency }: TransactionsPanelProps) {
  const addToast = useToastStore((state) => state.addToast);
  const [file, setFile] = useState<File | null>(null);
  const [capturedAt, setCapturedAt] = useState(localNow());
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const imports = useTransactionImports(eventId);
  const list = useMemo(() => imports.data?.rows ?? [], [imports.data]);
  useEffect(() => {
    if (selectedId === null && list.length) setSelectedId(list[0].id);
  }, [list, selectedId]);
  const current = useTransactionImport(eventId, selectedId);
  const imp = current.data ?? null;
  const unmatched = useTransactionRows(eventId, selectedId, { action: 'unmatched', page });
  const actions = useTransactionActions(eventId);

  const submit = async () => {
    if (!file) return;
    setError(null);
    try {
      const result = await actions.upload.mutateAsync({ file, capturedAt: new Date(capturedAt).toISOString() });
      setSelectedId(result.id);
      setPage(1);
      setFile(null);
      setConfirmed(false);
      addToast({
        type: 'success',
        message: result.created === false ? 'This exact file was already uploaded — opened it.' : 'File checked. Review the counts, then apply.',
      });
    } catch (err) {
      setError(errorText(err));
    }
  };

  const apply = async () => {
    if (!imp) return;
    setError(null);
    try {
      await actions.apply.mutateAsync(imp.id);
      addToast({ type: 'success', message: 'Payments applied to the matched purchases.' });
    } catch (err) {
      setError(errorText(err));
    }
  };

  const counts: TransactionCounts | undefined = imp?.counts.applied ?? imp?.counts.preview;
  const applied = imp?.state === 'applied';

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="intake-txn-file">BSCPro transactions export (CSV, or XLSX first sheet)</Label>
              <Input
                id="intake-txn-file"
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setConfirmed(false);
                }}
              />
            </div>
            <div>
              <Label htmlFor="intake-txn-captured">When was this export taken?</Label>
              <Input id="intake-txn-captured" type="datetime-local" value={capturedAt} onChange={(e) => setCapturedAt(e.target.value)} />
            </div>
          </div>
          {file ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              {file.name} belongs to {eventName}
            </label>
          ) : null}
          {error ? <Text className="text-sm text-red-600" role="alert">{error}</Text> : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Text variant="muted" className="text-xs">
              Rows match imported purchases by invoice number. Import the ticket export first; payments for purchases
              that arrive later attach on the next ticket update.
            </Text>
            <Button disabled={!file || !confirmed || actions.upload.isPending} onClick={() => void submit()}>
              {actions.upload.isPending ? 'Checking…' : 'Upload and check'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {imports.isLoading ? <LoadingState /> : null}
      {imports.isError ? <ErrorState description={errorText(imports.error)} onRetry={() => void imports.refetch()} /> : null}
      {!imports.isLoading && !imports.isError && !list.length ? (
        <Text variant="muted">No transactions export has been uploaded for this event.</Text>
      ) : null}

      {imp && counts ? (
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{imp.filename}</p>
                <Text variant="muted" className="text-xs">
                  Captured {new Date(imp.captured_at).toLocaleString()} ·{' '}
                  {applied && imp.applied_at ? `applied ${new Date(imp.applied_at).toLocaleString()}` : 'not applied yet'}
                </Text>
              </div>
              {applied ? null : (
                <Button disabled={actions.apply.isPending || counts.new + counts.changed === 0} onClick={() => void apply()}>
                  {actions.apply.isPending ? 'Applying…' : `Apply ${counts.new + counts.changed} payments`}
                </Button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Count label="Purchases in file" value={counts.rows.toLocaleString()} />
              <Count label={applied ? 'Priced' : 'New'} value={counts.new.toLocaleString()} hint="No payment recorded before" />
              <Count label="Changed" value={counts.changed.toLocaleString()} hint="Differs from the last file" />
              <Count label="Unchanged" value={counts.unchanged.toLocaleString()} />
              <Count
                label="Unmatched"
                value={counts.unmatched.toLocaleString()}
                hint={`${formatPrice(counts.unmatched_total, currency)} not counted`}
              />
            </div>
            <Text className="text-sm">
              Matched purchases total <strong>{formatPrice(counts.matched_total, currency)}</strong>, reported as partner
              revenue — separate from what WB collected.
            </Text>

            {unmatched.data?.pagination.total ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  {unmatched.data.pagination.total} invoices have no imported purchase in this event
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase text-slate-500">
                      <tr>
                        <th className="py-1 pr-3">Invoice</th>
                        <th className="py-1 pr-3">Buyer</th>
                        <th className="py-1 pr-3">Method</th>
                        <th className="py-1 pr-3 text-right">Qty</th>
                        <th className="py-1 pr-3 text-right">Total</th>
                        <th className="py-1">Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {unmatched.data.rows.map((row) => (
                        <tr key={row.id}>
                          <td className="py-1 pr-3 font-mono text-xs">{row.invoice}</td>
                          <td className="py-1 pr-3">{`${row.first_name} ${row.last_name}`.trim() || row.email || '—'}</td>
                          <td className="py-1 pr-3">{row.payment_method || '—'}</td>
                          <td className="py-1 pr-3 text-right">{row.quantity}</td>
                          <td className="py-1 pr-3 text-right">{formatPrice(row.total, currency)}</td>
                          <td className="py-1">{row.paid_at || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pager pagination={unmatched.data.pagination} onPage={setPage} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {list.length > 1 ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium">Upload history ({list.length})</p>
            <ul className="mt-2 divide-y divide-slate-100 text-sm dark:divide-white/5">
              {list.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <span className="font-medium">{item.filename}</span>
                    <span className="block text-xs text-slate-500">
                      Captured {new Date(item.captured_at).toLocaleString()} · {item.state === 'applied' ? 'Applied' : 'Not applied'}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant={selectedId === item.id ? 'default' : 'outline'}
                    onClick={() => {
                      setSelectedId(item.id);
                      setPage(1);
                    }}
                  >
                    {selectedId === item.id ? 'Selected' : 'Open'}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
