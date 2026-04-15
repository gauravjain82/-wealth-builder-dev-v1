import { useEffect, useMemo, useState } from 'react';
import { Block, ErrorState, LoadingState, TrackerTable } from '@/shared/components';
import { useToastStore } from '@/store';
import { buildProductionColumns } from '../production-columns';
import {
  fetchProductionTracker,
  type ProductionTrackerRecord,
} from '../services/production-tracker-service';

export default function ProductionTrackerPage() {
  const pageHeading = 'Production Tracker';
  const pageDescription = "Monitor your team's production and revenue";

  const [rows, setRows] = useState<ProductionTrackerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const addToast = useToastStore((state) => state.addToast);

  const columns = useMemo(() => buildProductionColumns(), []);

  useEffect(() => {
    let isMounted = true;

    const loadRows = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchProductionTracker();
        if (isMounted) {
          setRows(data);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load production tracker records';
        if (isMounted) {
          setError(message);
        }
        addToast({ type: 'error', message: 'Failed to load production tracker records.' });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRows();

    return () => {
      isMounted = false;
    };
  }, [addToast]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState
          pageHeading={pageHeading}
          pageDescription={pageDescription}
          title="Loading production tracker"
          description="Fetching production records..."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState
          pageHeading={pageHeading}
          pageDescription={pageDescription}
          title="Error Loading Production Tracker"
          description={error}
          retryLabel="Retry"
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col p-6">
      <Block
        title={pageHeading}
        description={`${pageDescription} • ${rows.length} total`}
        className="mb-6 flex-shrink-0"
      />

      <div className="flex-1 overflow-hidden">
        <TrackerTable
          columns={columns}
          rows={rows}
          rowKey={(row) => String(row.id)}
          stickyFirstNColumns={4}
          resizable
          tableId="production-tracker"
          emptyMessage="No production records found."
          className="h-full"
        />
      </div>
    </div>
  );
}
