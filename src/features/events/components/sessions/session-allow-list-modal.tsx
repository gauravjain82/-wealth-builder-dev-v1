import { useCallback, useEffect, useId, useState } from 'react';
import { Badge, Button, ConfirmationDialog, Input, Label, LoadingState, Modal, Text, Textarea } from '@shared/components';
import { useToastStore } from '@/store';
import { sessionService } from '../../services/session-service';
import type { PaginatedResponse } from '../../types/event';
import type {
  EligibilityAddResult,
  EventSession,
  SessionEligibilityEntry,
} from '../../types/session';

interface SessionAllowListModalProps {
  open: boolean;
  eventId: number;
  session: EventSession | null;
  onClose: () => void;
}

const PAGE_SIZE = 25;

/** Split a paste on newlines, commas, semicolons and tabs (spreadsheet columns). */
function splitIdentifiers(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\n,;\t]+/)
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  );
}

/**
 * A restricted session's allow-list. Lists *people*, not tickets: access is
 * checked against whoever holds a ticket at the door, so a qualifier who gives
 * their ticket away does not pass access along. Each row shows the tickets the
 * person holds now, and flags anyone who holds none.
 */
export function SessionAllowListModal({ open, eventId, session, onClose }: SessionAllowListModalProps) {
  const id = useId();
  const addToast = useToastStore((s) => s.addToast);
  const [paste, setPaste] = useState('');
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState<EligibilityAddResult | null>(null);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedResponse<SessionEligibilityEntry> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<SessionEligibilityEntry | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const sessionId = session?.id;
  const pending = splitIdentifiers(paste);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    if (!open || sessionId == null) return;
    setLoading(true);
    setError(null);
    try {
      setData(await sessionService.eligibility(eventId, sessionId, { search: debounced, page }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the allow-list.');
    } finally {
      setLoading(false);
    }
  }, [open, eventId, sessionId, debounced, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (open) return;
    setPaste('');
    setResult(null);
    setSearch('');
  }, [open]);

  const add = async () => {
    if (sessionId == null || !pending.length) return;
    setAdding(true);
    try {
      const outcome = await sessionService.addEligible(eventId, sessionId, pending);
      setResult(outcome);
      // Keep only what failed in the box, so it can be corrected and retried.
      setPaste(outcome.not_found.join('\n'));
      await load();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Could not add.' });
    } finally {
      setAdding(false);
    }
  };

  const confirmRemove = async () => {
    if (!removing || sessionId == null) return;
    setRemoveBusy(true);
    try {
      await sessionService.removeEligible(eventId, sessionId, [removing.id]);
      addToast({
        type: 'success',
        message: `${removing.name || removing.person_email} removed from the allow-list.`,
      });
      setRemoving(null);
      await load();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Could not remove.' });
    } finally {
      setRemoveBusy(false);
    }
  };

  const count = data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        dismissible
        title={`Allow-list · ${session?.title ?? ''}`}
        subtitle={
          session?.min_level_code
            ? `Also open to everyone at ${session.min_level_code} and above.`
            : 'Only people on this list can attend.'
        }
        className="max-w-3xl"
      >
        <div className="space-y-6">
          <section className="space-y-2">
            <Label htmlFor={`${id}-paste`}>Add people</Label>
            <Textarea
              id={`${id}-paste`}
              rows={4}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder={'One per line — agent code, email, or ticket number\nAGT01\njohn@example.com'}
              aria-describedby={`${id}-paste-hint`}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Text id={`${id}-paste-hint`} variant="muted" className="text-xs">
                A ticket number adds the person holding that ticket now. Paste a column from a
                spreadsheet if you like.
              </Text>
              <Button type="button" onClick={() => void add()} disabled={adding || !pending.length}>
                {adding ? 'Adding…' : pending.length ? `Add ${pending.length}` : 'Add'}
              </Button>
            </div>

            {result ? (
              <div
                role="status"
                className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
              >
                <p className="text-slate-800 dark:text-white/90">
                  <strong>{result.added}</strong> added
                  {result.already ? (
                    <>
                      {' · '}
                      <strong>{result.already}</strong> already on the list
                    </>
                  ) : null}
                </p>
                {result.not_found.length ? (
                  <p className="text-amber-700 dark:text-amber-300">
                    Couldn’t match {result.not_found.length}: {result.not_found.join(', ')}. They’re
                    left in the box above to fix.
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                On the list <span className="font-normal text-slate-500">({count})</span>
              </h3>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, agent code…"
                aria-label="Search the allow-list"
                className="max-w-xs"
              />
            </div>

            {loading && !data ? (
              <LoadingState />
            ) : error ? (
              <Text className="text-sm text-red-600">{error}</Text>
            ) : count === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
                {debounced ? 'Nobody matches that search.' : 'Nobody on the list yet. Paste people above.'}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-white/10 dark:border-white/10">
                {data?.results.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {entry.name || entry.person_email}
                        {entry.level_code ? (
                          <span className="ml-2 text-xs font-normal text-slate-500">{entry.level_code}</span>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-white/50">
                        {[entry.agent_code, entry.name ? entry.person_email : ''].filter(Boolean).join(' · ') ||
                          'No platform account'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.ticket_numbers.length ? (
                        <Badge variant="success" title="Tickets this person holds now">
                          {entry.ticket_numbers.join(', ')}
                        </Badge>
                      ) : (
                        <Badge
                          variant="warning"
                          title="Holds no ticket for this event — never got one, or transferred it away"
                        >
                          No ticket
                        </Badge>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setRemoving(entry)}
                        aria-label={`Remove ${entry.name || entry.person_email}`}
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {pageCount > 1 ? (
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <span className="text-xs text-slate-500">
                  Page {page} of {pageCount}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </section>
        </div>
      </Modal>

      <ConfirmationDialog
        open={removing !== null}
        title="Remove from allow-list?"
        message={`${removing?.name || removing?.person_email || 'This person'} will no longer be admitted to “${session?.title ?? ''}” by scan. Anyone already checked in stays checked in.`}
        confirmText="Remove"
        confirmVariant="destructive"
        loading={removeBusy}
        onConfirm={() => void confirmRemove()}
        onClose={() => setRemoving(null)}
      />
    </>
  );
}
