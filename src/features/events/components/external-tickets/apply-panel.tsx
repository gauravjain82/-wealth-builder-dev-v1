import { useRef, useState } from 'react';
import { Button, Card, CardContent, Text } from '@shared/components';
import type { ExternalImport, PreviewCounts, RowFilters } from '../../types/external-tickets';
import { IMPORT_STATE_LABEL, errorText } from './labels';

interface ApplyPanelProps {
  imp: ExternalImport;
  previewing: boolean;
  applying: boolean;
  onPreview: () => Promise<void>;
  onApply: (key: string) => Promise<void>;
  onShowRows: (filters: RowFilters) => void;
  onShowReview: (kind: string) => void;
}

const CARDS: Array<{ key: keyof PreviewCounts; label: string; target: { rows?: RowFilters; review?: string } }> = [
  { key: 'new', label: 'New', target: { rows: { action: 'create', page: 1 } } },
  { key: 'changed', label: 'Changed', target: { rows: { action: 'update', page: 1 } } },
  { key: 'unchanged', label: 'Unchanged', target: { rows: { action: 'unchanged', page: 1 } } },
  { key: 'identity_review', label: 'Identity review', target: { review: 'identity_hold' } },
  { key: 'onsite_conflicts', label: 'On-site conflicts', target: { review: 'conflict' } },
  { key: 'missing_review', label: 'Missing from export', target: { review: 'missing_source' } },
];

/**
 * Step 4 — build the preview, read the counts, apply. Queue acceptance is shown
 * as "Applying…" until the server reports the import applied; the idempotency
 * key is kept across retries so a double press cannot apply twice.
 */
export function ApplyPanel({ imp, previewing, applying, onPreview, onApply, onShowRows, onShowReview }: ApplyPanelProps) {
  const keyRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const preview = imp.counts.preview;
  const canApply = imp.state === 'preview_ready' && Boolean(preview);

  const run = async (action: () => Promise<void>) => {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Text className="font-semibold">{imp.filename}</Text>
            <Text variant="muted" className="text-sm" aria-live="polite">
              {IMPORT_STATE_LABEL[imp.state]}
              {imp.safe_error ? ` · ${imp.safe_error.replace(/_/g, ' ')}` : ''}
              {imp.counts.preview_built_at ? ` · preview built ${new Date(imp.counts.preview_built_at).toLocaleTimeString()}` : ''}
            </Text>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={imp.state !== 'preview_ready' || previewing} onClick={() => void run(onPreview)}>
              {previewing ? 'Building preview…' : preview ? 'Rebuild preview' : 'Build preview'}
            </Button>
            <Button
              disabled={!canApply || applying}
              onClick={() =>
                void run(async () => {
                  keyRef.current = keyRef.current ?? crypto.randomUUID();
                  await onApply(keyRef.current);
                })
              }
            >
              {imp.state === 'applying' || applying ? 'Applying…' : 'Apply update'}
            </Button>
          </div>
        </div>
        {imp.state === 'historical' ? (
          <Text className="text-sm text-amber-700">This snapshot is older than the one already applied. It is kept for reference only.</Text>
        ) : null}
        {preview ? (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {CARDS.map((card) => (
              <button
                key={card.key}
                type="button"
                className="rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                onClick={() => (card.target.rows ? onShowRows(card.target.rows) : onShowReview(card.target.review as string))}
              >
                <Text variant="muted" className="text-xs">{card.label}</Text>
                <p className="text-xl font-semibold">{preview[card.key]}</p>
              </button>
            ))}
          </div>
        ) : (
          <Text variant="muted" className="text-sm">Build a preview to see what this export would change. Nothing is written until you apply.</Text>
        )}
        {preview && (preview.field_review || preview.unlinked_holders) ? (
          <Text variant="muted" className="text-xs">
            {preview.unlinked_holders} attendee(s) not yet linked to a confirmed WB account (they still get tickets).
            {preview.field_review ? ` ${preview.field_review} value(s) too long for WB will need manual correction.` : ''}
          </Text>
        ) : null}
        {imp.counts.applied ? (
          <Text className="text-sm" aria-live="polite">
            Applied: {imp.counts.applied.created ?? 0} created, {imp.counts.applied.updated ?? 0} updated,{' '}
            {imp.counts.applied.conflicts ?? 0} conflicts, {imp.counts.applied.holds ?? 0} identity holds,{' '}
            {imp.counts.applied.missing_review ?? 0} missing for review.
          </Text>
        ) : null}
        {error ? <Text className="text-sm text-red-600" role="alert">{error}</Text> : null}
      </CardContent>
    </Card>
  );
}
