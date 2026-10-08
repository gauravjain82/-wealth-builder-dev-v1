import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Button, Modal } from '@/shared/components';
import { cn } from '@core/utils';
import { AIAttemptReviewModal } from '@/features/promotion/components/ai-attempt-review-modal';
import { fetchAIAttempts } from '../services/promotion-admin-service';

const PAGE_SIZE = 50;
const INPUT =
  'h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-300/50 dark:border-white/15 dark:bg-white/5 dark:text-white';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Every agent's AI test attempts, newest first, searchable by agent or video and
 * filterable by result. Opening a row shows the full review: answers, feedback and the
 * call transcript — the place to spot a test that looks gamed.
 */
export function AIAttemptsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [passed, setPassed] = useState<'' | 'true' | 'false'>('');
  const [page, setPage] = useState(0);
  const [attemptId, setAttemptId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(input.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['promotion-admin', 'ai-attempts', search, passed, page],
    queryFn: () =>
      fetchAIAttempts({ search, passed, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    enabled: open,
    placeholderData: keepPreviousData,
  });
  const pages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;

  return (
    <>
      <Modal
        open={open}
        title="AI test attempts"
        subtitle={data ? `${data.count} attempts` : undefined}
        onClose={onClose}
        dismissible
        contentClassName="max-w-[920px]"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              className={cn(INPUT, 'min-w-[220px] flex-1')}
              placeholder="Search agent or video…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <select
              className={INPUT}
              value={passed}
              onChange={(e) => {
                setPassed(e.target.value as '' | 'true' | 'false');
                setPage(0);
              }}
              aria-label="Result"
            >
              <option value="">All results</option>
              <option value="true">Passed</option>
              <option value="false">Not passed</option>
            </select>
          </div>

          {isLoading ? (
            <p className="py-6 text-center text-sm text-slate-500">Loading…</p>
          ) : error ? (
            <p className="py-6 text-center text-sm text-red-600">
              {error instanceof Error ? error.message : 'Unable to load attempts'}
            </p>
          ) : !data?.results.length ? (
            <p className="py-6 text-center text-sm text-slate-500">No attempts match.</p>
          ) : (
            <div className={cn('overflow-x-auto', isFetching && 'opacity-60')}>
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-500 dark:text-white/50">
                  <tr>
                    <th className="px-2 py-2">Agent</th>
                    <th className="px-2 py-2">Video</th>
                    <th className="px-2 py-2">Result</th>
                    <th className="px-2 py-2">Answers</th>
                    <th className="px-2 py-2">Mode</th>
                    <th className="px-2 py-2">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => setAttemptId(a.id)}
                      className="cursor-pointer border-t border-slate-100 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/[0.04]"
                    >
                      <td className="px-2 py-2 font-medium text-slate-900 dark:text-white">
                        {a.user_name}
                      </td>
                      <td className="px-2 py-2 text-slate-600 dark:text-white/70">
                        {a.module_title} <span className="opacity-60">#{a.attempt_number}</span>
                      </td>
                      <td
                        className={cn(
                          'px-2 py-2 font-semibold',
                          a.status === 'in_progress'
                            ? 'text-slate-400'
                            : a.passed
                              ? 'text-emerald-600 dark:text-emerald-300'
                              : 'text-red-600 dark:text-red-300'
                        )}
                      >
                        {a.status === 'in_progress'
                          ? 'Unfinished'
                          : `${a.score ?? 0}/100 ${a.passed ? '✓' : '✗'}`}
                      </td>
                      <td className="px-2 py-2 tabular-nums">{a.answer_count}</td>
                      <td className="px-2 py-2">{a.mode === 'voice' ? 'Voice' : 'Typed'}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-slate-500 dark:text-white/50">
                        {formatDate(a.started_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-end gap-2 text-sm">
              <Button
                type="button"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-slate-500">
                {page + 1} / {pages}
              </span>
              <Button
                type="button"
                variant="outline"
                disabled={page + 1 >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </Modal>
      <AIAttemptReviewModal attemptId={attemptId} onClose={() => setAttemptId(null)} />
    </>
  );
}
