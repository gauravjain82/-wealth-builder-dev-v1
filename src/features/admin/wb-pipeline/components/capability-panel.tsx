/**
 * The capability check: does the live schema still carry what the jobs read?
 *
 * Explicitly a button rather than a poll — it is a pre-flight check an operator
 * runs before a rebuild, and it writes nothing.
 */

import { Button, Card, CardContent, CardHeader, CardTitle, Text } from '@/shared/components';

import { useCapabilityCheck } from '../hooks/use-wb-pipeline';

export function CapabilityPanel({ canManage }: { canManage: boolean }) {
  const check = useCapabilityCheck();
  const report = check.data;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Source capability</CardTitle>
        <Button
          variant="outline"
          onClick={() => check.mutate()}
          disabled={!canManage || check.isPending}
        >
          {check.isPending ? 'Checking…' : 'Run check'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!canManage ? (
          <Text variant="muted">
            Running the check needs the manage permission.
          </Text>
        ) : null}

        {check.isError ? (
          <Text className="text-destructive">{(check.error as Error).message}</Text>
        ) : null}

        {!report && !check.isPending && !check.isError ? (
          <Text variant="muted">
            Confirms every source table and column the jobs read, and that the reporting
            tables exist. Writes nothing.
          </Text>
        ) : null}

        {report ? (
          report.ok ? (
            <Text className="text-green-600 dark:text-green-500">
              All source tables, columns and reporting tables are present.
            </Text>
          ) : (
            <div className="space-y-3">
              <Text className="text-destructive">
                The live schema cannot satisfy the jobs. Rebuilds will refuse to write.
              </Text>
              {report.source_issues.length ? (
                <div>
                  <Text weight="semibold">Source problems</Text>
                  <ul className="list-inside list-disc">
                    {report.source_issues.map((issue) => (
                      <li key={issue.table} className="font-mono text-xs">
                        {issue.table}:{' '}
                        {issue.table_missing
                          ? 'table not found'
                          : `missing ${issue.missing_columns.join(', ')}`}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {report.missing_owned_tables.length ? (
                <div>
                  <Text weight="semibold">Reporting tables not migrated</Text>
                  <ul className="list-inside list-disc">
                    {report.missing_owned_tables.map((table) => (
                      <li key={table} className="font-mono text-xs">
                        {table}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
