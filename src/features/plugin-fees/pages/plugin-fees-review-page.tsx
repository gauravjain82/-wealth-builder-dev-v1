/**
 * Hierarchy Assistant review page: office approvals and assistant verifications.
 * Route `/admin/plugin-fees/review`, guarded by `PluginFeesReviewRoute` on
 * `my-access/`.can_review (`plugin_fees:review`). The backend re-checks every request.
 * Screens and states: `docs/plugin-fees/UI.md` §2.4.
 */

import { useState } from 'react';

import { Heading, Text } from '@/shared/components';

import {
  useAssistantReviews,
  useDecideAssistant,
  useDecideOffice,
  useOfficeReviews,
} from '../hooks/use-plugin-fees';
import type {
  AssistantDecision,
  AssistantReviewItem,
  AssistantReviewStatus,
  OfficeDecision,
  OfficeReviewItem,
  OfficeReviewStatus,
  ReviewKind,
} from '../types';
import { ReviewQueue, type ReviewQueueConfig } from '../components/review/review-queue';
import { AssistantSummary, OfficeSummary } from '../components/submission-summaries';
import '../components/plugin-fees.css';

const OFFICE_CONFIG: ReviewQueueConfig<OfficeReviewStatus, OfficeReviewItem, OfficeDecision> = {
  noun: 'Office',
  statuses: [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'all', label: 'All' },
  ],
  defaultStatus: 'pending',
  useList: useOfficeReviews,
  useDecide: useDecideOffice,
  approveDecision: 'approve',
  rejectDecision: 'reject',
  approveLabel: (item) => (item.status === 'pending' ? 'Approve' : null),
  renderBody: (item, actions) => <OfficeSummary office={item} headerExtra={actions} />,
};

const ASSISTANT_CONFIG: ReviewQueueConfig<
  AssistantReviewStatus,
  AssistantReviewItem,
  AssistantDecision
> = {
  noun: 'Assistant',
  statuses: [
    { value: 'pending', label: 'Pending' },
    { value: 'reverify_due', label: 'Re-verification due' },
    { value: 'verified', label: 'Verified' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'expired', label: 'Expired' },
    { value: 'all', label: 'All' },
  ],
  defaultStatus: 'pending',
  useList: useAssistantReviews,
  useDecide: useDecideAssistant,
  approveDecision: 'verify',
  rejectDecision: 'reject',
  // A pending submission is verified; a verified one inside its window is re-verified.
  approveLabel: (item) =>
    item.status === 'pending'
      ? 'Verify'
      : item.status === 'verified' && item.reverify_open
        ? 'Re-verify'
        : null,
  renderBody: (item, actions) => <AssistantSummary assistant={item} headerExtra={actions} />,
};

const TABS: { key: ReviewKind; label: string }[] = [
  { key: 'offices', label: 'Offices' },
  { key: 'assistants', label: 'Assistants' },
];

export default function PluginFeesReviewPage() {
  const [tab, setTab] = useState<ReviewKind>('offices');

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h4" weight="bold">
          Plug-in Fee Reviews
        </Heading>
        <Text variant="muted">
          Approve offices and verify assistants. Every decision records who made it and when; a
          rejection note is emailed to the agent.
        </Text>
      </div>

      <div className="wb-pf-tabs" role="tablist" aria-label="Review queues">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="tab"
            id={`wb-pf-tab-${entry.key}`}
            aria-selected={tab === entry.key}
            aria-controls={`wb-pf-panel-${entry.key}`}
            className="wb-pf-tab"
            onClick={() => setTab(entry.key)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`wb-pf-panel-${tab}`} aria-labelledby={`wb-pf-tab-${tab}`}>
        {tab === 'offices' ? (
          <ReviewQueue key="offices" config={OFFICE_CONFIG} />
        ) : (
          <ReviewQueue key="assistants" config={ASSISTANT_CONFIG} />
        )}
      </div>
    </div>
  );
}
