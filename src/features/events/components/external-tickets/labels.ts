import type { ExternalImport, MapState } from '../../types/external-tickets';

/** Display labels and error wording shared by the External Tickets components. */

export const STATE_LABEL: Record<MapState, string> = {
  unmatched: 'Unmatched',
  provisional: 'Suggested',
  confirmed: 'Confirmed',
  review: 'Needs review',
  ignored: 'Not a WB account',
};

export const IMPORT_STATE_LABEL: Record<ExternalImport['state'], string> = {
  queued: 'Queued',
  validating: 'Validating…',
  preview_ready: 'Ready to preview',
  applying: 'Applying…',
  applied: 'Applied (active)',
  failed: 'Failed',
  superseded: 'Superseded',
  historical: 'Historical (older snapshot)',
};

/** Human message for a backend error code; falls back to the server's text. */
export function errorText(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code: string }).code);
    const known: Record<string, string> = {
      stale_revision: 'This changed since you opened it — it has been reloaded, please review again.',
      stale_preview: 'Something changed since this preview. Rebuild the preview, then apply.',
      group_conflict: 'Some rows in this group were already decided differently — review them one by one.',
      quick_confirm_not_allowed: 'This group cannot be quick-confirmed. Use Review instead.',
      busy: 'Another update for this event is being applied. Try again shortly.',
      historical_snapshot: 'This is an older snapshot. It is kept for reference and cannot be applied.',
    };
    if (known[code]) return known[code];
  }
  return err instanceof Error ? err.message : 'Something went wrong.';
}
