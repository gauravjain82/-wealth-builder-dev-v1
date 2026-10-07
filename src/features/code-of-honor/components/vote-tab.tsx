/**
 * The live vote. Ordered by the server and polled while the tab is visible; a like
 * returns the whole refreshed feed, which replaces the cache in one step.
 *
 * Reordering is animated (FLIP) so a rising act is legible rather than jumping, except
 * when the viewer prefers reduced motion.
 */

import { useLayoutEffect, useRef } from 'react';

import { useLike, useVoteFeed } from '../hooks/use-code-of-honor';
import type { AnonymousAct, WallState } from '../types';
import { ActText } from './act-text';
import { Empty, ErrorNotice, Loading } from './states';
import { errorMessage } from './error-message';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Animate list items from their previous position to the new one. */
function useFlip(ids: string[]) {
  const nodes = useRef(new Map<string, HTMLElement>());
  const positions = useRef(new Map<string, number>());
  const key = ids.join(',');

  useLayoutEffect(() => {
    const reduce = prefersReducedMotion();
    nodes.current.forEach((node, id) => {
      const top = node.getBoundingClientRect().top;
      const before = positions.current.get(id);
      if (!reduce && before !== undefined && before !== top && typeof node.animate === 'function') {
        node.animate([{ transform: `translateY(${before - top}px)` }, { transform: 'translateY(0)' }], {
          duration: 350,
          easing: 'ease-out',
        });
      }
      positions.current.set(id, top);
    });
  }, [key]);

  return (id: string) => (node: HTMLElement | null) => {
    if (node) nodes.current.set(id, node);
    else nodes.current.delete(id);
  };
}

export function VoteTab({ state }: { state: WallState }) {
  const live = Boolean(state.voting);
  const feed = useVoteFeed(true, live);
  const like = useLike();
  const refFor = useFlip((feed.data?.acts ?? []).map((act) => act.id));

  if (feed.isLoading) return <Loading label="Loading the vote" />;
  if (feed.isError || !feed.data) return <ErrorNotice error={feed.error} onRetry={() => feed.refetch()} />;
  const data = feed.data;

  if (data.status === 'closed') {
    return (
      <Empty>
        No vote is running right now. {state.open_cycle.label} is voted on{' '}
        {new Date(`${state.open_cycle.vote_day}T12:00:00`).toLocaleDateString(undefined, {
          weekday: 'long', month: 'long', day: 'numeric',
        })}.
      </Empty>
    );
  }

  const likesLeft = data.likes_left ?? 0;
  const runoff = data.round === 'runoff';

  return (
    <div className="wb-coh-vote">
      <div className="wb-coh-vote__bar" role="status" aria-live="polite">
        <strong>{runoff ? `Tie-breaker · ${data.label}` : `Voting · ${data.label}`}</strong>
        <span>
          {likesLeft} of {data.likes_total} {data.likes_total === 1 ? 'like' : 'likes'} left
        </span>
      </div>
      {runoff && <p className="wb-coh-muted">Only the tied acts are in this round. You have one like.</p>}
      {like.isError && <ErrorNotice error={like.error} />}
      {data.acts.length === 0 ? (
        <Empty>No acts are in the vote.</Empty>
      ) : (
        <ul className="wb-coh-list">
          {data.acts.map((act) => (
            <li key={act.id} ref={refFor(act.id)} className="wb-coh-act">
              <ActText text={act.text} />
              <div className="wb-coh-act__meta">
                <span className="wb-coh-tag">{act.value}</span>
                {act.values.map((value) => (
                  <span key={value} className="wb-coh-tag wb-coh-tag--soft">{value}</span>
                ))}
                <LikeButton
                  act={act}
                  showCount={Boolean(data.totals_visible)}
                  noneLeft={likesLeft === 0}
                  pending={like.isPending && like.variables?.actId === act.id}
                  onToggle={() => like.mutate({ actId: act.id, liked: !act.liked })}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {like.isError && <span className="sr-only">{errorMessage(like.error)}</span>}
    </div>
  );
}

interface LikeButtonProps {
  act: AnonymousAct;
  showCount: boolean;
  noneLeft: boolean;
  pending: boolean;
  onToggle: () => void;
}

function LikeButton({ act, showCount, noneLeft, pending, onToggle }: LikeButtonProps) {
  const liked = Boolean(act.liked);
  const reason = !act.can_like
    ? "You can't vote on this one"
    : noneLeft && !liked
      ? 'No likes left — take one back to move it'
      : null;
  const count = showCount && act.likes !== undefined ? act.likes : null;
  const label = liked
    ? 'Remove like'
    : `Like${count !== null ? `, ${count} ${count === 1 ? 'like' : 'likes'}` : ''}`;

  return (
    <button
      type="button"
      className={liked ? 'wb-coh-like wb-coh-like--on' : 'wb-coh-like'}
      aria-pressed={liked}
      aria-label={label}
      title={reason ?? undefined}
      aria-describedby={reason ? `wb-coh-like-why-${act.id}` : undefined}
      disabled={Boolean(reason) || pending}
      onClick={onToggle}
    >
      <span aria-hidden="true">{liked ? '♥' : '♡'}</span>
      {count !== null && <span aria-hidden="true">{count}</span>}
      {reason && (
        <span id={`wb-coh-like-why-${act.id}`} className="sr-only">
          {reason}
        </span>
      )}
    </button>
  );
}
