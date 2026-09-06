/**
 * AIReviewPanel — the Builder AI workspace (Phase 7).
 *
 * Lists the caller's AI reviews (auto-polling while any is in-flight) and lets them
 * request a new one. The list, request picker, and toasts are wired here; the row
 * rendering and the modal are their own components (Decision 24 — thin container).
 */

import { useState } from 'react';
import { Button, Card } from '@shared/components';
import { Sparkles } from 'lucide-react';
import { useToastStore } from '@/store';
import {
  useAiReviewMutations,
  useAiReviewTemplates,
  useAiReviews,
  usePeriods,
  useSubmissions,
} from '../../hooks/use-builder-ai';
import { AIReviewCard } from './ai-review-card';
import { AIReviewRequestModal } from './ai-review-request-modal';
import type { CreateAIReviewPayload } from '../../types';

/** Render the AI review list + request flow. */
export function AIReviewPanel() {
  const addToast = useToastStore((state) => state.addToast);
  const [requestOpen, setRequestOpen] = useState(false);

  const reviews = useAiReviews();
  const templates = useAiReviewTemplates();
  const periods = usePeriods();
  const submissions = useSubmissions();
  const { create } = useAiReviewMutations();

  const hasTemplates = (templates.data ?? []).some((t) => t.is_active);

  /** Submit a review request and surface the outcome. */
  const handleRequest = async (payload: CreateAIReviewPayload) => {
    try {
      await create.mutateAsync(payload);
      addToast({ type: 'success', message: 'Review requested — the result will appear shortly.' });
      setRequestOpen(false);
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to request the review.',
      });
    }
  };

  const rows = reviews.data ?? [];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <Sparkles size={16} className="text-amber-600 dark:text-amber-300" />
          AI reviews
        </h2>
        <Button
          onClick={() => setRequestOpen(true)}
          disabled={!hasTemplates}
          title={hasTemplates ? undefined : 'No review types are configured yet.'}
        >
          <Sparkles size={16} />
          Request review
        </Button>
      </div>

      {reviews.isLoading ? (
        <Card className="p-6 text-center text-sm text-slate-500 dark:text-white/60">
          Loading reviews…
        </Card>
      ) : rows.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-white/80">No AI reviews yet</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-white/60">
            {hasTemplates
              ? 'Request a review of your performance or a submission to get AI coaching feedback.'
              : 'An administrator needs to configure a review type before you can request one.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {rows.map((review) => (
            <AIReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      <AIReviewRequestModal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        onSubmit={handleRequest}
        isSubmitting={create.isPending}
        templates={templates.data ?? []}
        periods={periods.data ?? []}
        submissions={submissions.data ?? []}
      />
    </section>
  );
}
