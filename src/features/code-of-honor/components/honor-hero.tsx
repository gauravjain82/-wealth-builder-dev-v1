/**
 * The card's header: why to take part (the question) and when (the countdown to voting,
 * posts left, acts so far). The coins and the
 * video sit on the right, over the Post tab's feed column.
 *
 * Every number comes from `state/` and `wall/`; nothing here is computed that the server
 * would not also enforce.
 */

import { Clock, PenLine, Sparkles } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';

import type { WallResponse, WallState } from '../types';
import { HonorCoins } from './honor-coin';
import { HonorVideo } from './honor-video';

/** Whole days from today to an ISO date, read at local noon so DST never shifts it. */
function daysUntil(isoDay: string): number {
  const target = new Date(`${isoDay}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function countdown(isoDay: string): string {
  const days = daysUntil(isoDay);
  if (days <= 0) return 'Voting opens today';
  if (days === 1) return 'Voting opens tomorrow';
  return `Voting opens in ${days} days`;
}

interface HonorHeroProps {
  state: WallState | undefined;
  wall: WallResponse | undefined;
  onOpenCommittee?: () => void;
}

export function HonorHero({ state, wall, onOpenCommittee }: HonorHeroProps) {
  const voting = state?.voting ?? null;

  return (
    <>
      <div className="wb-coh-hero">
        <p className="wb-coh-hero__eyebrow">
          Code of Honor
          {state && <span> · {voting ? voting.label : state.open_cycle.label}</span>}
        </p>
        <h3 className="wb-coh-hero__title">
          {voting
            ? voting.round === 'runoff'
              ? 'It’s a tie. Help settle it.'
              : 'Which acts deserve the coins?'
            : 'Who held the standard this month?'}
        </h3>

        <div className="wb-coh-hero__chips">
          {state && !voting && (
            <span className="wb-coh-hero__chip">
              <Clock size={14} aria-hidden="true" /> {countdown(state.open_cycle.vote_day)}
            </span>
          )}
          {voting && (
            <span className="wb-coh-hero__chip wb-coh-hero__chip--live">
              <span className="wb-coh-live__dot" aria-hidden="true" /> Voting live
            </span>
          )}
          {wall && !voting && (
            <span className="wb-coh-hero__chip" aria-label={`${wall.slots_left} of ${wall.slots_total} posts left`}>
              <PenLine size={14} aria-hidden="true" />
              <span className="wb-coh-dots" aria-hidden="true">
                {Array.from({ length: wall.slots_total }, (_, index) => (
                  <span
                    key={index}
                    className={index < wall.slots_left ? 'wb-coh-dot wb-coh-dot--on' : 'wb-coh-dot'}
                  />
                ))}
              </span>
              {wall.slots_left} left
            </span>
          )}
          {wall && (
            <span className="wb-coh-hero__chip">
              <Sparkles size={14} aria-hidden="true" /> {wall.feed.acts.length}{' '}
              {wall.feed.acts.length === 1 ? 'act' : 'acts'} {voting ? 'in the vote' : 'so far'}
            </span>
          )}
          {onOpenCommittee && (
            <Button type="button" variant="outline" size="sm" className="wb-coh-hero__committee" onClick={onOpenCommittee}>
              Committee
            </Button>
          )}
        </div>
      </div>

      <div className="wb-coh-hero__aside">
        <HonorCoins />
        <HonorVideo />
      </div>
    </>
  );
}
