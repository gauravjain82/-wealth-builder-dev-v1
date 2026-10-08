/**
 * The Code of Honor card on Home v2: title, tabs, and a body that scrolls inside the
 * card (the card keeps its height; the page does not grow).
 *
 * The card is split in half: the wall on the left, the turning challenge coin on the
 * right. On a narrow card the coin is dropped and the wall takes the full width.
 *
 * Tabs appear only for capabilities the server reports in `state/`; the server enforces
 * the same rule on every endpoint regardless. Committee and Admin screens live on their
 * own page (`/code-of-honor/committee`), linked from here for those who hold them.
 */

import { useState } from 'react';

import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

import '../code-of-honor.css';
import { useCodeOfHonorAccess, useWallState } from '../hooks/use-code-of-honor';
import type { Capability } from '../types';
import { CoinsTab } from './coins-tab';
import { HonorCoin } from './honor-coin';
import { PostTab } from './post-tab';
import { ErrorNotice, Loading } from './states';
import { VoteTab } from './vote-tab';
import { WinnersTab } from './winners-tab';

type TabId = 'post' | 'vote' | 'winners' | 'coins';

const TABS: { id: TabId; label: string; capability: Capability }[] = [
  { id: 'post', label: 'Post an Act', capability: 'code_of_honor.view' },
  { id: 'vote', label: 'Vote', capability: 'code_of_honor.vote' },
  { id: 'winners', label: 'Winners', capability: 'code_of_honor.view' },
  { id: 'coins', label: 'Coins', capability: 'code_of_honor.view' },
];

interface CodeOfHonorCardProps {
  /** Opens the committee/admin page. Omit to hide the link. */
  onOpenCommittee?: () => void;
}

export function CodeOfHonorCard({ onOpenCommittee }: CodeOfHonorCardProps) {
  const access = useCodeOfHonorAccess();
  const canView = Boolean(access.data?.can_view);
  const state = useWallState(canView);
  const [chosen, setChosen] = useState<TabId | null>(null);

  // Prospects and anyone without the view capability see nothing at all.
  if (access.isLoading || !canView) return null;

  const capabilities = new Set(state.data?.capabilities ?? []);
  const tabs = TABS.filter((tab) => capabilities.has(tab.capability));
  const voting = state.data?.voting ?? null;
  const tab = chosen ?? (voting && capabilities.has('code_of_honor.vote') ? 'vote' : 'post');
  const showCommitteeLink = Boolean(onOpenCommittee && (access.data?.can_review || access.data?.can_manage));

  return (
    <Card className="wb-coh-card">
      <div className="wb-coh-card__layout">
        <div className="wb-coh-card__main">
          <CardHeader className="wb-coh-card__header">
            <div>
              <CardTitle className="wb-coh-card__title">Code of Honor</CardTitle>
              <p className="wb-coh-card__status">
                {state.data
                  ? voting
                    ? `${voting.round === 'runoff' ? 'Tie-breaker' : 'Voting'} live · ${voting.label}`
                    : `Posting for ${state.data.open_cycle.label}`
                  : 'Loading…'}
              </p>
            </div>
            {showCommitteeLink && (
              <Button type="button" variant="outline" onClick={onOpenCommittee}>
                Committee
              </Button>
            )}
          </CardHeader>

          <CardContent className="wb-coh-card__content">
            <div className="wb-coh-tabs" role="tablist" aria-label="Code of Honor">
              {tabs.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`wb-coh-tab-${item.id}`}
                  aria-selected={tab === item.id}
                  aria-controls="wb-coh-tabpanel"
                  variant={tab === item.id ? 'default' : 'outline'}
                  className="wb-coh-tab"
                  onClick={() => setChosen(item.id)}
                >
                  {item.label}
                  {item.id === 'vote' && voting && (
                    <span className="wb-coh-live">
                      <span className="wb-coh-live__dot" aria-hidden="true" /> live
                    </span>
                  )}
                </Button>
              ))}
            </div>

            <div id="wb-coh-tabpanel" role="tabpanel" aria-labelledby={`wb-coh-tab-${tab}`} className="wb-coh-scroll">
              {state.isLoading && <Loading label="Loading Code of Honor" />}
              {state.isError && <ErrorNotice error={state.error} onRetry={() => state.refetch()} />}
              {state.data && tab === 'post' && (
                <PostTab state={state.data} canSubmit={capabilities.has('code_of_honor.submit')} />
              )}
              {state.data && tab === 'vote' && <VoteTab state={state.data} />}
              {state.data && tab === 'winners' && <WinnersTab />}
              {state.data && tab === 'coins' && <CoinsTab />}
            </div>
          </CardContent>
        </div>
        <HonorCoin />
      </div>
    </Card>
  );
}
