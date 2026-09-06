/**
 * AIReviewCard — one AI review run and its result.
 *
 * Shows the subject/builder, a live status badge (PENDING/RUNNING pulse while the
 * async run completes — Decision 12), the model reply, and cost/latency footer.
 * A FAILED review surfaces its recorded error (the backend never 500s a review).
 */

import { Badge, Card } from '@shared/components';
import { Bot, Clock, Coins } from 'lucide-react';
import { aiReviewStatusStyle } from '../../theme';
import type { AIReview } from '../../types';

export interface AIReviewCardProps {
  review: AIReview;
}

/** Human label for what this review is about. */
function subjectLabel(review: AIReview): string {
  if (review.submission) return `Submission #${review.submission}`;
  if (review.period) return `Period #${review.period}`;
  return 'Builder review';
}

/** Render one AI review record. */
export function AIReviewCard({ review }: AIReviewCardProps) {
  const style = aiReviewStatusStyle(review.status);
  const inFlight = review.status === 'PENDING' || review.status === 'RUNNING';
  const builderName = review.builder?.user?.full_name || review.builder?.user?.username || 'You';

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Bot size={16} className="text-amber-600 dark:text-amber-300" />
            <span className="truncate">{review.template_code ?? 'AI review'}</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-white/60">
            {subjectLabel(review)} · {builderName}
          </p>
        </div>
        <Badge variant={style.badge} className="shrink-0">
          <span
            className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${style.dot} ${
              inFlight ? 'animate-pulse' : ''
            }`}
          />
          {style.label}
        </Badge>
      </div>

      {review.status === 'COMPLETED' && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-white/80">
          {review.result_text}
        </p>
      )}

      {review.status === 'FAILED' && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {review.error || 'The review could not be completed.'}
        </p>
      )}

      {inFlight && (
        <p className="text-sm text-slate-500 dark:text-white/60">
          The AI is reviewing this — the result will appear here automatically.
        </p>
      )}

      {review.status === 'COMPLETED' && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-[11px] text-slate-400 dark:border-white/10 dark:text-white/40">
          {review.model && (
            <span className="inline-flex items-center gap-1">
              <Bot size={12} /> {review.provider}/{review.model}
            </span>
          )}
          {review.total_tokens > 0 && (
            <span className="inline-flex items-center gap-1">
              <Coins size={12} /> {review.total_tokens} tokens
            </span>
          )}
          {review.latency_ms > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} /> {review.latency_ms} ms
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
