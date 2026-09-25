/**
 * Manual rebuild triggers.
 *
 * Dry run is the default on purpose: the delivered verification procedure expects a
 * dry run before any write, and an operator who clicks through without reading gets
 * the harmless path.
 */

import { useState } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Text,
} from '@/shared/components';

import { useRebuildMonthly, useRecalculateDaily } from '../hooks/use-wb-pipeline';

/** First day of the previous month, as `YYYY-MM`. */
function previousMonthValue(): string {
  const now = new Date();
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`;
}

export function ManualRebuildPanel({ canManage }: { canManage: boolean }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [month, setMonth] = useState(previousMonthValue);
  const [dailyDryRun, setDailyDryRun] = useState(true);
  const [monthlyDryRun, setMonthlyDryRun] = useState(true);

  const daily = useRecalculateDaily();
  const monthly = useRebuildMonthly();

  const dailyDisabled = !canManage || !start || daily.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Manual rebuild</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        {!canManage ? (
          <Text variant="muted">Triggering a rebuild needs the manage permission.</Text>
        ) : null}

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            daily.mutate({ start, end: end || start, dry_run: dailyDryRun });
          }}
        >
          <Text weight="semibold">Daily recalculation</Text>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[10rem] flex-1">
              <Label htmlFor="wb-daily-start">From</Label>
              <Input
                id="wb-daily-start"
                type="date"
                value={start}
                onChange={(event) => setStart(event.target.value)}
                required
              />
            </div>
            <div className="min-w-[10rem] flex-1">
              <Label htmlFor="wb-daily-end">To</Label>
              <Input
                id="wb-daily-end"
                type="date"
                value={end}
                onChange={(event) => setEnd(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={dailyDisabled}>
              {daily.isPending ? 'Queueing…' : 'Queue'}
            </Button>
          </div>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={dailyDryRun}
              onChange={(event) => setDailyDryRun(event.target.checked)}
            />
            Dry run — read and report without writing
          </label>
          <Text variant="muted" className="text-xs">
            Start a narrow range and reconcile it before widening. Ranges are capped at 367
            days.
          </Text>
          {daily.isError ? (
            <Text className="text-destructive">{(daily.error as Error).message}</Text>
          ) : null}
          {daily.isSuccess ? (
            <Text className="text-green-600 dark:text-green-500">
              Queued. Watch the status cards above.
            </Text>
          ) : null}
        </form>

        <form
          className="space-y-3 border-t pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            monthly.mutate({ month, dry_run: monthlyDryRun });
          }}
        >
          <Text weight="semibold">Monthly snapshot</Text>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[10rem] flex-1">
              <Label htmlFor="wb-month">Month</Label>
              <Input
                id="wb-month"
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={!canManage || !month || monthly.isPending}>
              {monthly.isPending ? 'Queueing…' : 'Queue'}
            </Button>
          </div>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={monthlyDryRun}
              onChange={(event) => setMonthlyDryRun(event.target.checked)}
            />
            Dry run — aggregate and report without writing
          </label>
          <Text variant="muted" className="text-xs">
            A snapshot is rebuilt from daily rows, so recalculate the days first.
          </Text>
          {monthly.isError ? (
            <Text className="text-destructive">{(monthly.error as Error).message}</Text>
          ) : null}
          {monthly.isSuccess ? (
            <Text className="text-green-600 dark:text-green-500">
              Queued. Watch the status cards above.
            </Text>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
