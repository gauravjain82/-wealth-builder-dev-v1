/**
 * The guidance library and review queue.
 *
 * This page exists because without it the seeded SOPs could only be approved by hand
 * with an API client. `UI_CONTRACT.md` asks for a fuller management interface — a
 * structured editor, a step builder, permissions and feedback screens — and this is
 * deliberately less than that: the library, the review queue, the change note, a content
 * preview, and the lifecycle actions. That is the subset needed to get the imported
 * content live, which is what this package is actually delivering (decision G11).
 *
 * Two things it does carefully, because both are easy to get wrong:
 *
 * - **The change note is shown before the content**, not after. For the imported SOPs it
 *   is the whole point: it lists the host corrections applied on import (decision G6),
 *   and an approver who has not read it is approving a diff they have not seen.
 * - **A 409 offers Reload, never a retry.** Retrying a conflicted publish is precisely
 *   the silent overwrite the concurrency token exists to prevent, so the button says so.
 */

import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchLibrary,
  publishRevision,
  rollbackTopic,
  transitionRevision,
  GmsError,
} from '../services/gms-service';
import type { LibraryRow } from '../types';
import { ContentBlocks } from '../components/content-blocks';
import { useGmsAccess } from '../hooks/use-gms';
import '../gms.css';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  in_review: 'In review',
  approved: 'Approved',
  published: 'Published',
  superseded: 'Superseded',
  rolled_back: 'Rolled back',
};

export default function GuidanceAdminPage() {
  const queryClient = useQueryClient();
  const { data: access } = useGmsAccess();
  const [filter, setFilter] = useState<string>('');
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState<string>('');
  const [failure, setFailure] = useState<string>('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['gms', 'library', filter],
    queryFn: ({ signal }) => fetchLibrary(filter || undefined, signal),
  });

  const refresh = useCallback(() => {
    setConflict('');
    setFailure('');
    void queryClient.invalidateQueries({ queryKey: ['gms', 'library'] });
  }, [queryClient]);

  const run = useCallback(
    async (action: () => Promise<void>) => {
      setBusy(true);
      setConflict('');
      setFailure('');
      try {
        await action();
        await queryClient.invalidateQueries({ queryKey: ['gms', 'library'] });
      } catch (error) {
        if (error instanceof GmsError && error.code === 'edit_conflict') {
          // Never offer a retry here. Retrying is the overwrite the token prevents.
          setConflict(error.message);
        } else {
          setFailure(error instanceof Error ? error.message : 'Something went wrong.');
        }
      } finally {
        setBusy(false);
      }
    },
    [queryClient]
  );

  if (!access?.can_author) {
    return (
      <main className="w-full px-4 py-6">
        <p>You do not have permission to manage guidance.</p>
      </main>
    );
  }

  return (
    <main className="w-full px-4 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          Guidance
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-white/60">
          Contextual help and walkthroughs. Imported content arrives as a draft and is
          published only after someone approves it.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ['', 'All'],
          ['draft', 'Drafts'],
          ['in_review', 'In review'],
          ['approved', 'Approved'],
          ['published', 'Published'],
        ].map(([value, label]) => (
          <button
            key={value || 'all'}
            type="button"
            className="wb-gms-entry"
            style={{
              width: 'auto',
              marginBottom: 0,
              fontWeight: filter === value ? 700 : 400,
            }}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {conflict ? (
        <div className="wb-gms-note wb-gms-note--caution" role="alert">
          {conflict}{' '}
          <button type="button" onClick={refresh} style={{ textDecoration: 'underline' }}>
            Reload
          </button>
        </div>
      ) : null}
      {failure ? (
        <div className="wb-gms-note wb-gms-note--caution" role="alert">
          {failure}
        </div>
      ) : null}

      {isLoading ? <p>Loading…</p> : null}
      {!isLoading && rows.length === 0 ? (
        <p>Nothing here. Run `seed_gms_content` to import the delivered guidance.</p>
      ) : null}

      {rows.map((row: LibraryRow) => {
        const key = `${row.tool_key}:${row.topic_key}`;
        const expanded = openKey === key;
        const latest = row.latest;
        return (
          <section key={key} className="wb-gms-section">
            <button
              type="button"
              className="wb-gms-entry"
              onClick={() => setOpenKey(expanded ? null : key)}
              aria-expanded={expanded}
            >
              <span className="wb-gms-entry__title">{row.title}</span>
              <span className="wb-gms-entry__meta">
                {row.tool_key} · {row.topic_key} ·{' '}
                {latest
                  ? `r${latest.revision_number} ${STATUS_LABELS[latest.status] ?? latest.status}`
                  : 'no revisions'}
                {row.is_published
                  ? ` · live: r${row.published_revision_number}`
                  : ' · not published'}
              </span>
            </button>

            {expanded && latest ? (
              <div style={{ padding: '0 0.75rem 1rem' }}>
                {/*
                  The change note comes first. For an imported SOP it lists the host
                  corrections applied on the way in, and approving without reading it
                  means approving a diff you have not seen.
                */}
                {latest.change_note ? (
                  <div className="wb-gms-note wb-gms-note--warning">
                    <strong>What changed on import</strong>
                    <p>{latest.change_note}</p>
                  </div>
                ) : null}

                <ContentBlocks blocks={latest.content} />

                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    marginTop: '1rem',
                  }}
                >
                  {latest.status === 'draft' && access?.can_review ? (
                    <button
                      type="button"
                      className="wb-gms-entry"
                      style={{ width: 'auto', marginBottom: 0 }}
                      disabled={busy}
                      onClick={() =>
                        void run(() => transitionRevision(latest.id, 'submit'))
                      }
                    >
                      Submit for review
                    </button>
                  ) : null}

                  {latest.status === 'in_review' && access?.can_approve ? (
                    <button
                      type="button"
                      className="wb-gms-entry"
                      style={{ width: 'auto', marginBottom: 0 }}
                      disabled={busy}
                      onClick={() =>
                        void run(() => transitionRevision(latest.id, 'approve'))
                      }
                    >
                      Approve
                    </button>
                  ) : null}

                  {(latest.status === 'in_review' || latest.status === 'approved') &&
                  access?.can_review ? (
                    <button
                      type="button"
                      className="wb-gms-entry"
                      style={{ width: 'auto', marginBottom: 0 }}
                      disabled={busy}
                      onClick={() =>
                        void run(() => transitionRevision(latest.id, 'reject'))
                      }
                    >
                      Send back
                    </button>
                  ) : null}

                  {latest.status === 'approved' && access?.can_publish ? (
                    <button
                      type="button"
                      className="wb-gms-entry"
                      style={{ width: 'auto', marginBottom: 0 }}
                      disabled={busy}
                      onClick={() =>
                        // The topic's token travels with the publish. The backend
                        // treats a missing one as a conflict, so it is always sent.
                        void run(() =>
                          publishRevision(latest.id, row.topic_revision)
                        )
                      }
                    >
                      Publish
                    </button>
                  ) : null}

                  {row.is_published && access?.can_publish ? (
                    <button
                      type="button"
                      className="wb-gms-entry"
                      style={{ width: 'auto', marginBottom: 0 }}
                      disabled={busy}
                      onClick={() =>
                        void run(() => rollbackTopic(row.tool_key, row.topic_key))
                      }
                    >
                      Roll back
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        );
      })}
    </main>
  );
}
