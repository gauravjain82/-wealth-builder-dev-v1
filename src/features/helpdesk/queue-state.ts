/** Helpers for the worker-facing ticket `queue_state` (row highlighting). */

/** True for states that need the worker's attention (bold row + blue dot). */
export function isAttentionState(state?: string | null): boolean {
  return state === 'new' || state === 'user_replied';
}

/** True for finished tickets (muted rows). */
export function isFinishedState(state?: string | null): boolean {
  return state === 'resolved' || state === 'closed';
}

/**
 * Extra classes for a list row by queue state: attention rows are bold, finished
 * rows muted. Pair with `QueueStateBadge` so the state is never colour-only.
 */
export function queueStateRowClass(state?: string | null): string {
  if (isAttentionState(state)) return 'font-semibold';
  if (isFinishedState(state)) return 'opacity-60';
  return '';
}
