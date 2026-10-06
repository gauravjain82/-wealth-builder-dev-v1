import { useState } from 'react';
import { Button, Card, CardContent, Input, Label, Text } from '@shared/components';
import type { ExternalImport } from '../../types/external-tickets';
import { IMPORT_STATE_LABEL, errorText } from './labels';

interface UploadPanelProps {
  eventName: string;
  imports: ExternalImport[];
  selectedId: number | null;
  uploading: boolean;
  onUpload: (file: File, capturedAt: string) => Promise<ExternalImport | null>;
  onSelect: (id: number) => void;
}

function localNow(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

/** Proposes a label from a BSCPro filename — for comparison only, never an event id. */
function proposedLabel(filename: string): string {
  return filename
    .replace(/\.(csv|xlsx)$/i, '')
    .replace(/__\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_ALL.*$/, '')
    .replace(/_+/g, ' ')
    .trim();
}

/**
 * Step 1 — upload a BSCPro export for the event already selected in the page
 * header, and pick which snapshot to work on. The file name only *suggests* a
 * label; the operator confirms the event and the capture time.
 */
export function UploadPanel({ eventName, imports, selectedId, uploading, onUpload, onSelect }: UploadPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [capturedAt, setCapturedAt] = useState(localNow());
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const submit = async () => {
    if (!file) return;
    setError(null);
    try {
      const result = await onUpload(file, new Date(capturedAt).toISOString());
      if (result) {
        setFile(null);
        setConfirmed(false);
      }
    } catch (err) {
      setError(errorText(err));
    }
  };

  const label = file ? proposedLabel(file.name) : '';
  const mismatch = Boolean(label) && !eventName.toLowerCase().includes(label.toLowerCase().slice(0, 12));

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="intake-file">BSCPro export (CSV, or XLSX first sheet)</Label>
            <Input
              id="intake-file"
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setConfirmed(false);
              }}
            />
          </div>
          <div>
            <Label htmlFor="intake-captured">When was this export taken?</Label>
            <Input id="intake-captured" type="datetime-local" value={capturedAt} onChange={(e) => setCapturedAt(e.target.value)} />
          </div>
        </div>
        {file ? (
          <div className="rounded-lg border border-slate-200 p-3 text-sm dark:border-white/10">
            <p>
              File suggests: <strong>{label || '—'}</strong> · Importing into: <strong>{eventName}</strong>
            </p>
            {mismatch ? (
              <p className="mt-1 text-amber-700 dark:text-amber-400">
                The file name does not look like this event. Check you selected the right event.
              </p>
            ) : null}
            <label className="mt-2 flex items-center gap-2">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              This export belongs to {eventName}
            </label>
          </div>
        ) : null}
        {error ? <Text className="text-sm text-red-600" role="alert">{error}</Text> : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Text variant="muted" className="text-xs">
            Coverage is recorded as Unknown: a ticket missing from an export is flagged for review, never cancelled.
          </Text>
          <Button disabled={!file || !confirmed || uploading} onClick={() => void submit()}>
            {uploading ? 'Uploading…' : 'Upload and validate'}
          </Button>
        </div>

        <div className="border-t border-slate-200 pt-3 dark:border-white/10">
          <button type="button" className="text-sm font-medium underline-offset-4 hover:underline" aria-expanded={historyOpen} onClick={() => setHistoryOpen((v) => !v)}>
            Snapshot history ({imports.length})
          </button>
          {historyOpen ? (
            <ul className="mt-2 divide-y divide-slate-100 text-sm dark:divide-white/5">
              {imports.map((imp) => (
                <li key={imp.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <span className="font-medium">{imp.filename}</span>
                    <span className="block text-xs text-slate-500">
                      Captured {new Date(imp.captured_at).toLocaleString()} · uploaded {new Date(imp.uploaded_at).toLocaleString()} ·{' '}
                      {imp.counts.rows ?? 0} tickets
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs">{IMPORT_STATE_LABEL[imp.state]}</span>
                    {imp.safe_error ? <span className="text-xs text-red-600">{imp.safe_error.replace(/_/g, ' ')}</span> : null}
                    <Button size="sm" variant={selectedId === imp.id ? 'default' : 'outline'} onClick={() => onSelect(imp.id)}>
                      {selectedId === imp.id ? 'Selected' : 'Open'}
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
